import { EscrowStatus, Prisma } from "@prisma/client";
import type { EscrowTransaction } from "@prisma/client";
import { activeUser, jsonError } from "@/lib/http";
import { isMarketData, marketJson } from "@/lib/market-data";
import { prisma } from "@/lib/prisma";
import { addXpInTransaction } from "@/lib/xp";
import { createNotification } from "@/lib/notifications";

type RouteContext = { params: Promise<{ id: string }> };
type CompletionResult =
  | { error: "TRANSACTION_NOT_ACTIVE" | "FORBIDDEN" | "INVALID_LISTING" }
  | { transaction: EscrowTransaction; sellerId: string; buyerId: string; postTitle: string };

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk mengonfirmasi transaksi.", 401);
  const payload: unknown = await request.json();
  if (!payload || typeof payload !== "object" || (payload as Record<string, unknown>).action !== "complete") {
    return jsonError("Aksi escrow tidak valid.", 400);
  }
  const { id } = await params;
  let result: CompletionResult;
  try {
    result = await prisma.$transaction(async (tx) => {
    const escrow = await tx.escrowTransaction.findUnique({ where: { id }, include: { post: true } });
    if (!escrow || escrow.status !== EscrowStatus.IN_ESCROW) return { error: "TRANSACTION_NOT_ACTIVE" as const };
    const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";
    if (user.id !== escrow.sellerId && !isStaff) return { error: "FORBIDDEN" as const };
    if (!isMarketData(escrow.post.marketData)) return { error: "INVALID_LISTING" as const };
    const data = { ...escrow.post.marketData, status: "SOLD" as const };
    await tx.post.update({ where: { id: escrow.postId }, data: { marketData: marketJson(data) } });
    const updated = await tx.escrowTransaction.update({
      where: { id },
      data: { status: EscrowStatus.COMPLETED, completedAt: new Date() },
    });
    await addXpInTransaction(tx, escrow.sellerId, 50, "Top Trader");
    return { transaction: updated, sellerId: escrow.sellerId, buyerId: escrow.buyerId, postTitle: escrow.post.title };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return jsonError("Transaksi berubah bersamaan. Muat ulang dan coba lagi.", 409);
    throw error;
  }
  if ("error" in result) {
    if (result.error === "TRANSACTION_NOT_ACTIVE") return jsonError("Transaksi escrow tidak aktif.", 404);
    if (result.error === "FORBIDDEN") return jsonError("Hanya penjual atau moderator yang dapat mengonfirmasi transaksi.", 403);
    return jsonError("Data lapak tidak valid.", 422);
  }

  // Notify buyer of completion
  void createNotification({
    userId: result.buyerId,
    type: "ESCROW",
    message: `Transaksi lapak "${result.postTitle.slice(0, 40)}" telah diselesaikan! Terima kasih telah bertransaksi aman.`,
    link: `/marketplace`,
  });

  return Response.json({ transaction: result.transaction, notice: "Transaksi berhasil diselesaikan! Lapak ditandai SOLD dan reputasi transaksi berhasil dicatat." });
}
