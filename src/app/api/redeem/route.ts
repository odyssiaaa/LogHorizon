import { NextResponse } from "next/server";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sendDiscordChannelMessage, DiscordEmbed, getBaseAppUrl } from "@/lib/discord-bot";
import { createNotification } from "@/lib/notifications";
import { calculateProgressiveLevelUp } from "@/lib/level-system";

export const instant = false;

export async function POST(req: Request) {
  const user = await activeUser();
  if (!user) {
    return jsonError("Silakan masuk (login) terlebih dahulu untuk menukarkan kode hadiah.", 401);
  }

  const body = await req.json().catch(() => ({}));
  const rawCode = String(body.code || "").trim().toUpperCase().replace(/\s+/g, "");

  if (!rawCode) {
    return jsonError("Silakan masukkan kode redeem / voucher.", 400);
  }

  try {
    const claimResult = await prisma.$transaction(async (tx) => {
      const codeRecord = await tx.redeemCode.findUnique({
        where: { code: rawCode },
      });

      if (!codeRecord) {
        throw new Error("KODE_NOT_FOUND");
      }

      // Check if this is a SPONSOR_VOUCHER (e.g. OdyssiaVault)
      // Sponsor vouchers are NOT redeemed internally on LogHorizon, but used at the sponsor's store!
      if (codeRecord.category === "SPONSOR_VOUCHER") {
        const rawUrl = codeRecord.sponsorActionUrl || "http://odyssiavault.kiospremium.site/";
        const storeUrl = rawUrl.includes("odyssiavault.com") ? "http://odyssiavault.kiospremium.site/" : rawUrl;
        const err = new Error("IS_SPONSOR_VOUCHER");
        (err as any).sponsorData = {
          code: codeRecord.code,
          sponsorName: codeRecord.sponsorName || "OdyssiaVault",
          storeUrl,
          message: `Kode ini adalah Voucher Belanja ${codeRecord.sponsorName || "OdyssiaVault"}! Salin kodenya dan gunakan langsung saat checkout di toko resmi: ${storeUrl}`,
        };
        throw err;
      }

      if (!codeRecord.isActive) {
        throw new Error("KODE_INACTIVE");
      }

      if (codeRecord.expiresAt && new Date(codeRecord.expiresAt) < new Date()) {
        throw new Error("KODE_EXPIRED");
      }

      if (codeRecord.usedCount >= codeRecord.maxUses) {
        throw new Error("KODE_QUOTA_EXHAUSTED");
      }

      // Check if user has already claimed this code
      const existingClaim = await tx.redeemClaim.findUnique({
        where: {
          redeemCodeId_userId: {
            redeemCodeId: codeRecord.id,
            userId: user.id,
          },
        },
      });

      if (existingClaim) {
        throw new Error("KODE_ALREADY_CLAIMED");
      }

      // Increment usage count
      await tx.redeemCode.update({
        where: { id: codeRecord.id },
        data: { usedCount: { increment: 1 } },
      });

      // Generate unique serial number for validation with sponsors
      const prefix = codeRecord.category === "SPONSOR_VOUCHER" ? "LH-ODY" : "LH-GLD";
      const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const uniqueClaimSerial = `${prefix}-${randomPart}`;

      // Create claim record
      const claim = await tx.redeemClaim.create({
        data: {
          redeemCodeId: codeRecord.id,
          userId: user.id,
          uniqueClaimSerial,
          source: "REDEEM_CODE",
        },
      });

      // Bestow reward onto user
      let rewardText = "";
      const currentUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { xp: true, level: true, dailyGachaTickets: true, trialType: true, trialExpiresAt: true },
      });

      if (!currentUser) throw new Error("USER_NOT_FOUND");

      if (codeRecord.rewardType === "XP") {
        const addedXp = codeRecord.rewardValue;
        const progress = calculateProgressiveLevelUp(currentUser.level, currentUser.xp, addedXp);
        await tx.user.update({
          where: { id: user.id },
          data: { xp: progress.newInLevelXp, level: progress.newLevel },
        });
        rewardText = `+${addedXp.toLocaleString()} XP Guild (Level ${progress.newLevel})`;
      } else if (codeRecord.rewardType === "GACHA_TICKETS") {
        const addedTickets = codeRecord.rewardValue;
        await tx.user.update({
          where: { id: user.id },
          data: { dailyGachaTickets: { increment: addedTickets } },
        });
        rewardText = `+${addedTickets} Tiket Royal Gacha`;
      } else if (codeRecord.rewardType === "VIP_TRIAL_DAYS") {
        const days = codeRecord.rewardValue;
        const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        await tx.user.update({
          where: { id: user.id },
          data: { trialType: "VIP_PREMIUM", trialExpiresAt: expiry, trialGrantedBy: "Redeem Code" },
        });
        rewardText = `Akses VIP Premium selama ${days} Hari`;
      } else if (codeRecord.rewardType === "SPONSOR_DISCOUNT") {
        rewardText = `Voucher Diskon ${codeRecord.rewardValue}% ${codeRecord.sponsorName || "OdyssiaVault"}`;
      }

      return {
        codeRecord,
        claim,
        rewardText,
      };
    });

    // In-app notification
    void createNotification({
      userId: user.id,
      type: "SYSTEM",
      message: `🎉 Berhasil menukarkan kode "${claimResult.codeRecord.code}"! Anda mendapatkan: ${claimResult.rewardText}. (No. Seri: ${claimResult.claim.uniqueClaimSerial})`,
      link: claimResult.codeRecord.category === "SPONSOR_VOUCHER" ? "/profile?tab=profile" : "/profile",
    }).catch(() => null);

    // Discord audit log if sponsor voucher
    if (claimResult.codeRecord.category === "SPONSOR_VOUCHER") {
      const appUrl = getBaseAppUrl();
      const embed: DiscordEmbed = {
        title: `🏷️ [SPONSOR CLAIM] Voucher ${claimResult.codeRecord.sponsorName || "OdyssiaVault"} Diklaim`,
        description: `Petualang **@${user.username || user.name}** berhasil mengklaim voucher sponsor:`,
        color: 0x06b6d4,
        fields: [
          { name: "Kode Promo", value: `\`${claimResult.codeRecord.code}\``, inline: true },
          { name: "Nomor Seri Validasi", value: `\`${claimResult.claim.uniqueClaimSerial}\``, inline: true },
          { name: "Sisa Kuota", value: `${claimResult.codeRecord.usedCount + 1} / ${claimResult.codeRecord.maxUses}`, inline: true },
          { name: "Penerima", value: `@${user.username || user.name} (ID: \`${user.id}\`)`, inline: true },
        ],
        footer: { text: "LogHorizon Sponsor Voucher Wallet Gate" },
        timestamp: new Date().toISOString(),
      };
      void sendDiscordChannelMessage("mod_logs", { embeds: [embed] }).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      message: `Selamat! Kode "${claimResult.codeRecord.code}" berhasil ditukarkan.`,
      rewardText: claimResult.rewardText,
      claimSerial: claimResult.claim.uniqueClaimSerial,
      category: claimResult.codeRecord.category,
      sponsorName: claimResult.codeRecord.sponsorName,
      sponsorActionUrl: claimResult.codeRecord.sponsorActionUrl,
    });
  } catch (error: any) {
    if (error.message === "IS_SPONSOR_VOUCHER" && error.sponsorData) {
      return NextResponse.json({
        success: false,
        isSponsorVoucher: true,
        ...error.sponsorData,
      }, { status: 400 });
    }
    if (error.message === "KODE_NOT_FOUND") {
      return jsonError("Kode redeem / voucher tidak ditemukan atau salah ketik.", 404);
    }
    if (error.message === "KODE_INACTIVE") {
      return jsonError("Kode ini saat ini sedang dinonaktifkan oleh administrator.", 400);
    }
    if (error.message === "KODE_EXPIRED") {
      return jsonError("Masa berlaku kode redeem ini telah berakhir.", 400);
    }
    if (error.message === "KODE_QUOTA_EXHAUSTED") {
      return jsonError("Kuota penukaran kode ini sudah habis.", 400);
    }
    if (error.message === "KODE_ALREADY_CLAIMED") {
      return jsonError("Anda sudah pernah menukarkan kode ini sebelumnya. Setiap akun hanya berhak mengklaim 1 kali.", 400);
    }
    return jsonError(error.message || "Gagal memproses penukaran kode.", 500);
  }
}
