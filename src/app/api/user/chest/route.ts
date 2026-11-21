import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getWibDateInfo } from "@/lib/wib-time";
import { addXpInTransaction } from "@/lib/xp";
import { getActiveTempTitle } from "@/lib/caste";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({
      isLoggedIn: false,
      canOpen: false,
      hasCheckedInToday: false,
      alreadyOpened: false,
    });
  }

  const userId = session.user.id;
  const { dateKey, startOfTodayUtc, secondsUntilReset } = getWibDateInfo();

  try {
    const [user, todayClaim] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          lastCheckInAt: true,
          tempTitle: true,
          tempTitleExpiresAt: true,
          xp: true,
          level: true,
        },
      }),
      prisma.dailyChestClaim.findUnique({
        where: {
          userId_dateKey: {
            userId,
            dateKey,
          },
        },
      }),
    ]);

    if (!user) {
      return jsonError("User tidak ditemukan.", 404);
    }

    // Cek apakah user sudah absen hari ini
    let hasCheckedInToday = false;
    if (user.lastCheckInAt && new Date(user.lastCheckInAt) >= startOfTodayUtc) {
      hasCheckedInToday = true;
    }

    const alreadyOpened = Boolean(todayClaim);
    const canOpen = hasCheckedInToday && !alreadyOpened;
    const activeTitle = getActiveTempTitle(user);

    return NextResponse.json({
      isLoggedIn: true,
      dateKey,
      secondsUntilReset,
      hasCheckedInToday,
      canOpen,
      alreadyOpened,
      todayClaim: todayClaim
        ? {
            rewardType: todayClaim.rewardType,
            rewardValue: todayClaim.rewardValue,
            claimedAt: todayClaim.claimedAt,
          }
        : null,
      activeTitle,
    });
  } catch (error) {
    console.error("[chest/GET] Error:", error);
    return jsonError("Gagal mengambil status peti harta kerajaan.", 500);
  }
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Silakan login terlebih dahulu untuk membuka Peti Harta Kerajaan.", 401);
  }

  const userId = session.user.id;
  const rateLimit = checkRateLimit(`chest_open:${userId}`, 1, 2000);
  if (!rateLimit.allowed) {
    return jsonError("Harap tunggu sebentar sebelum mencoba kembali.", 429);
  }

  const { dateKey, startOfTodayUtc } = getWibDateInfo();

  try {
    const chestResult = await prisma.$transaction(async (tx) => {
      // 1. Ambil data user
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          lastCheckInAt: true,
          badges: true,
          xp: true,
          level: true,
        },
      });

      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      // 2. Pastikan user sudah absen hari ini
      const hasCheckedInToday = user.lastCheckInAt && new Date(user.lastCheckInAt) >= startOfTodayUtc;
      if (!hasCheckedInToday) {
        throw new Error("CHECKIN_REQUIRED");
      }

      // 3. Cek apakah peti hari ini sudah pernah dibuka
      const existingClaim = await tx.dailyChestClaim.findUnique({
        where: {
          userId_dateKey: {
            userId,
            dateKey,
          },
        },
      });

      if (existingClaim) {
        throw new Error("ALREADY_OPENED");
      }

      // 4. Roll random reward:
      // - 45%: +50 XP
      // - 30%: +150 XP
      // - 15%: Title Sementara 24 Jam ("🍀 Lucky Adventurer" atau "⚡ Chosen Vanguard")
      // - 10%: Jackpot +500 XP
      const roll = Math.random() * 100;
      let rewardType: "XP" | "TITLE" = "XP";
      let rewardValue = "50";
      let rewardTitle = "Pouch of +50 XP";

      if (roll < 45) {
        rewardType = "XP";
        rewardValue = "50";
        rewardTitle = "Pouch of +50 XP";
      } else if (roll < 75) {
        rewardType = "XP";
        rewardValue = "150";
        rewardTitle = "Pouch of +150 XP";
      } else if (roll < 90) {
        rewardType = "TITLE";
        rewardValue = Math.random() > 0.5 ? "🍀 Lucky Adventurer" : "⚡ Chosen Vanguard";
        rewardTitle = `Title Sementara 24 Jam: ${rewardValue}`;
      } else {
        rewardType = "XP";
        rewardValue = "500";
        rewardTitle = "JACKPOT! Pouch of +500 XP";
      }

      // 5. Catat claim peti
      await tx.dailyChestClaim.create({
        data: {
          userId,
          dateKey,
          rewardType,
          rewardValue,
        },
      });

      let updatedLevel = user.level;
      let updatedXp = user.xp;

      if (rewardType === "XP") {
        const updated = await addXpInTransaction(tx, userId, Number(rewardValue));
        if (updated) {
          updatedLevel = updated.level;
          updatedXp = updated.xp;
        }
      } else {
        // Berikan title sementara selama 24 jam
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const badges = new Set(user.badges);
        badges.add(rewardValue);

        await tx.user.update({
          where: { id: userId },
          data: {
            tempTitle: rewardValue,
            tempTitleExpiresAt: expiresAt,
            badges: [...badges],
          },
        });
      }

      // 6. Buat notifikasi sistem
      await tx.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          message: `👑 Peti Harta Kerajaan terbuka! Kamu mendapatkan ${rewardTitle}!`,
          link: "/profile",
        },
      });

      return {
        rewardType,
        rewardValue,
        rewardTitle,
        level: updatedLevel,
        xp: updatedXp,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Peti berhasil dibuka! Kamu memperoleh ${chestResult.rewardTitle}!`,
      ...chestResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "CHECKIN_REQUIRED") {
      return jsonError("Selesaikan Absen Harian terlebih dahulu untuk membuka Peti Harta Kerajaan!", 400);
    }
    if (message === "ALREADY_OPENED") {
      return jsonError("Peti Harta Kerajaan hari ini sudah kamu buka. Silakan kembali besok!", 400);
    }
    console.error("[chest/POST] Transaction error:", err);
    return jsonError("Gagal membuka peti harta kerajaan. Silakan coba lagi.", 500);
  }
}
