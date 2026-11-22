import { requireStaff, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const access = await requireStaff(["ADMIN", "MODERATOR"]);
  if (access.response) return access.response;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status")?.toUpperCase();

  const whereClause =
    statusParam && statusParam !== "ALL"
      ? { status: statusParam }
      : {};

  try {
    const bounties = await prisma.dungeonBounty.findMany({
      where: whereClause,
      include: {
        submittedBy: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            role: true,
            level: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            username: true,
            isBanned: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const pendingCount = await prisma.dungeonBounty.count({
      where: { status: "PENDING_REVIEW" },
    });

    return Response.json({
      success: true,
      pendingCount,
      bounties,
    });
  } catch (error) {
    console.error("[ADMIN_DUNGEON_GET_ERROR]", error);
    return jsonError("Gagal mengambil daftar laporan buronan.", 500);
  }
}
