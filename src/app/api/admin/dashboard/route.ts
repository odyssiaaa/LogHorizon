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
    pendingTournamentRegistrations,
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
    escrowTransactions,
    securityLogs,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.post.count({
      where: {
        category: PostCategory.MARKETPLACE,
        marketData: { path: ["status"], equals: "AVAILABLE" },
      },
    }),
    prisma.escrowTransaction.count({
      where: { status: "IN_ESCROW" },
    }),
    prisma.donation.count({
      where: { status: "PENDING" },
    }),
    prisma.participant.count({
      where: { paymentStatus: "PENDING_PAYMENT" },
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
    prisma.escrowTransaction.findMany({
      include: {
        post: { select: { id: true, title: true } },
        buyer: { select: { id: true, username: true, discordId: true } },
        seller: { select: { id: true, username: true, discordId: true } },
        claimedBy: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.securityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const DEFAULT_DISCORD_CHANNELS = {
    discordAnnouncementChannelId: "1547552373629780038",
    discordGiveawayChannelId: "1547552377396011118",
    discordInfoLiveChannelId: "1547552381221339149",
    discordPartnershipChannelId: "1572235405770887269",
    discordShopChannelId: "1547552452725973093",
    discordLfgChannelId: "1547552498833825874",
    discordModLogChannelId: "1547552557868777552",
  };

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
    discordWebhookUrl: null,
    ...DEFAULT_DISCORD_CHANNELS,
  };

  const resolvedSiteConfig = siteConfig
    ? {
        ...siteConfig,
        discordAnnouncementChannelId: siteConfig.discordAnnouncementChannelId || DEFAULT_DISCORD_CHANNELS.discordAnnouncementChannelId,
        discordGiveawayChannelId: siteConfig.discordGiveawayChannelId || DEFAULT_DISCORD_CHANNELS.discordGiveawayChannelId,
        discordInfoLiveChannelId: siteConfig.discordInfoLiveChannelId || DEFAULT_DISCORD_CHANNELS.discordInfoLiveChannelId,
        discordPartnershipChannelId: siteConfig.discordPartnershipChannelId || DEFAULT_DISCORD_CHANNELS.discordPartnershipChannelId,
        discordShopChannelId: siteConfig.discordShopChannelId || DEFAULT_DISCORD_CHANNELS.discordShopChannelId,
        discordLfgChannelId: siteConfig.discordLfgChannelId || DEFAULT_DISCORD_CHANNELS.discordLfgChannelId,
        discordModLogChannelId: siteConfig.discordModLogChannelId || DEFAULT_DISCORD_CHANNELS.discordModLogChannelId,
      }
    : defaultSiteConfig;

  const isAdmin = access.user.role === Role.ADMIN;

  return Response.json({
    stats: {
      totalMembers,
      totalForumThreads,
      activeMarketplaceListings: activeListings,
      activeEscrows: isAdmin ? activeEscrows : 0,
      pendingDonations: isAdmin ? pendingDonationsCount : 0,
      pendingTournamentRegistrations,
      pendingReports,
      totalDonations: isAdmin ? (totalDonationsSum._sum.amount ?? 0) : 0,
    },
    reports,
    recentPosts,
    users,
    marketplaceListings,
    donations: isAdmin ? donations : [],
    announcements,
    siteConfig: isAdmin ? resolvedSiteConfig : null,
    sponsors,
    escrowTransactions: isAdmin ? escrowTransactions : [],
    securityLogs,
    pagination: { page, pageSize: PAGE_SIZE, total: totalUsers, totalPages: Math.ceil(totalUsers / PAGE_SIZE) },
    canManageRoles: isAdmin,
    canBanMembers: true,
    canBroadcast: isAdmin,
    currentUserId: access.user.id,
  });
}
