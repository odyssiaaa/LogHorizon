import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getWibQuestPeriodKeys, mutateHorizonCoinsInTransaction } from "@/lib/horizon-coin";
import { addXpInTransaction } from "@/lib/xp";

export type QuestCategory = "DAILY" | "WEEKLY";

export interface QuestItem {
  id: string;
  category: QuestCategory;
  title: string;
  description: string;
  target: number;
  rewardHc: number;
  rewardXp: number;
  icon: string;
  actionUrl: string;
  actionLabel: string;
}

export const ALL_QUESTS: Record<string, QuestItem> = {
  // 1. MISI HARIAN (Reset Setiap 00:00 WIB)
  daily_checkin: {
    id: "daily_checkin",
    category: "DAILY",
    title: "Absen Masuk Gerbang Guild",
    description: "Klaim absen harian guild hari ini untuk mengonfirmasi kehadiranmu.",
    target: 1,
    rewardHc: 25,
    rewardXp: 50,
    icon: "🏰",
    actionUrl: "/profile",
    actionLabel: "Absen Sekarang",
  },
  daily_forum: {
    id: "daily_forum",
    category: "DAILY",
    title: "Suara Petualang",
    description: "Buat minimal 1 thread atau komentar aktif di Forum hari ini.",
    target: 1,
    rewardHc: 30,
    rewardXp: 50,
    icon: "💬",
    actionUrl: "/forum",
    actionLabel: "Buka Forum",
  },
  daily_like: {
    id: "daily_like",
    category: "DAILY",
    title: "Solidaritas Guild",
    description: "Beri apresiasi Like pada minimal 3 diskusi rekan guild di Forum hari ini.",
    target: 3,
    rewardHc: 20,
    rewardXp: 30,
    icon: "👍",
    actionUrl: "/forum",
    actionLabel: "Beri Like",
  },
  daily_lfg: {
    id: "daily_lfg",
    category: "DAILY",
    title: "Siap Tempur",
    description: "Buat atau bergabung dalam minimal 1 ajakan mabar LFG hari ini.",
    target: 1,
    rewardHc: 40,
    rewardXp: 75,
    icon: "⚔️",
    actionUrl: "/events?view=mabar",
    actionLabel: "Cari Mabar",
  },

  // 2. MISI MINGGUAN (Reset Setiap Hari Senin 00:00 WIB)
  weekly_checkin_5: {
    id: "weekly_checkin_5",
    category: "WEEKLY",
    title: "Aktif 5 Hari Seminggu",
    description: "Pertahankan loyalitas dengan absen minimal 5 hari dalam periode minggu ini.",
    target: 5,
    rewardHc: 150,
    rewardXp: 250,
    icon: "🔥",
    actionUrl: "/profile",
    actionLabel: "Cek Kehadiran",
  },
  weekly_forum_10: {
    id: "weekly_forum_10",
    category: "WEEKLY",
    title: "Kontributor Diskusi",
    description: "Buat total 10 komentar atau thread berkualitas di Forum minggu ini.",
    target: 10,
    rewardHc: 120,
    rewardXp: 200,
    icon: "📜",
    actionUrl: "/forum",
    actionLabel: "Tulis Diskusi",
  },
  weekly_arena_3: {
    id: "weekly_arena_3",
    category: "WEEKLY",
    title: "Pejuang Arena / Party",
    description: "Daftar turnamen resmi atau selesaikan 3 sesi mabar LFG dalam minggu ini.",
    target: 3,
    rewardHc: 200,
    rewardXp: 300,
    icon: "🏆",
    actionUrl: "/events?view=turnamen",
    actionLabel: "Masuk Arena",
  },
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({
      isLoggedIn: false,
      dailyQuests: [],
      weeklyQuests: [],
      horizonCoins: 0,
    });
  }

  const userId = session.user.id;
  const {
    dailyKey,
    weeklyKey,
    startOfTodayUtc,
    startOfWeekUtc,
    secondsUntilDailyReset,
    secondsUntilWeeklyReset,
  } = getWibQuestPeriodKeys();

  try {
    const [
      user,
      todayPosts,
      todayComments,
      todayLikes,
      todayLfgPosts,
      todayLfgJoins,
      weekPosts,
      weekComments,
      weekTournaments,
      weekLfgPosts,
      weekLfgJoins,
      existingClaims,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, horizonCoins: true, xp: true, level: true, lastCheckInAt: true, checkInStreak: true },
      }),
      // Daily activity
      prisma.post.count({ where: { authorId: userId, createdAt: { gte: startOfTodayUtc } } }),
      prisma.comment.count({ where: { authorId: userId, createdAt: { gte: startOfTodayUtc } } }),
      prisma.postVote.count({ where: { userId, value: "LIKE", createdAt: { gte: startOfTodayUtc } } }),
      prisma.lfgPost.count({ where: { authorId: userId, createdAt: { gte: startOfTodayUtc } } }),
      prisma.lfgJoin.count({ where: { userId, createdAt: { gte: startOfTodayUtc } } }),
      // Weekly activity
      prisma.post.count({ where: { authorId: userId, createdAt: { gte: startOfWeekUtc } } }),
      prisma.comment.count({ where: { authorId: userId, createdAt: { gte: startOfWeekUtc } } }),
      prisma.participant.count({ where: { leaderId: userId, createdAt: { gte: startOfWeekUtc } } }),
      prisma.lfgPost.count({ where: { authorId: userId, createdAt: { gte: startOfWeekUtc } } }),
      prisma.lfgJoin.count({ where: { userId, createdAt: { gte: startOfWeekUtc } } }),
      // Existing claims
      prisma.questClaim.findMany({
        where: {
          userId,
          OR: [{ periodKey: dailyKey }, { periodKey: weeklyKey }],
        },
        select: { questKey: true, periodKey: true },
      }),
    ]);

    const claimedKeys = new Set(existingClaims.map((c) => `${c.questKey}:${c.periodKey}`));

    // Checkin daily progress: 1 if lastCheckInAt >= startOfTodayUtc, else 0
    const hasCheckedInToday = Boolean(user?.lastCheckInAt && new Date(user.lastCheckInAt) >= startOfTodayUtc);
    const dailyCheckinProgress = hasCheckedInToday ? 1 : 0;

    // Checkin weekly progress: using streak or capped at 5
    const streak = user?.checkInStreak ?? 0;
    const weeklyCheckinProgress = Math.min(5, streak);

    const progressMap: Record<string, number> = {
      daily_checkin: dailyCheckinProgress,
      daily_forum: todayPosts + todayComments,
      daily_like: todayLikes,
      daily_lfg: todayLfgPosts + todayLfgJoins,
      weekly_checkin_5: weeklyCheckinProgress,
      weekly_forum_10: weekPosts + weekComments,
      weekly_arena_3: weekTournaments + weekLfgPosts + weekLfgJoins,
    };

    const processQuest = (q: QuestItem) => {
      const periodKey = q.category === "DAILY" ? dailyKey : weeklyKey;
      const current = progressMap[q.id] ?? 0;
      const isClaimed = claimedKeys.has(`${q.id}:${periodKey}`);
      const isCompleted = current >= q.target;
      const canClaim = isCompleted && !isClaimed;

      return {
        ...q,
        currentProgress: Math.min(q.target, current),
        isCompleted,
        isClaimed,
        canClaim,
      };
    };

    const dailyQuests = Object.values(ALL_QUESTS)
      .filter((q) => q.category === "DAILY")
      .map(processQuest);

    const weeklyQuests = Object.values(ALL_QUESTS)
      .filter((q) => q.category === "WEEKLY")
      .map(processQuest);

    return NextResponse.json({
      isLoggedIn: true,
      horizonCoins: user?.horizonCoins ?? 0,
      xp: user?.xp ?? 0,
      level: user?.level ?? 1,
      dailyKey,
      weeklyKey,
      secondsUntilDailyReset,
      secondsUntilWeeklyReset,
      dailyQuests,
      weeklyQuests,
    });
  } catch (error) {
    console.error("[quests/GET] Error:", error);
    return jsonError("Gagal mengambil daftar misi guild.", 500);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Silakan login terlebih dahulu untuk mengklaim hadiah misi.", 401);
  }

  const userId = session.user.id;
  const rateLimit = checkRateLimit(`quest_claim_v2:${userId}`, 1, 1000);
  if (!rateLimit.allowed) {
    return jsonError("Harap tunggu sebentar sebelum mencoba kembali.", 429);
  }

  const payload: unknown = await request.json().catch(() => ({}));
  const questId =
    typeof (payload as { questId?: unknown })?.questId === "string"
      ? (payload as { questId: string }).questId
      : "";

  const quest = ALL_QUESTS[questId];
  if (!quest) {
    return jsonError("Misi tidak valid atau telah kedaluwarsa.", 400);
  }

  const {
    dailyKey,
    weeklyKey,
    startOfTodayUtc,
    startOfWeekUtc,
  } = getWibQuestPeriodKeys();

  const periodKey = quest.category === "DAILY" ? dailyKey : weeklyKey;

  try {
    const claimResult = await prisma.$transaction(async (tx) => {
      // 1. Cek apakah misi sudah diklaim pada periode aktif
      const existing = await tx.questClaim.findUnique({
        where: {
          userId_questKey_periodKey: {
            userId,
            questKey: quest.id,
            periodKey,
          },
        },
      });

      if (existing) {
        throw new Error("ALREADY_CLAIMED");
      }

      // 2. Verifikasi progres secara server-side
      let currentProgress = 0;
      if (quest.id === "daily_checkin") {
        const u = await tx.user.findUnique({ where: { id: userId }, select: { lastCheckInAt: true } });
        currentProgress = u?.lastCheckInAt && new Date(u.lastCheckInAt) >= startOfTodayUtc ? 1 : 0;
      } else if (quest.id === "daily_forum") {
        const [posts, comments] = await Promise.all([
          tx.post.count({ where: { authorId: userId, createdAt: { gte: startOfTodayUtc } } }),
          tx.comment.count({ where: { authorId: userId, createdAt: { gte: startOfTodayUtc } } }),
        ]);
        currentProgress = posts + comments;
      } else if (quest.id === "daily_like") {
        currentProgress = await tx.postVote.count({
          where: { userId, value: "LIKE", createdAt: { gte: startOfTodayUtc } },
        });
      } else if (quest.id === "daily_lfg") {
        const [posts, joins] = await Promise.all([
          tx.lfgPost.count({ where: { authorId: userId, createdAt: { gte: startOfTodayUtc } } }),
          tx.lfgJoin.count({ where: { userId, createdAt: { gte: startOfTodayUtc } } }),
        ]);
        currentProgress = posts + joins;
      } else if (quest.id === "weekly_checkin_5") {
        const u = await tx.user.findUnique({ where: { id: userId }, select: { checkInStreak: true } });
        currentProgress = u?.checkInStreak ?? 0;
      } else if (quest.id === "weekly_forum_10") {
        const [posts, comments] = await Promise.all([
          tx.post.count({ where: { authorId: userId, createdAt: { gte: startOfWeekUtc } } }),
          tx.comment.count({ where: { authorId: userId, createdAt: { gte: startOfWeekUtc } } }),
        ]);
        currentProgress = posts + comments;
      } else if (quest.id === "weekly_arena_3") {
        const [tourneys, posts, joins] = await Promise.all([
          tx.participant.count({ where: { leaderId: userId, createdAt: { gte: startOfWeekUtc } } }),
          tx.lfgPost.count({ where: { authorId: userId, createdAt: { gte: startOfWeekUtc } } }),
          tx.lfgJoin.count({ where: { userId, createdAt: { gte: startOfWeekUtc } } }),
        ]);
        currentProgress = tourneys + posts + joins;
      }

      if (currentProgress < quest.target) {
        throw new Error("PROGRESS_NOT_MET");
      }

      // 3. Catat claim misi (dilindungi @@unique)
      await tx.questClaim.create({
        data: {
          userId,
          questKey: quest.id,
          periodKey,
        },
      });

      // 4. Tambah XP via formula terpusat
      const updatedUser = await addXpInTransaction(tx, userId, quest.rewardXp);

      // 5. Tambah Horizon Coins secara atomik
      const coinTx = await mutateHorizonCoinsInTransaction(
        tx,
        userId,
        quest.rewardHc,
        quest.category === "DAILY" ? "DAILY_QUEST" : "WEEKLY_QUEST",
        `Hadiah ${quest.title} (+${quest.rewardHc} HC)`
      );

      // 6. Notifikasi in-app
      await tx.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          message: `🎁 Hadiah ${quest.title} berhasil diklaim (+${quest.rewardHc} HC & +${quest.rewardXp} XP)!`,
          link: "/profile",
        },
      });

      return {
        questId: quest.id,
        rewardHc: quest.rewardHc,
        rewardXp: quest.rewardXp,
        horizonCoins: coinTx.newBalance,
        level: updatedUser?.level ?? 1,
        xp: updatedUser?.xp ?? 0,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Selamat! Hadiah ${quest.title} berhasil diklaim (+${claimResult.rewardHc} HC & +${claimResult.rewardXp} XP)!`,
      ...claimResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "ALREADY_CLAIMED") {
      return jsonError("Misi ini sudah kamu klaim pada periode ini.", 400);
    }
    if (message === "PROGRESS_NOT_MET") {
      return jsonError("Syarat misi belum terpenuhi. Selesaikan misi sebelum mengklaim hadiah.", 400);
    }
    console.error("[quests/POST] Transaction error:", err);
    return jsonError("Gagal mengklaim hadiah misi. Silakan coba kembali.", 500);
  }
}
