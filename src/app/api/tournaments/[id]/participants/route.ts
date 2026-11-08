import { Prisma, TournamentStatus } from "@prisma/client";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createSingleEliminationBracket } from "@/lib/tournament";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk mendaftar ke turnamen.", 401);
  const { id } = await params;
  const payload: unknown = await request.json();
  const teamName = payload && typeof payload === "object" && typeof (payload as Record<string, unknown>).teamName === "string"
    ? ((payload as Record<string, unknown>).teamName as string).trim()
    : "";
  if (!teamName || teamName.length > 64) return jsonError("Nama party wajib diisi (maksimal 64 karakter).", 400);

  try {
    const participant = await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({ where: { id } });
      if (!tournament || tournament.status !== TournamentStatus.OPEN) throw new Error("TOURNAMENT_CLOSED");
      const count = await tx.participant.count({ where: { tournamentId: id } });
      if (count >= tournament.maxSlots) throw new Error("TOURNAMENT_FULL");
      const created = await tx.participant.create({ data: { tournamentId: id, leaderId: user.id, teamName } });
      const participants = await tx.participant.findMany({
        where: { tournamentId: id },
        orderBy: { createdAt: "asc" },
        select: { id: true, teamName: true },
      });
      if (participants.length >= tournament.maxSlots) {
        const bracket = createSingleEliminationBracket(participants.map((entry) => ({ participantId: entry.id, teamName: entry.teamName })));
        await tx.tournament.update({
          where: { id },
          data: { status: TournamentStatus.FULL, bracket: bracket as Prisma.InputJsonValue },
        });
      }
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return Response.json(participant, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "TOURNAMENT_CLOSED") return jsonError("Turnamen sudah ditutup.", 409);
    if (error instanceof Error && error.message === "TOURNAMENT_FULL") return jsonError("Slot turnamen sudah penuh.", 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return jsonError("Party kamu sudah terdaftar.", 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return jsonError("Pendaftaran berubah bersamaan. Coba lagi.", 409);
    throw error;
  }
}
