import { LeaderboardTable } from "@/components/leaderboard-table";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Guild Leaderboard — LogHorizon" };
export const instant = false;

export default async function LeaderboardPage() {
  const [members, donorTotals] = await Promise.all([
    prisma.user.findMany({
      where: { isBanned: false },
      select: { id: true, username: true, level: true, xp: true, role: true, badges: true, isPremium: true },
      orderBy: [{ level: "desc" }, { xp: "desc" }, { joinedAt: "asc" }],
      take: 10,
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

  const benefactors = donorTotals.map((donor) => ({ ...donor, total: Number(donor.total) }));
  return <LeaderboardTable members={members} benefactors={benefactors} />;
}
