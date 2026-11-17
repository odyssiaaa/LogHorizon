import { Prisma, TournamentStatus } from "@prisma/client";
import { activeUser, jsonError, requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createSingleEliminationBracket, TournamentTeam, TournamentMatch, TournamentRosterPlayer } from "@/lib/tournament";
import { sanitizePlainText, isValidSafeImage } from "@/lib/sanitize";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk mendaftar ke turnamen.", 401);
  const { id } = await params;
  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const teamName = sanitizePlainText(typeof data.teamName === "string" ? data.teamName.trim() : "");

  if (!teamName || teamName.length > 64) {
    return jsonError("Nama party/tim wajib diisi (maksimal 64 karakter).", 400);
  }

  const rawPhone = typeof data.phone === "string" ? data.phone.trim().replace(/[^\d+]/g, "") : "";
  if (!rawPhone || rawPhone.replace(/\D/g, "").length < 8) {
    return jsonError("Nomor WhatsApp/telepon perwakilan wajib diisi (minimal 8 angka).", 400);
  }

  // Payment proof & sender name
  const rawSender = typeof data.senderName === "string" ? data.senderName.trim() : "";
  const senderName = sanitizePlainText(rawSender);
  const rawProof = typeof data.paymentProof === "string" ? data.paymentProof.trim() : "";
  if (rawProof && !isValidSafeImage(rawProof)) {
    return jsonError("Bukti pembayaran tidak valid atau melebihi batas ukuran 2 MB.", 400);
  }
  const paymentProof = rawProof.length > 0 ? rawProof : null;

  // Parse Pemain Inti
  let mainPlayers: { name: string; inGameId: string; role: "MAIN" }[] = [];
  if (Array.isArray(data.mainPlayers)) {
    mainPlayers = (data.mainPlayers as Array<{ name?: unknown; nickname?: unknown; inGameId?: unknown; gameId?: unknown }>)
      .map((p) => {
        const nameVal = typeof p.nickname === "string" ? p.nickname : typeof p.name === "string" ? p.name : "";
        const idVal = typeof p.gameId === "string" ? p.gameId : typeof p.inGameId === "string" ? p.inGameId : "";
        return {
          name: sanitizePlainText(nameVal.trim()),
          inGameId: sanitizePlainText(idVal.trim()),
          role: "MAIN" as const,
        };
      })
      .filter((p) => p.name.length > 0 && p.inGameId.length > 0);
  } else if (Array.isArray(data.roster)) {
    mainPlayers = (data.roster as Array<{ name?: unknown; nickname?: unknown; inGameId?: unknown; gameId?: unknown; role?: unknown }>)
      .filter((p) => p.role !== "SUB")
      .map((p) => {
        const nameVal = typeof p.nickname === "string" ? p.nickname : typeof p.name === "string" ? p.name : "";
        const idVal = typeof p.gameId === "string" ? p.gameId : typeof p.inGameId === "string" ? p.inGameId : "";
        return {
          name: sanitizePlainText(nameVal.trim()),
          inGameId: sanitizePlainText(idVal.trim()),
          role: "MAIN" as const,
        };
      })
      .filter((p) => p.name.length > 0 && p.inGameId.length > 0);
  } else if (Array.isArray(data.players)) {
    mainPlayers = (data.players as string[])
      .filter((p) => typeof p === "string" && p.trim().length > 0)
      .map((p, idx) => ({
        name: sanitizePlainText(p.trim()),
        inGameId: `TAG-${idx + 1}`,
        role: "MAIN" as const,
      }));
  }

  if (mainPlayers.length === 0) {
    return jsonError("Daftar pemain inti wajib diisi lengkap dengan Nickname dan ID In-Game.", 400);
  }

  // Parse Pemain Cadangan (Opsional)
  let subPlayers: { name: string; inGameId: string; role: "SUB" }[] = [];
  if (Array.isArray(data.subPlayers)) {
    subPlayers = (data.subPlayers as Array<{ name?: unknown; nickname?: unknown; inGameId?: unknown; gameId?: unknown }>)
      .map((p) => {
        const nameVal = typeof p.nickname === "string" ? p.nickname : typeof p.name === "string" ? p.name : "";
        const idVal = typeof p.gameId === "string" ? p.gameId : typeof p.inGameId === "string" ? p.inGameId : "";
        return {
          name: sanitizePlainText(nameVal.trim()),
          inGameId: sanitizePlainText(idVal.trim()),
          role: "SUB" as const,
        };
      })
      .filter((p) => p.name.length > 0 && p.inGameId.length > 0);
  } else if (Array.isArray(data.roster)) {
    subPlayers = (data.roster as Array<{ name?: unknown; nickname?: unknown; inGameId?: unknown; gameId?: unknown; role?: unknown }>)
      .filter((p) => p.role === "SUB")
      .map((p) => {
        const nameVal = typeof p.nickname === "string" ? p.nickname : typeof p.name === "string" ? p.name : "";
        const idVal = typeof p.gameId === "string" ? p.gameId : typeof p.inGameId === "string" ? p.inGameId : "";
        return {
          name: sanitizePlainText(nameVal.trim()),
          inGameId: sanitizePlainText(idVal.trim()),
          role: "SUB" as const,
        };
      })
      .filter((p) => p.name.length > 0 && p.inGameId.length > 0);
  }

  const roster = [...mainPlayers, ...subPlayers];
  const legacyPlayerStrings = roster.map((p) => `${p.name} (${p.inGameId})`);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({ where: { id } });
      if (!tournament || (tournament.status !== TournamentStatus.OPEN && tournament.status !== TournamentStatus.REGISTRATION)) {
        throw new Error("TOURNAMENT_CLOSED");
      }

      const isPaid = !tournament.isFreeEntry && tournament.entryFee > 0;
      if (isPaid) {
        if (!senderName || senderName.length < 2) {
          throw new Error("MISSING_SENDER_NAME");
        }
        if (!paymentProof) {
          throw new Error("MISSING_PAYMENT_PROOF");
        }
      }

      // Check existing registration
      const existing = await tx.participant.findUnique({
        where: { tournamentId_leaderId: { tournamentId: id, leaderId: user.id } },
      });
      if (existing) {
        if (existing.paymentStatus === "REJECTED") {
          await tx.participant.delete({ where: { id: existing.id } });
        } else if (existing.paymentStatus === "PENDING_PAYMENT") {
          throw new Error("PENDING_VERIFICATION");
        } else {
          throw new Error("ALREADY_REGISTERED");
        }
      }

      const count = await tx.participant.count({
        where: { tournamentId: id, paymentStatus: "APPROVED" },
      });
      if (count >= tournament.maxSlots) throw new Error("TOURNAMENT_FULL");

      const paymentStatus = isPaid ? "PENDING_PAYMENT" : "APPROVED";

      const created = await tx.participant.create({
        data: {
          tournamentId: id,
          leaderId: user.id,
          teamName,
          phone: rawPhone,
          roster: roster as unknown as Prisma.InputJsonValue,
          paymentStatus,
          senderName: isPaid ? senderName : null,
          paymentProof: isPaid ? paymentProof : null,
        },
      });

      // If Paid Entry, team is not placed into active bracket until approved by staff
      if (isPaid) {
        return {
          success: true,
          status: "PENDING_PAYMENT",
          message: "Pendaftaran & bukti pembayaran terkirim! Menunggu verifikasi Admin sebelum tim resmi masuk ke dalam bagan.",
          participant: created,
        };
      }

      // Free Entry: Immediately enter team into tournament bracket
      const existingTeams = (tournament.teams as unknown as TournamentTeam[]) || [];
      const newTeamObj: TournamentTeam = {
        id: created.id,
        teamName,
        captainName: user.username ?? user.name ?? "Kapten Party",
        representativeDiscord: user.username ?? user.name ?? "Gamer",
        representativeDiscordId: user.discordId ?? undefined,
        representativePhone: rawPhone,
        players: legacyPlayerStrings,
        mainPlayers,
        subPlayers,
        roster,
        paymentStatus: "APPROVED",
      };

      // Replace placeholder or push
      let updatedTeams = [...existingTeams];
      const placeholderIdx = updatedTeams.findIndex((t) => t.teamName.startsWith("Tim ") && t.id.startsWith("team-"));
      if (placeholderIdx !== -1) {
        updatedTeams[placeholderIdx] = newTeamObj;
      } else {
        updatedTeams.push(newTeamObj);
      }

      // Update slot in round 1 matches if placeholder
      let updatedMatches = (tournament.matches as unknown as TournamentMatch[]) || [];
      if (updatedMatches.length > 0) {
        updatedMatches = updatedMatches.map((match) => {
          if (match.round === 1) {
            if (placeholderIdx !== -1 && match.teamA.name === `Tim ${placeholderIdx + 1}`) {
              return { ...match, teamA: { ...match.teamA, id: created.id, name: teamName } };
            }
            if (placeholderIdx !== -1 && match.teamB.name === `Tim ${placeholderIdx + 1}`) {
              return { ...match, teamB: { ...match.teamB, id: created.id, name: teamName } };
            }
          }
          return match;
        });
      }

      const isFullNow = count + 1 >= tournament.maxSlots;
      const participants = await tx.participant.findMany({
        where: { tournamentId: id, paymentStatus: "APPROVED" },
        orderBy: { createdAt: "asc" },
        select: { id: true, teamName: true },
      });

      let legacyBracket: Prisma.InputJsonValue | undefined = undefined;
      if (isFullNow) {
        legacyBracket = createSingleEliminationBracket(participants.map((entry) => ({ participantId: entry.id, teamName: entry.teamName }))) as unknown as Prisma.InputJsonValue;
      }

      await tx.tournament.update({
        where: { id },
        data: {
          status: isFullNow ? TournamentStatus.FULL : tournament.status,
          teams: updatedTeams as unknown as Prisma.InputJsonValue,
          matches: updatedMatches as unknown as Prisma.InputJsonValue,
          ...(legacyBracket ? { bracket: legacyBracket } : {}),
        },
      });

      return {
        success: true,
        status: "APPROVED",
        message: "Tim berhasil didaftarkan ke turnamen!",
        participant: created,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "TOURNAMENT_CLOSED") return jsonError("Pendaftaran turnamen sudah ditutup.", 409);
    if (error instanceof Error && error.message === "TOURNAMENT_FULL") return jsonError("Slot turnamen sudah penuh.", 409);
    if (error instanceof Error && error.message === "MISSING_SENDER_NAME") return jsonError("Nama pengirim / pemilik rekening transfer wajib diisi.", 400);
    if (error instanceof Error && error.message === "MISSING_PAYMENT_PROOF") return jsonError("Upload bukti pembayaran QRIS wajib dilampirkan.", 400);
    if (error instanceof Error && error.message === "PENDING_VERIFICATION") return jsonError("Pendaftaran tim kamu sedang dalam antrean verifikasi pembayaran oleh Admin.", 409);
    if (error instanceof Error && error.message === "ALREADY_REGISTERED") return jsonError("Party kamu sudah terdaftar di turnamen ini.", 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return jsonError("Party kamu sudah terdaftar di turnamen ini.", 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return jsonError("Pendaftaran berubah bersamaan. Coba lagi.", 409);
    throw error;
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await requireStaff(["ADMIN", "MODERATOR"]);
  if (access.response) return access.response;

  const { id } = await params;
  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const participantId = typeof data.participantId === "string" ? data.participantId : "";
  const action = typeof data.action === "string" ? data.action.toUpperCase() : "";
  const reason = sanitizePlainText(typeof data.reason === "string" ? data.reason.trim() : "");

  if (!participantId || !["APPROVE", "REJECT"].includes(action)) {
    return jsonError("ID pendaftar dan aksi (APPROVE / REJECT) wajib disertakan.", 400);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({ where: { id } });
      if (!tournament) throw new Error("TOURNAMENT_NOT_FOUND");

      const participant = await tx.participant.findUnique({
        where: { id: participantId },
        include: { leader: true },
      });
      if (!participant || participant.tournamentId !== id) throw new Error("PARTICIPANT_NOT_FOUND");

      if (action === "APPROVE") {
        if (participant.paymentStatus === "APPROVED") {
          return { success: true, message: "Tim ini sudah berstatus disetujui." };
        }

        // Update participant status
        await tx.participant.update({
          where: { id: participantId },
          data: { paymentStatus: "APPROVED", rejectionReason: null },
        });

        // Add team to bracket
        const existingTeams = (tournament.teams as unknown as TournamentTeam[]) || [];
        const roster = (participant.roster as unknown as TournamentRosterPlayer[]) || [];
        const mainPlayers = roster.filter((r) => r.role === "MAIN");
        const subPlayers = roster.filter((r) => r.role === "SUB");
        const legacyPlayerStrings = roster.map((p) => `${p.name} (${p.inGameId})`);

        const newTeamObj: TournamentTeam = {
          id: participant.id,
          teamName: participant.teamName,
          captainName: participant.leader.username ?? participant.leader.name ?? "Kapten Party",
          representativeDiscord: participant.leader.username ?? participant.leader.name ?? "Gamer",
          representativeDiscordId: participant.leader.discordId ?? undefined,
          representativePhone: participant.phone ?? undefined,
          players: legacyPlayerStrings,
          mainPlayers,
          subPlayers,
          roster,
          paymentStatus: "APPROVED",
          senderName: participant.senderName ?? undefined,
        };

        let updatedTeams = [...existingTeams];
        const placeholderIdx = updatedTeams.findIndex((t) => t.teamName.startsWith("Tim ") && t.id.startsWith("team-"));
        if (placeholderIdx !== -1) {
          updatedTeams[placeholderIdx] = newTeamObj;
        } else {
          updatedTeams.push(newTeamObj);
        }

        // Update round 1 match slot if placeholder
        let updatedMatches = (tournament.matches as unknown as TournamentMatch[]) || [];
        if (updatedMatches.length > 0) {
          updatedMatches = updatedMatches.map((match) => {
            if (match.round === 1) {
              if (placeholderIdx !== -1 && match.teamA.name === `Tim ${placeholderIdx + 1}`) {
                return { ...match, teamA: { ...match.teamA, id: participant.id, name: participant.teamName } };
              }
              if (placeholderIdx !== -1 && match.teamB.name === `Tim ${placeholderIdx + 1}`) {
                return { ...match, teamB: { ...match.teamB, id: participant.id, name: participant.teamName } };
              }
            }
            return match;
          });
        }

        const approvedCount = await tx.participant.count({
          where: { tournamentId: id, paymentStatus: "APPROVED" },
        });
        const isFullNow = approvedCount >= tournament.maxSlots;

        await tx.tournament.update({
          where: { id },
          data: {
            status: isFullNow ? TournamentStatus.FULL : tournament.status,
            teams: updatedTeams as unknown as Prisma.InputJsonValue,
            matches: updatedMatches as unknown as Prisma.InputJsonValue,
          },
        });

        // Notify team leader
        await tx.notification.create({
          data: {
            userId: participant.leaderId,
            type: "SYSTEM",
            message: `Pendaftaran tim "${participant.teamName}" di turnamen "${tournament.title}" telah disetujui Admin! Tim resmi masuk ke dalam bagan pertandingan.`,
            link: `/events/turnamen/${tournament.id}`,
          },
        });

        return { success: true, message: `Tim "${participant.teamName}" berhasil di-ACC dan masuk ke bagan turnamen!` };
      } else {
        // REJECT
        await tx.participant.update({
          where: { id: participantId },
          data: { paymentStatus: "REJECTED", rejectionReason: reason || "Bukti transfer tidak valid/sesuai" },
        });

        // Notify team leader
        await tx.notification.create({
          data: {
            userId: participant.leaderId,
            type: "SYSTEM",
            message: `Pendaftaran tim "${participant.teamName}" di turnamen "${tournament.title}" ditolak oleh Admin. Alasan: ${reason || "Bukti transfer tidak valid atau belum masuk ke rekening kas guild."}`,
            link: `/events/turnamen/${tournament.id}`,
          },
        });

        return { success: true, message: `Pendaftaran tim "${participant.teamName}" telah ditolak.` };
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return Response.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "TOURNAMENT_NOT_FOUND") return jsonError("Turnamen tidak ditemukan.", 404);
    if (error instanceof Error && error.message === "PARTICIPANT_NOT_FOUND") return jsonError("Data pendaftar tidak ditemukan.", 404);
    throw error;
  }
}
