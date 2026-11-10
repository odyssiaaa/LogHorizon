import { authenticatedUser, jsonError } from "@/lib/http";

const HF_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";
const MODEL = "meta-llama/Meta-Llama-3-8B-Instruct";
const COOLDOWN_MS = 3_000;
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

function validateHistory(value: unknown): ChatMessage[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_HISTORY_MESSAGES) return null;

  const history: ChatMessage[] = [];
  let totalLength = 0;
  for (const item of value) {
    if (!isRecord(item) || (item.role !== "user" && item.role !== "assistant") || typeof item.content !== "string") {
      return null;
    }

    const maxLength = item.role === "user" ? MAX_INPUT_LENGTH : 1_500;
    const content = item.content.trim();
    if (!content || content.length > maxLength) return null;

    totalLength += content.length;
    if (totalLength > 4_000) return null;
    history.push({ role: item.role, content });
  }
  return history;
}

function generateLocalReply(message: string, username: string, level: number): string {
  const lower = message.toLowerCase();

  if (lower.includes("halo") || lower.includes("hai") || lower.includes("p ") || lower.includes("oi") || lower.includes("siang") || lower.includes("malam") || lower.includes("pagi") || lower.includes("sore")) {
    return `Oit petualang ${username}! Satpam Horizon siap berjaga di gerbang guild. Ada party atau misi apa yang bisa kubantu hari ini?`;
  }
  if (lower.includes("owner") || lower.includes("emperor") || lower.includes("odyssia") || lower.includes("farrel") || lower.includes("pemilik")) {
    return `Hormat gerak! 👑 Emperor kita adalah .odyssia (Farrel), penguasa dan pemilik tunggal tahta LogHorizon. Kendali absolut guild berada di tangannya!`;
  }
  if (lower.includes("aturan") || lower.includes("rules") || lower.includes("larangan") || lower.includes("toxic") || lower.includes("cheat")) {
    return `Catat baik-baik, petualang: 1. Fair Play & No Toxic, 2. Solidaritas tinggi (jangan kabur dari party), 3. Anti scam & cheat! Langgar ini, langsung berhadapan dengan pentungan Satpam & ⚔️ Lord Commander!`;
  }
  if (lower.includes("forum") || lower.includes("diskusi") || lower.includes("thread")) {
    return `Mau ngobrol atau cari party? Langsung meluncur ke menu Forum di atas! Ada obrolan umum (f/general-chat), promosi (f/promotion), dan kotak aspirasi guild.`;
  }
  if (lower.includes("market") || lower.includes("jual") || lower.includes("beli") || lower.includes("lapak") || lower.includes("escrow")) {
    return `Butuh item, akun, atau jasa joki? Buka halaman Marketplace (Lapak Gamer). Ingat, utamakan transaksi aman dan patuhi regulasi guild!`;
  }
  if (lower.includes("level") || lower.includes("xp") || lower.includes("rank") || lower.includes("leaderboard")) {
    return `Levelmu saat ini Lv.${level}. Rajin-rajinlah berdiskusi di forum dan aktif di guild untuk menaikkan XP dan memuncaki Leaderboard Petualang!`;
  }
  if (lower.includes("donasi") || lower.includes("donate") || lower.includes("kas") || lower.includes("treasury") || lower.includes("sponsor")) {
    return `Mau menyokong kas guild? Kunjungi menu Donate (Guild Treasury). Ada kasta kehormatan 🛡️ Knight, 👑 High Merchant, hingga 💎 Noble Patron dengan badge dan benefit glowing!`;
  }
  if (lower.includes("discord") || lower.includes("server") || lower.includes("voice") || lower.includes("party")) {
    return `Server Discord LogHorizon aktif 24/7! Kamu bisa masuk ke voice room mana pun untuk mabar Valorant, MLBB, Dota, Genshin, atau sekadar nongkrong santai.`;
  }
  if (lower.includes("siapa kamu") || lower.includes("satpam")) {
    return `Aku Satpam Horizon, AI penjaga gerbang benteng LogHorizon. Tugas utamaku mengawasi gerbang, memandu petualang baru, dan memastikan tidak ada cheater yang menyusup!`;
  }

  const defaultReplies = [
    `Roger that, petualang ${username}! Pesanmu kuterima. Sebagai penjaga gerbang Lv.${level}, saranku segera cari party di forum atau nongkrong di voice channel Discord guild!`,
    `Hmm, sinyal gerbang tertangkap jelas! Tetap jaga sportivitas dan pantau terus papan pengumuman guild ya. Ada hal lain yang mau ditanyakan?`,
    `Siap, tercatat di buku patroli Satpam! Kalau ada yang mencurigakan di forum atau marketplace, jangan ragu klik tombol Report Post agar tim Lord Commander segera turun tangan!`,
    `Mantap jiwa! Terus asah skill-mu bersama kawan-kawan guild LogHorizon. Jangan lupa cek menu Leaderboard untuk lihat siapa petualang paling terdepan hari ini!`
  ];
  const picked = defaultReplies[Math.abs(message.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % defaultReplies.length];
  return picked;
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
      { error: "Satpam masih cooldown. Tunggu sebentar sebelum bertanya lagi." },
      { status: 429, headers: { "Retry-After": "3", "Cache-Control": "no-store" } },
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
  if (!history) return jsonError("Riwayat percakapan tidak valid.", 400);

  lastRequestAt.set(user.id, now);

  const token = process.env.HF_ACCESS_TOKEN;
  if (token) {
    try {
      const response = await fetch(HF_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: [
                "Kamu adalah Satpam Horizon, penjaga komunitas multi-game guild LogHorizon.",
                "Jawab dalam bahasa Indonesia dengan ramah, cerdas, sedikit humoris, dan bergaya pelindung benteng RPG gamer.",
                "Hormati Owner/Emperor .odyssia (Farrel) dengan penuh takzim.",
                `Anggota yang sedang berbicara adalah ${user.username ?? "Petualang"} di level ${user.level}.`,
                "Bantu arahkan anggota seputar forum, marketplace, discord, leaderboard, dan turnamen guild.",
              ].join(" "),
            },
            ...history,
            { role: "user", content: message },
          ],
          max_tokens: 180,
          stream: false,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (response.ok) {
        const result = (await response.json()) as HuggingFaceResponse;
        const reply = result.choices?.[0]?.message?.content;
        if (typeof reply === "string" && reply.trim()) {
          return Response.json({ reply: reply.trim() });
        }
      }
    } catch (e) {
      console.warn("[ai-chat] Cloud inference fallback to intelligent rule agent", e);
    }
  }

  // Guaranteed resilient smart conversational engine
  const reply = generateLocalReply(message, user.username ?? "Petualang", user.level);
  return Response.json(
    { reply },
    { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}
