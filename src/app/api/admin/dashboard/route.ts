import { PostCategory, Prisma, ReportStatus, Role } from "@prisma/client";
import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  const access = await requireStaff();
  if (access.response) return access.response;

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const requestedPage = Number(url.searchParams.get("page") ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const userWhere: Prisma.UserWhereInput = search
    ? {
        OR: [
          { username: { contains: search, mode: "insensitive" } },
          { discordId: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [
    totalMembers,
    activeListings,
    activeEscrows,
    pendingDonationsCount,
    totalForumThreads,
    pendingReports,
    totalDonationsSum,
    reports,
    totalUsers,
    users,
    recentPosts,
    marketplaceListings,
    donations,
    announcements,
    siteConfig,
    sponsors,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.post.count({
      where: {
        category: PostCategory.MARKETPLACE,
        marketData: { path: ["status"], equals: "AVAILABLE" },
      },
    }),
    prisma.post.count({
      where: {
        category: PostCategory.MARKETPLACE,
        marketData: { path: ["status"], equals: "IN_ESCROW" },
      },
    }),
    prisma.donation.count({
      where: { status: "PENDING" },
    }),
    prisma.post.count({ where: { category: { not: PostCategory.MARKETPLACE } } }),
    prisma.report.count({ where: { status: ReportStatus.PENDING } }),
    prisma.donation.aggregate({
      where: { status: { in: ["APPROVED", "SUCCEEDED"] } },
      _sum: { amount: true },
    }),
    prisma.report.findMany({
      where: { status: ReportStatus.PENDING },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            category: true,
            isPinned: true,
            author: { select: { username: true } },
          },
        },
        reporter: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where: userWhere }),
    prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        username: true,
        avatar: true,
        discordId: true,
        role: true,
        isBanned: true,
        isPremium: true,
        xp: true,
        level: true,
        badges: true,
        joinedAt: true,
      },
      orderBy: { joinedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.post.findMany({
      where: { category: { not: PostCategory.MARKETPLACE } },
      select: {
        id: true,
        title: true,
        category: true,
        isPinned: true,
        createdAt: true,
        author: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.post.findMany({
      where: { category: PostCategory.MARKETPLACE },
      select: {
        id: true,
        title: true,
        marketData: true,
        createdAt: true,
        author: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.donation.findMany({
      include: {
        user: { select: { id: true, username: true, avatar: true, badges: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.announcement.findMany({
      include: {
        author: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.siteConfig.findUnique({
      where: { id: "default" },
    }),
    prisma.sponsor.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const defaultSiteConfig = {
    id: "default",
    statMembers: "1,200+",
    statParties: "450+",
    statVoice: "24/7",
    qrisImageUrl: "/qris-guild.png",
    rekberAccount: "BCA 1234567890 a.n LogHorizon",
    rekberFee: 5000,
    monthlyGoal: 5000000,
    minDonation: 10000,
    discordInviteUrl: "https://discord.gg/aJvbVyTxNb",
  };

  return Response.json({
    stats: {
      totalMembers,
      totalForumThreads,
      activeMarketplaceListings: activeListings,
      activeEscrows,
      pendingDonations: pendingDonationsCount,
      pendingReports,
      totalDonations: totalDonationsSum._sum.amount ?? 0,
    },
    reports,
    recentPosts,
    users,
    marketplaceListings,
    donations,
    announcements,
    siteConfig: siteConfig ?? defaultSiteConfig,
    sponsors,
    pagination: { page, pageSize: PAGE_SIZE, total: totalUsers, totalPages: Math.ceil(totalUsers / PAGE_SIZE) },
    canManageRoles: access.user.role === Role.ADMIN,
    canBanMembers: true,
    canBroadcast: access.user.role === Role.ADMIN,
    currentUserId: access.user.id,
  });
}
