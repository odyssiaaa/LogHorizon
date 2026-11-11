import { EscrowStatus, Prisma } from "@prisma/client";
import { activeUser, jsonError } from "@/lib/http";
import { isMarketData, marketJson } from "@/lib/market-data";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const buyer = await activeUser();
  if (!buyer) return jsonError("Login diperlukan untuk memulai transaksi.", 401);
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({ where: { id } });
      if (!post || post.category !== "MARKETPLACE" || !isMarketData(post.marketData)) throw new Error("LISTING_NOT_FOUND");
      if (post.authorId === buyer.id) throw new Error("SELF_PURCHASE");
      if (post.marketData.type !== "WTS" || post.marketData.status !== "AVAILABLE") throw new Error("LISTING_UNAVAILABLE");
      const updatedData = { ...post.marketData, status: "IN_ESCROW" as const };
      await tx.post.update({ where: { id }, data: { marketData: marketJson(updatedData) } });
      const transaction = await tx.escrowTransaction.create({
        data: { postId: id, buyerId: buyer.id, sellerId: post.authorId, amount: post.marketData.price, status: EscrowStatus.IN_ESCROW },
      });
      return { transaction, marketData: updatedData, sellerId: post.authorId, postTitle: post.title };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    // Notify seller
    void createNotification({
      userId: result.sellerId,
      type: "ESCROW",
      message: `${buyer.username ?? "Seorang pembeli"} mengajukan transaksi escrow untuk lapak "${result.postTitle.slice(0, 40)}"`,
      link: `/marketplace`,
    });

    return Response.json({
      transaction: result.transaction,
      marketData: result.marketData,
      notice: "Transaksi escrow berhasil dicatat. Transaksi dipantau oleh sistem keamanan guild.",
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "LISTING_NOT_FOUND") return jsonError("Lapak tidak ditemukan atau datanya tidak valid.", 404);
    if (error instanceof Error && error.message === "SELF_PURCHASE") return jsonError("Pemilik lapak tidak dapat membeli lapaknya sendiri.", 400);
    if (error instanceof Error && error.message === "LISTING_UNAVAILABLE") return jsonError("Lapak bukan WTS atau sudah tidak tersedia.", 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return jsonError("Lapak sedang diproses oleh transaksi lain. Coba lagi.", 409);
    throw error;
  }
}
