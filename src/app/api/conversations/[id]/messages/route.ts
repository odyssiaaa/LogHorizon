import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const me = await activeUser();
  if (!me) return jsonError("Login diperlukan.", 401);

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const afterParam = searchParams.get("after");

  // Verify membership
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

  // Update lastReadAt silently
  await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: { lastReadAt: new Date() },
  });

  // Query new messages only
  const whereClause: { conversationId: string; createdAt?: { gt: Date } } = {
    conversationId: id,
  };

  if (afterParam) {
    const afterDate = new Date(afterParam);
    if (!isNaN(afterDate.getTime())) {
      whereClause.createdAt = { gt: afterDate };
    }
  }

  const messages = await prisma.directMessage.findMany({
    where: whereClause,
    orderBy: { createdAt: "asc" },
    take: 50,
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
    },
  });

  return Response.json({ success: true, messages });
}

export async function POST(request: Request, { params }: RouteContext) {
  const me = await activeUser();
  if (!me) return jsonError("Login diperlukan.", 401);

  const { id } = await params;

  // Verify membership
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

  const body = await request.json().catch(() => ({}));
  const rawContent = typeof body.content === "string" ? body.content.trim() : "";
  const content = sanitizeText(rawContent);

  if (!content) {
    return jsonError("Pesan tidak boleh kosong.", 400);
  }

  if (content.length > 250000) {
    return jsonError("Pesan maksimal 250.000 karakter.", 400);
  }

  const message = await prisma.directMessage.create({
    data: {
      conversationId: id,
      senderId: me.id,
      content,
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
    },
  });

  // Update conversation updatedAt & participant lastReadAt
  const now = new Date();
  await Promise.all([
    prisma.conversation.update({
      where: { id },
      data: { updatedAt: now },
    }),
    prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: now },
    }),
  ]);

  return Response.json({ success: true, message });
}
