import { activeUser, authenticatedUser, jsonError } from "@/lib/http";
import { isMarketData, marketJson } from "@/lib/market-data";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const viewer = await authenticatedUser().catch(() => null);
    const { id } = await params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, username: true, avatar: true, role: true, isPremium: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, username: true, avatar: true, isPremium: true } } },
        },
        votes: { where: { userId: viewer?.id ?? "" }, select: { value: true } },
      },
    });
    if (!post || post.category === "MARKETPLACE") return jsonError("Thread tidak ditemukan.", 404);
    return Response.json(post);
  } catch (error) {
    console.error("[api/posts/[id]] Failed to load thread:", error);
    return jsonError("Gagal memuat thread dari database.", 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan.", 401);
  const { id } = await params;
  const payload: unknown = await request.json();
  const status = payload && typeof payload === "object" ? (payload as Record<string, unknown>).status : undefined;
  if (status !== "SOLD" && status !== "AVAILABLE") {
    return jsonError("Status yang diminta tidak valid.", 400);
  }
  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true, category: true, marketData: true } });
  if (!post) return jsonError("Lapak tidak ditemukan.", 404);
  if (post.category !== "MARKETPLACE") return jsonError("Postingan ini bukan lapak marketplace.", 400);
  if (post.authorId !== user.id && user.role !== "ADMIN" && user.role !== "MODERATOR") return jsonError("Hanya pemilik lapak atau moderator yang dapat mengelola transaksi.", 403);
  if (!isMarketData(post.marketData)) return jsonError("Data lapak tidak valid.", 400);
  if (status === "SOLD") {
    const activeEscrow = await prisma.escrowTransaction.findFirst({ where: { postId: id, status: "IN_ESCROW" }, select: { id: true } });
    if (activeEscrow) return jsonError("Selesaikan transaksi escrow aktif sebelum mengubah status lapak.", 409);
  }
  const updated = await prisma.post.update({
    where: { id },
    data: { marketData: marketJson({ ...post.marketData, status }) },
    select: { id: true, marketData: true },
  });
  return Response.json(updated);
}
