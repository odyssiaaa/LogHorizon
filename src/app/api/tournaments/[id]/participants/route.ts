import { Prisma, TournamentStatus } from "@prisma/client";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createSingleEliminationBracket, TournamentTeam, TournamentMatch } from "@/lib/tournament";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk mendaftar ke turnamen.", 401);
  const { id } = await params;
  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const teamName = typeof data.teamName === "string" ? data.teamName.trim() : "";
  const playersRaw = Array.isArray(data.players) ? data.players.filter((p): p is string => typeof p === "string" && p.trim().length > 0) : [];
  const players = playersRaw.length > 0 ? playersRaw : [user.username ?? "Kapten Party", "Player 2", "Player 3", "Player 4", "Player 5"];

  if (!teamName || teamName.length > 64) return jsonError("Nama party wajib diisi (maksimal 64 karakter).", 400);

  try {
    const participant = await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({ where: { id } });
      if (!tournament || (tournament.status !== TournamentStatus.OPEN && tournament.status !== TournamentStatus.REGISTRATION)) {
        throw new Error("TOURNAMENT_CLOSED");
      }
      const count = await tx.participant.count({ where: { tournamentId: id } });
      if (count >= tournament.maxSlots) throw new Error("TOURNAMENT_FULL");

      const created = await tx.participant.create({
        data: { tournamentId: id, leaderId: user.id, teamName },
      });

      // Update tournament teams array
      const existingTeams = (tournament.teams as unknown as TournamentTeam[]) || [];
      const newTeamObj: TournamentTeam = {
        id: created.id,
        teamName,
        captainName: user.username ?? "Kapten Party",
        players,
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
