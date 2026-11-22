import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { activeUser } from "@/lib/http";
import { formatLastSeen } from "@/lib/wib-time";
import { PublicProfileClient } from "@/components/public-profile-client";

type PageProps = {
  params: Promise<{ username: string }>;
};

export const instant = false;

export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  return {
    title: `${decoded} | Profil Petualang LogHorizon`,
    description: `Profil petualang, reputasi kasta, pencapaian turnamen, dan rekam jejak ${decoded} di markas komunitas LogHorizon.`,
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const me = await activeUser().catch(() => null);

  const user = await prisma.user.findFirst({
    where: {
      username: {
        equals: decoded,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      username: true,
      name: true,
      avatar: true,
      role: true,
      isBanned: true,
      xp: true,
      level: true,
      badges: true,
      isPremium: true,
      isVerifiedSeller: true,
      bio: true,
      favoriteGames: true,
      inGameName: true,
      highestRank: true,
      primaryRole: true,
      gender: true,
      birthDate: true,
      showBirthDate: true,
      equippedAvatarFrame: true,
      equippedCustomTitle: true,
      lastActiveAt: true,
      joinedAt: true,
      discordId: true,
    },
  });

  if (!user) notFound();

  // Parallel data fetching for rich activity feed & statistics
  const [
    successfulSales,
    postsCount,
    donationsCount,
    lfgCount,
    partyMembership,
    tournamentHistory,
    followersCount,
    followingCount,
    initialIsFollowingRecord,
    forumPosts,
    forumComments,
    marketplaceListings,
  ] = await Promise.all([
    prisma.escrowTransaction.count({
      where: {
        OR: [{ sellerId: user.id }, { buyerId: user.id }],
        status: "COMPLETED",
      },
    }),
    prisma.post.count({ where: { authorId: user.id, category: { not: "MARKETPLACE" } } }),
    prisma.donation.count({ where: { userId: user.id, status: { in: ["APPROVED", "SUCCEEDED"] } } }),
    prisma.lfgPost.count({ where: { authorId: user.id } }),
    prisma.guildPartyMember.findFirst({
      where: { userId: user.id },
      include: {
        party: {
          select: {
            id: true,
            name: true,
            tag: true,
            emblemColor: true,
            primaryGame: true,
            totalPartyXp: true,
          },
        },
      },
    }),
    prisma.participant.findMany({
      where: { leaderId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        tournament: {
          select: {
            id: true,
            title: true,
            game: true,
            status: true,
            prizePool: true,
            eventDate: true,
          },
        },
      },
    }),
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
    me?.id
      ? prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: me.id,
              followingId: user.id,
            },
          },
        })
      : null,
    prisma.post.findMany({
      where: { authorId: user.id, category: { not: "MARKETPLACE" } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        category: true,
        createdAt: true,
        likes: true,
      },
    }),
    prisma.comment.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        content: true,
        createdAt: true,
        post: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.post.findMany({
      where: { authorId: user.id, category: "MARKETPLACE" },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        title: true,
        createdAt: true,
        marketData: true,
      },
    }),
  ]);

  const isOwner =
    user.username?.toLowerCase() === ".odyssia" ||
    user.username?.toLowerCase() === "odyssia" ||
    user.name?.toLowerCase() === ".odyssia" ||
    user.name?.toLowerCase() === "odyssia" ||
    user.discordId === "706661230835925042";

  const { isOnline, text: lastSeenText } = formatLastSeen(user.lastActiveAt);

  const achievements = [
    {
      id: "discussion-starter",
      title: "🗣️ Pembuka Diskusi",
      desc: "Menerbitkan thread diskusi di forum",
      unlocked: postsCount >= 1,
    },
    {
      id: "trusted-trader",
      title: "🛡️ Pedagang Terpercaya",
      desc: "Transaksi aman via Rekber Guild",
      unlocked: successfulSales >= 1,
    },
    {
      id: "guild-supporter",
      title: "💎 Penyokong Guild",
      desc: "Donatur kas perbendaharaan",
      unlocked:
        isOwner ||
        donationsCount >= 1 ||
        user.badges.includes("Knight") ||
        user.badges.includes("High Merchant") ||
        user.badges.includes("Noble Patron"),
    },
    {
      id: "party-veteran",
      title: "⚔️ Veteran Party",
      desc: "Pencari tim di Find Teammate / LFG",
      unlocked: lfgCount >= 1,
    },
    {
      id: "verified-gamer",
      title: "🎮 Gamer Terverifikasi",
      desc: "Game yang dimainkan telah diatur",
      unlocked: Boolean(
        (user.favoriteGames && user.favoriteGames.length > 0) || (user.inGameName && user.primaryRole)
      ),
    },
  ];

  return (
    <main className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full overflow-x-hidden">
      {/* Back Button */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/members"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7C3AED] dark:text-[#A78BFA] hover:underline"
        >
          <ArrowLeft size={15} /> Kembali ke Direktori Petualang
        </Link>
      </div>

      {/* Main Interactive Client Component */}
      <PublicProfileClient
        user={{
          ...user,
          joinedAt: user.joinedAt.toISOString(),
          lastActiveAt: user.lastActiveAt?.toISOString() || null,
        }}
        isOwner={isOwner}
        partyMembership={partyMembership}
        followersCount={followersCount}
        followingCount={followingCount}
        initialIsFollowing={Boolean(initialIsFollowingRecord)}
        isOnline={isOnline}
        lastSeenText={lastSeenText}
        stats={{
          postsCount,
          successfulSales,
          donationsCount,
          lfgCount,
          tournamentsCount: tournamentHistory.length,
        }}
        forumPosts={forumPosts.map((p) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
        }))}
        forumComments={forumComments.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        }))}
        tournamentHistory={tournamentHistory.map((t) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
          tournament: {
            ...t.tournament,
            eventDate: t.tournament.eventDate.toISOString(),
          },
        }))}
        marketplaceListings={marketplaceListings.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        }))}
        achievements={achievements}
      />
    </main>
  );
}
