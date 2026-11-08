import { parseEnv } from "@neon/env";
import OpenAI from "openai";
import { PostCategory } from "@prisma/client";
import { authenticatedUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import neonConfig from "../../../../../neon";

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user) return jsonError("Login Discord diperlukan untuk menggunakan ringkasan AI.", 401);
  if (user.isBanned) return jsonError("Akun kamu sedang dibatasi dan tidak dapat menggunakan fitur AI.", 403);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Permintaan ringkasan tidak valid.", 400);
  }

  const postId = payload && typeof payload === "object" && "postId" in payload ? payload.postId : null;
  if (typeof postId !== "string" || postId.length > 32) return jsonError("Thread tidak valid.", 400);

  const post = await prisma.post.findFirst({
    where: { id: postId, category: { not: PostCategory.MARKETPLACE } },
    select: { title: true, content: true },
  });
  if (!post) return jsonError("Thread tidak ditemukan.", 404);

  if (!process.env.NEON_AI_GATEWAY_TOKEN || !process.env.NEON_AI_GATEWAY_BASE_URL) {
    return jsonError("Neon AI Gateway belum dikonfigurasi.", 503);
  }

  const env = parseEnv(neonConfig, ["NEON_AI_GATEWAY_TOKEN", "NEON_AI_GATEWAY_BASE_URL"]);
  const client = new OpenAI({
    apiKey: env.aiGateway.apiKey,
    baseURL: `${env.aiGateway.baseUrl}/v1`,
  });

  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await client.chat.completions.create(
      {
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: "Ringkas thread komunitas gamer dalam bahasa Indonesia. Berikan 2-3 kalimat netral tanpa menambahkan informasi yang tidak ada.",
          },
          { role: "user", content: `Judul: ${post.title}\n\nIsi:\n${post.content}` },
        ],
        max_completion_tokens: 180,
      },
      { timeout: 20_000 },
    );
  } catch (error) {
    console.error("[ai] Neon AI Gateway request failed", error);

    if (error instanceof OpenAI.APIError) {
      const errorBody = error.error;
      const unavailable =
        error.code === "paid_plan_required" ||
        (typeof errorBody === "object" &&
          errorBody !== null &&
          "unavailable_reason" in errorBody &&
          errorBody.unavailable_reason === "paid_plan_required");
      if (error.status === 403 && unavailable) {
        return jsonError("Ringkasan AI belum tersedia. Tambahkan kredit AI Gateway pada Neon untuk mengaktifkan model.", 503);
      }
      return jsonError(`Neon AI Gateway menolak permintaan (HTTP ${error.status ?? "unknown"}).`, 502);
    }

    return jsonError("Neon AI Gateway tidak dapat dijangkau.", 502);
  }

  const summary = completion.choices[0]?.message?.content;
  if (typeof summary !== "string" || !summary.trim()) {
    return jsonError("Neon AI Gateway tidak mengembalikan ringkasan.", 502);
  }
  return Response.json({ summary: summary.trim() }, { headers: { "Cache-Control": "no-store" } });
}
