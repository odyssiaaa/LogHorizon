import { authenticatedUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, username: true, avatar: true, role: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, username: true, avatar: true } } },
      },
    },
  });
  if (!post || post.category === "MARKETPLACE") return jsonError("Thread tidak ditemukan.", 404);
  return Response.json(post);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await authenticatedUser();
  if (!user) return jsonError("Login diperlukan.", 401);
  const { id } = await params;
  const payload: unknown = await request.json();
  if (!payload || typeof payload !== "object" || (payload as Record<string, unknown>).status !== "SOLD") {
    return jsonError("Status yang diminta tidak valid.", 400);
  }
  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true, category: true } });
  if (!post) return jsonError("Lapak tidak ditemukan.", 404);
  if (post.category !== "MARKETPLACE") return jsonError("Postingan ini bukan lapak marketplace.", 400);
  if (post.authorId !== user.id && user.role !== "ADMIN" && user.role !== "MODERATOR") return jsonError("Hanya pemilik lapak atau moderator yang dapat mengelola transaksi.", 403);
  return jsonError("Status SOLD harus dikonfirmasi melalui transaksi escrow aktif.", 409);
}
