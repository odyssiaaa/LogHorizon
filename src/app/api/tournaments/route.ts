import { TournamentStatus } from "@prisma/client";
import { jsonError, requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
    include: {
      participants: {
        orderBy: { createdAt: "asc" },
        include: { leader: { select: { id: true, username: true } } },
      },
    },
  });
  return Response.json(tournaments.map((tournament) => ({
    ...tournament,
    participants: tournament.participants.map((participant) => ({
      id: participant.id,
      teamName: participant.teamName,
      leader: { username: participant.leader.username },
    })),
    bracket: tournament.bracket,
  })));
}

export async function POST(request: Request) {
  const access = await requireStaff(["ADMIN", "MODERATOR"]);
  if (access.response) return access.response;

  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const game = typeof data.game === "string" ? data.game.trim() : "";
  const maxSlots = data.maxSlots;
  const eventDate = typeof data.eventDate === "string" ? new Date(data.eventDate) : new Date(Number.NaN);
  if (!game || game.length > 80 || typeof maxSlots !== "number" || !Number.isInteger(maxSlots) || maxSlots < 2 || maxSlots > 64 || Number.isNaN(eventDate.getTime()) || eventDate <= new Date()) {
    return jsonError("Game, tanggal mendatang, dan slot turnamen tidak valid.", 400);
  }

  const tournament = await prisma.tournament.create({
    data: { game, maxSlots: Number(maxSlots), eventDate, status: TournamentStatus.OPEN },
  });
  return Response.json(tournament, { status: 201 });
}
