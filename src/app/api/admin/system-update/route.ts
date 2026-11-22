import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sendDiscordChannelMessage, getBaseAppUrl, DiscordEmbed, DiscordEmbedField, DiscordChannelKey } from "@/lib/discord-bot";

export async function POST(request: Request) {
  const access = await requireStaff(["ADMIN"]);
  if (access.response) return access.response;

  // Extra zero-trust check
  const dbUser = await prisma.user.findUnique({
    where: { id: access.user.id },
    select: { id: true, username: true, role: true, isBanned: true },
  });

  if (!dbUser || dbUser.isBanned || dbUser.role !== "ADMIN") {
    return Response.json({ error: "Akses ditolak. Tindakan ini memerlukan hak akses Admin aktif." }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Format payload tidak valid." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  const updateType = typeof body.updateType === "string" ? body.updateType.toLowerCase() : "feat";
  const targetChannel: DiscordChannelKey = body.targetChannel === "announcements" ? "announcements" : "mod_logs";
  const versionTag = typeof body.versionTag === "string" && body.versionTag.trim() ? body.versionTag.trim() : "v1.4.0";

  let rawModules: string[] = [];
  if (Array.isArray(body.affectedModules)) {
    rawModules = body.affectedModules.map((m) => String(m).trim()).filter(Boolean);
  } else if (typeof body.affectedModules === "string" && body.affectedModules.trim()) {
    rawModules = body.affectedModules.split(",").map((m) => m.trim()).filter(Boolean);
  }

  const affectedModules = rawModules.length > 0 ? rawModules.join(", ") : "Semua Modul Terkait";

  if (!title || title.length > 180 || !summary || summary.length > 5000) {
    return Response.json(
      { error: "Judul (maks 180 karakter) dan rincian update (maks 5.000 karakter) wajib diisi." },
      { status: 400 }
    );
  }

  // Type metadata
  const typeMeta: Record<string, { label: string; color: number }> = {
    feat: { label: "✨ Fitur Baru Ditambahkan", color: 0x10b981 },
    fix: { label: "🐛 Perbaikan Bug & Tampilan", color: 0x3b82f6 },
    security: { label: "🛡️ Peningkatan Keamanan & Proteksi", color: 0xef4444 },
    ui: { label: "⚡ Peningkatan UI/UX & Kecepatan", color: 0x8b5cf6 },
    maintenance: { label: "🔧 Maintenance & Pembersihan Sistem", color: 0xf59e0b },
  };

  const selectedType = typeMeta[updateType] || typeMeta.feat;
  const baseUrl = getBaseAppUrl();
  const now = new Date();
  const wibDate =
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(now) + " WIB";

  const fields: DiscordEmbedField[] = [
    {
      name: "🏷️ Kategori Pembaruan",
      value: `**${selectedType.label}** (${versionTag})`,
      inline: true,
    },
    {
      name: "👑 Dilaporkan Oleh",
      value: `@${dbUser.username || "Admin"}`,
      inline: true,
    },
    {
      name: "🧩 Modul Terdampak",
      value: `**${affectedModules}**`,
      inline: false,
    },
    {
      name: "📝 Rincian Perubahan",
      value: summary.slice(0, 2048),
      inline: false,
    },
    {
      name: "⏰ Waktu Laporan (WIB)",
      value: wibDate,
      inline: true,
    },
    {
      name: "🌐 Status Website",
      value: `[Kunjungi loghorizon.vercel.app](${baseUrl}) • Status: Live & Ready`,
      inline: true,
    },
  ];

  const embed: DiscordEmbed = {
    title: `🚀 LOGHORIZON SYSTEM UPDATE: ${title}`,
    description: `Laporan rincian pembaruan sistem dan maintenance resmi dari manajemen komunitas **LogHorizon**.`,
    color: selectedType.color,
    fields,
    footer: {
      text: `LogHorizon System Update • Disiarkan oleh @${dbUser.username || "Admin"} ke #${targetChannel === "mod_logs" ? "mod-logs" : "announcements"}`,
    },
    timestamp: now.toISOString(),
  };

  const discordResult = await sendDiscordChannelMessage(targetChannel, {
    content: targetChannel === "announcements" 
      ? `@everyone 📢 **[SYSTEM UPDATE & MAINTENANCE REPORT]**\n\n**${title}** telah selesai diterapkan!`
      : `🛡️ **[SYSTEM UPDATE LOG]** Laporan pembaruan sistem baru telah dikirim oleh **@${dbUser.username}**:`,
    embeds: [embed],
    allowed_mentions: targetChannel === "announcements" ? { parse: ["everyone"] } : undefined,
  });

  // Log to SecurityLog
  await prisma.securityLog.create({
    data: {
      userId: dbUser.id,
      username: dbUser.username || "Admin",
      action: "BROADCAST_SYSTEM_UPDATE",
      reason: `Broadcast Update Sistem (${updateType})`,
      content: `Judul: ${title} • Channel: ${targetChannel} • Tipe: ${updateType} • Modul: ${affectedModules} • Status: ${discordResult.success ? "SUCCESS" : "FAILED"}`,
      severity: "INFO",
    },
  }).catch(() => null);

  return Response.json({
    success: true,
    channelName: discordResult.channelName,
    delivered: discordResult.success,
    message: discordResult.success
      ? `Laporan update berhasil dikirim ke saluran ${discordResult.channelName}!`
      : `Laporan berhasil diproses, namun Discord Bot melaporkan: ${discordResult.error || "Gagal kirim ke Discord."}`,
  });
}
