import { authenticatedUser, jsonError } from "@/lib/http";

const GEMINI_ENDPOINT_PRIMARY = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
const GEMINI_ENDPOINT_FALLBACK = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
const COOLDOWN_MS = 2_500;
const MAX_INPUT_LENGTH = 300;
const MAX_BODY_BYTES = 16_384;

type ChatMessage = { role: "user" | "assistant"; content: string };
type GeminiPart = { text: string };
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
      role?: string;
    };
    finishReason?: string;
  }[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
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

function formatGeminiContents(history: ChatMessage[], currentMessage: string): GeminiContent[] {
  const turns: { role: "user" | "model"; text: string }[] = [];

  for (const h of history) {
    const text = h.content?.trim();
    if (text) {
      turns.push({
        role: h.role === "assistant" ? "model" : "user",
        text,
      });
    }
  }

  const cleanCurrent = currentMessage.trim();
  if (cleanCurrent) {
    turns.push({ role: "user", text: cleanCurrent });
  }

  // Merge consecutive turns with the exact same role to enforce strict alternation
  const merged: { role: "user" | "model"; text: string }[] = [];
  for (const turn of turns) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === turn.role) {
      prev.text = `${prev.text}\n${turn.text}`.trim();
    } else {
      merged.push({ role: turn.role, text: turn.text });
    }
  }

  // Standard LLM chat templates require the conversation following system to start with user.
  // Strip any leading assistant/model greeting from history so that first turn is always user.
  while (merged.length > 0 && merged[0].role === "model") {
    merged.shift();
  }

  // Ensure conversation ends with user message
  if (merged.length === 0 || merged[merged.length - 1].role !== "user") {
    merged.push({ role: "user", text: cleanCurrent || "Halo Satpam Horizon" });
  }

  return merged.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));
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

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return Response.json({
      reply: "Waduh bro, token AI (GEMINI_API_KEY) belum dipasang di environment server! Hubungi Emperor .odyssia biar Satpam bisa mikir pakai Google Gemini Flash asli.",
    });
  }

  const systemPrompt = [
    "Kamu adalah Satpam Horizon, penjaga gerbang komunitas multi-game LogHorizon yang kocak, sarkas, gaul, suka pakai bahasa gamer Indonesia (seperti mabar, afk, noob, gacor, push rank), dan sangat menghormati Emperor / Admin guild.",
    "Jawab pertanyaan atau obrolan user secara natural, nyambung, lucu, dan singkat (maksimal 2-3 kalimat).",
    `Info guild penting: Emperor/Owner guild adalah .odyssia (Farrel). User yang sedang bicara bernama "${user.username ?? user.name ?? "Petualang"}" (Level ${user.level ?? 1}, Role: ${user.role ?? "MEMBER"}).`,
    "Fitur web LogHorizon: Forum diskusi (f/general-chat, f/promotion, f/feedback), Lapak Marketplace gamer, Leaderboard peringkat XP/kas donatur, Jadwal mabar & turnamen (Events), dan Warta Berita (News Hub).",
  ].join(" ");

  const contents = formatGeminiContents(history, message);

  const endpoints = [GEMINI_ENDPOINT_PRIMARY, GEMINI_ENDPOINT_FALLBACK];
  let lastErrorDetail = "";

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
            parts: [{ text: systemPrompt }],
          },
          contents,
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.7,
          },
        }),
        signal: AbortSignal.timeout(12_000),
      });

      if (response.ok) {
        const result = (await response.json()) as GeminiResponse;
        const reply = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof reply === "string" && reply.trim()) {
          return Response.json(
            { reply: reply.trim() },
            { headers: { "Cache-Control": "no-store" } },
          );
        }
      } else {
        const status = response.status;
        const errorText = await response.text();
        console.error(`[gemini-chat] HTTP ${status} from ${endpoint}:`, errorText);

        let cleanSnippet = errorText;
        try {
          const parsed = JSON.parse(errorText);
          cleanSnippet = parsed?.error?.message ?? errorText.slice(0, 180);
        } catch {
          cleanSnippet = errorText.slice(0, 180);
        }

        if (status === 400 || status === 401 || status === 403) {
          lastErrorDetail = `HTTP ${status}: ${cleanSnippet}`;
          continue;
        }
        if (status === 429) {
          return Response.json({
            reply: "Antrean server Gemini lagi padat mabar nih (Rate limit 429)! Tunggu beberapa detik terus coba lagi ya bro.",
          });
        }

        lastErrorDetail = `HTTP ${status}: ${cleanSnippet}`;
      }
    } catch (err) {
      console.warn(`[gemini-chat] Connection error with ${endpoint}:`, err);
      lastErrorDetail = err instanceof Error ? err.message : "Koneksi timeout";
    }
  }

  // Meaningful non-repetitive error message with debug info
  return Response.json({
    reply: `Aduh sinyal ke otak AI lagi ngelag (${lastErrorDetail || "Server timeout"}). Coba kirim ulang pesanmu sekali lagi ya petualang!`,
  });
}
