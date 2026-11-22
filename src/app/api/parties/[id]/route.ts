import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  const party = await prisma.guildParty.findUnique({
    where: { id },
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
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  if (!party) return jsonError("Party tidak ditemukan.", 404);

  const totalPartyXp = party.members.reduce((sum, m) => sum + (m.user.xp || 0), 0);

  return Response.json({
    success: true,
    party: {
      id: party.id,
      name: party.name,
      tag: party.tag,
      description: party.description,
      primaryGame: party.primaryGame,
      emblemColor: party.emblemColor,
      maxMembers: party.maxMembers,
      totalPartyXp,
      leader: party.leader,
      membersCount: party._count.members,
      members: party.members,
      createdAt: party.createdAt,
    },
  });
}
