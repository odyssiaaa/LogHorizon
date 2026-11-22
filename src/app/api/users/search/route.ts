import { activeUser } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { formatLastSeen } from "@/lib/wib-time";
import { Prisma, Role } from "@prisma/client";

export async function GET(request: Request) {
  const me = await activeUser().catch(() => null);

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";

  // On-demand search only: require at least 2 characters to protect database performance
  if (!query || query.length < 2) {
    return Response.json({
      users: [],
      total: 0,
      page: 1,
      limit: 6,
      totalPages: 0,
    });
  }

  const gameFilter = searchParams.get("game")?.trim() || "";
  const roleFilter = searchParams.get("role")?.trim() || "";
  const sort = searchParams.get("sort")?.trim() || "active";
  const limitParam = parseInt(searchParams.get("limit") || "6", 10);
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const excludeMe = searchParams.get("excludeMe") === "true";

  // Maximum 6 results per search query
  const limit = Math.max(1, Math.min(6, isNaN(limitParam) ? 6 : limitParam));
  const page = Math.max(1, isNaN(pageParam) ? 1 : pageParam);
  const skip = (page - 1) * limit;

  // Build where conditions
  const conditions: Prisma.UserWhereInput[] = [
    { isBanned: false },
    { username: { not: null } },
  ];

  if (excludeMe && me?.id) {
    conditions.push({ id: { not: me.id } });
  }

  if (query) {
    conditions.push({
      OR: [
        { username: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { inGameName: { contains: query, mode: "insensitive" } },
        { favoriteGames: { has: query } },
        {
          partyMembership: {
            party: {
              OR: [
                { tag: { contains: query, mode: "insensitive" } },
                { name: { contains: query, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    });
  }

  if (gameFilter) {
    conditions.push({
      favoriteGames: { has: gameFilter },
    });
  }

  if (roleFilter && Object.values(Role).includes(roleFilter as Role)) {
    conditions.push({
      role: roleFilter as Role,
    });
  }

  const whereClause: Prisma.UserWhereInput = { AND: conditions };

  // Determine sort order
  let orderBy: Prisma.UserOrderByWithRelationInput[];
  if (sort === "level") {
    orderBy = [{ level: "desc" }, { xp: "desc" }];
  } else if (sort === "newest") {
    orderBy = [{ joinedAt: "desc" }];
  } else {
    // "active" (default)
    orderBy = [
      { lastActiveAt: { sort: "desc", nulls: "last" } },
      { xp: "desc" },
    ];
  }

  const [total, rawUsers] = await Promise.all([
    prisma.user.count({ where: whereClause }),
    prisma.user.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        role: true,
        isPremium: true,
        xp: true,
        level: true,
        bio: true,
        inGameName: true,
        highestRank: true,
        primaryRole: true,
        favoriteGames: true,
        equippedAvatarFrame: true,
        equippedCustomTitle: true,
        lastActiveAt: true,
        allowDirectMessages: true,
        joinedAt: true,
        partyMembership: {
          include: {
            party: {
              select: {
                id: true,
                name: true,
                tag: true,
                emblemColor: true,
                primaryGame: true,
              },
            },
          },
        },
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
        ...(me?.id
          ? {
              followers: {
                where: { followerId: me.id },
                select: { id: true },
              },
            }
          : {}),
      },
    }),
  ]);

  const users = rawUsers.map((u) => {
    const { isOnline, text: lastSeenText } = formatLastSeen(u.lastActiveAt);
    const isOwner =
      u.username?.toLowerCase() === ".odyssia" ||
      u.username?.toLowerCase() === "odyssia" ||
      u.name?.toLowerCase() === ".odyssia" ||
      u.name?.toLowerCase() === "odyssia";

    const followersArray = (u as { followers?: { id: string }[] }).followers;
    const isFollowing = Boolean(followersArray && followersArray.length > 0);

    return {
      id: u.id,
      name: u.name,
      username: u.username,
      avatar: u.avatar,
      role: isOwner ? "EMPEROR" : u.role,
      isOwner,
      isPremium: isOwner || u.isPremium,
      xp: u.xp,
      level: u.level,
      bio: u.bio,
      inGameName: u.inGameName,
      highestRank: u.highestRank,
      primaryRole: u.primaryRole,
      favoriteGames: u.favoriteGames,
      equippedAvatarFrame: u.equippedAvatarFrame,
      equippedCustomTitle: u.equippedCustomTitle,
      lastActiveAt: u.lastActiveAt?.toISOString() || null,
      isOnline,
      lastSeenText,
      allowDirectMessages: u.allowDirectMessages,
      joinedAt: u.joinedAt.toISOString(),
      party: u.partyMembership?.party || null,
      followersCount: u._count.followers,
      followingCount: u._count.following,
      isFollowing,
    };
  });

  return Response.json({
    success: true,
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
