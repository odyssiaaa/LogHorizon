import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { addXpInTransaction } from "@/lib/xp";
import { createNotification } from "@/lib/notifications";
import { sanitizeText } from "@/lib/sanitize";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk berkomentar.", 401);
  const { id } = await params;
  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const rawContent = typeof data.content === "string" ? data.content.trim() : "";
  const content = sanitizeText(rawContent);
  const parentId = typeof data.parentId === "string" ? data.parentId : null;
  if (!content || content.length > 250000) return jsonError("Komentar wajib diisi (maksimal 250.000 karakter).", 400);

  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, title: true, authorId: true },
  });
  if (!post) return jsonError("Postingan tidak ditemukan.", 404);

  // Anti-spam check: Cooldown minimal 3 detik antar komentar dari user yang sama
  const lastComment = await prisma.comment.findFirst({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (lastComment) {
    const elapsedMs = Date.now() - new Date(lastComment.createdAt).getTime();
    if (elapsedMs < 3000) {
      return jsonError("Mohon tunggu sebentar sebelum mengirim komentar baru.", 429);
    }
  }

  if (parentId) {
    const parent = await prisma.comment.findFirst({ where: { id: parentId, postId: id }, select: { id: true } });
    if (!parent) return jsonError("Komentar yang dibalas tidak ditemukan.", 404);
  }

  // Berikan XP hanya jika jeda komentar >= 30 detik untuk mencegah XP farming
  const shouldAwardXp = !lastComment || (Date.now() - new Date(lastComment.createdAt).getTime() >= 30000);

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { postId: id, authorId: user.id, parentId, content },
      include: { author: { select: { id: true, username: true, avatar: true } } },
    });
    if (shouldAwardXp) {
      const commentCount = await tx.comment.count({ where: { authorId: user.id } });
      await addXpInTransaction(tx, user.id, 5, commentCount >= 25 ? "Guild Guide" : undefined);
    }
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  // Trigger notification if commenter is not post author
  if (post.authorId !== user.id) {
    void createNotification({
      userId: post.authorId,
      type: "REPLY",
      message: `${user.username ?? "Seorang petualang"} membalas thread "${post.title.slice(0, 45)}"`,
      link: `/forum/${post.id}`,
    });
  }

  return Response.json(comment, { status: 201 });
}
