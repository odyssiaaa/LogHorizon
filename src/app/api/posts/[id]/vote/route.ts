import { VoteType } from "@prisma/client";
import { authenticatedUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await authenticatedUser();
  if (!user) return jsonError("Login diperlukan untuk memberi vote.", 401);
  const { id } = await params;
  const payload: unknown = await request.json();
  const value = payload && typeof payload === "object" ? (payload as Record<string, unknown>).value : null;
  if (value !== VoteType.UP && value !== VoteType.DOWN) return jsonError("Tipe vote tidak valid.", 400);

  const result = await prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({ where: { id } });
    if (!post) return null;
    const existing = await tx.postVote.findUnique({ where: { postId_userId: { postId: id, userId: user.id } } });
    if (existing?.value === value) {
      await tx.postVote.delete({ where: { id: existing.id } });
      const updated = await tx.post.update({
        where: { id },
        data: {
          ...(value === VoteType.UP ? { upvotes: { decrement: 1 } } : { downvotes: { decrement: 1 } }),
        },
      });
      return { upvotes: updated.upvotes, downvotes: updated.downvotes, vote: null };
    }

    const upvoteDelta = (value === VoteType.UP ? 1 : 0) - (existing?.value === VoteType.UP ? 1 : 0);
    const downvoteDelta = (value === VoteType.DOWN ? 1 : 0) - (existing?.value === VoteType.DOWN ? 1 : 0);
    if (existing) {
      await tx.postVote.update({ where: { id: existing.id }, data: { value } });
    } else {
      await tx.postVote.create({ data: { postId: id, userId: user.id, value } });
    }
    const updated = await tx.post.update({
      where: { id },
      data: {
        ...(upvoteDelta ? { upvotes: { increment: upvoteDelta } } : {}),
        ...(downvoteDelta ? { downvotes: { increment: downvoteDelta } } : {}),
      },
    });
    return { upvotes: updated.upvotes, downvotes: updated.downvotes, vote: value };
  });
  return result ? Response.json(result) : jsonError("Thread tidak ditemukan.", 404);
}
