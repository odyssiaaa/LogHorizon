import { NextResponse } from "next/server";
import { requireOwnerOdyssia } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { ARMORY_ITEMS } from "@/lib/armory-catalog";
import { sendDiscordChannelMessage, getBaseAppUrl, DiscordEmbed } from "@/lib/discord-bot";
import { createNotification } from "@/lib/notifications";
import { CosmeticType } from "@prisma/client";
import { getLevelProgressFromXp, getMinimumXpForLevel } from "@/lib/level-system";

export const instant = false;

export async function POST(req: Request) {
  const { user: owner, response } = await requireOwnerOdyssia();
  if (response || !owner) return response;

  const body = await req.json().catch(() => ({}));
  const {
    targetUserId,
    targetUsername,
    action,
    amount,
    level,
    itemId,
    badge,
    badgeMode,
    trialType,
    trialDays,
    isVerified,
    streak,
  } = body;

  // Resolve target user
  let target = null;
  if (targetUserId) {
    target = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { cosmetics: true },
    });
  } else if (targetUsername) {
    const cleanUsername = String(targetUsername).replace(/^@/, "").trim();
    target = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanUsername, mode: "insensitive" } },
          { name: { equals: cleanUsername, mode: "insensitive" } },
          { discordId: cleanUsername },
          { id: cleanUsername },
        ],
      },
      include: { cosmetics: true },
    });
  }

  if (!target) {
    return NextResponse.json({ error: "Pengguna target tidak ditemukan." }, { status: 404 });
  }

  let auditActionTitle = "Sovereign Bestowal";
  let auditDetails = "";
  let notificationMessage = "";

  try {
    if (action === "ADD_XP") {
      const xpVal = Number(amount) || 0;
      const newXp = Math.max(0, (target.xp || 0) + xpVal);
      const { level: newLevel } = getLevelProgressFromXp(newXp);

      await prisma.user.update({
        where: { id: target.id },
        data: { xp: newXp, level: newLevel },
      });

      auditActionTitle = `🎁 Suntik XP Guild (+${xpVal.toLocaleString("id-ID")} XP)`;
      auditDetails = `XP baru: ${newXp.toLocaleString("id-ID")} XP (Level ${newLevel})`;
      notificationMessage = `👑 Emperor menganugerahi Anda +${xpVal.toLocaleString("id-ID")} XP! Level Anda sekarang Level ${newLevel}.`;
    } else if (action === "SET_XP") {
      const xpVal = Math.max(0, Number(amount) || 0);
      const { level: newLevel } = getLevelProgressFromXp(xpVal);

      await prisma.user.update({
        where: { id: target.id },
        data: { xp: xpVal, level: newLevel },
      });

      auditActionTitle = `👑 Penetapan Total XP Guild (${xpVal.toLocaleString("id-ID")} XP)`;
      auditDetails = `XP baru: ${xpVal.toLocaleString("id-ID")} XP (Level ${newLevel})`;
      notificationMessage = `👑 Emperor menetapkan total XP Anda menjadi ${xpVal.toLocaleString("id-ID")} XP (Level ${newLevel})!`;
    } else if (action === "SET_LEVEL") {
      const lvlVal = Math.max(1, Math.min(999, Number(level) || 1));
      const newXp = getMinimumXpForLevel(lvlVal);

      await prisma.user.update({
        where: { id: target.id },
        data: { level: lvlVal, xp: newXp },
      });

      auditActionTitle = `👑 Penetapan Langsung Level Guild (${lvlVal})`;
      auditDetails = `Level ditetapkan ke ${lvlVal} (Total XP otomatis disesuaikan ke ${newXp.toLocaleString("id-ID")} XP)`;
      notificationMessage = `👑 Emperor secara langsung menetapkan tingkat kehormatan Anda ke Level ${lvlVal} (Total XP: ${newXp.toLocaleString("id-ID")})!`;
    } else if (action === "ADD_GACHA_TICKETS") {
      const ticketVal = Number(amount) || 1;
      const newTickets = Math.max(0, (target.dailyGachaTickets || 0) + ticketVal);

      await prisma.user.update({
        where: { id: target.id },
        data: { dailyGachaTickets: newTickets },
      });

      auditActionTitle = `🎟️ Injeksi Tiket Royal Gacha (+${ticketVal})`;
      auditDetails = `Total Tiket Gacha sekarang: ${newTickets}`;
      notificationMessage = `👑 Emperor mengirimkan ${ticketVal} Tiket Royal Gacha langsung ke inventaris Anda!`;
    } else if (action === "GIVE_ARMORY_ITEM") {
      if (itemId === "UNLOCK_ALL") {
        // Unlock all items from ARMORY_ITEMS
        const existingItemIds = new Set(target.cosmetics.map((c) => c.itemId));
        const toCreate = ARMORY_ITEMS.filter((item) => !existingItemIds.has(item.id)).map((item) => ({
          userId: target.id,
          itemId: item.id,
          itemName: item.name,
          itemType: item.type as CosmeticType,
        }));

        if (toCreate.length > 0) {
          await prisma.userCosmetic.createMany({
            data: toCreate,
            skipDuplicates: true,
          });
        }

        auditActionTitle = `⚔️ Buka Seluruh Koleksi Guild Armory (Semua Bingkai & Gelar)`;
        auditDetails = `Membuka ${toCreate.length} item baru dari total ${ARMORY_ITEMS.length} katalog resmi.`;
        notificationMessage = `👑 Seluruh koleksi Guild Armory (semua bingkai avatar Discord & gelar ksatria) telah dibuka penuh oleh Emperor!`;
      } else {
        const item = ARMORY_ITEMS.find((it) => it.id === itemId);
        if (!item) {
          return NextResponse.json({ error: "Item armory tidak valid." }, { status: 400 });
        }

        await prisma.userCosmetic.upsert({
          where: {
            userId_itemId: {
              userId: target.id,
              itemId: item.id,
            },
          },
          update: {
            itemName: item.name,
            itemType: item.type as CosmeticType,
          },
          create: {
            userId: target.id,
            itemId: item.id,
            itemName: item.name,
            itemType: item.type as CosmeticType,
          },
        });

        if (body.equipImmediately !== false) {
          if (item.type === "AVATAR_FRAME") {
            await prisma.user.update({
              where: { id: target.id },
              data: { equippedAvatarFrame: item.id },
            });
          } else if (item.type === "CUSTOM_TITLE") {
            await prisma.user.update({
              where: { id: target.id },
              data: { equippedCustomTitle: item.name },
            });
          }
        }

        auditActionTitle = `🛡️ Penganugerahan & Pemasangan Item Armory: ${item.name}`;
        auditDetails = `Item ID: ${item.id} (${item.type})`;
        notificationMessage = `👑 Emperor menghadiahkan item eksklusif Armory: "${item.name}" kepada Anda! Cek di Pengaturan Akun.`;
      }
    } else if (action === "REVOKE_ARMORY_ITEM") {
      if (itemId === "LOCK_ALL") {
        await prisma.userCosmetic.deleteMany({
          where: { userId: target.id },
        });
        await prisma.user.update({
          where: { id: target.id },
          data: { equippedAvatarFrame: null, equippedCustomTitle: null },
        });

        auditActionTitle = `🔒 Cabut Seluruh Koleksi Armory`;
        auditDetails = `Semua kosmetik yang dimiliki target telah dihapus.`;
      } else {
        await prisma.userCosmetic.deleteMany({
          where: { userId: target.id, itemId },
        });

        const updatePayload: Record<string, any> = {};
        if (target.equippedAvatarFrame === itemId) updatePayload.equippedAvatarFrame = null;
        if (target.equippedCustomTitle === itemId) updatePayload.equippedCustomTitle = null;
        if (Object.keys(updatePayload).length > 0) {
          await prisma.user.update({ where: { id: target.id }, data: updatePayload });
        }

        auditActionTitle = `🔒 Pencabutan Item Armory: ${itemId}`;
        auditDetails = `Item ${itemId} dicabut dari pengguna.`;
      }
    } else if (action === "SET_CASTE_BADGE") {
      const badgeName = String(badge || "").trim();
      if (!badgeName) {
        return NextResponse.json({ error: "Nama badge wajib diisi." }, { status: 400 });
      }

      const currentBadges = Array.isArray(target.badges) ? [...target.badges] : [];
      let updatedBadges: string[];

      if (badgeMode === "REMOVE") {
        updatedBadges = currentBadges.filter((b) => b !== badgeName);
      } else {
        if (!currentBadges.includes(badgeName)) {
          updatedBadges = [...currentBadges, badgeName];
        } else {
          updatedBadges = currentBadges;
        }
      }

      await prisma.user.update({
        where: { id: target.id },
        data: { badges: updatedBadges },
      });

      auditActionTitle = `${badgeMode === "REMOVE" ? "❌ Pencopotan" : "💎 Penganugerahan"} Kasta/Badge: ${badgeName}`;
      auditDetails = `Badges saat ini: [${updatedBadges.join(", ")}]`;
      notificationMessage =
        badgeMode === "REMOVE"
          ? `Lencana kasta "${badgeName}" telah dicabut oleh Emperor.`
          : `👑 Anda dianugerahi Lencana Kasta Kerajaan: "${badgeName}" oleh Emperor!`;
    } else if (action === "SET_TRIAL") {
      const days = Math.max(1, Math.min(365, Number(trialDays) || 30));
      const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: target.id },
        data: {
          trialType: trialType || "VIP_PREMIUM",
          trialExpiresAt: expiry,
          trialGrantedBy: owner.username || "odyssia",
        },
      });

      auditActionTitle = `⏳ Aktivasi Akses Trial Eksklusif (${days} Hari)`;
      auditDetails = `Tipe: ${trialType || "VIP_PREMIUM"}, Berakhir: ${expiry.toLocaleDateString("id-ID")}`;
      notificationMessage = `👑 Emperor mengaktifkan status akses trial "${trialType}" selama ${days} hari untuk akun Anda!`;
    } else if (action === "SET_VERIFIED_SELLER") {
      const verified = Boolean(isVerified);

      await prisma.user.update({
        where: { id: target.id },
        data: {
          isVerifiedSeller: verified,
          sellerVerificationStatus: verified ? "APPROVED" : "NONE",
        },
      });

      auditActionTitle = `${verified ? "✅ Verifikasi" : "❌ Pencabutan"} Status VERIFIED SELLER`;
      auditDetails = `Status Verified Seller diubah menjadi: ${verified ? "AKTIF" : "NONAKTIF"}`;
      notificationMessage = verified
        ? `👑 Status Verified Seller resmi telah disahkan oleh Emperor! Anda kini memiliki badge terpercaya di Rekber & Marketplace.`
        : `Status Verified Seller Anda telah dicabut oleh Emperor.`;
    } else if (action === "SET_CHECKIN_STREAK") {
      const streakVal = Math.max(0, Number(streak) || 0);

      await prisma.user.update({
        where: { id: target.id },
        data: { checkInStreak: streakVal },
      });

      auditActionTitle = `🔥 Kalibrasi Check-in Daily Streak (${streakVal} Hari)`;
      auditDetails = `Streak diperbarui menjadi ${streakVal} hari beruntun.`;
      notificationMessage = `👑 Emperor mengalibrasi rekor absensi harian Anda menjadi ${streakVal} hari berturut-turut!`;
    } else {
      return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
    }

    // Send internal notification if message is set
    if (notificationMessage && target.id !== owner.id) {
      void createNotification({
        userId: target.id,
        type: "SYSTEM",
        message: notificationMessage,
        link: "/profile",
      }).catch(() => null);
    }

    // Send Discord mod-logs embed
    const appUrl = getBaseAppUrl();
    const targetMention = target.discordId ? `<@${target.discordId}>` : `@${target.username || target.name}`;
    const embed: DiscordEmbed = {
      title: `👑 [EMPEROR AUDIT] Sovereign Action Executed`,
      description: `**Titah Mutlak Pemilik Tertinggi (.odyssia)** baru saja dieksekusi di database guild.`,
      color: 0xf59e0b, // Royal Amber Gold
      fields: [
        { name: "⚡ Aksi", value: auditActionTitle, inline: true },
        { name: "🎯 Target", value: `${targetMention} (\`${target.username || target.id}\`)`, inline: true },
        { name: "📜 Rincian", value: auditDetails || "-", inline: false },
        { name: "👤 Eksekutor Mutlak", value: `@${owner.username} (ID: \`${owner.id}\`)`, inline: true },
        { name: "🌐 Profil Target", value: `[Lihat Profil](${appUrl}/u/${target.username || target.id})`, inline: true },
      ],
      footer: {
        text: "LogHorizon Sovereign Command Center • Exclusive Emperor Power",
      },
      timestamp: new Date().toISOString(),
    };

    void sendDiscordChannelMessage("mod_logs", { embeds: [embed] }).catch(() => null);

    // Fetch updated target user
    const updatedUser = await prisma.user.findUnique({
      where: { id: target.id },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
        xp: true,
        level: true,
        dailyGachaTickets: true,
        badges: true,
        isVerifiedSeller: true,
        checkInStreak: true,
        trialType: true,
        trialExpiresAt: true,
        cosmetics: {
          select: { id: true, itemId: true, itemName: true, itemType: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `${auditActionTitle} berhasil diterapkan ke @${target.username || target.name}!`,
      user: updatedUser,
    });
  } catch (err: any) {
    console.error("Owner gift execution failed:", err);
    return NextResponse.json({ error: err.message || "Gagal mengeksekusi titah kaisar." }, { status: 500 });
  }
}
