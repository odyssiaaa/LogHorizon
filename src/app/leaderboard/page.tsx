import { LeaderboardTable } from "@/components/leaderboard-table";
import { prisma } from "@/lib/prisma";
import { sanitizeBadges } from "@/lib/caste";
import { getCustomTitleBadge } from "@/lib/armory-catalog";

export const metadata = { title: "Guild Leaderboard | LogHorizon" };
export const instant = false;

export default async function LeaderboardPage() {
  const [rawMembers, donorTotals] = await Promise.all([
    prisma.user.findMany({
      where: {
        isBanned: false,
        username: { notIn: ["satpam-horizon", "Satpam Horizon"] },
        NOT: [
          { email: { endsWith: "@system.local" } },
          { badges: { has: "SATPAM_AI" } },
        ],
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        level: true,
        xp: true,
        role: true,
        badges: true,
        isPremium: true,
        tempTitle: true,
        tempTitleExpiresAt: true,
        equippedAvatarFrame: true,
        equippedCustomTitle: true,
        partyMembership: {
          select: {
            party: {
              select: {
                tag: true,
              },
            },
          },
        },
      },
      orderBy: [{ level: "desc" }, { xp: "desc" }, { joinedAt: "asc" }],
      take: 5,
    }),
    prisma.$queryRaw<{ id: string; username: string | null; badges: string[]; total: string }[]>`
      SELECT u."id", u."username", u."badges", SUM(d."amount")::text AS "total"
      FROM "User" u
      INNER JOIN "Donation" d ON d."userId" = u."id"
      WHERE u."isBanned" = false
        AND u."username" NOT IN ('satpam-horizon', 'Satpam Horizon')
        AND (u."email" IS NULL OR u."email" NOT LIKE '%@system.local')
        AND d."status" = 'SUCCEEDED'::"DonationStatus"
        AND (d."gatewayRef" IS NULL OR d."gatewayRef" NOT LIKE 'mock-%')
      GROUP BY u."id"
      ORDER BY SUM(d."amount") DESC, u."joinedAt" ASC, u."id" ASC
      LIMIT 10
    `,
  ]);

  const members = rawMembers.map((m) => {
    const rawBadges = [...m.badges];
    if (m.equippedCustomTitle) {
      const customTitle = getCustomTitleBadge(m.equippedCustomTitle);
      if (customTitle && !rawBadges.includes(customTitle)) {
        rawBadges.unshift(customTitle);
      }
    }
    return {
      id: m.id,
      username: m.username,
      avatar: m.avatar,
      level: m.level,
      xp: m.xp,
      role: m.role,
      badges: sanitizeBadges(m, rawBadges),
      isPremium: m.isPremium,
      equippedAvatarFrame: m.equippedAvatarFrame,
      equippedCustomTitle: m.equippedCustomTitle,
      partyTag: m.partyMembership?.party?.tag ?? null,
    };
  });

  const benefactors = donorTotals.map((donor) => ({ ...donor, total: Number(donor.total) }));
  return <LeaderboardTable members={members} benefactors={benefactors} />;
}
