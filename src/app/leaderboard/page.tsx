import { LeaderboardTable } from "@/components/leaderboard-table";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Guild Leaderboard — LogHorizon" };
export const instant = false;

export default async function LeaderboardPage() {
  const members = await prisma.user.findMany({
    where: { isBanned: false },
    select: { id: true, username: true, level: true, xp: true, role: true, badges: true },
    orderBy: [{ level: "desc" }, { xp: "desc" }, { joinedAt: "asc" }],
    take: 10,
  });

  return <LeaderboardTable members={members} />;
}
