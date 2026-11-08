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
    ? { username: { contains: search, mode: "insensitive" } }
    : {};

  const [totalMembers, activeListings, totalForumThreads, pendingReports, reports, totalUsers, users] =
    await prisma.$transaction([
      prisma.user.count(),
      prisma.post.count({
        where: {
          category: PostCategory.MARKETPLACE,
          marketData: { path: ["status"], equals: "AVAILABLE" },
        },
      }),
      prisma.post.count({ where: { category: { not: PostCategory.MARKETPLACE } } }),
      prisma.report.count({ where: { status: ReportStatus.PENDING } }),
      prisma.report.findMany({
        where: { status: ReportStatus.PENDING },
        include: {
          post: {
            select: { id: true, title: true, category: true, author: { select: { username: true } } },
          },
          reporter: { select: { username: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.user.count({ where: userWhere }),
      prisma.user.findMany({
        where: userWhere,
        select: { id: true, username: true, avatar: true, role: true, isBanned: true, joinedAt: true },
        orderBy: { joinedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);

  return Response.json({
    stats: {
      totalMembers,
      totalForumThreads,
      activeMarketplaceListings: activeListings,
      pendingReports,
    },
    reports,
    users,
    pagination: { page, pageSize: PAGE_SIZE, total: totalUsers, totalPages: Math.ceil(totalUsers / PAGE_SIZE) },
    canManageRoles: access.user.role === Role.ADMIN,
    canBanMembers: true,
    canBroadcast: access.user.role === Role.ADMIN,
    currentUserId: access.user.id,
  });
}
