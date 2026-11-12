import { LfgStatus } from "@prisma/client";
import { activeUser, authenticatedUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sendDiscordNotice } from "@/lib/discord-webhook";

const VALID_DURATIONS = [1, 3, 6, 12, 24] as const;

export async function GET() {
  const viewer = await authenticatedUser();
  const now = new Date();

  // Zero-cron cleanup: otomatis hapus seluruh postingan LFG yang sudah melewati expiresAt
  try {
    await prisma.lfgPost.deleteMany({
      where: {
        expiresAt: { lte: now },
      },
    });
  } catch (err) {
    console.error("[lfg-cleanup] Zero-cron cleanup error:", err);
  }

  const posts = await prisma.lfgPost.findMany({
    where: {
      status: { in: [LfgStatus.OPEN, LfgStatus.FULL] },
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          inGameName: true,
          primaryRole: true,
          highestRank: true,
          isPremium: true,
        },
      },
      joins: { select: { userId: true, user: { select: { username: true, inGameName: true, primaryRole: true } } } },
    },
  });

  return Response.json(
    posts.map((post) => ({
      id: post.id,
      game: post.game,
      description: post.description,
      scheduledAt: post.scheduledAt.toISOString(),
      expiresAt: post.expiresAt.toISOString(),
      createdAt: post.createdAt.toISOString(),
      maxSlots: post.maxSlots,
      status: post.status,
      targetRank: post.targetRank || "Bebas",
      roleNeeded: post.roleNeeded || "Flex",
      playGoal: post.playGoal || "Mabar Santai",
      playTime: post.playTime || "Malam ini",
      author: post.author,
      isOwner: post.authorId === viewer?.id,
      canManage: post.authorId === viewer?.id || viewer?.role === "ADMIN" || viewer?.role === "MODERATOR",
      joinedByViewer: post.joins.some((join) => join.userId === viewer?.id),
      joins: post.joins.map((join) => ({ username: join.user.username })),
    }))
  );
}

export async function POST(request: Request) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk membuat party.", 401);

  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const game = typeof data.game === "string" ? data.game.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  
  // Slot calculations: can be directly maxSlots or calculated from slotsNeeded (host + needed)
  let maxSlots = Number(data.maxSlots);
  if (!Number.isInteger(maxSlots) || maxSlots < 2) {
    const needed = Number(data.slotsNeeded ?? 2);
    maxSlots = Number.isInteger(needed) && needed >= 1 && needed <= 19 ? needed + 1 : 5;
  }

  // Schedule: if not provided or in past, default to upcoming session (1 hour ahead)
  let scheduledAt: Date;
  if (typeof data.scheduledAt === "string" && data.scheduledAt.trim()) {
    const parsed = new Date(data.scheduledAt);
    scheduledAt = !Number.isNaN(parsed.getTime()) && parsed > new Date()
      ? parsed
      : new Date(Date.now() + 60 * 60 * 1000);
  } else {
    scheduledAt = new Date(Date.now() + 60 * 60 * 1000);
  }

  const targetRank = typeof data.targetRank === "string" && data.targetRank.trim() ? data.targetRank.trim().slice(0, 50) : "Bebas";
  const roleNeeded = typeof data.roleNeeded === "string" && data.roleNeeded.trim() ? data.roleNeeded.trim().slice(0, 50) : "Flex";
  const playGoal = typeof data.playGoal === "string" && data.playGoal.trim() ? data.playGoal.trim().slice(0, 50) : "Mabar Santai";
  const playTime = typeof data.playTime === "string" && data.playTime.trim() ? data.playTime.trim().slice(0, 50) : "Malam ini";

  if (
    !game ||
    game.length > 80 ||
    !description ||
    description.length > 500 ||
    !Number.isInteger(maxSlots) ||
    maxSlots < 2 ||
    maxSlots > 20
  ) {
    return jsonError("Nama game, deskripsi ajakan, dan slot pemain tidak valid.", 400);
  }

  // Durasi kustom dengan default 24 jam
  const durationInput = Number(data.durationHours ?? data.duration ?? 24);
  const durationHours = VALID_DURATIONS.includes(durationInput as (typeof VALID_DURATIONS)[number])
    ? durationInput
    : 24;

  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  const post = await prisma.lfgPost.create({
    data: {
      authorId: user.id,
      game,
      description,
      scheduledAt,
      maxSlots,
      targetRank,
      roleNeeded,
      playGoal,
      playTime,
      expiresAt,
    },
    select: {
      id: true,
      game: true,
      description: true,
      scheduledAt: true,
      expiresAt: true,
      createdAt: true,
      targetRank: true,
      roleNeeded: true,
      playGoal: true,
      playTime: true,
    },
  });

  void sendDiscordNotice(
    "events",
    `[Find Teammate] ${game} (${playGoal}) - Butuh ${roleNeeded}`,
    `Rank Target: ${targetRank} | Jam Main: ${playTime}\n${description}\n(Masa aktif ${durationHours} jam)`
  );
  return Response.json(post, { status: 201 });
}
