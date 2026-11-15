import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
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

  await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: { lastReadAt: new Date() },
  });

  return Response.json({ success: true, message: "Ditandai telah dibaca." });
}
