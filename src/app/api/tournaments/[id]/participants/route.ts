import { Prisma, TournamentStatus } from "@prisma/client";
import { activeUser, jsonError, requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createSingleEliminationBracket, TournamentTeam, TournamentMatch, TournamentRosterPlayer } from "@/lib/tournament";
import { sanitizePlainText, isValidSafeImage, validateHoneypot, sanitizeTextInput } from "@/lib/sanitize";
import { notifyPaidTournamentRegistration, notifyTournamentTeamDecision } from "@/lib/discord-webhook";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await activeUser();
  const { id } = await params;
  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  // Invisible Honeypot Anti-Bot Shield
  if (!validateHoneypot(data)) {
    return jsonError("Pendaftaran ditolak oleh filter anti-bot otomatis.", 400);
  }

  // Extract client IP for anti-spam rate limiting
  const forwarded = request.headers.get("x-forwarded-for");
  const clientIp = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "127.0.0.1";

  // Rate Limiting on Guest Registration: max 2 per 30 mins per IP
  if (!user) {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const ipRecentCount = await prisma.participant.count({
      where: {
        ipAddress: clientIp,
        createdAt: { gte: thirtyMinsAgo },
      },
    });
    if (ipRecentCount >= 2) {
      return jsonError("Batas pendaftaran tercapai (maksimal 2 kali per 30 menit). Silakan coba lagi nanti atau hubungi Admin.", 429);
    }
  }

  const teamName = sanitizePlainText(typeof data.teamName === "string" ? data.teamName.trim() : "");
  if (!teamName || teamName.length < 2 || teamName.length > 64) {
    return jsonError("Nama party/tim wajib diisi (minimal 2 dan maksimal 64 karakter).", 400);
  }

  const rawTag = typeof data.teamTag === "string" ? data.teamTag.trim() : "";
  const teamTag = sanitizePlainText(rawTag).slice(0, 12);

  // Captain Name / Nickname validation
  const rawCaptain = typeof data.captainName === "string" ? data.captainName.trim() : typeof data.captainIgn === "string" ? data.captainIgn.trim() : "";
  const captainName = sanitizePlainText(rawCaptain) || (user?.username ?? user?.name ?? "");
  if (!captainName || captainName.length < 2) {
    return jsonError("Nama lengkap / Nickname Kapten Tim wajib diisi (minimal 2 karakter).", 400);
  }

  // Captain Phone / WhatsApp validation (9-15 digits)
  const rawPhone = typeof data.phone === "string" ? data.phone.trim().replace(/[^\d+]/g, "") : "";
  const phoneDigits = rawPhone.replace(/\D/g, "");
  if (!rawPhone || phoneDigits.length < 9 || phoneDigits.length > 15) {
    return jsonError("Nomor WhatsApp/telepon kapten wajib diisi valid (9-15 digit, contoh: 08123456789 atau 628123456789).", 400);
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

  if (mainPlayers.length < 5) {
    return jsonError("Seluruh 5 Pemain Inti wajib diisi lengkap dengan Nickname dan ID In-Game.", 400);
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

      // Check duplicate team name or phone within same tournament
      const duplicateTeam = await tx.participant.findFirst({
        where: {
          tournamentId: id,
          teamName: { equals: teamName, mode: "insensitive" },
          paymentStatus: { in: ["APPROVED", "PENDING_PAYMENT"] },
        },
      });
      if (duplicateTeam) {
        throw new Error("TEAM_NAME_ALREADY_EXISTS");
      }

      const duplicatePhone = await tx.participant.findFirst({
        where: {
          tournamentId: id,
          phone: rawPhone,
          paymentStatus: { in: ["APPROVED", "PENDING_PAYMENT"] },
        },
      });
      if (duplicatePhone) {
        throw new Error("PHONE_ALREADY_REGISTERED");
      }

      // If user is logged in, check their existing registration
      if (user) {
        const existing = await tx.participant.findFirst({
          where: { tournamentId: id, leaderId: user.id },
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
      }

      const count = await tx.participant.count({
        where: { tournamentId: id, paymentStatus: { in: ["APPROVED", "PENDING_PAYMENT"] } },
      });
      if (count >= tournament.maxSlots) throw new Error("TOURNAMENT_FULL");

      const paymentStatus = isPaid ? "PENDING_PAYMENT" : "APPROVED";

      const created = await tx.participant.create({
        data: {
          tournamentId: id,
          leaderId: user ? user.id : null,
          captainName,
          teamTag: teamTag || null,
          teamName,
          phone: rawPhone,
          roster: roster as unknown as Prisma.InputJsonValue,
          paymentStatus,
          senderName: isPaid ? senderName : null,
          paymentProof: isPaid ? paymentProof : null,
          ipAddress: clientIp,
        },
      });

      // If Paid Entry, team is not placed into active bracket until approved by staff
      if (isPaid) {
        return {
          success: true,
          status: "PENDING_PAYMENT",
          message: "Pendaftaran & bukti pembayaran terkirim! Menunggu verifikasi Admin sebelum tim resmi masuk ke dalam bagan.",
          participant: created,
          tournamentTitle: tournament.title,
          entryFee: tournament.entryFee,
        };
      }

      // Free Entry: Immediately enter team into tournament bracket
      const existingTeams = (tournament.teams as unknown as TournamentTeam[]) || [];
      const newTeamObj: TournamentTeam = {
        id: created.id,
        teamName,
        captainName,
        representativeDiscord: user?.username ?? user?.name ?? `${captainName} (Guest)`,
        representativeDiscordId: user?.discordId ?? undefined,
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
        tournamentTitle: tournament.title,
        entryFee: tournament.entryFee,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (result.status === "PENDING_PAYMENT") {
      void notifyPaidTournamentRegistration({
        tournamentId: id,
        tournamentTitle: result.tournamentTitle || "Turnamen LogHorizon",
        teamName,
        senderName: senderName || "Pengirim",
        contactPhone: rawPhone,
        entryFee: Number(result.entryFee || 0),
        captainUsername: user ? (user.username || user.name || "Gamer") : `${captainName} (Guest)`,
      });
    }

    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "TOURNAMENT_CLOSED") return jsonError("Pendaftaran turnamen sudah ditutup.", 409);
    if (error instanceof Error && error.message === "TOURNAMENT_FULL") return jsonError("Slot turnamen sudah penuh.", 409);
    if (error instanceof Error && error.message === "TEAM_NAME_ALREADY_EXISTS") return jsonError("Nama tim ini sudah terdaftar di turnamen ini. Silakan gunakan nama tim lain.", 409);
    if (error instanceof Error && error.message === "PHONE_ALREADY_REGISTERED") return jsonError("Nomor WhatsApp/telepon ini sudah pernah didaftarkan pada turnamen ini.", 409);
    if (error instanceof Error && error.message === "MISSING_SENDER_NAME") return jsonError("Nama pengirim / pemilik rekening transfer wajib diisi.", 400);
    if (error instanceof Error && error.message === "MISSING_PAYMENT_PROOF") return jsonError("Upload bukti pembayaran QRIS wajib dilampirkan.", 400);
    if (error instanceof Error && error.message === "PENDING_VERIFICATION") return jsonError("Pendaftaran tim kamu sedang dalam antrean verifikasi pembayaran oleh Admin.", 409);
    if (error instanceof Error && error.message === "ALREADY_REGISTERED") return jsonError("Party kamu sudah terdaftar di turnamen ini.", 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return jsonError("Tim atau nomor kontak sudah terdaftar di turnamen ini.", 409);
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

  // Invisible Honeypot Anti-Bot Shield
  if (!validateHoneypot(data)) {
    return jsonError("Pendaftaran ditolak oleh filter anti-bot otomatis.", 400);
  }
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
          captainName: participant.captainName || participant.leader?.username || participant.leader?.name || "Kapten Party",
          representativeDiscord: participant.leader?.username || participant.leader?.name || `${participant.captainName || "Guest"}`,
          representativeDiscordId: participant.leader?.discordId ?? undefined,
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

        // Notify team leader if registered account
        if (participant.leaderId) {
          await tx.notification.create({
            data: {
              userId: participant.leaderId,
              type: "SYSTEM",
              message: `Pendaftaran tim "${participant.teamName}" di turnamen "${tournament.title}" telah disetujui Admin! Tim resmi masuk ke dalam bagan pertandingan.`,
              link: `/events/turnamen/${tournament.id}`,
            },
          });
        }

        return {
          success: true,
          message: `Tim "${participant.teamName}" berhasil di-ACC dan masuk ke bagan turnamen!`,
          tournamentTitle: tournament.title,
          teamName: participant.teamName,
          isApproved: true,
        };
      } else {
        // REJECT
        await tx.participant.update({
          where: { id: participantId },
          data: { paymentStatus: "REJECTED", rejectionReason: reason || "Bukti transfer tidak valid/sesuai" },
        });

        // Also prune team from tournament.teams if present
        let currentTeams: any[] = [];
        try {
          currentTeams = Array.isArray(tournament.teams) ? tournament.teams : JSON.parse((tournament.teams as string) || "[]");
        } catch {
          currentTeams = [];
        }

        const teamNameNorm = participant.teamName.trim().toLowerCase();
        const updatedTeams = currentTeams.filter((t: any) => {
          const tName = typeof t === "string" ? t : t?.name || t?.teamName || "";
          return tName.trim().toLowerCase() !== teamNameNorm;
        });

        // Clean up matches if this team was assigned to any match
        let currentMatches: any[] = [];
        try {
          currentMatches = Array.isArray(tournament.matches) ? tournament.matches : JSON.parse((tournament.matches as string) || "[]");
        } catch {
          currentMatches = [];
        }

        let matchesChanged = false;
        const updatedMatches = currentMatches.map((m: any) => {
          let modified = false;
          let teamA = m.teamA;
          let teamB = m.teamB;
          const nameA = typeof teamA === "string" ? teamA : teamA?.name || teamA?.teamName || "";
          const nameB = typeof teamB === "string" ? teamB : teamB?.name || teamB?.teamName || "";

          if (nameA.trim().toLowerCase() === teamNameNorm || teamA?.id === participant.id) {
            teamA = { name: "TBD", score: 0, status: "WAITING" };
            modified = true;
          }
          if (nameB.trim().toLowerCase() === teamNameNorm || teamB?.id === participant.id) {
            teamB = { name: "TBD", score: 0, status: "WAITING" };
            modified = true;
          }
          if (modified) {
            matchesChanged = true;
            return { ...m, teamA, teamB };
          }
          return m;
        });

        const activeCount = await tx.participant.count({
          where: {
            tournamentId: id,
            paymentStatus: { in: ["APPROVED", "PENDING_PAYMENT"] },
          },
        });

        const shouldRevertToOpen = tournament.status === TournamentStatus.FULL && activeCount < tournament.maxSlots;

        await tx.tournament.update({
          where: { id },
          data: {
            status: shouldRevertToOpen ? TournamentStatus.OPEN : tournament.status,
            teams: updatedTeams as unknown as Prisma.InputJsonValue,
            ...(matchesChanged ? { matches: updatedMatches as unknown as Prisma.InputJsonValue } : {}),
          },
        });

        // Notify team leader if registered account
        if (participant.leaderId) {
          await tx.notification.create({
            data: {
              userId: participant.leaderId,
              type: "SYSTEM",
              message: `Pendaftaran tim "${participant.teamName}" di turnamen "${tournament.title}" ditolak oleh Admin. Alasan: ${reason || "Bukti transfer tidak valid atau belum masuk ke rekening kas guild."}`,
              link: `/events/turnamen/${tournament.id}`,
            },
          });
        }

        return {
          success: true,
          message: `Pendaftaran tim "${participant.teamName}" telah ditolak.`,
          tournamentTitle: tournament.title,
          teamName: participant.teamName,
          isApproved: false,
          reason,
        };
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (result.tournamentTitle) {
      void notifyTournamentTeamDecision({
        adminName: access.user.username ?? "Admin",
        tournamentTitle: result.tournamentTitle,
        teamName: result.teamName || "Tim",
        isApproved: Boolean(result.isApproved),
        reason: result.reason,
      });
    }

    return Response.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "TOURNAMENT_NOT_FOUND") return jsonError("Turnamen tidak ditemukan.", 404);
    if (error instanceof Error && error.message === "PARTICIPANT_NOT_FOUND") return jsonError("Data pendaftar tidak ditemukan.", 404);
    throw error;
  }
}
