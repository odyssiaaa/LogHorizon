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
      author: { select: { id: true, username: true } },
      joins: { select: { userId: true, user: { select: { username: true } } } },
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
  const maxSlots = Number(data.maxSlots);
  const scheduledAt = typeof data.scheduledAt === "string" ? new Date(data.scheduledAt) : new Date(Number.NaN);

  if (
    !game ||
    game.length > 80 ||
    !description ||
    description.length > 500 ||
    !Number.isInteger(maxSlots) ||
    maxSlots < 2 ||
    maxSlots > 20 ||
    Number.isNaN(scheduledAt.getTime()) ||
    scheduledAt <= new Date()
  ) {
    return jsonError("Game, deskripsi, jadwal mendatang, dan slot party tidak valid.", 400);
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
      expiresAt,
    },
    select: {
      id: true,
      game: true,
      description: true,
      scheduledAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  void sendDiscordNotice("events", `Party LFG baru: ${game} (Aktif ${durationHours} jam)`, description);
  return Response.json(post, { status: 201 });
}
