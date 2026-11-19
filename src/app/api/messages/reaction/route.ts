import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const me = await activeUser();
  if (!me) return jsonError("Login diperlukan.", 401);

  const body = await request.json().catch(() => ({}));
  const messageId = typeof body.messageId === "string" ? body.messageId : "";
  const emoji = typeof body.emoji === "string" ? body.emoji : "";

  if (!messageId || !emoji) {
    return jsonError("Parameter tidak valid.", 400);
  }

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

  if (!message) return jsonError("Pesan tidak ditemukan.", 404);

  const isMember = message.conversation.participants.some((p) => p.userId === me.id);
  if (!isMember) return jsonError("Akses ditolak.", 403);

  const rawReactions = (message.reactions && typeof message.reactions === "object"
    ? message.reactions
    : {}) as Record<string, string[]>;

  const currentUsers = Array.isArray(rawReactions[emoji]) ? rawReactions[emoji] : [];
  let updatedUsers: string[];

  if (currentUsers.includes(me.id)) {
    // Toggle off
    updatedUsers = currentUsers.filter((id) => id !== me.id);
  } else {
    // Add reaction
    updatedUsers = [...currentUsers, me.id];
  }

  const nextReactions = { ...rawReactions, [emoji]: updatedUsers };

  const updated = await prisma.directMessage.update({
    where: { id: messageId },
    data: { reactions: nextReactions },
    select: { id: true, reactions: true },
  });

  return Response.json({ success: true, messageId: updated.id, reactions: updated.reactions });
}
