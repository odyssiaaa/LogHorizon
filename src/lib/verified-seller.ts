import {
  DiscordEmbed,
  sendDiscordChannelMessage,
  getBaseAppUrl,
} from "@/lib/discord-bot-sender";
import { formatWibDateTime } from "@/lib/wib-time";

/**
 * Notifikasi Pengajuan Verified Seller Baru ke Channel #🛡️・mod-logs (1547552557868777552)
 */
export async function notifySellerVerificationRequested(data: {
  userId: string;
  username: string;
  discordId?: string | null;
  pactAcceptedAt: Date | string;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const profileUrl = `${baseUrl}/u/${encodeURIComponent(data.username)}`;
  const adminUrl = `${baseUrl}/admin?tab=verified_sellers`;
  const wibTime = formatWibDateTime(data.pactAcceptedAt);

  const embed: DiscordEmbed = {
    title: "🛡️ PENGAJUAN VERIFIED SELLER BARU (MENUNGGU WAWANCARA STAF)",
    description: `Petualang **@${data.username}** telah menyetujui **Pakta Pertanggungjawaban Hukum & Sanksi Sosial** dan mengajukan lencana Penjual Terpercaya resmi LogHorizon.`,
    color: 0xf59e0b, // Amber Gold
    url: profileUrl,
    fields: [
      { name: "👤 Calon Penjual", value: `[@${data.username}](${profileUrl})`, inline: true },
      { name: "🆔 Discord ID", value: data.discordId ? `\`${data.discordId}\` (<@${data.discordId}>)` : "*Belum ditautkan*", inline: true },
      { name: "⚖️ Pakta Hukum & Sanksi", value: "✅ **TELAH DICENTANG & DISETUJUI SECARA SADAR**", inline: false },
      {
        name: "🔒 Isi Pakta Pertanggungjawaban",
        value:
          "> *\"Bersedia menjalani validasi identitas bersama Staf LogHorizon. Apabila terbukti melakukan penipuan (scam) atau membawa kabur dana/akun, bersedia menerima sanksi sosial (publikasi blacklist penipu komunitas) serta diproses secara hukum pidana sesuai peraturan perundang-undangan di Indonesia.\"*",
        inline: false,
      },
      {
        name: "🧭 Langkah Staf Berikutnya",
        value: `1. Hubungi member melalui **Private Chat website** atau **DM Discord** untuk wawancara identitas langsung (voice/video/data check).\n2. Validasi atau tolak pengajuan melalui panel **[Admin Dashboard &rarr; Verifikasi Penjual](${adminUrl})**.`,
        inline: false,
      },
      { name: "⏰ Waktu Pengajuan (WIB)", value: wibTime, inline: true },
    ],
    footer: { text: "LogHorizon Seller Verification System • #mod-logs" },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("mod_logs", {
    content: `🛡️ **PENGAJUAN VERIFIKASI PENJUAL BARU: @${data.username}**`,
    embeds: [embed],
  }).catch((err) => console.warn("[Verified Seller Dispatcher] notifyRequested error:", err));
}

/**
 * Notifikasi Audit Sakelar Verified Seller oleh Admin ke Channel #🛡️・mod-logs
 */
export async function notifyVerifiedSellerAudit(data: {
  adminName: string;
  targetUsername: string;
  action: "VERIFIED" | "REVOKED" | "REJECTED";
  note?: string | null;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const profileUrl = `${baseUrl}/u/${encodeURIComponent(data.targetUsername)}`;
  const wibTime = formatWibDateTime(new Date());

  const isApproved = data.action === "VERIFIED";
  const title = isApproved
    ? "✅ LENCANA VERIFIED SELLER RESMI DITERBITKAN"
    : data.action === "REVOKED"
    ? "❌ LENCANA VERIFIED SELLER DICABUT"
    : "🚫 PENGAJUAN VERIFIED SELLER DITOLAK";

  const color = isApproved ? 0x10b981 : 0xef4444; // Emerald or Red

  const embed: DiscordEmbed = {
    title,
    description: isApproved
      ? `Akun **@${data.targetUsername}** kini resmi berstatus **VERIFIED SELLER** setelah berhasil melewati tahap wawancara dan validasi staf.`
      : `Status Verified Seller untuk akun **@${data.targetUsername}** telah **${data.action === "REVOKED" ? "DICABUT" : "DITOLAK"}** oleh jajaran Admin.`,
    color,
    url: profileUrl,
    fields: [
      { name: "👑 Admin Validator", value: `@${data.adminName}`, inline: true },
      { name: "👤 Penjual / Member", value: `[@${data.targetUsername}](${profileUrl})`, inline: true },
      { name: "🏷️ Status Baru", value: isApproved ? "✅ **VERIFIED SELLER (RESMI)**" : "❌ **NON-VERIFIED**", inline: true },
      { name: "📝 Catatan Staf", value: data.note?.trim() || (isApproved ? "Wawancara langsung & verifikasi rekam jejak berhasil." : "Tidak memenuhi kualifikasi / dicabut atas dasar keamanan."), inline: false },
      { name: "⏰ Waktu Audit (WIB)", value: wibTime, inline: true },
    ],
    footer: { text: "LogHorizon Staff Audit Trail • #mod-logs" },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("mod_logs", {
    content: isApproved
      ? `✅ **AUDIT: @${data.adminName} menerbitkan status Verified Seller untuk @${data.targetUsername}!**`
      : `⚠️ **AUDIT: @${data.adminName} mencabut/menolak status Verified Seller untuk @${data.targetUsername}.**`,
    embeds: [embed],
  }).catch((err) => console.warn("[Verified Seller Dispatcher] notifyAudit error:", err));
}
