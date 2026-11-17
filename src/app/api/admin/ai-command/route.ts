import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { isGuildOwner } from "@/lib/caste";
import { sendDiscordNotice } from "@/lib/discord-webhook";
import { createNotification } from "@/lib/notifications";
import { DonationStatus, Role, TournamentStatus } from "@prisma/client";

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
      {
        name: "updateTournamentConfig",
        description: "Mengubah konfigurasi turnamen di database (biaya pendaftaran entryFee, hadiah prizePool, judul title, atau status fase)",
        parameters: {
          type: "OBJECT",
          properties: {
            tournamentQuery: { type: "STRING", description: "Nama atau kata kunci turnamen yang dicari (contoh: 'S1', 'Mobile Legends', 'Valorant')" },
            entryFee: { type: "NUMBER", description: "Biaya pendaftaran per tim dalam Rupiah (0 jika gratis)" },
            prizePool: { type: "STRING", description: "Total hadiah turnamen (contoh: 'Rp 2.500.000 + E-Certificate')" },
            title: { type: "STRING", description: "Judul baru turnamen" },
            status: { type: "STRING", enum: ["REGISTRATION", "ONGOING", "COMPLETED"], description: "Status fase turnamen" }
          },
          required: ["tournamentQuery"]
        }
      },
      {
        name: "updateSiteSettings",
        description: "Mengubah konfigurasi website (SiteConfig) seperti aiKnowledgeBase, discordInviteUrl, discordWebhookUrl, rekberFee, statMembers",
        parameters: {
          type: "OBJECT",
          properties: {
            aiKnowledgeBase: { type: "STRING", description: "Instruksi khusus dan ingatan AI knowledge base" },
            discordInviteUrl: { type: "STRING", description: "Link invite server Discord resmi guild" },
            discordWebhookUrl: { type: "STRING", description: "URL webhook notifikasi otomatis Discord" },
            statMembers: { type: "STRING", description: "Teks statistik member di landing page (cth: '1,500+')" },
            rekberFee: { type: "NUMBER", description: "Biaya jasa rekber dalam Rupiah" },
            minDonation: { type: "NUMBER", description: "Nominal minimal donasi dalam Rupiah" }
          }
        }
      },
      {
        name: "sendBroadcastAnnouncement",
        description: "Membuat pengumuman broadcast resmi baru yang akan tampil di Beranda dan dikirim ke channel Discord guild",
        parameters: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING", description: "Judul pengumuman resmi" },
            content: { type: "STRING", description: "Isi pesan lengkap pengumuman resmi" }
          },
          required: ["title", "content"]
        }
      },
      {
        name: "manageUserRoleOrXP",
        description: "Mengubah pangkat role member (ADMIN/MODERATOR/MEMBER), atau menambah/mengurangi XP member. Pangkat Owner .odyssia tidak dapat diubah.",
        parameters: {
          type: "OBJECT",
          properties: {
            username: { type: "STRING", description: "Username akun member yang akan diubah" },
            role: { type: "STRING", enum: ["MEMBER", "MODERATOR", "ADMIN"], description: "Pangkat baru member" },
            xpDelta: { type: "NUMBER", description: "Jumlah penambahan (positif) atau pengurangan (negatif) XP" },
            customTitle: { type: "STRING", description: "Gelar kasta khusus (opsional)" }
          },
          required: ["username"]
        }
      },
      {
        name: "approvePendingItems",
        description: "Menyetujui (ACC) antrean donasi kas QRIS atau pendaftaran tim turnamen yang masih PENDING berdasarkan nama pengirim atau nama tim",
        parameters: {
          type: "OBJECT",
          properties: {
            itemType: { type: "STRING", enum: ["DONATION", "TOURNAMENT_PARTICIPANT"], description: "Tipe antrean pending yang akan disetujui" },
            identifier: { type: "STRING", description: "Nama pengirim donasi, username donatur, atau nama tim turnamen" }
          },
          required: ["itemType", "identifier"]
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

  // 3. Gather Live Admin Context for Gemini
  const [tournaments, siteConfig, pendingDonations, pendingParticipants, totalUsers] = await Promise.all([
    prisma.tournament.findMany({
      select: { id: true, title: true, game: true, entryFee: true, prizePool: true, status: true },
      take: 10,
      orderBy: { eventDate: "desc" },
    }),
    prisma.siteConfig.findUnique({ where: { id: "default" } }),
    prisma.donation.findMany({
      where: { status: DonationStatus.PENDING },
      select: { id: true, amount: true, senderName: true, createdAt: true, user: { select: { username: true } } },
      take: 5,
    }),
    prisma.participant.findMany({
      where: { paymentStatus: "PENDING" },
      select: { id: true, teamName: true, senderName: true, tournament: { select: { title: true } } },
      take: 5,
    }),
    prisma.user.count(),
  ]);

  const contextPrompt = `Konteks Live Database LogHorizon saat ini:
- Total Member Terdaftar: ${totalUsers} member
- Turnamen Aktif/Tersedia:
${tournaments.map((t) => `  * [ID: ${t.id}] "${t.title}" (${t.game}) - Biaya: Rp ${t.entryFee.toLocaleString("id-ID")} - Hadiah: ${t.prizePool} - Status: ${t.status}`).join("\n") || "  (Belum ada turnamen)"}
- Antrean Donasi QRIS Pending: ${pendingDonations.length} item (${pendingDonations.map((d) => `Pengirim "${d.senderName || d.user?.username}" Rp ${d.amount.toLocaleString("id-ID")}`).join(", ") || "Tidak ada"})
- Antrean Pendaftaran Turnamen Pending: ${pendingParticipants.length} tim (${pendingParticipants.map((p) => `Tim "${p.teamName}" di "${p.tournament.title}"`).join(", ") || "Tidak ada"})
- Pengaturan Website: Discord="${siteConfig?.discordInviteUrl || "-"}", RekberFee="Rp ${siteConfig?.rekberFee?.toLocaleString("id-ID") || "-"}"
`;

  const systemPrompt = `Kamu adalah "AI Admin Command Assistant" LogHorizon, asisten kendali otomatis khusus jajaran pimpinan tertinggi (Emperor .odyssia, Prince/Princess, dan Grand Chancellor).
Tugasmu adalah menganalisis instruksi dari Admin dan memanggil function/tool yang sesuai untuk mengubah database secara akurat.

Aturan Penting:
1. Jika instruksi meminta mengubah turnamen, panggil "updateTournamentConfig". Cocokkan nama turnamen dengan data di konteks.
2. Jika instruksi meminta mengubah link Discord, webhook, biaya rekber, atau knowledge base AI, panggil "updateSiteSettings".
3. Jika instruksi meminta mengirim broadcast pengumuman resmi, panggil "sendBroadcastAnnouncement".
4. Jika instruksi meminta mengubah pangkat role atau XP member, panggil "manageUserRoleOrXP". Akun Founder/Emperor .odyssia tidak dapat diubah oleh siapapun.
5. Jika instruksi meminta meng-ACC atau menyetujui donasi/pendaftaran, panggil "approvePendingItems".
6. Jika instruksi hanya pertanyaan info biasa (cth: "berapa total member?", "ada berapa pending?"), jawablah secara ringkas, ramah, dan taktis dalam bahasa Indonesia tanpa memanggil tool.

${contextPrompt}`;

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return jsonError("GEMINI_API_KEY belum dikonfigurasi di server.", 500);
  }

  // 4. Call Gemini with Tools
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

      // Check if Gemini invoked a function call
      if (part?.functionCall) {
        const { name, args } = part.functionCall;
        const toolResult = await executeToolAction(name, args as ToolArgs, currentUser, false);
        return Response.json(toolResult);
      }

      // Check text response
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
 * Tool Executor with Safety Guard & Confirmation Mechanism
 */
async function executeToolAction(
  toolName: string,
  args: ToolArgs,
  adminUser: { id: string; username: string | null; name: string | null },
  isConfirmed = false
) {
  // TOOL 1: updateTournamentConfig
  if (toolName === "updateTournamentConfig") {
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
      return {
        success: false,
        reply: `Turnamen dengan kata kunci "${query}" tidak ditemukan di database.`,
        toolResult: null,
      };
    }

    const before = {
      title: tournament.title,
      entryFee: `Rp ${tournament.entryFee.toLocaleString("id-ID")}`,
      prizePool: tournament.prizePool || "-",
      status: tournament.status,
    };

    const updateData: {
      entryFee?: number;
      isFreeEntry?: boolean;
      prizePool?: string;
      title?: string;
      status?: TournamentStatus;
    } = {};

    if (typeof args.entryFee === "number") {
      updateData.entryFee = Math.max(0, args.entryFee);
      updateData.isFreeEntry = args.entryFee === 0;
    }
    if (typeof args.prizePool === "string" && args.prizePool.trim()) {
      updateData.prizePool = args.prizePool.trim();
    }
    if (typeof args.title === "string" && args.title.trim()) {
      updateData.title = args.title.trim();
    }
    if (typeof args.status === "string" && ["REGISTRATION", "ONGOING", "COMPLETED"].includes(args.status)) {
      updateData.status = args.status as TournamentStatus;
    }

    const updated = await prisma.tournament.update({
      where: { id: tournament.id },
      data: updateData,
    });

    const after = {
      title: updated.title,
      entryFee: `Rp ${updated.entryFee.toLocaleString("id-ID")}`,
      prizePool: updated.prizePool || "-",
      status: updated.status,
    };

    return {
      success: true,
      reply: `Konfigurasi turnamen "${updated.title}" berhasil diperbarui.`,
      toolResult: {
        action: "updateTournamentConfig",
        summary: `Update Turnamen "${updated.title}"`,
        before,
        after,
        details: `Perubahan berhasil disimpan ke database.`,
      },
      requiresConfirmation: false,
    };
  }

  // TOOL 2: updateSiteSettings
  if (toolName === "updateSiteSettings") {
    const existing = await prisma.siteConfig.findUnique({ where: { id: "default" } });
    const before = {
      discordInviteUrl: existing?.discordInviteUrl || "-",
      discordWebhookUrl: existing?.discordWebhookUrl ? "Tersambung (Tersembunyi)" : "Belum Diatur",
      rekberFee: existing ? `Rp ${existing.rekberFee.toLocaleString("id-ID")}` : "-",
      aiKnowledgeBase: existing?.aiKnowledgeBase ? `${existing.aiKnowledgeBase.slice(0, 60)}...` : "(Kosong)",
    };

    const updated = await prisma.siteConfig.upsert({
      where: { id: "default" },
      update: {
        ...(typeof args.aiKnowledgeBase === "string" ? { aiKnowledgeBase: args.aiKnowledgeBase.trim() } : {}),
        ...(typeof args.discordInviteUrl === "string" ? { discordInviteUrl: args.discordInviteUrl.trim() } : {}),
        ...(typeof args.discordWebhookUrl === "string" ? { discordWebhookUrl: args.discordWebhookUrl.trim() } : {}),
        ...(typeof args.statMembers === "string" ? { statMembers: args.statMembers.trim() } : {}),
        ...(typeof args.rekberFee === "number" ? { rekberFee: Math.max(0, args.rekberFee) } : {}),
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
      aiKnowledgeBase: updated.aiKnowledgeBase ? `${updated.aiKnowledgeBase.slice(0, 60)}...` : "(Kosong)",
    };

    return {
      success: true,
      reply: "Pengaturan website (SiteConfig) berhasil diperbarui secara otomatis.",
      toolResult: {
        action: "updateSiteSettings",
        summary: "Perubahan Pengaturan Website & AI",
        before,
        after,
        details: "Pengaturan CMS dan integrasi Discord telah disimpan.",
      },
      requiresConfirmation: false,
    };
  }

  // TOOL 3: sendBroadcastAnnouncement
  if (toolName === "sendBroadcastAnnouncement") {
    const title = String(args.title || "").trim();
    const content = String(args.content || "").trim();

    if (!title || !content) {
      return { success: false, reply: "Judul dan isi broadcast wajib diisi.", toolResult: null };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 jam

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
      reply: `Broadcast "${title}" telah berhasil dipublikasikan ke Landing Page dan dikirimkan ke Discord guild!`,
      toolResult: {
        action: "sendBroadcastAnnouncement",
        summary: `Broadcast Pengumuman: ${title}`,
        before: { status: "Draf" },
        after: { status: "Tayang di Landing Page & Discord", id: announcement.id },
        details: `Konten: "${content.slice(0, 150)}..."`,
      },
      requiresConfirmation: false,
    };
  }

  // TOOL 4: manageUserRoleOrXP
  if (toolName === "manageUserRoleOrXP") {
    const username = String(args.username || "").trim();
    const targetUser = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      select: { id: true, username: true, role: true, xp: true, level: true, email: true, discordId: true },
    });

    if (!targetUser) {
      return { success: false, reply: `Member @${username} tidak ditemukan.`, toolResult: null };
    }

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

    // 1-Click Confirmation required for Role changes (promoting/demoting staff)
    if (newRole && newRole !== targetUser.role && !isConfirmed) {
      return {
        success: true,
        reply: `⚠️ Perubahan jabatan untuk @${targetUser.username} dari "${targetUser.role}" menjadi "${newRole}" terdeteksi sebagai aksi krusial. Harap periksa dan tekan tombol konfirmasi.`,
        requiresConfirmation: true,
        actionType: "ROLE_CHANGE",
        summary: `Ubah pangkat @${targetUser.username} dari ${targetUser.role} ➡️ ${newRole}`,
        payload: {
          tool: "manageUserRoleOrXP",
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
        action: "manageUserRoleOrXP",
        summary: `Update Akun @${updatedUser.username}`,
        before,
        after,
        details: newRole ? `Pangkat berhasil diubah menjadi ${newRole}.` : `XP berhasil disesuaikan (${xpDelta >= 0 ? `+${xpDelta}` : xpDelta}).`,
      },
      requiresConfirmation: false,
    };
  }

  // TOOL 5: approvePendingItems
  if (toolName === "approvePendingItems") {
    const itemType = String(args.itemType || "").toUpperCase();
    const identifier = String(args.identifier || "").trim();

    if (itemType === "DONATION") {
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
        return {
          success: false,
          reply: `Donasi pending dengan pencarian "${identifier}" tidak ditemukan.`,
          toolResult: null,
        };
      }

      await prisma.$transaction(async (tx) => {
        await tx.donation.update({
          where: { id: donation.id },
          data: { status: DonationStatus.APPROVED, completedAt: new Date() },
        });

        if (donation.userId) {
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
              message: `Donasi kas guild Rp ${donation.amount.toLocaleString("id-ID")} berhasil diverifikasi oleh Satpam AI Command. Terima kasih atas dukungannya!`,
              link: "/donate",
            },
          });
        }
      });

      return {
        success: true,
        reply: `Donasi sebesar Rp ${donation.amount.toLocaleString("id-ID")} dari "${donation.senderName || donation.user?.username}" berhasil diverifikasi dan disetujui!`,
        toolResult: {
          action: "approvePendingItems",
          summary: `ACC Donasi QRIS: Rp ${donation.amount.toLocaleString("id-ID")}`,
          before: { status: "PENDING" },
          after: { status: "APPROVED", completedAt: "Sekarang" },
          details: `Kasta & XP member telah diperbarui otomatis.`,
        },
        requiresConfirmation: false,
      };
    }

    if (itemType === "TOURNAMENT_PARTICIPANT") {
      const participant = await prisma.participant.findFirst({
        where: {
          paymentStatus: "PENDING",
          OR: [
            { id: { equals: identifier } },
            { teamName: { contains: identifier, mode: "insensitive" } },
            { leader: { username: { contains: identifier, mode: "insensitive" } } },
          ],
        },
        include: { tournament: true, leader: true },
      });

      if (!participant) {
        return {
          success: false,
          reply: `Pendaftaran turnamen pending dengan pencarian "${identifier}" tidak ditemukan.`,
          toolResult: null,
        };
      }

      await prisma.participant.update({
        where: { id: participant.id },
        data: { paymentStatus: "APPROVED" },
      });

      void createNotification({
        userId: participant.leaderId,
        type: "SYSTEM",
        message: `Pendaftaran tim "${participant.teamName}" di "${participant.tournament.title}" telah disetujui oleh Admin Command!`,
        link: `/events/turnamen/${participant.tournamentId}`,
      });

      return {
        success: true,
        reply: `Pendaftaran tim "${participant.teamName}" untuk turnamen "${participant.tournament.title}" berhasil di-ACC!`,
        toolResult: {
          action: "approvePendingItems",
          summary: `ACC Tim Turnamen: "${participant.teamName}"`,
          before: { paymentStatus: "PENDING" },
          after: { paymentStatus: "APPROVED" },
          details: `Kapten tim @${participant.leader.username} telah menerima notifikasi resmi.`,
        },
        requiresConfirmation: false,
      };
    }

    return { success: false, reply: `Tipe item pending "${itemType}" tidak dikenal.`, toolResult: null };
  }

  return { success: false, reply: `Tool "${toolName}" tidak terdaftar.`, toolResult: null };
}
