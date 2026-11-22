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
import { ShareButton } from "@/components/share-button";

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

function formatBirthDateAndAge(birthDateStr: string) {
  try {
    const bDate = new Date(birthDateStr);
    if (isNaN(bDate.getTime())) return birthDateStr;
    const now = new Date();
    let age = now.getFullYear() - bDate.getFullYear();
    const m = now.getMonth() - bDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < bDate.getDate())) {
      age--;
    }
    const formatted = bDate.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${formatted} (${age} thn)`;
  } catch {
    return birthDateStr;
  }
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

  // Query achievements stats, permanent squad party, and tournament history
  const [successfulSales, postsCount, donationsCount, lfgCount, partyMembership, tournamentHistory] = await Promise.all([
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
      take: 6,
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
  ]);

  const isOwner =
    user.username?.toLowerCase() === ".odyssia" ||
    user.username?.toLowerCase() === "odyssia" ||
    user.name?.toLowerCase() === ".odyssia" ||
    user.name?.toLowerCase() === "odyssia" ||
    user.discordId === "706661230835925042";
  const xpNeeded = user.level * 100;
  const xpProgress = Math.min(100, Math.round(((user.xp % 100) / 100) * 100));

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
      unlocked: Boolean((user.favoriteGames && user.favoriteGames.length > 0) || (user.inGameName && user.primaryRole)),
    },
  ];

  return (
    <main className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full max-w-full overflow-x-hidden">
      <Link
        href="/forum"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9D4EDD] hover:underline mb-6"
      >
        <ArrowLeft size={15} /> Kembali ke Komunitas
      </Link>

      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] p-6 sm:p-8 shadow-xl mb-8">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#9D4EDD]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative">
              <DiscordAvatar
                src={user.avatar}
                username={user.username}
                frameId={(user as any).equippedAvatarFrame}
                size={84}
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
                {partyMembership?.party?.tag && (
                  <span
                    className="px-2 py-0.5 rounded text-xs font-mono font-black"
                    style={{
                      backgroundColor: `${partyMembership.party.emblemColor || "#7C3AED"}25`,
                      color: partyMembership.party.emblemColor || "#A78BFA",
                      border: `1px solid ${partyMembership.party.emblemColor || "#7C3AED"}60`,
                    }}
                    title={`Squad Party: ${partyMembership.party.name}`}
                  >
                    [{partyMembership.party.tag}]
                  </span>
                )}
                <h1 className="page-title text-2xl sm:text-3xl font-black text-gray-900 dark:text-white break-words">
                  {user.username ?? "Petualang"}
                </h1>
                {(user as any).equippedTitle && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    ✦ {(user as any).equippedTitle}
                  </span>
                )}
                {(user.isPremium || isOwner || user.role === "ADMIN") && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    <Sparkles size={12} /> {isOwner ? "👑 Guild Emperor / Noble Patron" : user.role === "ADMIN" ? "✨ Prince / Princess (Admin)" : "✦ Elite Member"}
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm font-semibold text-[#9D4EDD] dark:text-[#C77DFF] flex items-center gap-1.5">
                <Shield size={14} />
                {isOwner
                  ? "👑 Guild Owner (Emperor)"
                  : user.role === "ADMIN"
                    ? "✨ Prince / Princess (Admin)"
                    : user.role === "MODERATOR"
                      ? "⚔️ Lord Commander (Moderator)"
                      : "🎮 Guild Adventurer"}
                {partyMembership?.party && (
                  <span className="text-slate-400 dark:text-slate-500 font-normal">
                    • Member of {partyMembership.party.name} ({partyMembership.role})
                  </span>
                )}
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

          <div className="sm:self-center shrink-0 flex flex-col sm:items-end gap-2.5">
            {successfulSales > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
                <ShieldCheck size={15} /> {successfulSales} Transaksi Rekber Sukses
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-gray-500/10 text-gray-500 dark:text-gray-400 border border-gray-500/20 shadow-sm">
                <Shield size={15} /> Penjual Baru
              </span>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/messages?user=${user.id}`}
                className="button button-primary text-xs font-bold inline-flex items-center gap-1.5"
              >
                <MessageSquare size={14} />
                <span>Kirim Pesan (PM)</span>
              </Link>
              <ShareButton
                url={`/u/${encodeURIComponent(user.username || "")}`}
                title={`Profil ${user.username} - LogHorizon`}
                text={`Lihat profil petualang ${user.username} di LogHorizon!`}
                label="Bagikan Profil"
                variant="outline"
              />
            </div>
          </div>
        </div>

        {/* Level & XP Progression */}
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-[#2E1E45]">
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

      {/* Gamer Profile & Played Games Card */}
      {Boolean(
        (user.favoriteGames && user.favoriteGames.length > 0) ||
        (user.gender && user.gender !== "Privasi / Tidak disebutkan") ||
        (user.showBirthDate && user.birthDate) ||
        user.inGameName ||
        user.primaryRole
      ) && (
        <div className="p-5 sm:p-6 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Gamepad2 size={18} className="text-[#9D4EDD]" /> Identitas &amp; Game yang Dimainkan
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {user.gender && user.gender !== "Privasi / Tidak disebutkan" && (
                <span className="font-mono text-gray-500 dark:text-gray-400">
                  Gender: <strong className="text-gray-800 dark:text-gray-200">{user.gender}</strong>
                </span>
              )}
              {user.showBirthDate && user.birthDate && (
                <span className="font-mono text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#9D4EDD]" />
                  <span>{formatBirthDateAndAge(user.birthDate)}</span>
                </span>
              )}
            </div>
          </div>

          {/* Game List Badges */}
          {user.favoriteGames && user.favoriteGames.length > 0 ? (
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2 tracking-wider">
                Game Aktif ({user.favoriteGames.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {user.favoriteGames.map((game) => (
                  <span
                    key={game}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none border border-[#7C3AED]/40 bg-[#7C3AED]/10 text-purple-300 font-mono text-xs font-bold"
                  >
                    🎮 {game}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">Belum ada game yang ditambahkan ke profil.</p>
          )}

          {/* Legacy IGN / Role info if available */}
          {(user.inGameName || user.primaryRole) && (
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#2E1E45]/60 flex flex-wrap gap-4 text-xs">
              {user.inGameName && (
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">IGN / ID: </span>
                  <strong className="text-gray-800 dark:text-gray-200">{user.inGameName}</strong>
                </div>
              )}
              {user.primaryRole && (
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Role: </span>
                  <strong className="text-[#9D4EDD]">{user.primaryRole}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grid: Badges & Threads */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Badges & Reputation */}
        <div className="space-y-6">
          {/* Achievements */}
          <div className="p-5 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Award size={16} className="text-[#9D4EDD]" /> Pencapaian (Achievements)
            </h2>
            <div className="space-y-2">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-2.5 rounded-none border flex items-center justify-between text-xs ${
                    ach.unlocked
                      ? "bg-purple-500/10 border-purple-500/30 text-gray-900 dark:text-white"
                      : "bg-gray-50/50 dark:bg-[#08060B]/50 border-gray-100 dark:border-[#2E1E45] opacity-50 text-gray-400"
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

          <div className="p-5 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
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

          <div className="p-5 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <ShieldCheck size={16} className="text-emerald-500" /> Reputasi Transaksi
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#2E1E45]">
                <span className="text-gray-500">Transaksi Sukses:</span>
                <strong className="text-emerald-500 font-bold">{successfulSales}x</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#2E1E45]">
                <span className="text-gray-500">Status Akun:</span>
                <span className={user.isBanned ? "text-red-500 font-bold" : "text-emerald-500 font-bold"}>
                  {user.isBanned ? "Dibatasi (Banned)" : "Terverifikasi / Aktif"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Benefit Guild:</span>
                <span className="text-gray-800 dark:text-gray-200 font-medium">
                  {isOwner ? "👑 Guild Emperor / Noble Patron (Tier Tertinggi)" : user.role === "ADMIN" ? "✨ Prince / Princess (Admin Privileges)" : user.isPremium ? "Elite Party Member" : "Adventurer"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Forum Posts */}
        <div className="md:col-span-2">
          <div className="p-5 sm:p-6 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <MessageSquare size={16} className="text-[#9D4EDD]" /> Aktivitas Diskusi Forum
            </h2>

            {user.posts.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                Member ini belum pernah membuat postingan forum.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-[#2E1E45]">
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

          {/* Tournament Activity & Achievements Card */}
          <div className="p-5 sm:p-6 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] mt-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#2E1E45] mb-4">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Trophy size={16} className="text-[#F59E0B]" /> Aktivitas &amp; Prestasi Turnamen
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30">
                {tournamentHistory.length} Turnamen Diikuti
              </span>
            </div>

            {tournamentHistory.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                Belum ada turnamen resmi yang didaftarkan oleh petualang ini.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tournamentHistory.map((item) => (
                  <Link
                    key={item.id}
                    href={`/events/turnamen/${item.tournament.id}`}
                    className="p-3.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] hover:border-[#7C3AED] transition group block"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <span className="font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase">
                        {item.tournament.game}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded font-bold ${
                          item.tournament.status === "COMPLETED"
                            ? "bg-slate-200 dark:bg-slate-800 text-slate-500"
                            : item.tournament.status === "ONGOING"
                            ? "bg-emerald-500/15 text-emerald-500 animate-pulse"
                            : "bg-amber-500/15 text-amber-500"
                        }`}
                      >
                        {item.tournament.status}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#7C3AED] transition-colors truncate">
                      {item.tournament.title}
                    </h3>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-[#2E1E45]/60 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-[#A78BFA]">
                      <span>Tim: <strong className="text-slate-800 dark:text-slate-200">{item.teamName}</strong></span>
                      <span className="text-[#7C3AED] group-hover:underline font-bold">Bagan ➔</span>
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
