import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";
import { checkRateLimit } from "@/lib/rate-limiter";
import {
  checkContentSafety,
  checkSatpamCooldown,
  handleDirectMessageMention,
} from "@/lib/satpam-guardian";

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

  const isStaff = me.role === "ADMIN" || me.role === "MODERATOR";
  if (!isStaff) {
    const limit = checkRateLimit(`chat:user:${me.id}`, 15, 60_000);
    if (!limit.allowed) {
      return jsonError(`Terlalu cepat mengirim pesan (maksimal 15 pesan/menit). Harap tunggu ${limit.remainingSec} detik.`, 429);
    }
  }

  const body = await request.json().catch(() => ({}));
  const rawContent = typeof body.content === "string" ? body.content.trim() : "";
  const content = sanitizeText(rawContent);

  if (!content) {
    return jsonError("Pesan tidak boleh kosong.", 400);
  }

  if (content.length > 2_000) {
    return jsonError("Pesan maksimal 2.000 karakter.", 400);
  }

  // 1. Content Safety Check
  const safety = await checkContentSafety(content, "COMMENT", me);
  if (!safety.isSafe) {
    return jsonError(safety.reason ?? "Pesan diblokir oleh Satpam AI.", 400);
  }

  // 2. Satpam mention check
  const isSatpamMention = /@satpam\b/i.test(content);
  if (isSatpamMention) {
    const isOwnerOrStaff = me.username?.toLowerCase() === ".odyssia" || me.role === "ADMIN" || me.role === "MODERATOR";
    const cooldown = checkSatpamCooldown(me.id, isOwnerOrStaff);
    if (!cooldown.allowed) {
      return jsonError(`Cooldown Satpam: Harap tunggu ${cooldown.remainingSec} detik sebelum memanggil @satpam kembali.`, 429);
    }
  }

  const rawReplyToId = typeof body.replyToId === "string" && body.replyToId.trim() ? body.replyToId.trim() : null;
  const rawImageUrl = typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null;

  const message = await prisma.directMessage.create({
    data: {
      conversationId: id,
      senderId: me.id,
      content,
      replyToId: rawReplyToId,
      imageUrl: rawImageUrl,
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

  if (isSatpamMention) {
    void handleDirectMessageMention({
      conversationId: id,
      userMessage: content,
      senderUsername: me.username ?? "Petualang",
    });
  }

  return Response.json({ success: true, message });
}
