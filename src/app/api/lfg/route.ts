import { LfgStatus } from "@prisma/client";
import { activeUser, authenticatedUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sendDiscordNotice } from "@/lib/discord-webhook";

export async function GET() {
  const viewer = await authenticatedUser();
  const posts = await prisma.lfgPost.findMany({
    where: { status: { in: [LfgStatus.OPEN, LfgStatus.FULL] } },
    orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
    include: {
      author: { select: { username: true } },
      joins: { select: { userId: true, user: { select: { username: true } } } },
    },
  });
  return Response.json(posts.map((post) => ({
    id: post.id,
    game: post.game,
    description: post.description,
    scheduledAt: post.scheduledAt,
    maxSlots: post.maxSlots,
    status: post.status,
    author: post.author,
    isOwner: post.authorId === viewer?.id,
    joinedByViewer: post.joins.some((join) => join.userId === viewer?.id),
    joins: post.joins.map((join) => ({ username: join.user.username })),
  })));
}

export async function POST(request: Request) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk membuat party.", 401);
  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const game = typeof data.game === "string" ? data.game.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const maxSlots = Number(data.maxSlots);
  const scheduledAt = typeof data.scheduledAt === "string" ? new Date(data.scheduledAt) : new Date(Number.NaN);
  if (!game || game.length > 80 || !description || description.length > 500 || !Number.isInteger(maxSlots) || maxSlots < 2 || maxSlots > 20 || Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    return jsonError("Game, deskripsi, jadwal mendatang, dan slot party tidak valid.", 400);
  }
  const post = await prisma.lfgPost.create({
    data: { authorId: user.id, game, description, scheduledAt, maxSlots },
    select: { id: true, game: true, description: true, scheduledAt: true },
  });
  void sendDiscordNotice("events", `Party LFG baru: ${game}`, description);
  return Response.json(post, { status: 201 });
}
