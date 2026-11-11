import { VoteType } from "@prisma/client";
import { authenticatedUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await authenticatedUser();
  if (!user) return jsonError("Login diperlukan untuk memberi reaksi.", 401);
  const { id } = await params;
  const payload: unknown = await request.json();
  const value = payload && typeof payload === "object" ? (payload as Record<string, unknown>).value : null;
  if (value !== VoteType.LIKE && value !== VoteType.DISLIKE) return jsonError("Tipe reaksi tidak valid.", 400);

  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, title: true, authorId: true },
  });
  if (!post) return jsonError("Thread tidak ditemukan.", 404);

  const result = await prisma.$transaction(async (tx) => {
    const lockedPosts = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Post" WHERE "id" = ${id} FOR UPDATE`;
    if (!lockedPosts.length) return null;
    const existing = await tx.postVote.findUnique({ where: { postId_userId: { postId: id, userId: user.id } } });
    const isNewLike = !existing && value === VoteType.LIKE;
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
      isNewLike,
    };
  });

  if (result?.isNewLike && post.authorId !== user.id) {
    void createNotification({
      userId: post.authorId,
      type: "LIKE",
      message: `${user.username ?? "Petualang"} menyukai thread kamu: "${post.title.slice(0, 45)}"`,
      link: `/forum/${post.id}`,
    });
  }

  return result ? Response.json({ likes: result.likes, dislikes: result.dislikes, reaction: result.reaction }) : jsonError("Thread tidak ditemukan.", 404);
}
