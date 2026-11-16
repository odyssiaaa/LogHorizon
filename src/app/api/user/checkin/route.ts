import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";

function getWibDateKey(date: Date): { key: string; midnightUtc: number } {
  // WIB is UTC+7
  const wibTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const y = wibTime.getUTCFullYear();
  const m = wibTime.getUTCMonth();
  const d = wibTime.getUTCDate();
  const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const midnightUtc = Date.UTC(y, m, d);
  return { key, midnightUtc };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ canCheckIn: false, isLoggedIn: false, streak: 0 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, xp: true, level: true, lastCheckInAt: true, checkInStreak: true },
  });

  if (!user) {
    return jsonError("User tidak ditemukan.", 404);
  }

  const now = new Date();
  const nowWib = getWibDateKey(now);

  let alreadyCheckedIn = false;
  if (user.lastCheckInAt) {
    const lastWib = getWibDateKey(user.lastCheckInAt);
    if (nowWib.key === lastWib.key) {
      alreadyCheckedIn = true;
    }
  }

  // Calculate seconds until next WIB midnight
  const nextWibMidnight = new Date(nowWib.midnightUtc + 24 * 60 * 60 * 1000 - 7 * 60 * 60 * 1000);
  const secondsUntilReset = Math.max(0, Math.floor((nextWibMidnight.getTime() - now.getTime()) / 1000));

  return NextResponse.json({
    canCheckIn: !alreadyCheckedIn,
    alreadyCheckedIn,
    streak: user.checkInStreak ?? 0,
    lastCheckInAt: user.lastCheckInAt,
    secondsUntilReset,
    level: user.level,
    xp: user.xp,
  });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Silakan masuk (login) terlebih dahulu untuk absen harian.", 401);
  }

  const userId = session.user.id;
  const now = new Date();
  const nowWib = getWibDateKey(now);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, xp: true, level: true, badges: true, lastCheckInAt: true, checkInStreak: true },
    });

    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    if (user.lastCheckInAt) {
      const lastWib = getWibDateKey(user.lastCheckInAt);
      if (nowWib.key === lastWib.key) {
        throw new Error("ALREADY_CLAIMED");
      }
    }

    // Determine new streak
    let newStreak = 1;
    if (user.lastCheckInAt) {
      const lastWib = getWibDateKey(user.lastCheckInAt);
      const diffDays = Math.round((nowWib.midnightUtc - lastWib.midnightUtc) / (24 * 60 * 60 * 1000));
      if (diffDays === 1) {
        newStreak = (user.checkInStreak ?? 0) + 1;
      } else {
        newStreak = 1;
      }
    }

    // Calculate level progression (+15 XP)
    let newLevel = user.level;
    let remainingXp = user.xp + 15;
    while (remainingXp >= newLevel * 100) {
      remainingXp -= newLevel * 100;
      newLevel += 1;
    }

    const badges = new Set(user.badges);
    if (newStreak >= 7) badges.add("Streak 7 Hari");
    if (newStreak >= 30) badges.add("Loyal Guildsman");
    if (newLevel >= 10) badges.add("Veteran");

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        xp: remainingXp,
        level: newLevel,
        badges: [...badges],
        lastCheckInAt: now,
        checkInStreak: newStreak,
      },
      select: {
        id: true,
        xp: true,
        level: true,
        lastCheckInAt: true,
        checkInStreak: true,
      },
    });

    return {
      updatedUser,
      newStreak,
      xpGained: 15,
    };
  });

  return NextResponse.json({
    success: true,
    message: `Berhasil absen harian! Kamu memperoleh +15 XP. Streak saat ini: ${result.newStreak} hari.`,
    xpGained: result.xpGained,
    streak: result.newStreak,
    level: result.updatedUser.level,
    xp: result.updatedUser.xp,
    lastCheckInAt: result.updatedUser.lastCheckInAt,
  });
}
