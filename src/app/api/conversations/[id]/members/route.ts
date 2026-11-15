import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const me = await activeUser();
  if (!me) return jsonError("Login diperlukan.", 401);

  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      participants: { select: { userId: true } },
    },
  });

  if (!conversation) return jsonError("Percakapan tidak ditemukan.", 404);
  if (!conversation.isGroup) return jsonError("Hanya grup yang dapat menambah anggota.", 400);

  // Check if me is participant
  const isMember = conversation.participants.some((p) => p.userId === me.id);
  if (!isMember && me.role !== "ADMIN") {
    return jsonError("Anda bukan anggota grup ini.", 403);
  }

  const body = await request.json().catch(() => ({}));
  const rawMemberIds: string[] = Array.isArray(body.memberIds) ? body.memberIds : typeof body.userId === "string" ? [body.userId] : [];
  
  const existingIds = new Set(conversation.participants.map((p) => p.userId));
  const newMemberIds = rawMemberIds.filter((mId) => typeof mId === "string" && !existingIds.has(mId));

  if (newMemberIds.length === 0) {
    return jsonError("Pengguna sudah menjadi anggota grup atau tidak valid.", 400);
  }

  // Create participant records
  await prisma.conversationParticipant.createMany({
    data: newMemberIds.map((userId) => ({
      conversationId: id,
      userId,
    })),
    skipDuplicates: true,
  });

  // Fetch usernames for notice
  const addedUsers = await prisma.user.findMany({
    where: { id: { in: newMemberIds } },
    select: { username: true },
  });
  const namesStr = addedUsers.map((u) => `@${u.username || "Petualang"}`).join(", ");

  await prisma.directMessage.create({
    data: {
      conversationId: id,
      senderId: me.id,
      content: `👋 @${me.username || "Anggota"} menambahkan ${namesStr} ke grup.`,
    },
  });

  await prisma.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  const updatedParticipants = await prisma.conversationParticipant.findMany({
    where: { conversationId: id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          isPremium: true,
          role: true,
        },
      },
    },
  });

  return Response.json({ success: true, participants: updatedParticipants });
}
