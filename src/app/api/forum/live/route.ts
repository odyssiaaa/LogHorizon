import { PostCategory } from "@prisma/client";
import { rawSql } from "@neon/realtime/server";
import { getRealtime } from "@/lib/realtime";
import { jsonError } from "@/lib/http";

type ForumLiveRow = { id: string };
const forumCategories = new Set<string>([PostCategory.GENERAL_CHAT, PostCategory.PROMOTION, PostCategory.FEEDBACK]);

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Permintaan live forum tidak valid.", 400);
  }

  const category = payload && typeof payload === "object" && "category" in payload ? payload.category : null;
  if (typeof category !== "string" || !forumCategories.has(category)) {
    return jsonError("Kategori forum tidak valid.", 400);
  }
  if (!process.env.NEON_REALTIME_SECRET || !process.env.NEON_REALTIME_URL) {
    return jsonError("Neon Realtime belum dikonfigurasi.", 503);
  }

  const query = rawSql<ForumLiveRow>(
    `SELECT "id" FROM "Post"
     WHERE "category" = $1::"PostCategory"
     ORDER BY "isPinned" DESC, "createdAt" DESC, "id" DESC`,
    [category],
  );
  const sealedQuery = await getRealtime().seal({ query });

  return Response.json(sealedQuery, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
