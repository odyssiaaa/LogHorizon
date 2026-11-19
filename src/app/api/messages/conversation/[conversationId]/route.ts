import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function DELETE(request: Request, { params }: RouteContext) {
  const me = await activeUser();
  if (!me) return jsonError("Login diperlukan.", 401);

  const { conversationId } = await params;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action")?.toLowerCase() || "clear";

  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId: me.id,
      },
    },
    include: {
      conversation: true,
    },
  });

  if (!participant) {
    return jsonError("Anda bukan anggota obrolan ini.", 403);
  }

  if (action === "delete") {
    // Delete the entire conversation & its messages
    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    return Response.json({
      success: true,
      message: "Percakapan berhasil dihapus menyeluruh.",
      action: "delete",
    });
  }

  // Clear messages inside this conversation
  await prisma.directMessage.deleteMany({
    where: { conversationId },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return Response.json({
    success: true,
    message: "Seluruh riwayat obrolan berhasil dibersihkan.",
    action: "clear",
  });
}
