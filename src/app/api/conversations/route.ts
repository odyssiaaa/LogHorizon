import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const me = await activeUser();
  if (!me) return jsonError("Login diperlukan.", 401);

  // Get conversations where me is participant
  const memberships = await prisma.conversationParticipant.findMany({
    where: { userId: me.id },
    select: {
      conversationId: true,
      lastReadAt: true,
      conversation: {
        include: {
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
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              content: true,
              senderId: true,
              createdAt: true,
            },
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  // Calculate unread counts
  const results = await Promise.all(
    memberships.map(async (m) => {
      const conv = m.conversation;
      const lastMsg = conv.messages[0] || null;

      const unreadCount = await prisma.directMessage.count({
        where: {
          conversationId: conv.id,
          senderId: { not: me.id },
          createdAt: { gt: m.lastReadAt },
        },
      });

      return {
        id: conv.id,
        name: conv.name,
        isGroup: conv.isGroup,
        creatorId: conv.creatorId,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        participants: conv.participants.map((p) => ({
          id: p.id,
          userId: p.userId,
          joinedAt: p.joinedAt,
          user: p.user,
        })),
        lastMessage: lastMsg,
        unreadCount,
      };
    })
  );

  return Response.json({ success: true, conversations: results });
}

export async function POST(request: Request) {
  const me = await activeUser();
  if (!me) return jsonError("Login diperlukan.", 401);

  const body = await request.json().catch(() => ({}));
  const { isGroup, name, targetUserId, memberIds } = body;

  // 1-on-1 Chat
  if (!isGroup) {
    if (!targetUserId || typeof targetUserId !== "string") {
      return jsonError("ID target pengguna diperlukan.", 400);
    }

    if (targetUserId === me.id) {
      return jsonError("Tidak dapat mengirim pesan ke diri sendiri.", 400);
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isBanned: true, username: true },
    });
    if (!targetUser || targetUser.isBanned) {
      return jsonError("Pengguna tujuan tidak ditemukan atau dibekukan.", 404);
    }

    // Check if 1-on-1 conversation already exists
    const existingMembership = await prisma.conversationParticipant.findFirst({
      where: {
        userId: me.id,
        conversation: {
          isGroup: false,
          participants: {
            some: { userId: targetUserId },
          },
        },
      },
      select: { conversationId: true },
    });

    if (existingMembership) {
      const existingConv = await prisma.conversation.findUnique({
        where: { id: existingMembership.conversationId },
        include: {
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
        },
      });
      return Response.json({ success: true, conversation: existingConv, isNew: false });
    }

    // Create new 1-on-1 conversation
    const newConv = await prisma.conversation.create({
      data: {
        isGroup: false,
        creatorId: me.id,
        participants: {
          create: [
            { userId: me.id },
            { userId: targetUserId },
          ],
        },
      },
      include: {
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
      },
    });

    return Response.json({ success: true, conversation: newConv, isNew: true });
  }

  // Group Chat
  const groupName = typeof name === "string" ? name.trim() : "";
  if (!groupName || groupName.length < 2) {
    return jsonError("Nama grup obrolan minimal 2 karakter.", 400);
  }

  const rawMembers: string[] = Array.isArray(memberIds) ? memberIds : [];
  const validMemberIds = Array.from(new Set(rawMembers.filter((id) => typeof id === "string" && id !== me.id)));

  const newGroup = await prisma.conversation.create({
    data: {
      isGroup: true,
      name: groupName,
      creatorId: me.id,
      participants: {
        create: [
          { userId: me.id },
          ...validMemberIds.map((userId) => ({ userId })),
        ],
      },
      messages: {
        create: {
          senderId: me.id,
          content: `🎉 Grup obrolan "${groupName}" telah dibuat. Selamat bergabung!`,
        },
      },
    },
    include: {
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
    },
  });

  return Response.json({ success: true, conversation: newGroup, isNew: true });
}
