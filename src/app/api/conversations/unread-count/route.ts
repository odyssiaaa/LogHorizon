import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const me = await activeUser();
  if (!me) return jsonError("Login diperlukan.", 401);

  const memberships = await prisma.conversationParticipant.findMany({
    where: { userId: me.id },
    select: {
      conversationId: true,
      lastReadAt: true,
    },
  });

  if (memberships.length === 0) {
    return Response.json({ success: true, unreadCount: 0 });
  }

  // Count unread across memberships
  let totalUnread = 0;
  for (const m of memberships) {
    const count = await prisma.directMessage.count({
      where: {
        conversationId: m.conversationId,
        senderId: { not: me.id },
        createdAt: { gt: m.lastReadAt },
      },
    });
    totalUnread += count;
  }

  return Response.json({ success: true, unreadCount: totalUnread });
}
