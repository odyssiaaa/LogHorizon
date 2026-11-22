import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sendDiscordChannelMessage, getBaseAppUrl, DiscordChannelKey, DiscordEmbed } from "@/lib/discord-bot";

export async function POST(request: Request) {
  const access = await requireStaff(["ADMIN"]);
  if (access.response) return access.response;

  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const content = typeof data.content === "string" ? data.content.trim() : "";
  const imageUrl = typeof data.imageUrl === "string" && /^https?:\/\//i.test(data.imageUrl) ? data.imageUrl.trim() : null;
  const targetChannel: DiscordChannelKey = data.targetChannel === "mod_logs" ? "mod_logs" : "announcements";
  const category = typeof data.category === "string" ? data.category.trim() : "";
  const affectedModules = typeof data.affectedModules === "string" ? data.affectedModules.trim() : "";
  const publishToWeb = typeof data.publishToWeb === "boolean" ? data.publishToWeb : targetChannel === "announcements";

  if (!title || title.length > 180 || !content || content.length > 10000) {
    return Response.json({ error: "Judul dan isi laporan/pengumuman wajib diisi (maksimal 180 dan 10.000 karakter)." }, { status: 400 });
  }

  const now = new Date();
  let announcement = null;

  // Jika diminta publish ke web (Banner/News)
  if (publishToWeb) {
    const rawDuration = typeof data.durationHours === "number" ? data.durationHours : 48;
    const durationHours = Math.min(720, Math.max(1, rawDuration));
    const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
    const showAsPopup = data.showAsPopup === false ? false : true;

    announcement = await prisma.announcement.create({
      data: {
        authorId: access.user.id,
        title,
        content,
        createdAt: now,
        expiresAt,
        showAsPopup,
      },
      include: {
        author: { select: { username: true } },
      },
    });

    // Kirim notifikasi sistem ke seluruh member aktif jika target publik
    if (targetChannel === "announcements") {
      try {
        const allUsers = await prisma.user.findMany({
          where: { isBanned: false },
          select: { id: true },
          take: 500,
        });
        if (allUsers.length) {
          await prisma.notification.createMany({
            data: allUsers.map((u) => ({
              userId: u.id,
              type: "SYSTEM",
              message: `📢 PENGUMUMAN RESMI: ${title}`,
              link: "/",
            })),
            skipDuplicates: true,
          });
        }
      } catch (err) {
        console.error("[broadcast] Failed to broadcast notification:", err);
      }
    }
  }

  // Format tanggal WIB
  const wibDate = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(now) + " WIB";

  const baseUrl = getBaseAppUrl();

  // Konstruksi Embed Discord
  let embed: DiscordEmbed;
  let messageContent = "";

  if (targetChannel === "mod_logs") {
    // Mode Laporan Update / Maintenance Khusus Staf (#mod-logs)
    let embedColor = 0x7c3aed;
    const catLower = category.toLowerCase();
    if (catLower.includes("keamanan") || catLower.includes("security")) {
      embedColor = 0xef4444; // Merah
    } else if (catLower.includes("fitur") || catLower.includes("feat")) {
      embedColor = 0x10b981; // Hijau
    } else if (catLower.includes("bug") || catLower.includes("fix")) {
      embedColor = 0x3b82f6; // Biru
    } else if (catLower.includes("ui") || catLower.includes("ux")) {
      embedColor = 0x8b5cf6; // Ungu Terang
    } else if (catLower.includes("maintenance") || catLower.includes("pemeliharaan")) {
      embedColor = 0xf59e0b; // Amber
    }

    embed = {
      title: "🚀 LOGHORIZON SYSTEM UPDATE // RINCIAN PERUBAHAN",
      description: `Laporan pembaruan sistem dan maintenance baru saja dikirimkan oleh Admin **@${access.user.username || "Admin"}**.`,
      color: embedColor,
      fields: [
        {
          name: "🏷️ Kategori Update",
          value: `**${category || "🔧 Maintenance & Pembaruan Sistem"}**`,
          inline: true,
        },
        {
          name: "📌 Judul Update",
          value: `**${title}**`,
          inline: true,
        },
        {
          name: "🧩 Modul Terdampak",
          value: `**${affectedModules || "Platform Umum & Infrastruktur"}**`,
          inline: false,
        },
        {
          name: "📝 Rincian Penjelasan Update",
          value: content.slice(0, 1024),
          inline: false,
        },
        {
          name: "👤 Dilaporkan Oleh",
          value: `@${access.user.username || "Admin"} (Staff Council)`,
          inline: true,
        },
        {
          name: "⏰ Waktu Lapor (WIB)",
          value: wibDate,
          inline: true,
        },
        {
          name: "🌐 Cek Website Live",
          value: "[loghorizon.vercel.app](https://loghorizon.vercel.app/) • Status: Live & Ready",
          inline: false,
        },
      ],
      footer: {
        text: "LogHorizon Admin Dispatch • #mod-logs (1547552557868777552)",
      },
      timestamp: now.toISOString(),
      ...(imageUrl ? { image: { url: imageUrl } } : {}),
    };

    messageContent = `📢 **[MANUAL UPDATE REPORT]** Laporan rincian update terbaru telah dikirimkan ke \`#🛡️・mod-logs\`:`;
  } else {
    // Mode Pengumuman Publik (#announcements)
    embed = {
      title: title.slice(0, 256),
      description: content.slice(0, 4000),
      color: 0x9d4edd,
      url: `${baseUrl}/news`,
      fields: affectedModules ? [{ name: "🧩 Modul Terdampak", value: affectedModules, inline: false }] : undefined,
      ...(imageUrl ? { image: { url: imageUrl } } : {}),
      footer: { text: "LogHorizon Guild Dispatch • #announcements" },
      timestamp: now.toISOString(),
    };

    messageContent = `@everyone 📢 **WARTA RESMI GUILD LOGHORIZON**\n\n**${title}**\n\n${content}\n\n*• Emperor & Council LogHorizon*`;
  }

  const botResult = await sendDiscordChannelMessage(targetChannel, {
    content: messageContent,
    embeds: [embed],
    allowed_mentions: targetChannel === "announcements" ? { parse: ["everyone"] } : { parse: [] },
  });

  return Response.json(
    {
      announcement,
      notificationSent: botResult.success,
      channel: botResult.channelName,
      warning: botResult.success
        ? undefined
        : `Laporan berhasil disimpan, namun bot Discord melaporkan: ${botResult.error || "Gagal kirim ke channel"}`,
    },
    { status: 201 }
  );
}
