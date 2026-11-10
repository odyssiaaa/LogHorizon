import { PostCategory } from "@prisma/client";
import { rawSql } from "@neon/realtime/server";
import { jsonError } from "@/lib/http";
import { getRealtime } from "@/lib/realtime";

type MarketplaceLiveRow = { id: string; status: string | null };

export async function POST() {
  if (!process.env.NEON_REALTIME_SECRET || !process.env.NEON_REALTIME_URL) {
    return jsonError("Neon Realtime belum dikonfigurasi.", 503);
  }
  const query = rawSql<MarketplaceLiveRow>(
    `SELECT "id", "marketData"->>'status' AS "status" FROM "Post"
     WHERE "category" = $1::"PostCategory"
     ORDER BY "isPinned" DESC, "createdAt" DESC, "id" DESC`,
    [PostCategory.MARKETPLACE],
  );
  const sealedQuery = await getRealtime().seal({ query });
  return Response.json(sealedQuery, { headers: { "Cache-Control": "private, no-store" } });
}
