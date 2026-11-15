import { TournamentStatus, Prisma } from "@prisma/client";
import { authenticatedUser, jsonError, requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { generateTemplateBracket, TournamentTeam, TournamentMatch } from "@/lib/tournament";
import { sanitizePlainText } from "@/lib/sanitize";

export async function GET() {
  const viewer = await authenticatedUser().catch(() => null);
  const isStaff = viewer?.role === "ADMIN" || viewer?.role === "MODERATOR";

  const tournaments = await prisma.tournament.findMany({
    orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
    include: {
      participants: {
        orderBy: { createdAt: "asc" },
        include: {
          leader: {
            select: { id: true, username: true, discordId: true, name: true, image: true },
          },
        },
      },
    },
  });

  return Response.json(tournaments.map((tournament) => {
    const rawTeams = (tournament.teams as unknown as TournamentTeam[]) || [];
    // Sanitize team representative phone numbers for non-staff
    const sanitizedTeams = isStaff
      ? rawTeams
      : rawTeams.map((team) => ({
          ...team,
          representativePhone: undefined,
        }));

    return {
      ...tournament,
      mainPlayersCount: tournament.mainPlayersCount ?? 5,
      subPlayersCount: tournament.subPlayersCount ?? 2,
      participants: tournament.participants.map((participant) => ({
        id: participant.id,
        teamName: participant.teamName,
        phone: isStaff || (viewer && viewer.id === participant.leader.id) ? participant.phone ?? null : null,
        roster: participant.roster ?? [],
        leader: {
          id: participant.leader.id,
          username: participant.leader.username,
          discordId: participant.leader.discordId ?? null,
          name: participant.leader.name,
        },
      })),
      bracket: tournament.bracket,
      teams: sanitizedTeams,
      matches: (tournament.matches as unknown as TournamentMatch[]) || [],
    };
  }));
}

export async function POST(request: Request) {
  const access = await requireStaff(["ADMIN", "MODERATOR"]);
  if (access.response) return access.response;

  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const title = sanitizePlainText(typeof data.title === "string" && data.title.trim() ? data.title.trim() : "LogHorizon Tournament Cup");
  const game = sanitizePlainText(typeof data.game === "string" ? data.game.trim() : "");
  const prizePool = sanitizePlainText(typeof data.prizePool === "string" && data.prizePool.trim() ? data.prizePool.trim() : "Prizepool Komunitas");

  let teamCount = typeof data.teamCount === "number" ? data.teamCount : parseInt(String(data.format || "8").replace(/\D/g, ""), 10);
  if (isNaN(teamCount) || teamCount < 2) teamCount = 8;
  if (teamCount > 128) teamCount = 128;
  const format = `${teamCount} Tim`;
  const maxSlots = teamCount;

  const mainPlayersCount = typeof data.mainPlayersCount === "number" ? Math.max(1, Math.min(10, data.mainPlayersCount)) : 5;
  const subPlayersCount = typeof data.subPlayersCount === "number" ? Math.max(0, Math.min(5, data.subPlayersCount)) : 2;

  const eventDate = typeof data.eventDate === "string" ? new Date(data.eventDate) : new Date(Date.now() + 86400000 * 3);
  if (!game || game.length > 80 || Number.isNaN(eventDate.getTime())) {
    return jsonError("Nama game dan tanggal turnamen wajib diisi.", 400);
  }

  const rawTeams = Array.isArray(data.teams) ? (data.teams as TournamentTeam[]) : [];
  const rawMatches = Array.isArray(data.matches) ? (data.matches as TournamentMatch[]) : [];

  // Generate template bracket if not supplied
  const template = (rawTeams.length > 0 && rawMatches.length > 0)
    ? { teams: rawTeams, matches: rawMatches }
    : generateTemplateBracket(teamCount, rawTeams);

  const status = data.status === "REGISTRATION"
    ? TournamentStatus.REGISTRATION
    : data.status === "ONGOING"
      ? TournamentStatus.ONGOING
      : data.status === "COMPLETED"
        ? TournamentStatus.COMPLETED
        : TournamentStatus.OPEN;

  const tournament = await prisma.tournament.create({
    data: {
      title,
      game,
      prizePool,
      format,
      maxSlots,
      mainPlayersCount,
      subPlayersCount,
      eventDate,
      status,
      teams: template.teams as unknown as Prisma.InputJsonValue,
      matches: template.matches as unknown as Prisma.InputJsonValue,
    },
  });

  return Response.json(tournament, { status: 201 });
}
