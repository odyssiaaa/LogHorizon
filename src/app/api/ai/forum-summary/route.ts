import { PostCategory } from "@prisma/client";
import { authenticatedUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type GatewayResponse = {
  choices?: { message?: { content?: unknown } }[];
  error?: { code?: unknown; message?: unknown; unavailable_reason?: unknown };
};

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

  const baseUrl = process.env.NEON_AI_GATEWAY_BASE_URL;
  const token = process.env.NEON_AI_GATEWAY_TOKEN;
  if (!baseUrl || !token) return jsonError("Neon AI Gateway belum dikonfigurasi.", 503);

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: "Ringkas thread komunitas gamer dalam bahasa Indonesia. Berikan 2-3 kalimat netral tanpa menambahkan informasi yang tidak ada.",
          },
          { role: "user", content: `Judul: ${post.title}\n\nIsi:\n${post.content}` },
        ],
        max_completion_tokens: 180,
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    console.error("[ai] Neon AI Gateway request failed", error);
    return jsonError("Neon AI Gateway tidak dapat dijangkau.", 502);
  }

  let result: GatewayResponse;
  try {
    result = (await response.json()) as GatewayResponse;
  } catch {
    return jsonError("Neon AI Gateway mengirim respons yang tidak valid.", 502);
  }

  if (!response.ok) {
    const unavailable = result.error?.unavailable_reason === "paid_plan_required" || result.error?.code === "paid_plan_required";
    if (response.status === 403 && unavailable) {
      return jsonError("Ringkasan AI belum tersedia. Tambahkan kredit AI Gateway pada Neon untuk mengaktifkan model.", 503);
    }
    console.error("[ai] Neon AI Gateway returned an error", response.status);
    return jsonError(`Neon AI Gateway menolak permintaan (HTTP ${response.status}).`, 502);
  }

  const summary = result.choices?.[0]?.message?.content;
  if (typeof summary !== "string" || !summary.trim()) {
    return jsonError("Neon AI Gateway tidak mengembalikan ringkasan.", 502);
  }
  return Response.json({ summary: summary.trim() }, { headers: { "Cache-Control": "no-store" } });
}
