import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sanitizePlainText } from "@/lib/sanitize";
import { sendDiscordChannelMessage, getBaseAppUrl, DiscordEmbed } from "@/lib/discord-bot";

const VALID_CATEGORIES = [
  "SCAM_TRANSAKSI",
  "CHEAT_TURNAMEN",
  "TOXIC_BERAT",
  "BURONAN_GUILD",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  SCAM_TRANSAKSI: "🚨 Penipuan Transaksi / Rekber / Scam",
  CHEAT_TURNAMEN: "⚔️ Kecurangan / Cheat / Exploit Turnamen",
  TOXIC_BERAT: "☣️ Perilaku Toxic Ekstrem / SARA / Pelecehan",
  BURONAN_GUILD: "🚩 Pelanggaran Berat / Buronan Khusus Guild",
};

export async function POST(request: Request) {
  const user = await activeUser();
  if (!user) {
    return jsonError("Login diperlukan untuk mengajukan laporan buronan.", 401);
  }

  // Anti-spam requirement: Member must be level >= 2 OR have linked Discord ID
  if (user.level < 2 && !user.discordId) {
    return jsonError(
      "Akun minimal Level 2 atau terverifikasi akun Discord untuk mengajukan laporan buronan guna mencegah laporan palsu/spam.",
      403
    );
  }

  const body = await request.json().catch(() => ({}));
  const rawTargetName = typeof body.targetName === "string" ? body.targetName.trim() : "";
  const targetName = sanitizePlainText(rawTargetName);
  const category = String(body.category || "").toUpperCase();
  const rawDescription = typeof body.crimeDescription === "string" ? body.crimeDescription.trim() : "";
  const crimeDescription = sanitizePlainText(rawDescription);
  const rawBountyReward = typeof body.bountyReward === "string" ? body.bountyReward.trim() : "";
  const bountyReward = rawBountyReward ? sanitizePlainText(rawBountyReward) : null;
  const evidenceImage = typeof body.evidenceImage === "string" && body.evidenceImage.trim() ? body.evidenceImage.trim() : null;

  if (!targetName || targetName.length < 2) {
    return jsonError("Nama atau identitas terlapor (Username / Rekening / Sosmed) wajib diisi minimal 2 karakter.", 400);
  }

  if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    return jsonError("Kategori pelanggaran tidak valid.", 400);
  }

  if (!crimeDescription || crimeDescription.length < 10) {
    return jsonError("Kronologi lengkap kejadian/penipuan wajib diisi minimal 10 karakter.", 400);
  }

  // Check image payload size (prevent gigantic uploads > 5MB)
  if (evidenceImage && evidenceImage.length > 5 * 1024 * 1024) {
    return jsonError("Ukuran gambar bukti terlalu besar (maksimal 4MB).", 400);
  }

  try {
    const bounty = await prisma.dungeonBounty.create({
      data: {
        targetName,
        category,
        crimeDescription,
        evidenceImage,
        bountyReward,
        status: "PENDING_REVIEW",
        submittedById: user.id,
      },
      include: {
        submittedBy: {
          select: {
            username: true,
            discordId: true,
            level: true,
          },
        },
      },
    });

    // Send high-priority embed alert to Discord channel #🛡️・mod-logs (1547552557868777552)
    const now = new Date();
    const wibDate =
      new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(now) + " WIB";

    const baseUrl = getBaseAppUrl();
    const categoryLabel = CATEGORY_LABELS[category] || category;

    const embed: DiscordEmbed = {
      title: `⛓️ PENGAJUAN BURONAN / BOUNTY BARU [BUTUH ACC STAF]`,
      description: `Laporan buronan baru diajukan untuk dimasukkan ke **Papan Buronan & Sel Tahanan (/dungeon)**. Staf/Moderator diminta meninjau bukti sebelum diterbitkan ke publik.`,
      color: 0xf59e0b, // Amber
      fields: [
        { name: "🎯 Identitas Terlapor", value: `**${targetName}**`, inline: false },
        { name: "🏷️ Kategori Kasus", value: `**${categoryLabel}**`, inline: true },
        { name: "💰 Hadiah Bounty", value: bountyReward ? `**${bountyReward}**` : "*Tidak ada*", inline: true },
        { name: "👤 Dilaporkan Oleh", value: `@${user.username || "Petualang"} (Lv.${user.level})`, inline: true },
        { name: "⏰ Waktu Pengajuan", value: wibDate, inline: true },
        { name: "📝 Kronologi Kasus", value: crimeDescription.slice(0, 1024), inline: false },
        {
          name: "⚖️ Panel Moderasi Staf",
          value: `[Buka Panel Moderasi Admin / Staf](${baseUrl}/admin) • Tinjau & putuskan sanksi.`,
          inline: false,
        },
      ],
      ...(evidenceImage && !evidenceImage.startsWith("data:") ? { image: { url: evidenceImage } } : {}),
      footer: {
        text: `LogHorizon Royal Citadel Dungeon • #mod-logs (1547552557868777552)`,
      },
      timestamp: now.toISOString(),
    };

    void sendDiscordChannelMessage("mod_logs", {
      content: `⛓️ **[ALERT DUNGEON]** Pengajuan buronan baru terhadap **${targetName}** (${categoryLabel}) telah masuk dari **@${user.username || "Petualang"}**:`,
      embeds: [embed],
    }).catch(() => null);

    return Response.json({
      success: true,
      message:
        "Laporan buronan berhasil diajukan! Status saat ini PENDING_REVIEW dan akan segera diperiksa oleh Staf/Moderator (⚔️ Lord Commander) sebelum diterbitkan ke Papan Buronan.",
      bounty: {
        id: bounty.id,
        targetName: bounty.targetName,
        category: bounty.category,
        status: bounty.status,
      },
    });
  } catch (error) {
    console.error("[DUNGEON_SUBMIT_ERROR]", error);
    return jsonError("Gagal mengajukan laporan buronan.", 500);
  }
}
