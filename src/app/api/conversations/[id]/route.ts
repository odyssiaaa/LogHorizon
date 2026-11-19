import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const me = await activeUser();
  if (!me) return jsonError("Login diperlukan.", 401);

  const { id } = await params;

  // Check membership
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId: id,
        userId: me.id,
      },
    },
  });

  if (!participant) {
    return jsonError("Anda bukan anggota percakapan ini.", 403);
  }

  // Update lastReadAt
  await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: { lastReadAt: new Date() },
  });

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      creator: {
        select: { id: true, name: true, username: true, role: true },
      },
      participants: {
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
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 100,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              isPremium: true,
              role: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              imageUrl: true,
              isDeleted: true,
              sender: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!conversation) return jsonError("Percakapan tidak ditemukan.", 404);

  return Response.json({ success: true, conversation });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const me = await activeUser();
  if (!me) return jsonError("Login diperlukan.", 401);

  const { id } = await params;

  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId: id,
        userId: me.id,
      },
    },
  });

  if (!participant) {
    return jsonError("Anda bukan anggota percakapan ini.", 403);
  }

  // Remove participant
  await prisma.conversationParticipant.delete({
    where: { id: participant.id },
  });

  // Check if conversation has any remaining participants
  const remainingCount = await prisma.conversationParticipant.count({
    where: { conversationId: id },
  });

  if (remainingCount === 0) {
    await prisma.conversation.delete({ where: { id } });
  } else {
    // Post leave notice
    await prisma.directMessage.create({
      data: {
        conversationId: id,
        senderId: me.id,
        content: `👋 @${me.username || "Anggota"} telah keluar dari obrolan.`,
      },
    });
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  }

  return Response.json({ success: true, message: "Berhasil keluar dari obrolan." });
}
