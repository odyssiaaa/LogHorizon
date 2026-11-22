import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [bannedUsers, imprisonedBounties, activeBounties, capturedBounties] =
      await Promise.all([
        // 1. Permanently banned users from DB
        prisma.user.findMany({
          where: { isBanned: true },
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            level: true,
            role: true,
            banReason: true,
            bannedAt: true,
            joinedAt: true,
            badges: true,
          },
          orderBy: { joinedAt: "desc" },
        }),

        // 2. Bounties marked as IMPRISONED
        prisma.dungeonBounty.findMany({
          where: { status: "IMPRISONED" },
          include: {
            approvedBy: { select: { username: true, role: true } },
            submittedBy: { select: { username: true } },
          },
          orderBy: { createdAt: "desc" },
        }),

        // 3. Active WANTED bounties
        prisma.dungeonBounty.findMany({
          where: { status: "WANTED_ACTIVE" },
          include: {
            approvedBy: { select: { username: true, role: true } },
            submittedBy: { select: { id: true, username: true } },
          },
          orderBy: { createdAt: "desc" },
        }),

        // 4. Captured bounties
        prisma.dungeonBounty.findMany({
          where: { status: "CAPTURED" },
          include: {
            approvedBy: { select: { username: true, role: true } },
            submittedBy: { select: { id: true, username: true } },
          },
          orderBy: { updatedAt: "desc" },
        }),
      ]);

    // Format imprisoned items
    const formattedImprisoned = [
      ...bannedUsers.map((u) => ({
        id: `user-${u.id}`,
        type: "MEMBER_BAN" as const,
        targetName: u.username || u.name || "Petualang Terhukum",
        avatar: u.avatar,
        category: "PELANGGARAN_BERAT",
        level: u.level,
        role: u.role,
        crimeDescription:
          u.banReason ||
          "Dikenakan sanksi pemblokiran permanen (Permanent Ban) karena pelanggaran berat kode etik, penipuan, atau perusakan ketertiban komunitas.",
        verdictDate: u.bannedAt || u.joinedAt,
        badges: u.badges || [],
      })),
      ...imprisonedBounties.map((b) => ({
        id: b.id,
        type: "BOUNTY_IMPRISONED" as const,
        targetName: b.targetName,
        avatar: b.evidenceImage || null,
        category: b.category,
        level: 1,
        role: "OUTLAW",
        crimeDescription: b.crimeDescription,
        bountyReward: b.bountyReward,
        verdictDate: b.createdAt,
        approvedBy: b.approvedBy?.username || "Staf Moderasi",
        reviewNote: b.reviewNote,
        badges: ["Sanksi Vonis"],
      })),
    ];

    return Response.json({
      success: true,
      stats: {
        totalImprisoned: formattedImprisoned.length,
        activeBounties: activeBounties.length,
        totalCaptured: capturedBounties.length,
      },
      imprisoned: formattedImprisoned,
      bounties: [...activeBounties, ...capturedBounties],
    });
  } catch (error) {
    console.error("[DUNGEON_GET_ERROR]", error);
    return Response.json(
      { error: "Gagal memuat data Penjara & Papan Buronan." },
      { status: 500 }
    );
  }
}
