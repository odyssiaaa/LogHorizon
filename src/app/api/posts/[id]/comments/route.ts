import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { addXpInTransaction } from "@/lib/xp";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk berkomentar.", 401);
  const { id } = await params;
  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const content = typeof data.content === "string" ? data.content.trim() : "";
  const parentId = typeof data.parentId === "string" ? data.parentId : null;
  if (!content || content.length > 5000) return jsonError("Komentar wajib diisi (maksimal 5.000 karakter).", 400);
  if (parentId) {
    const parent = await prisma.comment.findFirst({ where: { id: parentId, postId: id }, select: { id: true } });
    if (!parent) return jsonError("Komentar yang dibalas tidak ditemukan.", 404);
  }
  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { postId: id, authorId: user.id, parentId, content },
      include: { author: { select: { id: true, username: true, avatar: true } } },
    });
    const commentCount = await tx.comment.count({ where: { authorId: user.id } });
    await addXpInTransaction(tx, user.id, 5, commentCount >= 25 ? "Guild Guide" : undefined);
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return Response.json(comment, { status: 201 });
}
