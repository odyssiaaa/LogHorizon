import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limiter";
import { getWibDateInfo } from "@/lib/wib-time";
import { addXpInTransaction } from "@/lib/xp";

export type QuestDefinition = {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardXp: number;
  icon: string;
  actionUrl: string;
  actionLabel: string;
};

export const QUEST_DEFINITIONS: Record<string, QuestDefinition> = {
  forum_activity: {
    id: "forum_activity",
    title: "Misi 1 — Suara Petualang",
    description: "Buat minimal 1 thread atau komentar di forum hari ini.",
    target: 1,
    rewardXp: 50,
    icon: "💬",
    actionUrl: "/forum",
    actionLabel: "Buka Forum",
  },
  forum_like: {
    id: "forum_like",
    title: "Misi 2 — Kawan Seperjuangan",
    description: "Berikan Like pada 3 diskusi di forum hari ini.",
    target: 3,
    rewardXp: 30,
    icon: "👍",
    actionUrl: "/forum",
    actionLabel: "Beri Like",
  },
  lfg_party: {
    id: "lfg_party",
    title: "Misi 3 — Siap Tempur",
    description: "Buat atau gabung dalam 1 ajakan mabar LFG hari ini.",
    target: 1,
    rewardXp: 75,
    icon: "⚔️",
    actionUrl: "/events",
    actionLabel: "Cari Mabar",
  },
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ isLoggedIn: false, quests: [] });
  }

  const userId = session.user.id;
  const { dateKey, startOfTodayUtc, secondsUntilReset } = getWibDateInfo();

  try {
    // 1. Fetch real-time progress parallel from DB
    const [todayPosts, todayComments, todayLikes, todayLfgPosts, todayLfgJoins, existingClaims] =
      await Promise.all([
        prisma.post.count({
          where: { authorId: userId, createdAt: { gte: startOfTodayUtc } },
        }),
        prisma.comment.count({
          where: { authorId: userId, createdAt: { gte: startOfTodayUtc } },
        }),
        prisma.postVote.count({
          where: { userId, value: "LIKE", createdAt: { gte: startOfTodayUtc } },
        }),
        prisma.lfgPost.count({
          where: { authorId: userId, createdAt: { gte: startOfTodayUtc } },
        }),
        prisma.lfgJoin.count({
          where: { userId, createdAt: { gte: startOfTodayUtc } },
        }),
        prisma.dailyQuestClaim.findMany({
          where: { userId, dateKey },
          select: { questId: true, claimedAt: true },
        }),
      ]);

    const claimedQuestIds = new Set(existingClaims.map((c) => c.questId));

    const progressMap: Record<string, number> = {
      forum_activity: todayPosts + todayComments,
      forum_like: todayLikes,
      lfg_party: todayLfgPosts + todayLfgJoins,
    };

    const quests = Object.values(QUEST_DEFINITIONS).map((q) => {
      const current = progressMap[q.id] ?? 0;
      const isClaimed = claimedQuestIds.has(q.id);
      const isCompleted = current >= q.target;
      const canClaim = isCompleted && !isClaimed;

      return {
        ...q,
        current: Math.min(q.target, current),
        isCompleted,
        isClaimed,
        canClaim,
      };
    });

    const totalCompleted = quests.filter((q) => q.isCompleted).length;
    const totalClaimed = quests.filter((q) => q.isClaimed).length;

    return NextResponse.json({
      isLoggedIn: true,
      dateKey,
      secondsUntilReset,
      quests,
      summary: {
        totalQuests: quests.length,
        totalCompleted,
        totalClaimed,
        allDone: totalClaimed === quests.length,
      },
    });
  } catch (error) {
    console.error("[quests/GET] Error:", error);
    return jsonError("Gagal mengambil data misi harian.", 500);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Silakan login terlebih dahulu untuk mengklaim misi.", 401);
  }

  const userId = session.user.id;
  const rateLimit = checkRateLimit(`quest_claim:${userId}`, 1, 1000);
  if (!rateLimit.allowed) {
    return jsonError("Harap tunggu sebentar sebelum mencoba kembali.", 429);
  }

  const payload: unknown = await request.json().catch(() => ({}));
  const questId = typeof (payload as { questId?: unknown })?.questId === "string" ? (payload as { questId: string }).questId : "";

  const quest = QUEST_DEFINITIONS[questId];
  if (!quest) {
    return jsonError("Misi tidak valid.", 400);
  }

  const { dateKey, startOfTodayUtc } = getWibDateInfo();

  try {
    const claimResult = await prisma.$transaction(async (tx) => {
      // 1. Cek apakah misi sudah pernah diklaim hari ini
      const alreadyClaimed = await tx.dailyQuestClaim.findUnique({
        where: {
          userId_questId_dateKey: {
            userId,
            questId,
            dateKey,
          },
        },
      });

      if (alreadyClaimed) {
        throw new Error("ALREADY_CLAIMED");
      }

      // 2. Verifikasi progres secara server-side
      let currentProgress = 0;
      if (questId === "forum_activity") {
        const [posts, comments] = await Promise.all([
          tx.post.count({ where: { authorId: userId, createdAt: { gte: startOfTodayUtc } } }),
          tx.comment.count({ where: { authorId: userId, createdAt: { gte: startOfTodayUtc } } }),
        ]);
        currentProgress = posts + comments;
      } else if (questId === "forum_like") {
        currentProgress = await tx.postVote.count({
          where: { userId, value: "LIKE", createdAt: { gte: startOfTodayUtc } },
        });
      } else if (questId === "lfg_party") {
        const [posts, joins] = await Promise.all([
          tx.lfgPost.count({ where: { authorId: userId, createdAt: { gte: startOfTodayUtc } } }),
          tx.lfgJoin.count({ where: { userId, createdAt: { gte: startOfTodayUtc } } }),
        ]);
        currentProgress = posts + joins;
      }

      if (currentProgress < quest.target) {
        throw new Error("PROGRESS_NOT_MET");
      }

      // 3. Catat klaim secara atomik (dilindungi @@unique)
      await tx.dailyQuestClaim.create({
        data: {
          userId,
          questId,
          dateKey,
          xpAwarded: quest.rewardXp,
        },
      });

      // 4. Tambahkan XP ke user
      const updatedUser = await addXpInTransaction(tx, userId, quest.rewardXp);

      // 5. Kirim notifikasi sistem
      await tx.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          message: `🎁 Hadiah ${quest.title} berhasil diklaim (+${quest.rewardXp} XP)!`,
          link: "/profile",
        },
      });

      return {
        questId,
        rewardXp: quest.rewardXp,
        level: updatedUser?.level ?? 1,
        xp: updatedUser?.xp ?? 0,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Selamat! Hadiah ${quest.title} berhasil diklaim (+${claimResult.rewardXp} XP)!`,
      ...claimResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "ALREADY_CLAIMED") {
      return jsonError("Misi ini sudah kamu klaim hari ini.", 400);
    }
    if (message === "PROGRESS_NOT_MET") {
      return jsonError("Progres misi belum selesai. Selesaikan misi terlebih dahulu sebelum mengklaim.", 400);
    }
    console.error("[quests/POST] Transaction error:", err);
    return jsonError("Gagal mengklaim hadiah misi. Silakan coba lagi.", 500);
  }
}
