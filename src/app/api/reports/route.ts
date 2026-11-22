import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sanitizePlainText } from "@/lib/sanitize";
import { sendDiscordChannelMessage, getBaseAppUrl, DiscordEmbed } from "@/lib/discord-bot";

export async function POST(request: Request) {
  const me = await activeUser();
  if (!me) return jsonError("Silakan masuk terlebih dahulu untuk mengirim laporan.", 401);

  const body = await request.json().catch(() => ({}));
  const targetType = String(body.targetType || "POST").toUpperCase();
  const targetId = typeof body.targetId === "string" ? body.targetId.trim() : "";
  const targetName = typeof body.targetName === "string" ? sanitizePlainText(body.targetName.trim()) : "";
  const category = String(body.category || "TOXIC").toUpperCase();
  const rawReason = typeof body.reason === "string" ? body.reason.trim() : "";
  const reason = sanitizePlainText(rawReason);
  const proofUrl = typeof body.proofUrl === "string" && body.proofUrl.trim() ? body.proofUrl.trim() : null;

  if (!reason || reason.length < 5) {
    return jsonError("Kronologi atau alasan laporan wajib diisi minimal 5 karakter.", 400);
  }

  const categoryLabels: Record<string, string> = {
    SCAM: "🚨 Penipuan / Scam Rekber",
    CHEAT: "⚔️ Cheat / Exploit Turnamen",
    TOXIC: "🤬 Perilaku Toxic / SARA",
    SPAM: "📢 Spamming / Iklan Ilegal",
  };
  const categoryLabel = categoryLabels[category] || "🚩 Pelanggaran Umum";

  // Create report in database
  const isPostType = targetType === "POST" || targetType === "MARKETPLACE";
  const report = await prisma.report.create({
    data: {
      targetType,
      targetId: targetId || null,
      targetName: targetName || null,
      postId: isPostType && targetId ? targetId : null,
      category,
      proofUrl,
      reason,
      reporterId: me.id,
      status: "PENDING",
    },
  });

  // Format date WIB
  const now = new Date();
  const wibDate =
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(now) + " WIB";

  const baseUrl = getBaseAppUrl();

  // Dispatch red alert embed to Discord #🛡️・mod-logs (1547552557868777552)
  const embed: DiscordEmbed = {
    title: `🚨 LAPORAN PELANGGARAN & SENGKETA MASUK [MODERASI]`,
    description: `Seorang petualang telah mengirimkan laporan pelanggaran resmi yang memerlukan perhatian staf moderasi guild.`,
    color: 0xef4444, // Red
    fields: [
      { name: "🏷️ Kategori Pelanggaran", value: `**${categoryLabel}**`, inline: true },
      { name: "🎯 Tipe Target", value: `\`${targetType}\``, inline: true },
      { name: "📌 Target Dilaporkan", value: `**${targetName || targetId || "Konten"}**`, inline: false },
      { name: "👤 Dilaporkan Oleh", value: `@${me.username || "Petualang"} (ID: \`${me.id}\`)`, inline: true },
      { name: "⏰ Waktu Laporan (WIB)", value: wibDate, inline: true },
      { name: "📝 Kronologi Kejadian", value: reason.slice(0, 1024), inline: false },
      ...(proofUrl ? [{ name: "📸 Bukti Screenshot", value: `[Buka Gambar Bukti](${proofUrl})`, inline: false }] : []),
      {
        name: "⚖️ Tindakan Moderasi",
        value: `[Buka Panel Moderasi Admin](${baseUrl}/admin) • Tinjau & tangani segera.`,
        inline: false,
      },
    ],
    ...(proofUrl ? { image: { url: proofUrl } } : {}),
    footer: {
      text: `LogHorizon Moderation Center • #mod-logs (1547552557868777552)`,
    },
    timestamp: now.toISOString(),
  };

  void sendDiscordChannelMessage("mod_logs", {
    content: `🚨 **[ALERT MODERASI]** Laporan pelanggaran baru (${categoryLabel}) telah masuk dari **@${me.username || "Petualang"}**:`,
    embeds: [embed],
  }).catch(() => null);

  return Response.json({
    success: true,
    report,
    message: "Laporan pelanggaran berhasil dikirim dan masuk antrean investigasi staf moderasi.",
  });
}
