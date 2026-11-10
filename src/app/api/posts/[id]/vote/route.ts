import { VoteType } from "@prisma/client";
import { authenticatedUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await authenticatedUser();
  if (!user) return jsonError("Login diperlukan untuk memberi reaksi.", 401);
  const { id } = await params;
  const payload: unknown = await request.json();
  const value = payload && typeof payload === "object" ? (payload as Record<string, unknown>).value : null;
  if (value !== VoteType.LIKE && value !== VoteType.DISLIKE) return jsonError("Tipe reaksi tidak valid.", 400);

  const result = await prisma.$transaction(async (tx) => {
    const lockedPosts = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Post" WHERE "id" = ${id} FOR UPDATE`;
    if (!lockedPosts.length) return null;
    const existing = await tx.postVote.findUnique({ where: { postId_userId: { postId: id, userId: user.id } } });
    if (existing?.value === value) {
      await tx.postVote.delete({ where: { id: existing.id } });
    } else if (existing) {
      await tx.postVote.update({ where: { id: existing.id }, data: { value } });
    } else {
      await tx.postVote.create({ data: { postId: id, userId: user.id, value } });
    }

    const [likes, dislikes] = await Promise.all([
      tx.postVote.count({ where: { postId: id, value: VoteType.LIKE } }),
      tx.postVote.count({ where: { postId: id, value: VoteType.DISLIKE } }),
    ]);
    const updated = await tx.post.update({
      where: { id },
      data: { likes, dislikes },
      select: { likes: true, dislikes: true },
    });
    return {
      likes: updated.likes,
      dislikes: updated.dislikes,
      reaction: existing?.value === value ? null : value,
    };
  });
  return result ? Response.json(result) : jsonError("Thread tidak ditemukan.", 404);
}
