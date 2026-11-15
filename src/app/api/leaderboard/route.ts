import { prisma } from "@/lib/prisma";

export async function GET() {
  const [members, donorTotals] = await Promise.all([
    prisma.user.findMany({
      where: { isBanned: false },
      select: {
        id: true,
        username: true,
        level: true,
        xp: true,
        role: true,
        badges: true,
        isPremium: true,
      },
      orderBy: [{ level: "desc" }, { xp: "desc" }, { joinedAt: "asc" }],
      take: 5,
    }),
    prisma.$queryRaw<{ id: string; username: string | null; badges: string[]; total: string }[]>`
      SELECT u."id", u."username", u."badges", SUM(d."amount")::text AS "total"
      FROM "User" u
      INNER JOIN "Donation" d ON d."userId" = u."id"
      WHERE u."isBanned" = false
        AND d."status" = 'SUCCEEDED'::"DonationStatus"
        AND (d."gatewayRef" IS NULL OR d."gatewayRef" NOT LIKE 'mock-%')
      GROUP BY u."id"
      ORDER BY SUM(d."amount") DESC, u."joinedAt" ASC, u."id" ASC
      LIMIT 10
    `,
  ]);

  const benefactors = donorTotals.map((donor) => ({
    id: donor.id,
    username: donor.username,
    badges: donor.badges,
    total: Number(donor.total),
  }));

  return Response.json({
    success: true,
    topXpMembers: members,
    topBenefactors: benefactors,
  });
}
