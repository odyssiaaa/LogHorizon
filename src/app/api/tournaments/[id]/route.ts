import { Prisma, TournamentStatus } from "@prisma/client";
import { jsonError, requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { advanceMatchWinner, generateTemplateBracket, TournamentMatch, TournamentTeam } from "@/lib/tournament";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
  });
  if (!tournament) return jsonError("Turnamen tidak ditemukan.", 404);
  return Response.json({ success: true, tournament });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await requireStaff(["ADMIN", "MODERATOR"]);
  if (access.response) return access.response;

  const { id } = await params;
  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) return jsonError("Turnamen tidak ditemukan.", 404);

  let updatedMatches = (tournament.matches as unknown as TournamentMatch[]) || [];
  let updatedTeams = (tournament.teams as unknown as TournamentTeam[]) || [];

  // Update teams list if provided
  if (Array.isArray(data.teams)) {
    updatedTeams = data.teams as TournamentTeam[];
  }

  // Update a single match or whole matches list
  if (Array.isArray(data.matches)) {
    updatedMatches = data.matches as TournamentMatch[];
  } else if (typeof data.matchId === "string" && data.winner !== undefined) {
    // Admin updated a specific match score / winner
    const matchId = data.matchId;
    const winnerName = typeof data.winner === "string" ? data.winner : "";
    const winnerId = typeof data.winnerId === "string" ? data.winnerId : undefined;
    const scoreA = typeof data.scoreA === "number" ? data.scoreA : undefined;
    const scoreB = typeof data.scoreB === "number" ? data.scoreB : undefined;

    updatedMatches = advanceMatchWinner(updatedMatches, matchId, winnerName, winnerId, scoreA, scoreB);
  }

  // Slot resizing & regeneration
  let nextMaxSlots = tournament.maxSlots;
  let nextFormat = tournament.format;
  if (typeof data.teamCount === "number" || typeof data.maxSlots === "number") {
    const rawCount = typeof data.teamCount === "number" ? data.teamCount : (data.maxSlots as number);
    const newTeamCount = Math.min(128, Math.max(2, rawCount));
    nextMaxSlots = newTeamCount;
    nextFormat = `${newTeamCount} Tim`;

    if (data.regenerateBracket === true) {
      // Regenerate template bracket while preserving existing teams
      const template = generateTemplateBracket(newTeamCount, updatedTeams);
      updatedTeams = template.teams;
      updatedMatches = template.matches;
    }
  } else if (typeof data.format === "string") {
    nextFormat = data.format;
  }

  // Optional status update
  let nextStatus: TournamentStatus | undefined = undefined;
  if (typeof data.status === "string") {
    if (Object.values(TournamentStatus).includes(data.status as TournamentStatus)) {
      nextStatus = data.status as TournamentStatus;
    }
  }

  const updated = await prisma.tournament.update({
    where: { id },
    data: {
      ...(typeof data.title === "string" ? { title: data.title.trim() } : {}),
      ...(typeof data.game === "string" ? { game: data.game.trim() } : {}),
      ...(typeof data.prizePool === "string" ? { prizePool: data.prizePool.trim() } : {}),
      ...(typeof data.mainPlayersCount === "number" ? { mainPlayersCount: Math.max(1, Math.min(10, data.mainPlayersCount)) } : {}),
      ...(typeof data.subPlayersCount === "number" ? { subPlayersCount: Math.max(0, Math.min(5, data.subPlayersCount)) } : {}),
      ...(nextMaxSlots !== tournament.maxSlots ? { maxSlots: nextMaxSlots } : {}),
      ...(nextFormat !== tournament.format ? { format: nextFormat } : {}),
      ...(nextStatus ? { status: nextStatus } : {}),
      teams: updatedTeams as unknown as Prisma.InputJsonValue,
      matches: updatedMatches as unknown as Prisma.InputJsonValue,
    },
  });

  return Response.json({
    success: true,
    tournament: {
      ...updated,
      teams: updatedTeams,
      matches: updatedMatches,
    },
    message: "Bagan dan tim turnamen berhasil diperbarui.",
  });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const access = await requireStaff(["ADMIN", "MODERATOR"]);
  if (access.response) return access.response;

  const { id } = await params;
  const existing = await prisma.tournament.findUnique({ where: { id } });
  if (!existing) return jsonError("Turnamen tidak ditemukan.", 404);

  await prisma.tournament.delete({ where: { id } });
  return Response.json({ success: true, message: "Turnamen berhasil dihapus." });
}
