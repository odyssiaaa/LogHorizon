import { authenticatedUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const GEMINI_ENDPOINTS = [
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
];

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

  // Merge consecutive turns with the same role
  const merged: { role: "user" | "model"; text: string }[] = [];
  for (const turn of turns) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === turn.role) {
      prev.text = `${prev.text}\n${turn.text}`.trim();
    } else {
      merged.push({ role: turn.role, text: turn.text });
    }
  }

  // First turn following system instruction must always be user
  while (merged.length > 0 && merged[0].role === "model") {
    merged.shift();
  }

  if (merged.length === 0 || merged[merged.length - 1].role !== "user") {
    merged.push({ role: "user", text: cleanCurrent || "Halo Satpam Horizon" });
  }

  return merged.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));
}

async function getLiveDatabaseContext(userId: string) {
  try {
    const [
      currentUser,
      topXpUsers,
      donorRaw,
      totalForumThreads,
      latestForumPosts,
      allMarketListings,
      openTournaments,
      openLfg,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, role: true, level: true, xp: true, isPremium: true },
      }),
      prisma.user.findMany({
        where: { isBanned: false },
        orderBy: [{ level: "desc" }, { xp: "desc" }],
        take: 5,
        select: { username: true, level: true, xp: true },
      }),
      prisma.$queryRaw<{ username: string | null; badges: string[]; total: string }[]>`
        SELECT u."username", u."badges", SUM(d."amount")::text AS "total"
        FROM "User" u
        INNER JOIN "Donation" d ON d."userId" = u."id"
        WHERE u."isBanned" = false
          AND d."status" = 'SUCCEEDED'::"DonationStatus"
          AND (d."gatewayRef" IS NULL OR d."gatewayRef" NOT LIKE 'mock-%')
        GROUP BY u."id"
        ORDER BY SUM(d."amount") DESC
        LIMIT 3
      `.catch(() => []),
      prisma.post.count({
        where: { category: { not: "MARKETPLACE" } },
      }),
      prisma.post.findMany({
        where: { category: { not: "MARKETPLACE" } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { title: true, category: true },
      }),
      prisma.post.findMany({
        where: { category: "MARKETPLACE" },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { title: true, marketData: true },
      }),
      prisma.tournament.findMany({
        where: { status: "OPEN" },
        orderBy: { eventDate: "asc" },
        take: 3,
        select: { game: true, maxSlots: true, eventDate: true },
      }),
      prisma.lfgPost.findMany({
        where: { status: "OPEN" },
        orderBy: { scheduledAt: "asc" },
        take: 3,
        select: { game: true, description: true, scheduledAt: true, maxSlots: true },
      }),
    ]);

    // Parse marketplace listings
    const availableMarket = allMarketListings
      .filter((item) => {
        const m = (item.marketData && typeof item.marketData === "object" ? item.marketData : {}) as Record<string, unknown>;
        return !m.status || m.status === "AVAILABLE";
      })
      .slice(0, 5)
      .map((item) => {
        const m = (item.marketData && typeof item.marketData === "object" ? item.marketData : {}) as Record<string, unknown>;
        const price = Number(m.price ?? 0);
        const game = String(m.game ?? "Game");
        const formattedPrice = price > 0 ? `Rp ${price.toLocaleString("id-ID")}` : "Gratis / Hubungi Penjual";
        return `"${item.title}" [${game}] - ${formattedPrice}`;
      });

    const topDonors = (donorRaw || []).map((d) => {
      const amount = Number(d.total || 0);
      let tier = "Guild Supporter";
      if (d.badges?.includes("Noble Patron") || amount >= 500_000) tier = "Noble Patron";
      else if (d.badges?.includes("High Merchant") || amount >= 250_000) tier = "High Merchant";
      else if (d.badges?.includes("Knight") || amount >= 50_000) tier = "Knight";
      return `${d.username ?? "Anonim"} (${tier}: Rp ${amount.toLocaleString("id-ID")})`;
    });

    const xpLeaderboardSummary = topXpUsers.length
      ? topXpUsers.map((u, i) => `${i + 1}. ${u.username ?? "Gamer"} (Lv.${u.level}, ${u.xp} XP)`).join(", ")
      : "Belum ada petualang di papan peringkat.";

    const donorSummary = topDonors.length
      ? topDonors.join(", ")
      : "Belum ada donatur terverifikasi.";

    const forumSummary = latestForumPosts.length
      ? `Total ${totalForumThreads} thread. 5 Thread terbaru: ` + latestForumPosts.map((p) => `"${p.title}"`).join(", ")
      : `Total ${totalForumThreads} thread forum. Belum ada postingan terbaru.`;

    const marketSummary = availableMarket.length
      ? `Total lapak aktif: ${allMarketListings.length}. Lapak tersedia: ` + availableMarket.join(", ")
      : "Belum ada barang aktif di lapak saat ini.";

    const eventList = [
      ...openTournaments.map((t) => `Turnamen ${t.game} (Slot: ${t.maxSlots})`),
      ...openLfg.map((l) => `Party ${l.game} (${l.description.slice(0, 30)}...)`),
    ];
    const eventSummary = eventList.length
      ? eventList.slice(0, 4).join(", ")
      : "Belum ada turnamen atau sesi mabar LFG yang aktif saat ini.";

    return {
      userContext: currentUser
        ? `Username: "${currentUser.username ?? "Gamer"}", Role: ${currentUser.role}, Level: ${currentUser.level}, XP: ${currentUser.xp}, Status Premium: ${currentUser.isPremium ? "Ya (Elite Member)" : "Tidak"}`
        : "User belum teridentifikasi penuh.",
      xpLeaderboardSummary,
      donorSummary,
      forumSummary,
      marketSummary,
      eventSummary,
    };
  } catch (error) {
    console.error("[gemini-chat] Failed to fetch live database context:", error);
    return {
      userContext: "Data user tidak dapat dimuat sementara.",
      xpLeaderboardSummary: "Papan peringkat sedang disinkronisasi.",
      donorSummary: "Data kas donatur sedang disinkronisasi.",
      forumSummary: "Forum komunitas sedang aktif.",
      marketSummary: "Lapak marketplace tersedia dengan sistem Escrow aman.",
      eventSummary: "Turnamen & Party LFG tersedia di menu Events.",
    };
  }
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
    return jsonError("Pesan harus berisi 1-300 karakter.", 400);
  }

  const history = validateHistory(payload.history);
  lastRequestAt.set(user.id, now);

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return Response.json({
      reply: "Waduh bro, token AI (GEMINI_API_KEY) belum dipasang di environment server! Hubungi Emperor .odyssia biar Satpam bisa mikir pakai Google Gemini Flash asli.",
    });
  }

  // Retrieve live PostgreSQL database context
  const dbContext = await getLiveDatabaseContext(user.id);

  const systemPrompt = [
    "IDENTITAS & KEPRIBADIAN:",
    "Kamu adalah 'Satpam Horizon', maskot penjaga gerbang resmi dan bot intelijen komunitas multi-game LogHorizon.",
    "Gaya bahasamu kocak, ramah, santai, sedikit sarkas ala gamer Indonesia (sering pakai istilah: mabar, afk, noob, gacor, push rank, sepuh, GGWP).",
    "Kamu sangat menghormati Emperor guild (.odyssia / Farrel) dan jajaran Admin/Council.",
    "Jawab pertanyaan secara ringkas, padat, natural, cerdas, dan informatif (maksimal 2-4 kalimat). Jangan halu atau mengarang data jika user menanyakan data komunitas, rujuklah DATA LIVE di bawah ini.",
    "",
    "DATA LIVE DARI DATABASE NEON SAAT INI:",
    `- Penanya saat ini: ${dbContext.userContext}`,
    `- Top 5 Leaderboard XP: ${dbContext.xpLeaderboardSummary}`,
    `- Top 3 Donatur Kas: ${dbContext.donorSummary}`,
    `- Data Forum Diskusi: ${dbContext.forumSummary}`,
    `- Data Lapak Marketplace: ${dbContext.marketSummary}`,
    `- Events & Party Aktif: ${dbContext.eventSummary}`,
    "",
    "PENGETAHUAN LENGKAP FITUR & STRUKTUR WEBSITE LOGHORIZON:",
    "1. Navigasi Utama: Beranda (/), Forum Komunitas (/forum), Marketplace Jual-Beli (/marketplace), Leaderboard (/leaderboard), Warta Berita (/news), Turnamen & LFG Party Finder (/events), Kas Donasi (/donate), Aturan & Hierarki (/rules), dan Pengaturan Profil (/profile).",
    "2. Sistem Keamanan Escrow: Lapak FJB menggunakan rekening bersama pihak ketiga aman (Escrow) agar transaksi anti-scam. Status lapak: AVAILABLE, IN_ESCROW, SOLD.",
    "3. Sistem Perolehan Level & XP: Petualang mendapat +10 XP tiap membuat thread forum, +5 XP tiap mengirim komentar diskusi, dan +50 XP tiap transaksi lapak sukses selesai. Level otomatis naik seiring akumulasi XP.",
    "4. Kas Donasi & Role Discord: Donasi (/donate) mendukung server guild. Donatur mendapatkan badge dan role Discord: Knight (Rp 50.000+), High Merchant (Rp 250.000+), dan Noble Patron (Rp 500.000+).",
    "5. Struktur Kasta Kerajaan: Emperor (.odyssia - Pemimpin Tertinggi), Prince/Princess (Wakil), Grand Chancellor & Lord Commander (Council/Moderator), Royal Guard, Knight, High Merchant, dan Adventurer (Member).",
    "6. Aturan Inti: No toxic, junjung tinggi sportivitas fair play, dilarang cheat/scam, dan jaga persaudaraan sesama gamer.",
  ].join("\n");

  const contents = formatGeminiContents(history, message);
  let lastErrorDetail = "";

  for (const endpoint of GEMINI_ENDPOINTS) {
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
            maxOutputTokens: 250,
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

        if (status === 404) {
          // Model endpoint not found, fallback to next endpoint model automatically
          lastErrorDetail = `Model 404: ${cleanSnippet}`;
          continue;
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

  return Response.json({
    reply: `Aduh sinyal ke otak Satpam lagi ngelag (${lastErrorDetail || "Server timeout"}). Coba kirim ulang pesanmu sekali lagi ya petualang!`,
  });
}
