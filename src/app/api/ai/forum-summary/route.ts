import { PostCategory } from "@prisma/client";
import { authenticatedUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const GEMINI_ENDPOINT_PRIMARY = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
const GEMINI_ENDPOINT_FALLBACK = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
  error?: {
    code?: number;
    message?: string;
  };
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

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return jsonError("Google Gemini API (GEMINI_API_KEY) belum dikonfigurasi.", 503);
  }

  const endpoints = [GEMINI_ENDPOINT_PRIMARY, GEMINI_ENDPOINT_FALLBACK];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: "Ringkas thread komunitas gamer dalam bahasa Indonesia. Berikan 2-3 kalimat netral, padat, dan informatif tanpa menambahkan asumsi yang tidak ada di teks." }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: `Judul: ${post.title}\n\nIsi:\n${post.content}` }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.5,
          },
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (response.ok) {
        const data = (await response.json()) as GeminiResponse;
        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof summary === "string" && summary.trim()) {
          return Response.json({ summary: summary.trim() }, { headers: { "Cache-Control": "no-store" } });
        }
      } else {
        const errText = await response.text();
        console.error(`[gemini-summary] HTTP ${response.status} from ${endpoint}:`, errText);
      }
    } catch (err) {
      console.warn(`[gemini-summary] Connection error with ${endpoint}:`, err);
    }
  }

  return jsonError("Layanan ringkasan AI sedang tidak dapat dijangkau. Coba lagi nanti.", 502);
}
