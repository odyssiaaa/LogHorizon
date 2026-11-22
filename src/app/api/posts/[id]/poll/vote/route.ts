import { Prisma } from "@prisma/client";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk memberikan suara.", 401);

  const { id: postId } = await params;
  const body = await request.json().catch(() => ({}));
  const { optionId } = body;

  if (!optionId || typeof optionId !== "string") {
    return jsonError("Pilihan polling tidak valid.", 400);
  }

  // Find poll for this post
  const poll = await prisma.poll.findUnique({
    where: { postId },
    include: {
      options: {
        select: { id: true, text: true, order: true },
      },
    },
  });

  if (!poll) {
    return jsonError("Polling tidak ditemukan pada postingan ini.", 404);
  }

  const optionExists = poll.options.some((o) => o.id === optionId);
  if (!optionExists) {
    return jsonError("Opsi jawaban tidak ditemukan.", 404);
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        // Enforce strictly 1 vote per user per poll
        const existingVote = await tx.pollVote.findUnique({
          where: {
            pollId_userId: {
              pollId: poll.id,
              userId: user.id,
            },
          },
        });

        if (existingVote) {
          throw new Error("Kamu sudah memberikan suara pada polling ini (suara terkunci 1x).");
        }

        await tx.pollVote.create({
          data: {
            pollId: poll.id,
            optionId,
            userId: user.id,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    // Fetch updated poll state
    const updatedOptions = await prisma.pollOption.findMany({
      where: { pollId: poll.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        text: true,
        order: true,
        _count: { select: { votes: true } },
      },
    });

    const totalVotes = updatedOptions.reduce((sum, opt) => sum + opt._count.votes, 0);

    return Response.json({
      success: true,
      message: "Suara berhasil dicatat!",
      poll: {
        id: poll.id,
        question: poll.question,
        userVotedOptionId: optionId,
        totalVotes,
        options: updatedOptions.map((opt) => ({
          id: opt.id,
          text: opt.text,
          order: opt.order,
          votesCount: opt._count.votes,
          percentage: totalVotes > 0 ? Math.round((opt._count.votes / totalVotes) * 100) : 0,
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memberikan suara.";
    return jsonError(message, 400);
  }
}
