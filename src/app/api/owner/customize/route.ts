import { NextResponse } from "next/server";
import { requireOwnerOdyssia } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { sendDiscordChannelMessage, DiscordEmbed, getBaseAppUrl } from "@/lib/discord-bot";

export const instant = false;

export async function POST(req: Request) {
  const { user: owner, response } = await requireOwnerOdyssia();
  if (response || !owner) return response;

  const body = await req.json().catch(() => ({}));
  const {
    equippedAvatarFrame,
    equippedCustomTitle,
    xp,
    level,
    dailyGachaTickets,
    badges,
    checkInStreak,
  } = body;

  const updateData: Record<string, any> = {};

  if (equippedAvatarFrame !== undefined) {
    updateData.equippedAvatarFrame = equippedAvatarFrame || null;
  }
  if (equippedCustomTitle !== undefined) {
    updateData.equippedCustomTitle = equippedCustomTitle || null;
  }
  if (typeof xp === "number") {
    updateData.xp = Math.max(0, xp);
  }
  if (typeof level === "number") {
    updateData.level = Math.max(1, level);
  }
  if (typeof dailyGachaTickets === "number") {
    updateData.dailyGachaTickets = Math.max(0, dailyGachaTickets);
  }
  if (Array.isArray(badges)) {
    updateData.badges = badges;
  }
  if (typeof checkInStreak === "number") {
    updateData.checkInStreak = Math.max(0, checkInStreak);
  }

  try {
    const updated = await prisma.user.update({
      where: { id: owner.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
        xp: true,
        level: true,
        dailyGachaTickets: true,
        badges: true,
        checkInStreak: true,
        equippedAvatarFrame: true,
        equippedCustomTitle: true,
      },
    });

    // Discord audit to #mod-logs
    const appUrl = getBaseAppUrl();
    const embed: DiscordEmbed = {
      title: `🧙‍♂️ [EMPEROR AUDIT] Self-Account Customization`,
      description: `Kaisar **@${owner.username}** memperbarui profil kerajaan pribadinya secara mandiri.`,
      color: 0xf59e0b,
      fields: [
        { name: "Bingkai Avatar", value: updated.equippedAvatarFrame || "Bawaan", inline: true },
        { name: "Gelar Khusus", value: updated.equippedCustomTitle || "Bawaan", inline: true },
        { name: "Level & XP", value: `Lv. ${updated.level} (${updated.xp.toLocaleString()} XP)`, inline: true },
        { name: "Tiket Gacha", value: `${updated.dailyGachaTickets} Tiket`, inline: true },
        { name: "Badges", value: updated.badges.length ? updated.badges.join(", ") : "Tidak ada", inline: false },
      ],
      footer: {
        text: "LogHorizon Emperor Self-Customizer",
      },
      timestamp: new Date().toISOString(),
    };

    void sendDiscordChannelMessage("mod_logs", { embeds: [embed] }).catch(() => null);

    return NextResponse.json({
      success: true,
      message: "Profil kaisar Anda berhasil disesuaikan!",
      user: updated,
    });
  } catch (error: any) {
    console.error("Owner customize error:", error);
    return NextResponse.json({ error: error.message || "Gagal memperbarui profil kaisar." }, { status: 500 });
  }
}
