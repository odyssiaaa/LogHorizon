import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan.", 401);

  const membership = await prisma.guildPartyMember.findUnique({
    where: { userId: user.id },
    include: {
      party: {
        include: {
          leader: {
            select: {
              id: true,
              username: true,
              avatar: true,
              role: true,
              level: true,
              equippedAvatarFrame: true,
              equippedCustomTitle: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                  level: true,
                  xp: true,
                  equippedAvatarFrame: true,
                  equippedCustomTitle: true,
                },
              },
            },
            orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
          },
          joinRequests: {
            where: { status: "PENDING" },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                  level: true,
                  xp: true,
                  equippedAvatarFrame: true,
                  equippedCustomTitle: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!membership) {
    return Response.json({
      inParty: false,
      party: null,
      membership: null,
    });
  }

  const party = membership.party;
  const isLeaderOrCoLeader = membership.role === "LEADER" || membership.role === "CO_LEADER";
  const totalPartyXp = party.members.reduce((sum, m) => sum + (m.user.xp || 0), 0);

  // Sync totalPartyXp in background if changed
  if (party.totalPartyXp !== totalPartyXp) {
    void prisma.guildParty.update({
      where: { id: party.id },
      data: { totalPartyXp },
    }).catch(() => null);
  }

  return Response.json({
    inParty: true,
    membership: {
      id: membership.id,
      role: membership.role,
      inGameNickname: membership.inGameNickname,
      inGameId: membership.inGameId,
      joinedAt: membership.joinedAt,
    },
    party: {
      id: party.id,
      name: party.name,
      tag: party.tag,
      description: party.description,
      primaryGame: party.primaryGame,
      emblemColor: party.emblemColor,
      leaderId: party.leaderId,
      maxMembers: party.maxMembers,
      totalPartyXp,
      conversationId: party.conversationId,
      createdAt: party.createdAt,
      leader: party.leader,
      members: party.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        inGameNickname: m.inGameNickname,
        inGameId: m.inGameId,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      joinRequests: isLeaderOrCoLeader ? party.joinRequests : [],
    },
  });
}
