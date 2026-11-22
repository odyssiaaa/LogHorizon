import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan.", 401);

  const { id: partyId } = await params;

  // Verify user is member of this party
  const party = await prisma.guildParty.findUnique({
    where: { id: partyId },
    include: {
      members: { select: { userId: true } },
    },
  });

  if (!party) return jsonError("Party tidak ditemukan.", 404);

  const isMember = party.members.some((m) => m.userId === user.id);
  if (!isMember) {
    return jsonError("Hanya anggota party yang dapat mengakses ruang obrolan ini.", 403);
  }

  let conversationId = party.conversationId;

  if (!conversationId) {
    // Create new group chat conversation
    const conv = await prisma.conversation.create({
      data: {
        name: `Party [${party.tag}] ${party.name}`,
        isGroup: true,
        creatorId: party.leaderId,
      },
    });
    conversationId = conv.id;
    await prisma.guildParty.update({
      where: { id: party.id },
      data: { conversationId },
    });
  }

  // Ensure all members are participants
  for (const m of party.members) {
    await prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId: m.userId,
        },
      },
      create: {
        conversationId,
        userId: m.userId,
      },
      update: {},
    });
  }

  return Response.json({
    success: true,
    conversationId,
  });
}
