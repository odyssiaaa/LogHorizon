import { prisma } from "@/lib/prisma";

const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.8-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

const GEMINI_ENDPOINTS = GEMINI_MODELS.map(
  (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
);

// Anti-spam tracker: 15 detik cooldown per user untuk mention @satpam
const satpamCooldowns = new Map<string, number>();

/**
 * Memeriksa apakah user sedang dalam masa cooldown 15 detik untuk memanggil @satpam.
 * Owner (.odyssia) dan Admin/Moderator bebas cooldown (0 detik).
 */
export function checkSatpamCooldown(userId: string, isOwnerOrStaff: boolean): { allowed: boolean; remainingSec: number } {
  if (isOwnerOrStaff) return { allowed: true, remainingSec: 0 };
  const now = Date.now();
  const lastCall = satpamCooldowns.get(userId) || 0;
  const elapsed = now - lastCall;
  const COOLDOWN_MS = 15_000;

  if (elapsed < COOLDOWN_MS) {
    const remainingSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return { allowed: false, remainingSec };
  }

  satpamCooldowns.set(userId, now);
  return { allowed: true, remainingSec: 0 };
}

/**
 * Menghasilkan respon dari Google Gemini menggunakan fallback model cerdas.
 */
export async function callGemini(
  prompt: string,
  systemPrompt = "Kamu adalah Satpam Horizon, AI Guardian resmi LogHorizon.",
  maxTokens = 300
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return "Token AI (GEMINI_API_KEY) belum terpasang di server. Hubungi Emperor .odyssia agar Satpam Horizon bisa aktif penuh!";
  }

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
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.7,
          },
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (response.ok) {
        const result = (await response.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text === "string" && text.trim()) {
          return text.trim();
        }
      }
    } catch {
      // Continue to next fallback model endpoint
      continue;
    }
  }

  return "Sinyal Satpam Horizon lagi terdistorsi gelombang radio nih petualang! Tapi santai, keamanan room tetap dalam pengawasan penuh.";
}

/**
 * Mengambil atau membuat akun resmi Bot 'Satpam Horizon' di database.
 */
export async function getOrCreateSatpamBotUser(): Promise<{ id: string; username: string }> {
  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: "satpam-horizon" },
          { username: "Satpam Horizon" },
        ],
      },
      select: { id: true, username: true },
    });

    if (existing) {
      return { id: existing.id, username: existing.username ?? "satpam-horizon" };
    }

    const created = await prisma.user.create({
      data: {
        username: "satpam-horizon",
        name: "Satpam Horizon",
        avatar: "/loghorizon-logo.png",
        role: "MODERATOR",
        isPremium: true,
        level: 99,
        xp: 99999,
        badges: ["SATPAM_AI", "BOT_GUILD", "SECURITY_GUARDIAN"],
        inGameName: "SatpamHorizon#AI",
        primaryRole: "Guardian AI",
      },
      select: { id: true, username: true },
    });

    return { id: created.id, username: created.username ?? "satpam-horizon" };
  } catch {
    // Fallback if concurrent creation occurred
    const fallback = await prisma.user.findFirst({
      where: { username: "satpam-horizon" },
      select: { id: true, username: true },
    });
    if (fallback) return { id: fallback.id, username: fallback.username ?? "satpam-horizon" };
    throw new Error("Gagal menginisialisasi bot user Satpam Horizon.");
  }
}

// =========================================================================
// 1. AUTO-MODERATION SHIELD: DETEKSI KONTEN TERLARANG
// =========================================================================

const JUDOL_PATTERNS = [
  /slot\s*gacor/i,
  /judi\s*online/i,
  /\bjudol\b/i,
  /zeus\s*slot/i,
  /pragmatic\s*gacor/i,
  /depo\s*pulsa/i,
  /\bmaxwin\b/i,
  /situs\s*judi/i,
  /bandar\s*togel/i,
  /\bsbobet\b/i,
  /agen\s*slot/i,
  /gacor88/i,
  /slot88/i,
  /rtp\s*slot/i,
  /link\s*slot/i,
  /daftar\s*slot/i,
  /mahjong\s*ways/i,
  /scatter\s*hitam/i,
];

const PHISHING_PATTERNS = [
  /dlscord\.gg/i,
  /discord-nitro/i,
  /discord-drop/i,
  /free-nitro/i,
  /steamcomunuty/i,
  /steam-wallet-free/i,
  /claim-airdrop/i,
  /free-robux/i,
  /free-diamond/i,
];

const TOXIC_PATTERNS = [
  /\bkontol\b/i,
  /\bmemek\b/i,
  /\bjancuk\b/i,
  /\bngentot\b/i,
  /mati\s*aja\s*lo/i,
  /bunuh\s*diri/i,
  /dasar\s*pribumi/i,
];

/**
 * Memeriksa apakah konten yang akan dipublikasikan aman dari phishing, judi online, atau SARA/toxic berat.
 * Jika melanggar, otomatis mencatat pelanggaran ke tabel SecurityLog di database.
 */
export async function checkContentSafety(
  content: string,
  type: "POST" | "MARKET" | "LFG" | "COMMENT",
  user?: { id?: string; username?: string | null } | null
): Promise<{ isSafe: boolean; reason?: string; flaggedWord?: string }> {
  // 1. Cek Judi Online
  for (const pattern of JUDOL_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      const flagged = match[0];
      const reason = `Terdeteksi promosi judi online/slot ilegal (${flagged})`;
      await logSecurityIncident({
        userId: user?.id,
        username: user?.username ?? "Anonymous",
        action: `${type}_BLOCKED_JUDOL`,
        reason,
        content: content.slice(0, 500),
        flagged,
        severity: "HIGH",
      });
      return { isSafe: false, reason: `Konten ditolak oleh Satpam AI: Dilarang mempromosikan judi online/slot ilegal di LogHorizon.`, flaggedWord: flagged };
    }
  }

  // 2. Cek Phishing & Scam Links
  for (const pattern of PHISHING_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      const flagged = match[0];
      const reason = `Terdeteksi tautan phishing/scam berbahaya (${flagged})`;
      await logSecurityIncident({
        userId: user?.id,
        username: user?.username ?? "Anonymous",
        action: `${type}_BLOCKED_PHISHING`,
        reason,
        content: content.slice(0, 500),
        flagged,
        severity: "CRITICAL",
      });
      return { isSafe: false, reason: `Konten ditolak oleh Satpam AI: Terdeteksi indikasi tautan phishing atau scam berbahaya.`, flaggedWord: flagged };
    }
  }

  // 3. Cek Toxic / SARA Berat
  for (const pattern of TOXIC_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      const flagged = match[0];
      const reason = `Terdeteksi kata-kata toxic/SARA kasar (${flagged})`;
      await logSecurityIncident({
        userId: user?.id,
        username: user?.username ?? "Anonymous",
        action: `${type}_BLOCKED_TOXIC`,
        reason,
        content: content.slice(0, 500),
        flagged,
        severity: "MEDIUM",
      });
      return { isSafe: false, reason: `Konten ditolak oleh Satpam AI: Harap jaga etika dan kesopanan sesama petualang (No Toxic / SARA).`, flaggedWord: flagged };
    }
  }

  return { isSafe: true };
}

/**
 * Mencatat kejadian pemblokiran konten ke tabel SecurityLog di PostgreSQL.
 */
export async function logSecurityIncident(data: {
  userId?: string;
  username?: string;
  action: string;
  reason: string;
  content: string;
  flagged?: string;
  severity?: string;
}): Promise<void> {
  try {
    await prisma.securityLog.create({
      data: {
        userId: data.userId || null,
        username: data.username || "Anonymous",
        action: data.action,
        reason: data.reason,
        content: data.content,
        flagged: data.flagged || null,
        severity: data.severity || "HIGH",
      },
    });
  } catch (err) {
    console.error("[satpam-guardian] Gagal menyimpan log keamanan:", err);
  }
}

// =========================================================================
// 2. ESCROW ANTI-SCAM DETECTOR
// =========================================================================

const OFF_ESCROW_PATTERNS = [
  /tf\s*langsung/i,
  /transfer\s*langsung/i,
  /trf\s*langsung/i,
  /trf\s*pribadi/i,
  /transfer\s*pribadi/i,
  /bca\s*langsung/i,
  /dana\s*langsung/i,
  /gopay\s*langsung/i,
  /ovo\s*langsung/i,
  /tanpa\s*rekber/i,
  /skip\s*rekber/i,
  /bypass\s*rekber/i,
  /wa\s*langsung/i,
  /chat\s*wa\s*aja/i,
  /direct\s*transfer/i,
];

const CREDENTIAL_THEFT_PATTERNS = [
  /minta\s*otp/i,
  /kirim\s*otp/i,
  /kode\s*otp/i,
  /password\s*akun/i,
  /pass\s*akun/i,
  /email\s*verification\s*code/i,
  /kode\s*verifikasi\s*email/i,
  /klik\s*link\s*ini\s*dulu/i,
  /konfirmasi\s*lewat\s*link/i,
];

/**
 * Memeriksa kalimat dalam chat Rekber apakah berpotensi penipuan / ajakan di luar sistem.
 */
export function detectEscrowScamPatterns(message: string): { isSuspicious: boolean; warning?: string; trigger?: string } {
  for (const pattern of OFF_ESCROW_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      return {
        isSuspicious: true,
        trigger: match[0],
        warning: `Ajakan transaksi di luar Rekber resmi LogHorizon (${match[0]}). Seluruh pembayaran WAJIB melalui kas Escrow agar dana aman sampai serah terima selesai.`,
      };
    }
  }

  for (const pattern of CREDENTIAL_THEFT_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      return {
        isSuspicious: true,
        trigger: match[0],
        warning: `Permintaan informasi sensitif / OTP / Password (${match[0]}). DILARANG memberikan kode OTP atau password email utama! Pembeli dan penjual hanya boleh menukar akses akun setelah dana terverifikasi terkunci di Escrow.`,
      };
    }
  }

  return { isSuspicious: false };
}

/**
 * Menangani peringatan otomatis anti-scam atau mention @satpam dalam rekber.
 */
export async function processEscrowGuardian({
  escrowId,
  userMessage,
  senderUser,
}: {
  escrowId: string;
  userMessage: string;
  senderUser: { id: string; username?: string | null };
}): Promise<void> {
  try {
    const satpamBot = await getOrCreateSatpamBotUser();

    // 1. Cek Pola Penipuan / Ajakan di luar Rekber
    const scamCheck = detectEscrowScamPatterns(userMessage);
    if (scamCheck.isSuspicious) {
      await logSecurityIncident({
        userId: senderUser.id,
        username: senderUser.username || "Gamer",
        action: "ESCROW_SCAM_WARNING",
        reason: scamCheck.warning || "Terdeteksi indikasi ajakan penipuan / transaksi di luar sistem",
        content: userMessage.slice(0, 500),
        flagged: scamCheck.trigger,
        severity: "HIGH",
      });

      await prisma.escrowMessage.create({
        data: {
          escrowId,
          senderId: satpamBot.id,
          message: `🛡️ **[PERINGATAN KEAMANAN SATPAM AI]**\n\nPerhatian Petualang! Terdeteksi indikasi berisiko:\n⚠️ ${scamCheck.warning}\n\n🔒 *DILARANG KERAS transfer di luar sistem atau memberikan akses OTP email utama sebelum admin escrow memverifikasi status dana.*`,
        },
      });
      return;
    }

    // 2. Cek Mention @satpam (Panduan checklist serah terima aman)
    if (/@satpam\b/i.test(userMessage)) {
      const escrow = await prisma.escrowTransaction.findUnique({
        where: { id: escrowId },
        select: {
          amount: true,
          status: true,
          post: {
            select: { title: true },
          },
        },
      });

      const systemPrompt = [
        "Kamu adalah Satpam Horizon, AI Escrow Guardian & Asisten Rekber LogHorizon.",
        "Tugasmu: Memberikan panduan serah terima akun/item game yang 100% aman bagi pembeli dan penjual.",
        "Checklist Keamanan Transaksi Game:",
        "1. Penjual memberikan info login dummy atau email first-hand (bind email diganti ke email pembeli).",
        "2. Pembeli WAJIB mengecek kelengkapan akun (skin, hero, rank, spek) dan segera mengganti password + aktifkan 2FA.",
        "3. Jangan pernah share OTP transaksi/bank ke siapapun.",
        "4. Setelah semua aman, pembeli klik konfirmasi terima agar dana diteruskan ke penjual.",
        "Jawab dengan ramah, profesional, dan to-the-point (3-4 butir checklist ringkas).",
      ].join("\n");

      const userPrompt = [
        `TRANSAKSI REKBER: ${escrow?.post?.title || "Item / Akun Game"}`,
        `NOMINAL: Rp ${escrow?.amount?.toLocaleString("id-ID") || "0"}`,
        `STATUS REKBER: ${escrow?.status || "IN_ESCROW"}`,
        `PERTANYAAN/PESAN DARI @${senderUser.username || "Petualang"}:`,
        userMessage,
        "",
        "Berikan checklist serah terima aman sekarang:",
      ].join("\n");

      const reply = await callGemini(userPrompt, systemPrompt, 350);

      await prisma.escrowMessage.create({
        data: {
          escrowId,
          senderId: satpamBot.id,
          message: `🛡️ **[PANDUAN SERAH TERIMA AMAN // SATPAM AI]**\n\n${reply}`,
        },
      });
    }
  } catch (err) {
    console.error("[satpam-guardian] Error in processEscrowGuardian:", err);
  }
}

// =========================================================================
// 3. MENTION @satpam DI FORUM DISKUSI
// =========================================================================

/**
 * Menangani pemanggilan @satpam di thread forum (merangkum, opini, review build).
 */
export async function handleForumMention({
  postId,
  commentId,
  userContent,
  authorUsername,
}: {
  postId: string;
  commentId: string;
  userContent: string;
  authorUsername: string;
}): Promise<void> {
  try {
    const [post, recentComments, satpamBot] = await Promise.all([
      prisma.post.findUnique({
        where: { id: postId },
        select: { title: true, content: true, category: true },
      }),
      prisma.comment.findMany({
        where: { postId },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { author: { select: { username: true } } },
      }),
      getOrCreateSatpamBotUser(),
    ]);

    if (!post) return;

    const threadContext = `JUDUL THREAD: "${post.title}"\nKATEGORI: ${post.category}\nISI THREAD:\n${post.content.slice(0, 800)}`;
    const debateContext = recentComments
      .reverse()
      .map((c) => `@${c.author.username || "Gamer"}: ${c.content.slice(0, 150)}`)
      .join("\n");

    const systemPrompt = [
      "Kamu adalah Satpam Horizon, AI Guardian resmi LogHorizon.",
      "Gaya bahasamu cerdas, santai, solutif, sedikit humor ala gamer Indonesia (GGWP, mabar, push rank, sepuh, gacor).",
      "Kamu baru saja dipanggil via mention @satpam oleh member di thread forum.",
      "Tugasmu: Berikan tanggapan yang sangat relevan sesuai perintah/pertanyaan user (misal: merangkum perdebatan thread, memberi opini fair, atau menilai topik diskusi).",
      "Tuliskan respon dalam 2-4 kalimat padat, jelas, dan berwibawa.",
      "Format jawaban dengan format bersih dan sopan.",
    ].join("\n");

    const userPrompt = [
      `KONTEKS THREAD FORUM:`,
      threadContext,
      "",
      `DISKUSI TERAKHIR:`,
      debateContext || "(Belum ada komentar lain)",
      "",
      `PESAN PEMANGGIL DARI @${authorUsername}:`,
      userContent,
      "",
      `Berikan jawabanmu sekarang:`,
    ].join("\n");

    const reply = await callGemini(userPrompt, systemPrompt, 350);

    // Simpan komentar balasan bot di database (dikaitkan ke parentId komentar pemanggil)
    await prisma.comment.create({
      data: {
        postId,
        authorId: satpamBot.id,
        parentId: commentId,
        content: `🛡️ **[SATPAM HORIZON // AI GUARDIAN]**\n\n${reply}`,
      },
    });
  } catch (err) {
    console.error("[satpam-guardian] Error in handleForumMention:", err);
  }
}

// =========================================================================
// 4. MENTION @satpam DI LOBBY MATCH TURNAMEN (ASISTEN WASIT RESMI)
// =========================================================================

/**
 * Menangani pemanggilan @satpam di Match Lobby Chat turnamen berdasarkan Buku Peraturan Resmi.
 */
export async function handleMatchLobbyMention({
  tournamentId,
  matchId,
  userMessage,
  senderUsername,
}: {
  tournamentId: string;
  matchId: string;
  userMessage: string;
  senderUsername: string;
}): Promise<void> {
  try {
    const [tournament, satpamBot] = await Promise.all([
      prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { title: true, game: true, format: true, rules: true },
      }),
      getOrCreateSatpamBotUser(),
    ]);

    if (!tournament) return;

    const systemPrompt = [
      "Kamu adalah Satpam Horizon bertindak sebagai Asisten Wasit AI Resmi Turnamen LogHorizon.",
      "Tugasmu adalah memberikan klarifikasi peraturan resmi pertandingan secara tegas, adil, dan objektif.",
      "",
      "BUKU PERATURAN RESMI TURNAMEN LOGHORIZON:",
      "1. Toleransi Keterlambatan: Maksimal 12 menit dari jadwal match. Melebihi 12 menit = Lawan yang hadir berhak klaim MENANG WO.",
      "2. Pelanggaran Radio / Chat All: Dilarang provokasi / toxic di Chat All / Radio. Tim yang dirugikan WAJIB screenshot bukti dan SEGERA SURRENDER sebelum pertandingan selesai, lalu lapor ke panitia/wasit untuk klaim MENANG DQ.",
      "3. Format Pertandingan: Babak kualifikasi menggunakan Best of 1 (BO1), sedangkan Semifinal & Grand Final menggunakan Best of 3 (BO3) / BO5.",
      "4. Pergantian Roster/Cadangan: Wajib dilaporkan ke panitia minimal 30 menit sebelum jadwal pertandingan dimulai.",
      "5. Keputusan Panitia & Wasit bersifat mutlak.",
      "",
      "Jawablah dengan nada wasit profesional, tegas, dan jelas (2-4 kalimat).",
    ].join("\n");

    const userPrompt = [
      `TURNAMEN: ${tournament.title} (${tournament.game})`,
      `MATCH ID: #${matchId}`,
      `KAPTEN/PEMAIN @${senderUsername} BERTANYA:`,
      userMessage,
      "",
      `Jawab berdasarkan Peraturan Resmi:`,
    ].join("\n");

    const reply = await callGemini(userPrompt, systemPrompt, 280);

    await prisma.matchMessage.create({
      data: {
        tournamentId,
        matchId,
        senderId: satpamBot.id,
        content: `🛡️ **[WASIT AI // SATPAM HORIZON]**\n\n${reply}`,
        roleLabel: "[🛡️ WASIT AI]",
      },
    });
  } catch (err) {
    console.error("[satpam-guardian] Error in handleMatchLobbyMention:", err);
  }
}

// =========================================================================
// 5. MENTION @satpam DI GROUP / PM CHAT (ASISTEN PARTY & JADWAL)
// =========================================================================

/**
 * Menangani pemanggilan @satpam di PM / Group Chat (/messages).
 */
export async function handleDirectMessageMention({
  conversationId,
  userMessage,
  senderUsername,
}: {
  conversationId: string;
  userMessage: string;
  senderUsername: string;
}): Promise<void> {
  try {
    const [satpamBot, upcomingTournaments] = await Promise.all([
      getOrCreateSatpamBotUser(),
      prisma.tournament.findMany({
        where: { status: { in: ["OPEN", "REGISTRATION", "ONGOING"] } },
        select: { title: true, game: true, eventDate: true, prizePool: true },
        take: 3,
        orderBy: { eventDate: "asc" },
      }),
    ]);

    // Pastikan bot terdaftar sebagai partisipan obrolan
    const isMember = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: satpamBot.id,
        },
      },
    });

    if (!isMember) {
      await prisma.conversationParticipant.create({
        data: {
          conversationId,
          userId: satpamBot.id,
        },
      }).catch(() => {});
    }

    const tournamentBrief = upcomingTournaments.length > 0
      ? upcomingTournaments.map((t) => `• ${t.title} (${t.game}) - Hadiah: ${t.prizePool || "Prizepool Komunitas"} [${new Date(t.eventDate).toLocaleDateString("id-ID")}]`).join("\n")
      : "Belum ada turnamen baru yang dijadwalkan minggu ini.";

    const systemPrompt = [
      "Kamu adalah Satpam Horizon, AI Companion & Party Assistant di obrolan guild LogHorizon.",
      "Gaya bicaramu asik, suportif, dan membantu petualang menyusun strategi mabar, komposisi role, atau memberi info jadwal turnamen.",
      `Data Turnamen Aktif saat ini:\n${tournamentBrief}`,
      "Jawab pertanyaan user secara ringkas dan ramah (2-3 kalimat).",
    ].join("\n");

    const reply = await callGemini(
      `Pesan dari @${senderUsername}: "${userMessage}"`,
      systemPrompt,
      250
    );

    await prisma.directMessage.create({
      data: {
        conversationId,
        senderId: satpamBot.id,
        content: `🛡️ **[SATPAM AI]**\n\n${reply}`,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  } catch (err) {
    console.error("[satpam-guardian] Error in handleDirectMessageMention:", err);
  }
}
