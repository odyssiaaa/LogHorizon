import { authenticatedUser, jsonError } from "@/lib/http";
import { isMarketData } from "@/lib/market-data";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await authenticatedUser();
  if (!user) return jsonError("Login Discord diperlukan untuk melihat kontak penjual.", 401);

  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: { category: true, marketData: true },
  });
  if (!post || post.category !== "MARKETPLACE" || !isMarketData(post.marketData)) {
    return jsonError("Lapak tidak ditemukan.", 404);
  }
  return Response.json({ contact: post.marketData.contact });
}
