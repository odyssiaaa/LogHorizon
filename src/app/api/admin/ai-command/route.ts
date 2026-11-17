import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { isGuildOwner } from "@/lib/caste";
import { notifyNewLfgParty, sendDiscordNotice } from "@/lib/discord-webhook";
import { createNotification } from "@/lib/notifications";
import { logSecurityIncident } from "@/lib/satpam-guardian";
import { generateTemplateBracket, shuffleArray, advanceMatchWinner, updateMatchStatus, TournamentMatch, TournamentTeam, TournamentLossReason } from "@/lib/tournament";
import { DonationStatus, EscrowStatus, LfgStatus, PostCategory, Prisma, Role, TournamentStatus } from "@prisma/client";

const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.8-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      // 1. Modul Turnamen & Bagan
      {
        name: "createTournament",
        description: "Membuat turnamen kompetisi baru lengkap dengan bracket otomatis di database",
        parameters: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING", description: "Judul turnamen (contoh: 'LogHorizon MLBB Championship S2')" },
            game: { type: "STRING", description: "Nama game (contoh: 'Mobile Legends', 'Valorant', 'PUBG Mobile')" },
            prizePool: { type: "STRING", description: "Total hadiah turnamen (contoh: 'Rp 2.500.000 + E-Certificate')" },
            entryFee: { type: "NUMBER", description: "Biaya pendaftaran per tim dalam Rupiah (0 untuk Free Entry)" },
            maxSlots: { type: "NUMBER", description: "Jumlah slot tim bracket (contoh: 4, 8, 16, 32). Default: 8" },
            mainPlayersCount: { type: "NUMBER", description: "Jumlah pemain inti per tim (default: 5)" },
            subPlayersCount: { type: "NUMBER", description: "Jumlah pemain cadangan (default: 1)" },
            eventDate: { type: "STRING", description: "Tanggal & waktu pelaksanaan turnamen (ISO atau string tanggal)" },
            rules: { type: "STRING", description: "Aturan khusus turnamen (opsional)" }
          },
          required: ["title", "game", "prizePool"]
        }
      },
      {
        name: "updateTournament",
        description: "Mengubah detail atau fase turnamen (judul, biaya entryFee, hadiah prizePool, status, aturan, atau jadwal)",
        parameters: {
          type: "OBJECT",
          properties: {
            tournamentQuery: { type: "STRING", description: "Nama, kata kunci, atau ID turnamen yang dicari" },
            title: { type: "STRING", description: "Judul baru turnamen" },
            entryFee: { type: "NUMBER", description: "Biaya pendaftaran per tim dalam Rupiah (0 untuk gratis)" },
            prizePool: { type: "STRING", description: "Total hadiah baru turnamen" },
            status: { type: "STRING", enum: ["REGISTRATION", "ONGOING", "COMPLETED"], description: "Status fase turnamen" },
            eventDate: { type: "STRING", description: "Tanggal baru turnamen" },
            rules: { type: "STRING", description: "Aturan turnamen baru" }
          },
          required: ["tournamentQuery"]
        }
      },
      {
        name: "randomizeTournamentBracket",
        description: "Melakukan gacha atau acak ulang penempatan tim dalam bagan (bracket) turnamen",
        parameters: {
          type: "OBJECT",
          properties: {
            tournamentQuery: { type: "STRING", description: "Nama atau ID turnamen yang bagannya akan diacak ulang" }
          },
          required: ["tournamentQuery"]
        }
      },
      {
        name: "updateMatchResult",
        description: "Memperbarui skor pertandingan, menentukan tim pemenang, mengatur status LIVE/UPCOMING, atau memproses WO/DQ",
        parameters: {
          type: "OBJECT",
          properties: {
            tournamentQuery: { type: "STRING", description: "Nama atau ID turnamen tempat pertandingan berlangsung" },
            matchId: { type: "STRING", description: "ID pertandingan (contoh: 'R1-M1', 'R1-M2', 'GF-01', atau matchId di bracket)" },
            winnerTeamName: { type: "STRING", description: "Nama tim yang menang" },
            scoreA: { type: "NUMBER", description: "Skor Tim A" },
            scoreB: { type: "NUMBER", description: "Skor Tim B" },
            lossReason: { type: "STRING", enum: ["NORMAL", "WO", "DQ"], description: "Penyebab kekalahan tim lawan (NORMAL, WO, atau DQ)" },
            matchStatus: { type: "STRING", enum: ["UPCOMING", "LIVE", "COMPLETED"], description: "Status pertandingan" }
          },
          required: ["tournamentQuery", "matchId", "winnerTeamName"]
        }
      },

      // 2. Modul Forum & Berita
      {
        name: "createForumThread",
        description: "Membuat postingan atau thread diskusi baru di forum resmi guild LogHorizon",
        parameters: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING", description: "Judul thread forum" },
            content: { type: "STRING", description: "Isi lengkap pembahasan atau pengumuman thread" },
            category: { type: "STRING", enum: ["GENERAL_CHAT", "PROMOTION", "FEEDBACK"], description: "Kategori sub-forum" }
          },
          required: ["title", "content"]
        }
      },
      {
        name: "togglePinThread",
        description: "Menyematkan (pin) atau melepas pin (unpin) thread forum di atas daftar diskusi",
        parameters: {
          type: "OBJECT",
          properties: {
            threadQuery: { type: "STRING", description: "Judul atau ID thread forum yang akan disematkan/dilepas pinnya" },
            isPinned: { type: "BOOLEAN", description: "True untuk pin, false untuk unpin" }
          },
          required: ["threadQuery", "isPinned"]
        }
      },
      {
        name: "deleteContent",
        description: "Menghapus konten yang melanggar aturan (thread forum, komentar, lapak marketplace, atau ajakan mabar)",
        parameters: {
          type: "OBJECT",
          properties: {
            contentType: { type: "STRING", enum: ["FORUM_THREAD", "FORUM_COMMENT", "MARKETPLACE", "LFG_PARTY"], description: "Tipe konten yang akan dihapus" },
            identifier: { type: "STRING", description: "ID atau kata kunci judul/isi konten yang dicari" }
          },
          required: ["contentType", "identifier"]
        }
      },

      // 3. Modul Event & Mabar LFG
      {
        name: "createLfgParty",
        description: "Membuka ajakan mabar (LFG Party) baru di board event arena LogHorizon",
        parameters: {
          type: "OBJECT",
          properties: {
            game: { type: "STRING", description: "Nama game (contoh: 'Mobile Legends', 'Valorant', 'Dota 2')" },
            description: { type: "STRING", description: "Deskripsi atau kriteria pemain yang dicari" },
            maxSlots: { type: "NUMBER", description: "Total pemain yang dibutuhkan dalam party (contoh: 5)" },
            targetRank: { type: "STRING", description: "Target rank atau minimal tier (contoh: 'Mythic', 'Diamond', 'Bebas')" },
            roleNeeded: { type: "STRING", description: "Role atau posisi yang dicari (contoh: 'Roamer', 'Duelist', 'Support')" },
            playGoal: { type: "STRING", description: "Tujuan bermain (contoh: 'Push Rank', 'Mabar Santai', 'Scrym')" },
            playTime: { type: "STRING", description: "Waktu mabar (contoh: 'Malam ini 20:00 WIB', 'Sekarang')" },
            durationHours: { type: "NUMBER", description: "Masa aktif party dalam jam (1, 3, 6, 12, atau 24). Default: 24" }
          },
          required: ["game", "description"]
        }
      },

      // 4. Modul Keuangan, Donasi & Rekber
      {
        name: "approveDonation",
        description: "Menyetujui (ACC) atau menolak antrean verifikasi donasi kas QRIS",
        parameters: {
          type: "OBJECT",
          properties: {
            identifier: { type: "STRING", description: "ID donasi, nama pengirim, atau username donatur" },
            status: { type: "STRING", enum: ["APPROVED", "REJECTED"], description: "Status hasil verifikasi (APPROVED atau REJECTED)" }
          },
          required: ["identifier"]
        }
      },
      {
        name: "approveTournamentRegistration",
        description: "Menyetujui (ACC) atau menolak pendaftaran tim turnamen yang berbayar / pending",
        parameters: {
          type: "OBJECT",
          properties: {
            teamName: { type: "STRING", description: "Nama tim pendaftar turnamen" },
            tournamentQuery: { type: "STRING", description: "Nama atau ID turnamen (opsional)" },
            status: { type: "STRING", enum: ["APPROVED", "REJECTED"], description: "Status persetujuan (APPROVED atau REJECTED)" }
          },
          required: ["teamName"]
        }
      },
      {
        name: "manageRekberTicket",
        description: "Mengelola tiket transaksi rekber escrow (mengklaim sebagai wasit penengah, mencairkan dana, atau membatalkan transaksi)",
        parameters: {
          type: "OBJECT",
          properties: {
            escrowId: { type: "STRING", description: "ID transaksi rekber atau judul lapak yang diperantarai" },
            action: { type: "STRING", enum: ["CLAIM_MEDIATOR", "RELEASE_FUNDS", "CANCEL_TRANSACTION"], description: "Aksi rekber (CLAIM_MEDIATOR, RELEASE_FUNDS, atau CANCEL_TRANSACTION)" }
          },
          required: ["escrowId", "action"]
        }
      },

      // 5. Modul Member, Kasta & Staf
      {
        name: "updateUserRoleOrXp",
        description: "Mengubah pangkat role member (ADMIN/MODERATOR/MEMBER), atau menambah/mengurangi XP member. Pangkat Owner .odyssia tidak dapat diubah.",
        parameters: {
          type: "OBJECT",
          properties: {
            username: { type: "STRING", description: "Username member yang akan diubah" },
            role: { type: "STRING", enum: ["MEMBER", "MODERATOR", "ADMIN"], description: "Pangkat baru member" },
            xpDelta: { type: "NUMBER", description: "Penambahan (positif) atau pengurangan (negatif) XP" },
            customTitle: { type: "STRING", description: "Gelar kasta khusus (opsional)" }
          },
          required: ["username"]
        }
      },
      {
        name: "toggleUserBan",
        description: "Mem-ban atau melepas ban (unban) akun member. Akun Owner .odyssia dilindungi mutlak.",
        parameters: {
          type: "OBJECT",
          properties: {
            username: { type: "STRING", description: "Username akun yang akan diban atau di-unban" },
            isBanned: { type: "BOOLEAN", description: "True untuk ban, false untuk unban" },
            reason: { type: "STRING", description: "Alasan pemblokiran (opsional)" }
          },
          required: ["username", "isBanned"]
        }
      },

      // 6. Modul CMS, Sponsor, Knowledge Base & Broadcast
      {
        name: "updateSiteConfig",
        description: "Mengubah konfigurasi website (SiteConfig) seperti aiKnowledgeBase, link Discord, webhook, biaya rekber, atau counter statistik",
        parameters: {
          type: "OBJECT",
          properties: {
            aiKnowledgeBase: { type: "STRING", description: "Ingatan dan instruksi khusus knowledge base Satpam AI" },
            discordInviteUrl: { type: "STRING", description: "Link invite server Discord resmi guild" },
            discordWebhookUrl: { type: "STRING", description: "URL webhook Discord untuk notifikasi otomatis" },
            statMembers: { type: "STRING", description: "Teks counter member di landing page (cth: '1,500+')" },
            rekberFee: { type: "NUMBER", description: "Biaya jasa rekber dalam Rupiah" },
            minDonation: { type: "NUMBER", description: "Nominal minimal donasi kas" }
          }
        }
      },
      {
        name: "manageSponsor",
        description: "Menambahkan atau menghapus sponsor resmi guild LogHorizon",
        parameters: {
          type: "OBJECT",
          properties: {
            action: { type: "STRING", enum: ["ADD", "REMOVE"], description: "Aksi (ADD atau REMOVE)" },
            name: { type: "STRING", description: "Nama sponsor atau brand mitra" },
            logoUrl: { type: "STRING", description: "URL logo sponsor (opsional)" },
            websiteUrl: { type: "STRING", description: "Tautan situs resmi sponsor (opsional)" },
            tier: { type: "STRING", description: "Tier sponsor (contoh: 'Official Partner', 'Benefactor')" }
          },
          required: ["action", "name"]
        }
      },
      {
        name: "broadcastAnnouncement",
        description: "Membuat pengumuman broadcast resmi baru yang akan tampil di Beranda dan dikirim ke Discord guild",
        parameters: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING", description: "Judul pengumuman resmi" },
            content: { type: "STRING", description: "Isi lengkap pengumuman resmi" }
          },
          required: ["title", "content"]
        }
      }
    ]
  }
];

type ToolArgs = Record<string, unknown>;

export async function POST(request: Request) {
  // 1. Strict Server-Side Authentication & Role Guard
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Login diperlukan untuk mengakses fitur ini.", 401);
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, name: true, role: true, isBanned: true, email: true, discordId: true },
  });

  const isOwner = isGuildOwner(currentUser);
  const isAdmin = currentUser?.role === "ADMIN" || isOwner;

  if (!currentUser || currentUser.isBanned || !isAdmin) {
    if (currentUser) {
      void logSecurityIncident({
        userId: currentUser.id,
        username: currentUser.username ?? currentUser.name ?? "Unauthorized",
        action: "UNAUTHORIZED_ADMIN_COMMAND_ATTEMPT",
        reason: currentUser.isBanned
          ? "Akun diblokir mencoba menembak API AI Command"
          : `Percobaan akses ilegal ke AI Command Center oleh ${currentUser.role}`,
        content: `User @${currentUser.username} (Role: ${currentUser.role}, Banned: ${currentUser.isBanned}) mencoba mengakses endpoint AI Command.`,
        severity: "CRITICAL",
      });
    }
    return jsonError(
      "Akses Ditolak: Fitur AI Command & Pengaturan Inti hanya untuk Emperor, Prince/Princess, dan Grand Chancellor.",
      403
    );
  }

  const payload: unknown = await request.json();
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  // 2. Direct Confirmation Execution Handler
  if (body.confirmedPayload && typeof body.confirmedPayload === "object") {
    const cp = body.confirmedPayload as { tool: string; args: ToolArgs; confirmed?: boolean };
    const result = await executeToolAction(cp.tool, cp.args, currentUser, true);
    return Response.json(result);
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return jsonError("Perintah tidak boleh kosong.", 400);
  }

  // 3. Gather Comprehensive Live Admin Context
  const [
    tournaments,
    siteConfig,
    pendingDonations,
    pendingParticipants,
    activeEscrows,
    sponsors,
    recentPosts,
    totalUsers,
  ] = await Promise.all([
    prisma.tournament.findMany({
      select: { id: true, title: true, game: true, entryFee: true, prizePool: true, status: true, format: true },
      take: 8,
      orderBy: { eventDate: "desc" },
    }),
    prisma.siteConfig.findUnique({ where: { id: "default" } }),
    prisma.donation.findMany({
      where: { status: DonationStatus.PENDING },
      select: { id: true, amount: true, senderName: true, user: { select: { username: true } } },
      take: 5,
    }),
    prisma.participant.findMany({
      where: { paymentStatus: "PENDING" },
      select: { id: true, teamName: true, senderName: true, tournament: { select: { title: true } } },
      take: 5,
    }),
    prisma.escrowTransaction.findMany({
      where: { status: EscrowStatus.IN_ESCROW },
      select: { id: true, amount: true, post: { select: { title: true } }, claimedById: true },
      take: 5,
    }),
    prisma.sponsor.findMany({ select: { id: true, name: true, tier: true }, take: 5 }),
    prisma.post.findMany({
      where: { category: { not: PostCategory.MARKETPLACE } },
      select: { id: true, title: true, isPinned: true, category: true },
      take: 6,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
  ]);

  const contextPrompt = `Konteks Live Database LogHorizon saat ini:
- Total Member: ${totalUsers} petualang
- Turnamen Aktif/Tersedia:
${tournaments.map((t) => `  * [ID: ${t.id}] "${t.title}" (${t.game}) | Biaya: Rp ${t.entryFee.toLocaleString("id-ID")} | Hadiah: ${t.prizePool} | Status: ${t.status}`).join("\n") || "  (Belum ada turnamen)"}
- Antrean Donasi Pending: ${pendingDonations.length} donasi (${pendingDonations.map((d) => `"${d.senderName || d.user?.username}" Rp ${d.amount.toLocaleString("id-ID")}`).join(", ") || "Nihil"})
- Antrean Tim Turnamen Pending: ${pendingParticipants.length} tim (${pendingParticipants.map((p) => `Tim "${p.teamName}" di "${p.tournament.title}"`).join(", ") || "Nihil"})
- Transaksi Rekber In-Escrow: ${activeEscrows.length} transaksi (${activeEscrows.map((e) => `[ID: ${e.id}] Lapak "${e.post.title}" Rp ${e.amount.toLocaleString("id-ID")}`).join(", ") || "Nihil"})
- Sponsor Resmi: ${sponsors.map((s) => `"${s.name}" (${s.tier})`).join(", ") || "Nihil"}
- Thread Forum Terkini:
${recentPosts.map((p) => `  * [ID: ${p.id}] "${p.title}" (${p.category}) [${p.isPinned ? "PINNED" : "NORMAL"}]`).join("\n") || "  (Belum ada thread)"}
- SiteConfig: Discord="${siteConfig?.discordInviteUrl || "-"}", Webhook="${siteConfig?.discordWebhookUrl ? "Aktif" : "Kosong"}", RekberFee="Rp ${siteConfig?.rekberFee?.toLocaleString("id-ID") || "-"}"
`;

  const systemPrompt = `Kamu adalah "AI Admin Command Assistant" LogHorizon, asisten taktis berkekuatan penuh untuk jajaran kepengurusan tertinggi (Emperor .odyssia, Prince/Princess, dan Grand Chancellor).
Tugasmu adalah menganalisis instruksi Admin dan memanggil function/tool yang tepat untuk mengelola database website LogHorizon secara menyeluruh.

Panduan Pemilihan Tool:
1. Buat Turnamen baru ➡️ "createTournament"
2. Ubah Turnamen (biaya, hadiah, status, judul, jadwal) ➡️ "updateTournament"
3. Gacha/Acak bagan bracket ➡️ "randomizeTournamentBracket"
4. Update skor/status match, WO/DQ ➡️ "updateMatchResult"
5. Buat Thread Forum baru ➡️ "createForumThread"
6. Pin/Unpin Thread Forum ➡️ "togglePinThread"
7. Hapus konten (thread, komentar, lapak, LFG) ➡️ "deleteContent"
8. Buat ajakan mabar (LFG Party) ➡️ "createLfgParty"
9. ACC/Tolak Donasi Kas QRIS ➡️ "approveDonation"
10. ACC/Tolak Pendaftaran Tim Turnamen ➡️ "approveTournamentRegistration"
11. Kelola Rekber (Klaim Wasit / Cairkan Dana / Batalkan) ➡️ "manageRekberTicket"
12. Ubah Role/XP Member ➡️ "updateUserRoleOrXp" (Perlindungan: Akun .odyssia TIDAK BISA diubah)
13. Ban/Unban Member ➡️ "toggleUserBan" (Perlindungan: Akun .odyssia TIDAK BISA diban)
14. Ubah pengaturan SiteConfig / Knowledge Base AI ➡️ "updateSiteConfig"
15. Tambah/Hapus Sponsor resmi ➡️ "manageSponsor"
16. Kirim Broadcast Pengumuman ➡️ "broadcastAnnouncement"
17. Jika pertanyaan informasi biasa (analisis stats, tanya jadwal), jawablah secara ringkas dan taktis tanpa memanggil tool.

${contextPrompt}`;

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return jsonError("GEMINI_API_KEY belum dikonfigurasi di server.", 500);
  }

  // 4. Call Gemini with Full Tools
  for (const model of GEMINI_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: GEMINI_TOOLS,
        }),
      });

      if (!res.ok) {
        continue;
      }

      const json = await res.json();
      const candidate = json.candidates?.[0];
      const part = candidate?.content?.parts?.[0];

      // Check if Gemini called a tool
      if (part?.functionCall) {
        const { name, args } = part.functionCall;
        const toolResult = await executeToolAction(name, args as ToolArgs, currentUser, false);
        return Response.json(toolResult);
      }

      // Check text reply
      const textReply = part?.text?.trim() || "";
      if (textReply) {
        return Response.json({
          success: true,
          reply: textReply,
          toolResult: null,
          requiresConfirmation: false,
        });
      }
    } catch (err) {
      console.warn(`[AI-Command] Fallback from model ${model}:`, err);
    }
  }

  return jsonError("AI Command Assistant sedang sibuk atau tidak dapat memproses perintah saat ini. Silakan coba kembali.", 500);
}

/**
 * Universal Tool Executor with Full CRUD & Safety Confirmation Gate
 */
async function executeToolAction(
  toolName: string,
  args: ToolArgs,
  adminUser: { id: string; username: string | null; name: string | null },
  isConfirmed = false
) {
  // Normalize legacy tool names
  let normalizedTool = toolName;
  if (toolName === "updateTournamentConfig") normalizedTool = "updateTournament";
  if (toolName === "updateSiteSettings") normalizedTool = "updateSiteConfig";
  if (toolName === "sendBroadcastAnnouncement") normalizedTool = "broadcastAnnouncement";
  if (toolName === "manageUserRoleOrXP") normalizedTool = "updateUserRoleOrXp";
  if (toolName === "approvePendingItems") {
    normalizedTool = String(args.itemType || "").toUpperCase() === "DONATION" ? "approveDonation" : "approveTournamentRegistration";
  }

  // =========================================================================
  // 1. MODUL TURNAMEN & BAGAN
  // =========================================================================
  if (normalizedTool === "createTournament") {
    const title = String(args.title || "").trim();
    const game = String(args.game || "").trim();
    const prizePool = String(args.prizePool || "Rp 1.000.000").trim();
    const entryFee = typeof args.entryFee === "number" ? Math.max(0, args.entryFee) : 0;
    const isFreeEntry = entryFee === 0;
    const maxSlots = typeof args.maxSlots === "number" && args.maxSlots >= 2 ? Math.min(64, args.maxSlots) : 8;
    const mainPlayersCount = typeof args.mainPlayersCount === "number" ? Math.max(1, args.mainPlayersCount) : 5;
    const subPlayersCount = typeof args.subPlayersCount === "number" ? Math.max(0, args.subPlayersCount) : 1;
    const rules = typeof args.rules === "string" && args.rules.trim() ? args.rules.trim() : "Aturan standar turnamen guild LogHorizon. Menjunjung tinggi sportivitas.";

    let eventDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (typeof args.eventDate === "string" && args.eventDate.trim()) {
      const parsed = new Date(args.eventDate);
      if (!isNaN(parsed.getTime())) eventDate = parsed;
    }

    const seededTeams: TournamentTeam[] = [];
    for (let i = 1; i <= maxSlots; i++) {
      seededTeams.push({
        id: `slot-${i}`,
        teamName: `Slot ${i}`,
        captainName: `Kapten ${i}`,
        players: Array.from({ length: mainPlayersCount }, (_, p) => `Pemain ${p + 1}`),
      });
    }

    const template = generateTemplateBracket(maxSlots, seededTeams);

    const tournament = await prisma.tournament.create({
      data: {
        title,
        game,
        prizePool,
        format: `${maxSlots} Tim (Single Elimination)`,
        maxSlots,
        mainPlayersCount,
        subPlayersCount,
        entryFee,
        isFreeEntry,
        rules,
        eventDate,
        status: TournamentStatus.REGISTRATION,
        teams: template.teams as unknown as Prisma.InputJsonValue,
        matches: template.matches as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      success: true,
      reply: `Turnamen "${tournament.title}" (${tournament.game}) dengan ${maxSlots} slot tim berhasil dibuat dan bracket template telah digenerate!`,
      toolResult: {
        action: "createTournament",
        summary: `Turnamen Baru: "${tournament.title}"`,
        before: { status: "Belum Dibuat" },
        after: {
          id: tournament.id,
          game: tournament.game,
          slots: `${maxSlots} Tim`,
          biaya: entryFee === 0 ? "Free Entry" : `Rp ${entryFee.toLocaleString("id-ID")}`,
          hadiah: tournament.prizePool,
          fase: "REGISTRATION",
        },
        details: `Pendaftaran telah dibuka untuk seluruh member guild.`,
      },
      requiresConfirmation: false,
    };
  }

  if (normalizedTool === "updateTournament") {
    const query = String(args.tournamentQuery || "").trim();
    const tournament = await prisma.tournament.findFirst({
      where: {
        OR: [
          { id: { equals: query } },
          { title: { contains: query, mode: "insensitive" } },
          { game: { contains: query, mode: "insensitive" } },
        ],
      },
    });

    if (!tournament) {
      return { success: false, reply: `Turnamen "${query}" tidak ditemukan.`, toolResult: null };
    }

    const before = {
      title: tournament.title,
      entryFee: tournament.entryFee === 0 ? "Free Entry" : `Rp ${tournament.entryFee.toLocaleString("id-ID")}`,
      prizePool: tournament.prizePool || "-",
      status: tournament.status,
    };

    const updateData: Prisma.TournamentUpdateInput = {};
    if (typeof args.title === "string" && args.title.trim()) updateData.title = args.title.trim();
    if (typeof args.entryFee === "number") {
      updateData.entryFee = Math.max(0, args.entryFee);
      updateData.isFreeEntry = args.entryFee === 0;
    }
    if (typeof args.prizePool === "string" && args.prizePool.trim()) updateData.prizePool = args.prizePool.trim();
    if (typeof args.status === "string" && ["REGISTRATION", "ONGOING", "COMPLETED"].includes(args.status)) {
      updateData.status = args.status as TournamentStatus;
    }
    if (typeof args.rules === "string" && args.rules.trim()) updateData.rules = args.rules.trim();
    if (typeof args.eventDate === "string") {
      const parsed = new Date(args.eventDate);
      if (!isNaN(parsed.getTime())) updateData.eventDate = parsed;
    }

    const updated = await prisma.tournament.update({
      where: { id: tournament.id },
      data: updateData,
    });

    const after = {
      title: updated.title,
      entryFee: updated.entryFee === 0 ? "Free Entry" : `Rp ${updated.entryFee.toLocaleString("id-ID")}`,
      prizePool: updated.prizePool || "-",
      status: updated.status,
    };

    return {
      success: true,
      reply: `Detail turnamen "${updated.title}" berhasil diperbarui.`,
      toolResult: {
        action: "updateTournament",
        summary: `Update Turnamen: "${updated.title}"`,
        before,
        after,
        details: "Perubahan konfigurasi disimpan ke database.",
      },
      requiresConfirmation: false,
    };
  }

  if (normalizedTool === "randomizeTournamentBracket") {
    const query = String(args.tournamentQuery || "").trim();
    const tournament = await prisma.tournament.findFirst({
      where: {
        OR: [
          { id: { equals: query } },
          { title: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        participants: {
          where: { paymentStatus: "APPROVED" },
          include: { leader: true },
        },
      },
    });

    if (!tournament) {
      return { success: false, reply: `Turnamen "${query}" tidak ditemukan.`, toolResult: null };
    }

    let realTeams: TournamentTeam[] = [];
    if (tournament.participants && tournament.participants.length >= 2) {
      realTeams = tournament.participants.map((p) => ({
        id: p.id,
        teamName: p.teamName,
        captainName: p.leader?.username ?? "Kapten",
        players: [p.leader?.username ?? "Player"],
      }));
    } else {
      const existingTeams = (tournament.teams as unknown as TournamentTeam[]) || [];
      const nonPlaceholders = existingTeams.filter((t) => t.teamName && !t.teamName.startsWith("Slot "));
      realTeams = nonPlaceholders.length > 0 ? nonPlaceholders : existingTeams;
    }

    realTeams = shuffleArray(realTeams);
    const effectiveCount = Math.max(realTeams.length, tournament.maxSlots);
    const seeded = [...realTeams];
    for (let i = seeded.length; i < effectiveCount; i++) {
      seeded.push({
        id: `slot-${i + 1}`,
        teamName: `Slot ${i + 1}`,
        captainName: `Kapten ${i + 1}`,
        players: ["Pemain 1", "Pemain 2", "Pemain 3"],
      });
    }

    const template = generateTemplateBracket(effectiveCount, seeded);

    await prisma.tournament.update({
      where: { id: tournament.id },
      data: {
        teams: template.teams as unknown as Prisma.InputJsonValue,
        matches: template.matches as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      success: true,
      reply: `Bagan turnamen "${tournament.title}" berhasil diacak ulang secara acak adil (Fisher-Yates) untuk ${template.teams.length} tim!`,
      toolResult: {
        action: "randomizeTournamentBracket",
        summary: `Gacha Bagan: "${tournament.title}"`,
        before: { bracket: "Susunan Lama" },
        after: { bracket: `Acak Selesai (${template.matches.length} Match Terbentuk)` },
        details: "Susunan bracket baru langsung aktif di halaman detail turnamen.",
      },
      requiresConfirmation: false,
    };
  }

  if (normalizedTool === "updateMatchResult") {
    const query = String(args.tournamentQuery || "").trim();
    const matchId = String(args.matchId || "").trim();
    const winnerTeamName = String(args.winnerTeamName || "").trim();
    const scoreA = typeof args.scoreA === "number" ? args.scoreA : 2;
    const scoreB = typeof args.scoreB === "number" ? args.scoreB : 0;
    const lossReason = (args.lossReason as TournamentLossReason) || "NORMAL";
    const matchStatus = (args.matchStatus as "UPCOMING" | "LIVE" | "FINISHED") || "FINISHED";

    const tournament = await prisma.tournament.findFirst({
      where: {
        OR: [
          { id: { equals: query } },
          { title: { contains: query, mode: "insensitive" } },
        ],
      },
    });

    if (!tournament) {
      return { success: false, reply: `Turnamen "${query}" tidak ditemukan.`, toolResult: null };
    }

    const rawMatches = (tournament.matches as unknown as TournamentMatch[]) || [];
    const targetMatch = rawMatches.find((m) => m.matchId === matchId);
    if (!targetMatch) {
      return { success: false, reply: `Match "${matchId}" tidak ditemukan dalam bagan turnamen "${tournament.title}".`, toolResult: null };
    }

    let updatedMatches = advanceMatchWinner(rawMatches, targetMatch.matchId, winnerTeamName, undefined, scoreA, scoreB, lossReason);
    if (matchStatus === "UPCOMING" || matchStatus === "LIVE" || matchStatus === "FINISHED") {
      updatedMatches = updateMatchStatus(updatedMatches, targetMatch.matchId, matchStatus);
    }

    await prisma.tournament.update({
      where: { id: tournament.id },
      data: {
        matches: updatedMatches as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      success: true,
      reply: `Hasil pertandingan "${targetMatch.matchId}" turnamen "${tournament.title}" berhasil diupdate. Pemenang: "${winnerTeamName}" (${scoreA} - ${scoreB}) [${lossReason}]!`,
      toolResult: {
        action: "updateMatchResult",
        summary: `Update Skor: Match ${targetMatch.matchId}`,
        before: { winner: targetMatch.winner || "TBD", status: targetMatch.matchStatus || "UPCOMING" },
        after: { winner: winnerTeamName, score: `${scoreA} - ${scoreB}`, status: matchStatus, statusLoss: lossReason },
        details: "Pemenang otomatis dimajukan ke babak selanjutnya di bagan.",
      },
      requiresConfirmation: false,
    };
  }

  // =========================================================================
  // 2. MODUL FORUM & BERITA
  // =========================================================================
  if (normalizedTool === "createForumThread") {
    const title = String(args.title || "").trim();
    const content = String(args.content || "").trim();
    const category = (args.category as PostCategory) || PostCategory.GENERAL_CHAT;

    if (!title || !content) {
      return { success: false, reply: "Judul dan konten thread forum wajib diisi.", toolResult: null };
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        category,
        authorId: adminUser.id,
      },
    });

    return {
      success: true,
      reply: `Thread forum "${post.title}" berhasil diterbitkan di sub-forum ${category}!`,
      toolResult: {
        action: "createForumThread",
        summary: `Thread Forum Baru: "${post.title}"`,
        before: { status: "Belum Ada" },
        after: { id: post.id, kategori: category, status: "Tayang di /forum" },
        details: `Member komunitas dapat langsung membaca dan berkomentar.`,
      },
      requiresConfirmation: false,
    };
  }

  if (normalizedTool === "togglePinThread") {
    const query = String(args.threadQuery || "").trim();
    const isPinned = Boolean(args.isPinned);

    const post = await prisma.post.findFirst({
      where: {
        OR: [
          { id: { equals: query } },
          { title: { contains: query, mode: "insensitive" } },
        ],
      },
    });

    if (!post) {
      return { success: false, reply: `Thread forum "${query}" tidak ditemukan.`, toolResult: null };
    }

    const updated = await prisma.post.update({
      where: { id: post.id },
      data: { isPinned },
    });

    return {
      success: true,
      reply: `Thread "${updated.title}" berhasil ${isPinned ? "disematkan (PINNED)" : "dilepas sematannya (UNPINNED)"} di forum!`,
      toolResult: {
        action: "togglePinThread",
        summary: `${isPinned ? "Sematkan" : "Lepas Pin"} Thread: "${updated.title}"`,
        before: { isPinned: post.isPinned },
        after: { isPinned: updated.isPinned },
        details: isPinned ? "Thread akan tampil di posisi teratas halaman /forum." : "Thread kembali ke urutan kronologis biasa.",
      },
      requiresConfirmation: false,
    };
  }

  if (normalizedTool === "deleteContent") {
    const contentType = String(args.contentType || "").toUpperCase();
    const identifier = String(args.identifier || "").trim();

    // Sensitive Action: 1-Click Confirmation Required!
    if (!isConfirmed) {
      return {
        success: true,
        reply: `⚠️ PENGHAPUSAN KONTEN PERMANEN: Menghapus ${contentType} dengan pencarian "${identifier}" adalah aksi sensitif. Silakan periksa ringkasan dan konfirmasi.`,
        requiresConfirmation: true,
        actionType: "DELETE_CONTENT",
        summary: `Hapus Permanen: [${contentType}] "${identifier}"`,
        payload: {
          tool: "deleteContent",
          args: { contentType, identifier },
          confirmed: true,
        },
      };
    }

    if (contentType === "FORUM_THREAD" || contentType === "MARKETPLACE") {
      const post = await prisma.post.findFirst({
        where: {
          OR: [
            { id: { equals: identifier } },
            { title: { contains: identifier, mode: "insensitive" } },
          ],
        },
      });

      if (!post) return { success: false, reply: `Konten postingan "${identifier}" tidak ditemukan.`, toolResult: null };
      await prisma.post.delete({ where: { id: post.id } });

      return {
        success: true,
        reply: `Konten post "${post.title}" berhasil dihapus permanen dari database.`,
        toolResult: {
          action: "deleteContent",
          summary: `Hapus Konten Post: "${post.title}"`,
          before: { status: "Aktif di Website" },
          after: { status: "Terhapus Permanen" },
          details: `Post ID: ${post.id}`,
        },
        requiresConfirmation: false,
      };
    }

    if (contentType === "FORUM_COMMENT") {
      const comment = await prisma.comment.findFirst({
        where: {
          OR: [
            { id: { equals: identifier } },
            { content: { contains: identifier, mode: "insensitive" } },
          ],
        },
      });

      if (!comment) return { success: false, reply: `Komentar "${identifier}" tidak ditemukan.`, toolResult: null };
      await prisma.comment.delete({ where: { id: comment.id } });

      return {
        success: true,
        reply: `Komentar forum berhasil dihapus permanen.`,
        toolResult: {
          action: "deleteContent",
          summary: `Hapus Komentar Forum`,
          before: { status: "Tayang" },
          after: { status: "Dihapus" },
          details: `ID: ${comment.id}`,
        },
        requiresConfirmation: false,
      };
    }

    if (contentType === "LFG_PARTY") {
      const lfg = await prisma.lfgPost.findFirst({
        where: {
          OR: [
            { id: { equals: identifier } },
            { game: { contains: identifier, mode: "insensitive" } },
            { description: { contains: identifier, mode: "insensitive" } },
          ],
        },
      });

      if (!lfg) return { success: false, reply: `Party LFG "${identifier}" tidak ditemukan.`, toolResult: null };
      await prisma.lfgPost.delete({ where: { id: lfg.id } });

      return {
        success: true,
        reply: `Party mabar LFG "${lfg.game}" berhasil dibatalkan dan dihapus.`,
        toolResult: {
          action: "deleteContent",
          summary: `Hapus Party LFG: ${lfg.game}`,
          before: { status: "Aktif" },
          after: { status: "Dihapus" },
          details: `ID: ${lfg.id}`,
        },
        requiresConfirmation: false,
      };
    }

    return { success: false, reply: `Tipe konten "${contentType}" tidak dikenal.`, toolResult: null };
  }

  // =========================================================================
  // 3. MODUL EVENT & MABAR LFG
  // =========================================================================
  if (normalizedTool === "createLfgParty") {
    const game = String(args.game || "").trim();
    const description = String(args.description || "").trim();
    const maxSlots = typeof args.maxSlots === "number" && args.maxSlots >= 2 ? Math.min(20, args.maxSlots) : 5;
    const targetRank = typeof args.targetRank === "string" ? args.targetRank.trim() : "Bebas";
    const roleNeeded = typeof args.roleNeeded === "string" ? args.roleNeeded.trim() : "Flex";
    const playGoal = typeof args.playGoal === "string" ? args.playGoal.trim() : "Mabar Santai";
    const playTime = typeof args.playTime === "string" ? args.playTime.trim() : "Malam ini";
    const durationHours = typeof args.durationHours === "number" ? Math.max(1, Math.min(24, args.durationHours)) : 24;

    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    const lfg = await prisma.lfgPost.create({
      data: {
        authorId: adminUser.id,
        game,
        description,
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
        maxSlots,
        targetRank,
        roleNeeded,
        playGoal,
        playTime,
        status: LfgStatus.OPEN,
        expiresAt,
      },
    });

    void notifyNewLfgParty({
      partyTitle: `${game} (${playGoal}) - Butuh ${roleNeeded}`,
      game,
      hostName: adminUser.username || "Admin Guild",
      requiredSlots: maxSlots - 1,
      modeOrRank: `${targetRank} • ${playTime}`,
    });

    return {
      success: true,
      reply: `Ajakan mabar (LFG) untuk game "${lfg.game}" berhasil dibuat dan di-broadcast ke Discord!`,
      toolResult: {
        action: "createLfgParty",
        summary: `Party LFG Baru: ${lfg.game}`,
        before: { status: "Belum Ada" },
        after: { id: lfg.id, game: lfg.game, slot: `${maxSlots} Pemain`, status: "OPEN" },
        details: `Member dapat langsung bergabung di /events?view=mabar.`,
      },
      requiresConfirmation: false,
    };
  }

  // =========================================================================
  // 4. MODUL KEUANGAN, DONASI & REKBER
  // =========================================================================
  if (normalizedTool === "approveDonation") {
    const identifier = String(args.identifier || "").trim();
    const status = String(args.status || "APPROVED").toUpperCase() === "REJECTED" ? DonationStatus.REJECTED : DonationStatus.APPROVED;

    const donation = await prisma.donation.findFirst({
      where: {
        status: DonationStatus.PENDING,
        OR: [
          { id: { equals: identifier } },
          { senderName: { contains: identifier, mode: "insensitive" } },
          { user: { username: { contains: identifier, mode: "insensitive" } } },
        ],
      },
      include: { user: true },
    });

    if (!donation) {
      return { success: false, reply: `Donasi pending "${identifier}" tidak ditemukan.`, toolResult: null };
    }

    await prisma.$transaction(async (tx) => {
      await tx.donation.update({
        where: { id: donation.id },
        data: {
          status,
          completedAt: status === DonationStatus.APPROVED ? new Date() : null,
        },
      });

      if (status === DonationStatus.APPROVED && donation.userId) {
        const badge = donation.amount >= 100_000 ? "Noble Patron" : donation.amount >= 50_000 ? "High Merchant" : "Knight";
        const currentBadges = donation.user?.badges || [];
        const nextBadges = currentBadges.includes(badge) ? currentBadges : [...currentBadges, badge];

        await tx.user.update({
          where: { id: donation.userId },
          data: {
            badges: nextBadges,
            ...(donation.amount >= 50_000 ? { isPremium: true } : {}),
          },
        });

        await tx.notification.create({
          data: {
            userId: donation.userId,
            type: "SYSTEM",
            message: `Donasi kas guild Rp ${donation.amount.toLocaleString("id-ID")} berhasil diverifikasi! Terima kasih.`,
            link: "/donate",
          },
        });
      }
    });

    return {
      success: true,
      reply: `Donasi sebesar Rp ${donation.amount.toLocaleString("id-ID")} dari "${donation.senderName || donation.user?.username}" berhasil ${status === DonationStatus.APPROVED ? "disetujui (APPROVED)" : "ditolak (REJECTED)"}!`,
      toolResult: {
        action: "approveDonation",
        summary: `${status}: Donasi Rp ${donation.amount.toLocaleString("id-ID")}`,
        before: { status: "PENDING" },
        after: { status },
        details: `Donatur: ${donation.senderName || donation.user?.username}`,
      },
      requiresConfirmation: false,
    };
  }

  if (normalizedTool === "approveTournamentRegistration") {
    const teamName = String(args.teamName || "").trim();
    const status = String(args.status || "APPROVED").toUpperCase() === "REJECTED" ? "REJECTED" : "APPROVED";

    const participant = await prisma.participant.findFirst({
      where: {
        paymentStatus: "PENDING",
        teamName: { contains: teamName, mode: "insensitive" },
      },
      include: { tournament: true, leader: true },
    });

    if (!participant) {
      return { success: false, reply: `Pendaftaran pending tim "${teamName}" tidak ditemukan.`, toolResult: null };
    }

    await prisma.participant.update({
      where: { id: participant.id },
      data: { paymentStatus: status },
    });

    void createNotification({
      userId: participant.leaderId,
      type: "SYSTEM",
      message: `Pendaftaran tim "${participant.teamName}" untuk "${participant.tournament.title}" telah ${status === "APPROVED" ? "disetujui" : "ditolak"}.`,
      link: `/events/turnamen/${participant.tournamentId}`,
    });

    return {
      success: true,
      reply: `Pendaftaran tim "${participant.teamName}" turnamen "${participant.tournament.title}" berhasil ${status}!`,
      toolResult: {
        action: "approveTournamentRegistration",
        summary: `${status}: Tim "${participant.teamName}"`,
        before: { paymentStatus: "PENDING" },
        after: { paymentStatus: status },
        details: `Turnamen: ${participant.tournament.title}`,
      },
      requiresConfirmation: false,
    };
  }

  if (normalizedTool === "manageRekberTicket") {
    const escrowId = String(args.escrowId || "").trim();
    const action = String(args.action || "CLAIM_MEDIATOR").toUpperCase();

    const escrow = await prisma.escrowTransaction.findFirst({
      where: {
        OR: [
          { id: { equals: escrowId } },
          { post: { title: { contains: escrowId, mode: "insensitive" } } },
        ],
      },
      include: { post: true, buyer: true, seller: true },
    });

    if (!escrow) {
      return { success: false, reply: `Tiket Rekber "${escrowId}" tidak ditemukan.`, toolResult: null };
    }

    // Safety Gate: Releasing funds or cancelling transaction requires 1-Click Confirmation!
    if ((action === "RELEASE_FUNDS" || action === "CANCEL_TRANSACTION") && !isConfirmed) {
      return {
        success: true,
        reply: `⚠️ TINDAKAN KEUANGAN REKBER KRUSIAL: Memproses ${action} untuk tiket rekber sebesar Rp ${escrow.amount.toLocaleString("id-ID")} memerlukan konfirmasi Admin.`,
        requiresConfirmation: true,
        actionType: "REKBER_FUNDS",
        summary: `${action === "RELEASE_FUNDS" ? "Cairkan Dana ke Penjual" : "Batalkan & Refund ke Pembeli"}: Rp ${escrow.amount.toLocaleString("id-ID")} (Lapak: "${escrow.post.title}")`,
        payload: {
          tool: "manageRekberTicket",
          args: { escrowId: escrow.id, action },
          confirmed: true,
        },
      };
    }

    if (action === "CLAIM_MEDIATOR") {
      await prisma.escrowTransaction.update({
        where: { id: escrow.id },
        data: { claimedById: adminUser.id },
      });

      return {
        success: true,
        reply: `Tiket rekber lapak "${escrow.post.title}" berhasil diklaim. Anda kini resmi menjadi wasit penengah transaksi ini.`,
        toolResult: {
          action: "manageRekberTicket",
          summary: `Klaim Wasit Rekber`,
          before: { claimedById: escrow.claimedById || "Belum Ada" },
          after: { claimedById: adminUser.id },
          details: `Lapak: ${escrow.post.title} | Nominal: Rp ${escrow.amount.toLocaleString("id-ID")}`,
        },
        requiresConfirmation: false,
      };
    }

    if (action === "RELEASE_FUNDS") {
      await prisma.$transaction([
        prisma.escrowTransaction.update({
          where: { id: escrow.id },
          data: { status: EscrowStatus.COMPLETED },
        }),
        prisma.post.update({
          where: { id: escrow.postId },
          data: {
            marketData: {
              ...(typeof escrow.post.marketData === "object" && escrow.post.marketData !== null ? (escrow.post.marketData as Record<string, unknown>) : {}),
              status: "SOLD",
            },
          },
        }),
      ]);

      void createNotification({
        userId: escrow.sellerId,
        type: "ESCROW",
        message: `Dana rekber Rp ${escrow.amount.toLocaleString("id-ID")} untuk lapak "${escrow.post.title}" telah disetujui cair oleh Admin!`,
        link: "/marketplace",
      });

      return {
        success: true,
        reply: `Dana rekber sebesar Rp ${escrow.amount.toLocaleString("id-ID")} berhasil dicairkan ke penjual @${escrow.seller.username}. Status lapak diubah menjadi SOLD.`,
        toolResult: {
          action: "manageRekberTicket",
          summary: `Cairkan Dana Rekber (COMPLETED)`,
          before: { status: escrow.status },
          after: { status: EscrowStatus.COMPLETED },
          details: `Penjual: @${escrow.seller.username} | Nilai: Rp ${escrow.amount.toLocaleString("id-ID")}`,
        },
        requiresConfirmation: false,
      };
    }

    if (action === "CANCEL_TRANSACTION") {
      await prisma.$transaction([
        prisma.escrowTransaction.update({
          where: { id: escrow.id },
          data: { status: EscrowStatus.CANCELLED },
        }),
        prisma.post.update({
          where: { id: escrow.postId },
          data: {
            marketData: {
              ...(typeof escrow.post.marketData === "object" && escrow.post.marketData !== null ? (escrow.post.marketData as Record<string, unknown>) : {}),
              status: "AVAILABLE",
            },
          },
        }),
      ]);

      void createNotification({
        userId: escrow.buyerId,
        type: "ESCROW",
        message: `Transaksi rekber untuk lapak "${escrow.post.title}" telah dibatalkan dan direfund oleh Admin.`,
        link: "/marketplace",
      });

      return {
        success: true,
        reply: `Transaksi rekber berhasil dibatalkan. Status lapak dikembalikan menjadi AVAILABLE.`,
        toolResult: {
          action: "manageRekberTicket",
          summary: `Batalkan Rekber (CANCELLED)`,
          before: { status: escrow.status },
          after: { status: EscrowStatus.CANCELLED },
          details: `Pembeli: @${escrow.buyer.username} | Nilai: Rp ${escrow.amount.toLocaleString("id-ID")}`,
        },
        requiresConfirmation: false,
      };
    }

    return { success: false, reply: `Aksi rekber "${action}" tidak dikenal.`, toolResult: null };
  }

  // =========================================================================
  // 5. MODUL MEMBER, KASTA & STAF
  // =========================================================================
  if (normalizedTool === "updateUserRoleOrXp") {
    const username = String(args.username || "").trim();
    const targetUser = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      select: { id: true, username: true, role: true, xp: true, level: true, email: true, discordId: true },
    });

    if (!targetUser) return { success: false, reply: `Member @${username} tidak ditemukan.`, toolResult: null };

    // Absolute Owner Protection
    if (isGuildOwner(targetUser)) {
      return {
        success: false,
        reply: "❌ Aksi Ditolak: Akun Founder/Emperor .odyssia dilindungi secara mutlak dan tidak dapat diturunkan atau diubah jabatannya oleh siapa pun.",
        toolResult: null,
      };
    }

    const newRole = typeof args.role === "string" && ["MEMBER", "MODERATOR", "ADMIN"].includes(args.role) ? (args.role as Role) : null;
    const xpDelta = typeof args.xpDelta === "number" ? Math.floor(args.xpDelta) : 0;

    // Safety Gate: Role change to ADMIN/MODERATOR requires 1-Click Confirmation!
    if (newRole && newRole !== targetUser.role && !isConfirmed) {
      return {
        success: true,
        reply: `⚠️ Perubahan jabatan untuk @${targetUser.username} dari "${targetUser.role}" menjadi "${newRole}" terdeteksi sebagai aksi krusial. Harap konfirmasi.`,
        requiresConfirmation: true,
        actionType: "ROLE_CHANGE",
        summary: `Ubah pangkat @${targetUser.username} dari ${targetUser.role} ➡️ ${newRole}`,
        payload: {
          tool: "updateUserRoleOrXp",
          args: { username: targetUser.username, role: newRole, xpDelta },
          confirmed: true,
        },
      };
    }

    const before = {
      username: targetUser.username,
      role: targetUser.role,
      xp: targetUser.xp,
      level: targetUser.level,
    };

    const nextXp = Math.max(0, targetUser.xp + xpDelta);
    const nextLevel = Math.max(1, Math.floor(nextXp / 1000) + 1);

    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        ...(newRole ? { role: newRole } : {}),
        ...(xpDelta !== 0 ? { xp: nextXp, level: nextLevel } : {}),
      },
    });

    const after = {
      username: updatedUser.username,
      role: updatedUser.role,
      xp: updatedUser.xp,
      level: updatedUser.level,
    };

    return {
      success: true,
      reply: `Data akun @${updatedUser.username} berhasil diperbarui.`,
      toolResult: {
        action: "updateUserRoleOrXp",
        summary: `Update Akun: @${updatedUser.username}`,
        before,
        after,
        details: newRole ? `Pangkat berhasil diubah menjadi ${newRole}.` : `XP berhasil disesuaikan (${xpDelta >= 0 ? `+${xpDelta}` : xpDelta}).`,
      },
      requiresConfirmation: false,
    };
  }

  if (normalizedTool === "toggleUserBan") {
    const username = String(args.username || "").trim();
    const isBanned = Boolean(args.isBanned);
    const reason = typeof args.reason === "string" ? args.reason.trim() : "Pelanggaran aturan guild.";

    const targetUser = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      select: { id: true, username: true, isBanned: true, role: true, email: true, discordId: true },
    });

    if (!targetUser) return { success: false, reply: `Member @${username} tidak ditemukan.`, toolResult: null };

    // Absolute Owner Protection
    if (isGuildOwner(targetUser)) {
      return {
        success: false,
        reply: "❌ Aksi Ditolak: Akun Founder/Emperor .odyssia dilindungi secara mutlak dan tidak dapat diblokir oleh siapa pun.",
        toolResult: null,
      };
    }

    // Safety Gate: Banning a user requires 1-Click Confirmation!
    if (isBanned && !isConfirmed) {
      return {
        success: true,
        reply: `⚠️ PEMBLOKIRAN AKUN: Memblokir @${targetUser.username} (${targetUser.role}) memerlukan konfirmasi langsung.`,
        requiresConfirmation: true,
        actionType: "BAN_USER",
        summary: `Pemblokiran Akun: @${targetUser.username} (Alasan: "${reason}")`,
        payload: {
          tool: "toggleUserBan",
          args: { username: targetUser.username, isBanned: true, reason },
          confirmed: true,
        },
      };
    }

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { isBanned },
    });

    return {
      success: true,
      reply: `Akun @${targetUser.username} berhasil ${isBanned ? "diblokir (BANNED)" : "dibuka blokirnya (UNBANNED)"}.`,
      toolResult: {
        action: "toggleUserBan",
        summary: `${isBanned ? "Ban Akun" : "Unban Akun"}: @${targetUser.username}`,
        before: { isBanned: targetUser.isBanned },
        after: { isBanned },
        details: isBanned ? `Alasan: ${reason}` : "Akun dapat kembali login normal.",
      },
      requiresConfirmation: false,
    };
  }

  // =========================================================================
  // 6. MODUL CMS, SPONSOR, KNOWLEDGE BASE & BROADCAST
  // =========================================================================
  if (normalizedTool === "updateSiteConfig") {
    const existing = await prisma.siteConfig.findUnique({ where: { id: "default" } });
    const before = {
      discordInviteUrl: existing?.discordInviteUrl || "-",
      discordWebhookUrl: existing?.discordWebhookUrl ? "Tersambung (Aktif)" : "Belum Diatur",
      rekberFee: existing ? `Rp ${existing.rekberFee.toLocaleString("id-ID")}` : "-",
      aiKnowledgeBase: existing?.aiKnowledgeBase ? `${existing.aiKnowledgeBase.slice(0, 50)}...` : "(Kosong)",
    };

    const updated = await prisma.siteConfig.upsert({
      where: { id: "default" },
      update: {
        ...(typeof args.aiKnowledgeBase === "string" ? { aiKnowledgeBase: args.aiKnowledgeBase.trim() } : {}),
        ...(typeof args.discordInviteUrl === "string" ? { discordInviteUrl: args.discordInviteUrl.trim() } : {}),
        ...(typeof args.discordWebhookUrl === "string" ? { discordWebhookUrl: args.discordWebhookUrl.trim() } : {}),
        ...(typeof args.statMembers === "string" ? { statMembers: args.statMembers.trim() } : {}),
        ...(typeof args.statParties === "string" ? { statParties: args.statParties.trim() } : {}),
        ...(typeof args.statVoice === "string" ? { statVoice: args.statVoice.trim() } : {}),
        ...(typeof args.rekberAccount === "string" ? { rekberAccount: args.rekberAccount.trim() } : {}),
        ...(typeof args.rekberFee === "number" ? { rekberFee: Math.max(0, args.rekberFee) } : {}),
        ...(typeof args.monthlyGoal === "number" ? { monthlyGoal: Math.max(0, args.monthlyGoal) } : {}),
        ...(typeof args.minDonation === "number" ? { minDonation: Math.max(1000, args.minDonation) } : {}),
      },
      create: {
        id: "default",
        aiKnowledgeBase: typeof args.aiKnowledgeBase === "string" ? args.aiKnowledgeBase.trim() : null,
        discordInviteUrl: typeof args.discordInviteUrl === "string" ? args.discordInviteUrl.trim() : "https://discord.gg/aJvbVyTxNb",
        discordWebhookUrl: typeof args.discordWebhookUrl === "string" ? args.discordWebhookUrl.trim() : null,
        statMembers: typeof args.statMembers === "string" ? args.statMembers.trim() : "1,200+",
        rekberFee: typeof args.rekberFee === "number" ? args.rekberFee : 5000,
        minDonation: typeof args.minDonation === "number" ? args.minDonation : 10000,
      },
    });

    const after = {
      discordInviteUrl: updated.discordInviteUrl,
      discordWebhookUrl: updated.discordWebhookUrl ? "Tersambung (Aktif)" : "Belum Diatur",
      rekberFee: `Rp ${updated.rekberFee.toLocaleString("id-ID")}`,
      aiKnowledgeBase: updated.aiKnowledgeBase ? `${updated.aiKnowledgeBase.slice(0, 50)}...` : "(Kosong)",
    };

    return {
      success: true,
      reply: "Pengaturan website (SiteConfig) berhasil diperbarui ke database.",
      toolResult: {
        action: "updateSiteConfig",
        summary: "Update SiteConfig CMS & AI",
        before,
        after,
        details: "Pengaturan CMS tersimpan dan langsung diterapkan.",
      },
      requiresConfirmation: false,
    };
  }

  if (normalizedTool === "manageSponsor") {
    const action = String(args.action || "ADD").toUpperCase();
    const name = String(args.name || "").trim();

    if (!name) return { success: false, reply: "Nama sponsor wajib diisi.", toolResult: null };

    if (action === "ADD") {
      const sponsor = await prisma.sponsor.create({
        data: {
          name,
          logoUrl: typeof args.logoUrl === "string" && args.logoUrl.trim() ? args.logoUrl.trim() : null,
          websiteUrl: typeof args.websiteUrl === "string" && args.websiteUrl.trim() ? args.websiteUrl.trim() : null,
          tier: typeof args.tier === "string" && args.tier.trim() ? args.tier.trim() : "Official Partner",
        },
      });

      return {
        success: true,
        reply: `Sponsor resmi "${sponsor.name}" (${sponsor.tier}) berhasil ditambahkan ke daftar partner guild!`,
        toolResult: {
          action: "manageSponsor",
          summary: `Tambah Sponsor: "${sponsor.name}"`,
          before: { status: "Belum Ada" },
          after: { id: sponsor.id, nama: sponsor.name, tier: sponsor.tier },
          details: "Logo sponsor akan tampil di landing page /admin & footer.",
        },
        requiresConfirmation: false,
      };
    }

    if (action === "REMOVE") {
      const existing = await prisma.sponsor.findFirst({
        where: {
          OR: [
            { id: { equals: name } },
            { name: { contains: name, mode: "insensitive" } },
          ],
        },
      });

      if (!existing) return { success: false, reply: `Sponsor "${name}" tidak ditemukan.`, toolResult: null };

      await prisma.sponsor.delete({ where: { id: existing.id } });

      return {
        success: true,
        reply: `Sponsor "${existing.name}" berhasil dihapus dari daftar mitra resmi.`,
        toolResult: {
          action: "manageSponsor",
          summary: `Hapus Sponsor: "${existing.name}"`,
          before: { status: "Aktif" },
          after: { status: "Dihapus" },
          details: `ID: ${existing.id}`,
        },
        requiresConfirmation: false,
      };
    }

    return { success: false, reply: `Aksi sponsor "${action}" tidak dikenal.`, toolResult: null };
  }

  if (normalizedTool === "broadcastAnnouncement") {
    const title = String(args.title || "").trim();
    const content = String(args.content || "").trim();

    if (!title || !content) {
      return { success: false, reply: "Judul dan isi broadcast wajib diisi.", toolResult: null };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const announcement = await prisma.announcement.create({
      data: {
        authorId: adminUser.id,
        title,
        content,
        createdAt: now,
        expiresAt,
      },
    });

    void sendDiscordNotice("announcements", title, content);

    return {
      success: true,
      reply: `Broadcast "${title}" telah dipublikasikan ke Beranda dan ditembakkan langsung ke channel Discord guild!`,
      toolResult: {
        action: "broadcastAnnouncement",
        summary: `Broadcast Resmi: ${title}`,
        before: { status: "Draf" },
        after: { id: announcement.id, status: "Tayang di Beranda & Discord" },
        details: `Konten: "${content.slice(0, 150)}..."`,
      },
      requiresConfirmation: false,
    };
  }

  return { success: false, reply: `Tool "${toolName}" tidak terdaftar.`, toolResult: null };
}
