import { authenticatedUser, jsonError } from "@/lib/http";

const HF_ROUTER_PRIMARY = "https://router.huggingface.co/hf-inference/v1/chat/completions";
const HF_ROUTER_FALLBACK = "https://router.huggingface.co/v1/chat/completions";
const MODEL_PRIMARY = "Qwen/Qwen2.5-7B-Instruct";
const MODEL_FALLBACK = "meta-llama/Meta-Llama-3-8B-Instruct";
const COOLDOWN_MS = 2_500;
const MAX_INPUT_LENGTH = 300;
const MAX_HISTORY_MESSAGES = 10;
const MAX_BODY_BYTES = 16_384;

type ChatMessage = { role: "user" | "assistant"; content: string };
type HuggingFaceResponse = {
  choices?: { message?: { content?: unknown } }[];
  error?: string | { message?: string };
};

const lastRequestAt = new Map<string, number>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  const history: ChatMessage[] = [];
  let totalLength = 0;

  for (const item of value) {
    if (!isRecord(item) || (item.role !== "user" && item.role !== "assistant") || typeof item.content !== "string") {
      continue;
    }

    const maxLength = item.role === "user" ? MAX_INPUT_LENGTH : 1_500;
    const content = item.content.trim();
    if (!content || content.length > maxLength) continue;

    totalLength += content.length;
    if (totalLength > 4_000) break;
    history.push({ role: item.role, content });
  }

  // Keep max last 6 history entries for conversational context
  return history.slice(-6);
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return jsonError("Permintaan terlalu besar.", 413);
  }

  const user = await authenticatedUser();
  if (!user) return jsonError("Login Discord diperlukan untuk berbicara dengan Satpam Horizon.", 401);
  if (user.isBanned) return jsonError("Akun kamu sedang dibatasi dan tidak dapat menggunakan fitur AI.", 403);

  const now = Date.now();
  const previousRequestAt = lastRequestAt.get(user.id);
  const cooldownLimit = user.isPremium ? 500 : COOLDOWN_MS;
  if (previousRequestAt && now - previousRequestAt < cooldownLimit) {
    return Response.json(
      { error: "Sabar bro, jangan spam! Satpam lagi narik napas dulu (cooldown 2.5s)." },
      { status: 429, headers: { "Retry-After": "2", "Cache-Control": "no-store" } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Format pesan tidak valid.", 400);
  }

  if (!isRecord(payload) || typeof payload.message !== "string") {
    return jsonError("Pesan tidak valid.", 400);
  }
  const message = payload.message.trim();
  if (!message || message.length > MAX_INPUT_LENGTH) {
    return jsonError("Pesan harus berisi 1–300 karakter.", 400);
  }

  const history = validateHistory(payload.history);
  lastRequestAt.set(user.id, now);

  const token = process.env.HF_ACCESS_TOKEN;
  if (!token) {
    return Response.json({
      reply: "Waduh bro, token AI (HF_ACCESS_TOKEN) belum dipasang di environment server! Hubungi Emperor .odyssia biar Satpam bisa mikir pakai LLM asli.",
    });
  }

  const systemPrompt = [
    "Kamu adalah Satpam Horizon, penjaga gerbang komunitas multi-game LogHorizon yang kocak, sarkas, gaul, suka pakai bahasa gamer Indonesia (seperti mabar, afk, noob, gacor, push rank), dan sangat menghormati Emperor / Admin guild.",
    "Jawab pertanyaan atau obrolan user secara natural, nyambung, lucu, dan singkat (maksimal 2-3 kalimat).",
    `Info guild penting: Emperor/Owner guild adalah .odyssia (Farrel). User yang sedang bicara bernama "${user.username ?? user.name ?? "Petualang"}" (Level ${user.level ?? 1}, Role: ${user.role ?? "MEMBER"}).`,
    "Fitur web LogHorizon: Forum diskusi (f/general-chat, f/promotion, f/feedback), Lapak Marketplace gamer, Leaderboard peringkat XP/kas donatur, Jadwal mabar & turnamen (Events), dan Warta Berita (News Hub).",
  ].join(" ");

  const messagesPayload = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message },
  ];

  const attempts = [
    { url: HF_ROUTER_PRIMARY, model: MODEL_PRIMARY },
    { url: HF_ROUTER_FALLBACK, model: MODEL_PRIMARY },
    { url: HF_ROUTER_PRIMARY, model: MODEL_FALLBACK },
  ];

  let lastErrorDetail = "";

  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: attempt.model,
          messages: messagesPayload,
          max_tokens: 220,
          temperature: 0.7,
          stream: false,
        }),
        signal: AbortSignal.timeout(12_000),
      });

      if (response.ok) {
        const result = (await response.json()) as HuggingFaceResponse;
        const reply = result.choices?.[0]?.message?.content;
        if (typeof reply === "string" && reply.trim()) {
          return Response.json(
            { reply: reply.trim() },
            { headers: { "Cache-Control": "no-store" } },
          );
        }
      } else {
        const status = response.status;
        const errorText = await response.text();
        console.warn(`[ai-chat] Router ${attempt.url} [${attempt.model}] failed with HTTP ${status}:`, errorText);

        if (status === 401 || status === 403) {
          return Response.json({
            reply: `Token HF_ACCESS_TOKEN ditolak Hugging Face (HTTP ${status}). Cek izin token 'Inference Providers' di akun Hugging Face kamu bro!`,
          });
        }
        if (status === 429) {
          return Response.json({
            reply: "Antrean server AI lagi padat mabar nih (Rate limit 429)! Tunggu sekitar 10-15 detik terus coba lagi ya bro.",
          });
        }
        if (status === 503) {
          lastErrorDetail = "Model AI lagi warm-up di server";
          continue;
        }
        lastErrorDetail = `HTTP ${status}`;
      }
    } catch (err) {
      console.warn(`[ai-chat] Connection error with ${attempt.url}:`, err);
      lastErrorDetail = err instanceof Error ? err.message : "Koneksi timeout";
    }
  }

  // Meaningful non-repetitive error message
  return Response.json({
    reply: `Aduh sinyal ke otak AI lagi ngelag (${lastErrorDetail || "Server timeout"}). Coba kirim ulang pesanmu sekali lagi ya petualang!`,
  });
}
