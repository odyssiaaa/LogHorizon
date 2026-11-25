import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await activeUser();
    if (!user) return jsonError("Login diperlukan.", 401);

    const transactions = await prisma.coinTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return Response.json({
      success: true,
      balance: user.horizonCoins ?? 0,
      transactions,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Gagal memuat riwayat transaksi Horizon Coin.",
      500
    );
  }
}
