import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle2,
  Crown,
  ExternalLink,
  Flame,
  Gamepad2,
  MessageSquare,
  Shield,
  ShieldCheck,
  Sparkles,
  Sword,
  Trophy,
  Zap,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DiscordAvatar } from "@/components/discord-avatar";

type PageProps = {
  params: Promise<{ username: string }>;
};

export const instant = false;

export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  return {
    title: `${decoded} | Profil Petualang LogHorizon`,
    description: `Profil petualang, reputasi, level, dan aktivitas komunitas dari ${decoded} di LogHorizon.`,
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);

  const user = await prisma.user.findFirst({
    where: {
      username: {
        equals: decoded,
        mode: "insensitive",
      },
    },
    include: {
      posts: {
        where: { category: { not: "MARKETPLACE" } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          category: true,
          createdAt: true,
          likes: true,
        },
      },
    },
  });

  if (!user) notFound();

  // Query achievements stats
  const [successfulSales, postsCount, donationsCount, lfgCount] = await Promise.all([
    prisma.escrowTransaction.count({
      where: {
        OR: [{ sellerId: user.id }, { buyerId: user.id }],
        status: "COMPLETED",
      },
    }),
    prisma.post.count({ where: { authorId: user.id, category: { not: "MARKETPLACE" } } }),
    prisma.donation.count({ where: { userId: user.id, status: { in: ["APPROVED", "SUCCEEDED"] } } }),
    prisma.lfgPost.count({ where: { authorId: user.id } }),
  ]);

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
      desc: "ID Game & role favorit lengkap",
      unlocked: Boolean(user.inGameName && user.primaryRole),
    },
  ];

  const isOwner = user.username?.toLowerCase() === ".odyssia" || user.name?.toLowerCase() === ".odyssia";
  const xpNeeded = user.level * 100;
  const xpProgress = Math.min(100, Math.round(((user.xp % 100) / 100) * 100));

  return (
    <main className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full max-w-full overflow-x-hidden">
      <Link
        href="/forum"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9D4EDD] hover:underline mb-6"
      >
        <ArrowLeft size={15} /> Kembali ke Komunitas
      </Link>

      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] p-6 sm:p-8 shadow-xl mb-8">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#9D4EDD]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative">
              <DiscordAvatar
                src={user.avatar}
                username={user.username}
                size={80}
                className="size-20 sm:size-24 rounded-full border-2 border-[#9D4EDD] shadow-lg shadow-[#9D4EDD]/20 object-cover"
              />
              {isOwner && (
                <span className="absolute -top-1 -right-1 p-1 bg-amber-400 rounded-full text-black shadow" title="Guild Owner">
                  <Crown size={14} />
                </span>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white break-words">
                  {user.username ?? "Petualang"}
                </h1>
                {user.isPremium && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    <Sparkles size={12} /> Elite Member
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm font-semibold text-[#9D4EDD] dark:text-[#C77DFF] flex items-center gap-1.5">
                <Shield size={14} />
                {isOwner
                  ? "👑 Guild Owner (Emperor)"
                  : user.role === "ADMIN"
                    ? "🛡️ High Council (Admin)"
                    : user.role === "MODERATOR"
                      ? "⚔️ Lord Commander (Moderator)"
                      : "🎮 Guild Adventurer"}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-2">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={13} /> Bergabung {new Date(user.joinedAt).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
                </span>
                {user.discordId && (
                  <span className="font-mono text-[11px] text-gray-400">
                    Discord ID: {user.discordId}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="sm:self-center shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
              <CheckCircle2 size={15} /> {successfulSales} Transaksi Sukses
            </span>
          </div>
        </div>

        {/* Level & XP Progression */}
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-[#211C2B]">
          <div className="flex items-center justify-between text-xs font-bold text-gray-800 dark:text-gray-200 mb-2">
            <span className="flex items-center gap-1.5">
              <Zap size={14} className="text-[#9D4EDD]" /> Level {user.level}
            </span>
            <span className="font-mono text-gray-500 dark:text-gray-400">
              {user.xp} XP / {xpNeeded} XP
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-[#1A1526] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#9D4EDD] to-[#C77DFF] rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, xpProgress)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Gamer Profile Card */}
      {(user.inGameName || user.primaryRole || user.highestRank || (user.favoriteGames && user.favoriteGames.length > 0)) && (
        <div className="p-5 sm:p-6 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] shadow-sm mb-8">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Gamepad2 size={18} className="text-[#9D4EDD]" /> Profil Gamer &amp; Posisi Main (Find Teammate)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#08060B] border border-gray-200 dark:border-[#211C2B]">
              <span className="text-[10px] text-gray-400 block font-semibold uppercase">IGN / ID Game</span>
              <strong className="text-gray-900 dark:text-white block mt-0.5 truncate">{user.inGameName || "-"}</strong>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#08060B] border border-gray-200 dark:border-[#211C2B]">
              <span className="text-[10px] text-gray-400 block font-semibold uppercase">Role Utama</span>
              <strong className="text-[#9D4EDD] dark:text-[#C77DFF] block mt-0.5 truncate">{user.primaryRole || "-"}</strong>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#08060B] border border-gray-200 dark:border-[#211C2B]">
              <span className="text-[10px] text-gray-400 block font-semibold uppercase">Rank Tertinggi</span>
              <strong className="text-amber-500 block mt-0.5 truncate">{user.highestRank || "-"}</strong>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#08060B] border border-gray-200 dark:border-[#211C2B]">
              <span className="text-[10px] text-gray-400 block font-semibold uppercase">Game Favorit</span>
              <strong className="text-gray-800 dark:text-gray-200 block mt-0.5 truncate">
                {user.favoriteGames?.length ? user.favoriteGames.join(", ") : "-"}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Badges & Threads */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Badges & Reputation */}
        <div className="space-y-6">
          {/* Achievements */}
          <div className="p-5 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Award size={16} className="text-[#9D4EDD]" /> Pencapaian (Achievements)
            </h2>
            <div className="space-y-2">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                    ach.unlocked
                      ? "bg-purple-500/10 border-purple-500/30 text-gray-900 dark:text-white"
                      : "bg-gray-50/50 dark:bg-[#08060B]/50 border-gray-100 dark:border-[#211C2B] opacity-50 text-gray-400"
                  }`}
                >
                  <div>
                    <span className="font-bold block text-[11px]">{ach.title}</span>
                    <span className="text-[10px] text-gray-400">{ach.desc}</span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${ach.unlocked ? "text-emerald-400 bg-emerald-500/15" : "text-gray-400"}`}>
                    {ach.unlocked ? "TERBUKA" : "LOCKED"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-amber-500" /> Lencana Kehormatan
            </h2>

            {user.badges && user.badges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.badges.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold bg-purple-50 dark:bg-[#1E1A3A] text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60"
                  >
                    <Flame size={12} className="text-[#9D4EDD]" /> {badge}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Belum ada lencana yang diraih.</p>
            )}
          </div>

          <div className="p-5 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <ShieldCheck size={16} className="text-emerald-500" /> Reputasi Transaksi
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#211C2B]">
                <span className="text-gray-500">Transaksi Sukses:</span>
                <strong className="text-emerald-500 font-bold">{successfulSales}x</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#211C2B]">
                <span className="text-gray-500">Status Akun:</span>
                <span className={user.isBanned ? "text-red-500 font-bold" : "text-emerald-500 font-bold"}>
                  {user.isBanned ? "Dibatasi (Banned)" : "Terverifikasi / Aktif"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Benefit Guild:</span>
                <span className="text-gray-800 dark:text-gray-200 font-medium">
                  {user.isPremium ? "Elite Party Member" : "Adventurer"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Forum Posts */}
        <div className="md:col-span-2">
          <div className="p-5 sm:p-6 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <MessageSquare size={16} className="text-[#9D4EDD]" /> Aktivitas Diskusi Forum
            </h2>

            {user.posts.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                Member ini belum pernah membuat postingan forum.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-[#211C2B]">
                {user.posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/forum/${post.id}`}
                    className="block py-3 hover:bg-gray-50/60 dark:hover:bg-[#1A1526]/50 rounded-md px-2 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 uppercase">
                        {post.category.toLowerCase().replaceAll("_", " ")}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(post.createdAt).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white line-clamp-1 hover:text-[#9D4EDD]">
                      {post.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1">
                      <span>👍 {post.likes} Suka</span>
                      <span className="text-purple-400 flex items-center gap-0.5">
                        Buka thread <ExternalLink size={11} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
