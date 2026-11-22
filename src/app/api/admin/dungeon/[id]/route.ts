import { requireStaff, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sanitizePlainText } from "@/lib/sanitize";
import { sendDiscordChannelMessage, getBaseAppUrl, DiscordEmbed } from "@/lib/discord-bot";

const CATEGORY_LABELS: Record<string, string> = {
  SCAM_TRANSAKSI: "🚨 Penipuan Transaksi / Rekber",
  CHEAT_TURNAMEN: "⚔️ Kecurangan / Exploit Turnamen",
  TOXIC_BERAT: "☣️ Perilaku Toxic Ekstrem / SARA",
  BURONAN_GUILD: "🚩 Pelanggaran Berat / Buronan Guild",
};

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await requireStaff(["ADMIN", "MODERATOR"]);
  if (access.response) return access.response;

  const { id } = await params;
  const staff = access.user;

  const existing = await prisma.dungeonBounty.findUnique({
    where: { id },
    include: {
      submittedBy: { select: { username: true } },
      targetUser: { select: { id: true, username: true } },
    },
  });

  if (!existing) {
    return jsonError("Data buronan tidak ditemukan.", 404);
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").toUpperCase();
  const rawNote = typeof body.note === "string" ? body.note.trim() : "";
  const reviewNote = rawNote ? sanitizePlainText(rawNote) : null;

  let newStatus: string;
  let verdictTitle: string;
  let embedColor: number;

  switch (action) {
    case "APPROVE_WANTED":
      newStatus = "WANTED_ACTIVE";
      verdictTitle = "🎯 POSTER BURONAN RESMI DITERBITKAN (WANTED)";
      embedColor = 0xf59e0b; // Amber
      break;
    case "APPROVE_IMPRISON":
      newStatus = "IMPRISONED";
      verdictTitle = "⛓️ VONIS PENJARA RESMI DITETAPKAN (IMPRISONED)";
      embedColor = 0xdc2626; // Red
      break;
    case "CAPTURE":
      newStatus = "CAPTURED";
      verdictTitle = "🏆 BURONAN BERHASIL DITANGKAP / DISANKSI (CAPTURED)";
      embedColor = 0x10b981; // Emerald
      break;
    case "REJECT":
      newStatus = "REJECTED";
      verdictTitle = "❌ PENGAJUAN BURONAN DITOLAK (REJECTED)";
      embedColor = 0x64748b; // Slate
      break;
    default:
      return jsonError("Aksi moderasi tidak valid. Pilihan: APPROVE_WANTED, APPROVE_IMPRISON, CAPTURE, REJECT.", 400);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // If decision is IMPRISONED and target has linked user account, ban the user in DB
      if (newStatus === "IMPRISONED" && existing.targetUserId) {
        await tx.user.update({
          where: { id: existing.targetUserId },
          data: {
            isBanned: true,
            banReason: `Vonis Penjara / Dungeon: ${existing.crimeDescription}`,
            bannedAt: new Date(),
          },
        });
      }

      return tx.dungeonBounty.update({
        where: { id },
        data: {
          status: newStatus,
          approvedById: staff.id,
          reviewNote,
        },
        include: {
          approvedBy: { select: { username: true, role: true } },
          submittedBy: { select: { username: true } },
        },
      });
    });

    // Send official audit embed to Discord #🛡️・mod-logs (1547552557868777552)
    const now = new Date();
    const wibDate =
      new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(now) + " WIB";

    const baseUrl = getBaseAppUrl();
    const staffRoleTitle =
      staff.role === "ADMIN" ? "✨ Prince / Admin" : "⚔️ Lord Commander (Moderator)";
    const catLabel = CATEGORY_LABELS[existing.category] || existing.category;

    const embed: DiscordEmbed = {
      title: `${verdictTitle}`,
      description: `Staf Moderasi guild telah memvalidasi dan memproses status laporan buronan pada sistem **Royal Dungeon & Wanted Board (/dungeon)**.`,
      color: embedColor,
      fields: [
        { name: "🎯 Identitas Terpidana / Terlapor", value: `**${existing.targetName}**`, inline: false },
        { name: "🏷️ Kategori", value: `**${catLabel}**`, inline: true },
        { name: "⚖️ Status Baru", value: `\`${newStatus}\``, inline: true },
        { name: "🛡️ Ditangani Oleh", value: `@${staff.username || "Staf"} (${staffRoleTitle})`, inline: true },
        { name: "⏰ Waktu Vonis", value: wibDate, inline: true },
        { name: "📝 Kronologi Pelanggaran", value: existing.crimeDescription.slice(0, 1024), inline: false },
        ...(reviewNote ? [{ name: "📌 Catatan Staf", value: reviewNote, inline: false }] : []),
        {
          name: "🔗 Tautan Papan Buronan",
          value: `[Buka Halaman Penjara & Buronan](${baseUrl}/dungeon)`,
          inline: false,
        },
      ],
      footer: {
        text: `LogHorizon Moderation Center • #mod-logs (1547552557868777552)`,
      },
      timestamp: now.toISOString(),
    };

    void sendDiscordChannelMessage("mod_logs", {
      content: `🛡️ **[AUDIT MODERASI]** Vonis buronan telah diperbarui menjadi **${newStatus}** oleh **@${staff.username || "Staf"}** (${staffRoleTitle}):`,
      embeds: [embed],
    }).catch(() => null);

    return Response.json({
      success: true,
      message: `Status buronan "${existing.targetName}" berhasil diperbarui menjadi ${newStatus}.`,
      bounty: updated,
    });
  } catch (error) {
    console.error("[ADMIN_DUNGEON_PATCH_ERROR]", error);
    return jsonError("Gagal memperbarui status buronan.", 500);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await requireStaff(["ADMIN", "MODERATOR"]);
  if (access.response) return access.response;

  const { id } = await params;

  try {
    await prisma.dungeonBounty.delete({
      where: { id },
    });

    return Response.json({
      success: true,
      message: "Data buronan berhasil dihapus.",
    });
  } catch (error) {
    console.error("[ADMIN_DUNGEON_DELETE_ERROR]", error);
    return jsonError("Gagal menghapus data buronan.", 500);
  }
}
