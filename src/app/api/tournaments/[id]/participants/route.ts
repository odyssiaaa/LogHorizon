import { Prisma, TournamentStatus } from "@prisma/client";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createSingleEliminationBracket, TournamentTeam, TournamentMatch } from "@/lib/tournament";
import { sanitizePlainText } from "@/lib/sanitize";

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

  // Parse Pemain Inti
  let mainPlayers: { name: string; inGameId: string; role: "MAIN" }[] = [];
  if (Array.isArray(data.mainPlayers)) {
    mainPlayers = (data.mainPlayers as Array<{ name?: unknown; inGameId?: unknown }>)
      .map((p) => ({
        name: sanitizePlainText(typeof p.name === "string" ? p.name.trim() : ""),
        inGameId: sanitizePlainText(typeof p.inGameId === "string" ? p.inGameId.trim() : ""),
        role: "MAIN" as const,
      }))
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
    subPlayers = (data.subPlayers as Array<{ name?: unknown; inGameId?: unknown }>)
      .map((p) => ({
        name: typeof p.name === "string" ? p.name.trim() : "",
        inGameId: typeof p.inGameId === "string" ? p.inGameId.trim() : "",
        role: "SUB" as const,
      }))
      .filter((p) => p.name.length > 0 && p.inGameId.length > 0);
  }

  const roster = [...mainPlayers, ...subPlayers];
  const legacyPlayerStrings = roster.map((p) => `${p.name} (${p.inGameId})`);

  try {
    const participant = await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({ where: { id } });
      if (!tournament || (tournament.status !== TournamentStatus.OPEN && tournament.status !== TournamentStatus.REGISTRATION)) {
        throw new Error("TOURNAMENT_CLOSED");
      }
      const count = await tx.participant.count({ where: { tournamentId: id } });
      if (count >= tournament.maxSlots) throw new Error("TOURNAMENT_FULL");

      const created = await tx.participant.create({
        data: {
          tournamentId: id,
          leaderId: user.id,
          teamName,
          phone: rawPhone,
          roster: roster as unknown as Prisma.InputJsonValue,
        },
      });

      // Update tournament teams array
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
      };

      // Replace placeholder or push
      let updatedTeams = [...existingTeams];
      const placeholderIdx = updatedTeams.findIndex((t) => t.teamName.startsWith("Tim ") && t.id.startsWith("team-"));
      if (placeholderIdx !== -1) {
        updatedTeams[placeholderIdx] = newTeamObj;
      } else {
        updatedTeams.push(newTeamObj);
      }

      // Also update slot in round 1 matches if still TBD / placeholder
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
        where: { tournamentId: id },
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

      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return Response.json(participant, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "TOURNAMENT_CLOSED") return jsonError("Pendaftaran turnamen sudah ditutup.", 409);
    if (error instanceof Error && error.message === "TOURNAMENT_FULL") return jsonError("Slot turnamen sudah penuh.", 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return jsonError("Party kamu sudah terdaftar di turnamen ini.", 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return jsonError("Pendaftaran berubah bersamaan. Coba lagi.", 409);
    throw error;
  }
}
