import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ messageId: string }> };

export async function DELETE(request: Request, { params }: RouteContext) {
  const me = await activeUser();
  if (!me) return jsonError("Login diperlukan.", 401);

  const { messageId } = await params;

  const message = await prisma.directMessage.findUnique({
    where: { id: messageId },
    include: {
      conversation: {
        include: {
          participants: true,
        },
      },
    },
  });

  if (!message) {
    return jsonError("Pesan tidak ditemukan.", 404);
  }

  // Verify authorization: sender, admin, moderator, or conversation creator
  const isSender = message.senderId === me.id;
  const isStaff = me.role === "ADMIN" || me.role === "MODERATOR" || me.username === ".odyssia";
  const isCreator = message.conversation.creatorId === me.id;

  if (!isSender && !isStaff && !isCreator) {
    return jsonError("Anda tidak berhak menghapus pesan ini.", 403);
  }

  // Soft delete message to preserve replies or delete
  const updatedMessage = await prisma.directMessage.update({
    where: { id: messageId },
    data: {
      isDeleted: true,
      content: "🚫 Pesan ini telah dihapus",
      imageUrl: null,
    },
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
  });

  return Response.json({
    success: true,
    message: "Pesan berhasil dihapus.",
    deletedMessage: updatedMessage,
  });
}
