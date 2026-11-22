"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Check,
  Coins,
  Copy,
  Crown,
  ExternalLink,
  Flag,
  Flame,
  Gamepad2,
  Heart,
  Loader2,
  MessageSquare,
  Share2,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { DiscordAvatar } from "@/components/discord-avatar";
import { ShareButton } from "@/components/share-button";
import { UniversalReportDialog } from "@/components/universal-report-dialog";

export type PublicProfileProps = {
  user: {
    id: string;
    username: string | null;
    name: string | null;
    avatar: string | null;
    role: string;
    isBanned: boolean;
    xp: number;
    level: number;
    badges: string[];
    isPremium: boolean;
    bio?: string | null;
    favoriteGames: string[];
    inGameName?: string | null;
    highestRank?: string | null;
    primaryRole?: string | null;
    gender?: string | null;
    birthDate?: string | null;
    showBirthDate?: boolean;
    equippedAvatarFrame?: string | null;
    equippedCustomTitle?: string | null;
    lastActiveAt?: string | null;
    joinedAt: string;
  };
  isOwner: boolean;
  partyMembership?: {
    role: string;
    party: {
      id: string;
      name: string;
      tag: string;
      emblemColor: string;
      primaryGame: string;
      totalPartyXp: number;
    };
  } | null;
  followersCount: number;
  followingCount: number;
  initialIsFollowing: boolean;
  isOnline: boolean;
  lastSeenText: string;
  stats: {
    postsCount: number;
    successfulSales: number;
    donationsCount: number;
    lfgCount: number;
    tournamentsCount: number;
  };
  forumPosts: {
    id: string;
    title: string;
    category: string;
    createdAt: string;
    likes: number;
  }[];
  forumComments: {
    id: string;
    content: string;
    createdAt: string;
    post: {
      id: string;
      title: string;
    };
  }[];
  tournamentHistory: {
    id: string;
    teamName: string;
    createdAt: string;
    tournament: {
      id: string;
      title: string;
      game: string;
      status: string;
      prizePool?: string | null;
      eventDate: string;
    };
  }[];
  marketplaceListings: {
    id: string;
    title: string;
    createdAt: string;
    marketData?: unknown;
  }[];
  achievements: {
    id: string;
    title: string;
    desc: string;
    unlocked: boolean;
  }[];
};

export function PublicProfileClient({
  user,
  isOwner,
  partyMembership,
  followersCount: initialFollowersCount,
  followingCount,
  initialIsFollowing,
  isOnline,
  lastSeenText,
  stats,
  forumPosts,
  forumComments,
  tournamentHistory,
  marketplaceListings,
  achievements,
}: PublicProfileProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const isMe = currentUserId === user.id;

  const [activeTab, setActiveTab] = useState<"forum" | "tournaments" | "marketplace">("forum");
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [followLoading, setFollowLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportNotice, setReportNotice] = useState("");

  const xpNeeded = user.level * 100;
  const xpProgress = Math.min(100, Math.round(((user.xp % 100) / 100) * 100));

  async function handleToggleFollow() {
    if (!currentUserId) {
      router.push("/api/auth/signin");
      return;
    }
    if (followLoading) return;

    const previousState = isFollowing;
    const previousCount = followersCount;

    // Optimistic update
    setIsFollowing(!previousState);
    setFollowersCount(previousState ? Math.max(0, previousCount - 1) : previousCount + 1);
    setFollowLoading(true);

    try {
      const res = await fetch("/api/users/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: user.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsFollowing(data.isFollowing);
        setFollowersCount(data.followersCount);
      } else {
        // Rollback
        setIsFollowing(previousState);
        setFollowersCount(previousCount);
      }
    } catch {
      setIsFollowing(previousState);
      setFollowersCount(previousCount);
    } finally {
      setFollowLoading(false);
    }
  }

  function handleCopyInGameId() {
    if (!user.inGameName) return;
    navigator.clipboard.writeText(user.inGameName);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* 1. HEADER PROFIL LENGKAP                                                  */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] p-6 sm:p-8 shadow-xl">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#7C3AED]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Avatar & Main Credentials */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative shrink-0">
              <DiscordAvatar
                src={user.avatar}
                username={user.username}
                frameId={user.equippedAvatarFrame}
                size={96}
                className="size-20 sm:size-24 rounded-full border-2 border-[#7C3AED] shadow-lg shadow-[#7C3AED]/20 object-cover"
              />
              <span
                className={`absolute bottom-0 right-0 size-4 rounded-full border-2 border-white dark:border-[#130921] ${
                  isOnline ? "bg-emerald-500 shadow-sm" : "bg-slate-400 dark:bg-slate-600"
                }`}
                title={isOnline ? "Online Sekarang" : lastSeenText}
              />
              {isOwner && (
                <span className="absolute -top-1 -right-1 p-1 bg-amber-400 rounded-full text-black shadow" title="Guild Emperor">
                  <Crown size={14} />
                </span>
              )}
            </div>

            <div>
              {/* Squad Tag + Username + Titles */}
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                {partyMembership?.party && (
                  <Link
                    href="/events?view=party"
                    className="px-2 py-0.5 rounded text-xs font-mono font-black transition hover:opacity-80"
                    style={{
                      backgroundColor: `${partyMembership.party.emblemColor || "#7C3AED"}25`,
                      color: partyMembership.party.emblemColor || "#A78BFA",
                      border: `1px solid ${partyMembership.party.emblemColor || "#7C3AED"}60`,
                    }}
                    title={`Squad Party: ${partyMembership.party.name} (${partyMembership.role})`}
                  >
                    [{partyMembership.party.tag}] {partyMembership.party.name}
                  </Link>
                )}

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white break-words">
                  {user.username ?? "Petualang"}
                </h1>

                {user.equippedCustomTitle && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    ✦ {user.equippedCustomTitle}
                  </span>
                )}

                {(user.isPremium || isOwner || user.role === "ADMIN") && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    <Sparkles size={12} /> {isOwner ? "👑 Guild Emperor" : user.role === "ADMIN" ? "✨ Prince / Princess (Admin)" : "✦ Elite Member"}
                  </span>
                )}
              </div>

              {/* Caste Subtitle & Online Indicator */}
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                <span className="font-semibold text-[#7C3AED] dark:text-[#C77DFF] flex items-center gap-1.5">
                  <Shield size={14} />
                  {isOwner
                    ? "👑 Guild Owner (Emperor)"
                    : user.role === "ADMIN"
                    ? "✨ Prince / Princess (Admin)"
                    : user.role === "MODERATOR"
                    ? "⚔️ Lord Commander (Moderator)"
                    : "🎮 Guild Adventurer"}
                </span>

                <span className="text-slate-400">•</span>

                <span className={`font-mono text-xs ${isOnline ? "text-emerald-500 font-bold" : "text-slate-400"}`}>
                  {isOnline ? "🟢 Online Sekarang" : lastSeenText}
                </span>

                <span className="text-slate-400">•</span>

                <span className="text-slate-400 text-xs font-mono">
                  Bergabung {new Date(user.joinedAt).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
                </span>
              </div>

              {/* Followers & Following Counters */}
              <div className="flex items-center gap-4 mt-3 text-xs font-mono">
                <div>
                  <strong className="text-slate-900 dark:text-white font-bold text-sm">{followersCount}</strong>{" "}
                  <span className="text-slate-500 dark:text-slate-400">Pengikut</span>
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-white font-bold text-sm">{followingCount}</strong>{" "}
                  <span className="text-slate-500 dark:text-slate-400">Mengikuti</span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons (Chat & Follow) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto">
            {!isMe && (
              <>
                <Link
                  href={`/messages?to=${user.id}`}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-[#7C3AED]/20 shrink-0"
                >
                  <MessageSquare size={15} />
                  <span>💬 Kirim Pesan (PM)</span>
                </Link>

                <button
                  type="button"
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 ${
                    isFollowing
                      ? "border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30"
                      : "border border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED] dark:text-[#A78BFA] hover:bg-[#7C3AED] hover:text-white"
                  }`}
                >
                  {followLoading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <UserCheck size={15} />
                      <span>Mengikuti</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={15} />
                      <span>➕ Ikuti</span>
                    </>
                  )}
                </button>
              </>
            )}

            <ShareButton
              title={`Profil ${user.username ?? "Petualang"} di LogHorizon`}
              text={`Lihat profil, reputasi, level, dan rekam jejak ${user.username ?? "Petualang"} di markas komunitas LogHorizon!`}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition flex items-center justify-center gap-1.5 text-xs font-bold shrink-0"
            />

            {!isMe && (
              <button
                type="button"
                onClick={() => setShowReportDialog(true)}
                className="w-full sm:w-auto px-3 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0"
                title={`Laporkan akun @${user.username}`}
              >
                <Flag size={14} />
                <span className="hidden sm:inline">Laporkan</span>
              </button>
            )}
          </div>
        </div>

        {/* Level & XP Progression Bar */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-[#2E1E45]">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
            <span className="flex items-center gap-1.5 font-mono">
              <Zap size={14} className="text-[#7C3AED]" /> Level {user.level}
            </span>
            <span className="font-mono text-slate-500 dark:text-slate-400">
              {user.xp} XP / {xpNeeded} XP
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-[#1A1526] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, xpProgress)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. GAMING INFO, BIO & IN-GAME ID CARD                                     */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#2E1E45]">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Gamepad2 size={18} className="text-[#7C3AED]" /> Identitas Gamer &amp; Rekam Jejak
          </h2>

          {/* Copy IGN Button if available */}
          {user.inGameName && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0A0512] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#2E1E45]">
              <span className="text-[11px] font-mono text-slate-400">In-Game Nick/ID:</span>
              <strong className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                {user.inGameName}
              </strong>
              <button
                type="button"
                onClick={handleCopyInGameId}
                className="ml-1 p-1 text-slate-500 hover:text-[#7C3AED] transition"
                title="Salin In-Game ID"
              >
                {copiedId ? (
                  <Check size={13} className="text-emerald-500" />
                ) : (
                  <Copy size={13} />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Bio Petualang */}
        {user.bio ? (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0A0512] border border-slate-200/60 dark:border-[#2A1B42]/50">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Bio Petualang:
            </span>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
              &quot;{user.bio}&quot;
            </p>
          </div>
        ) : null}

        {/* Game Aktif Badges */}
        {user.favoriteGames && user.favoriteGames.length > 0 ? (
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2 tracking-wider">
              Game yang Dimainkan ({user.favoriteGames.length}):
            </span>
            <div className="flex flex-wrap gap-2">
              {user.favoriteGames.map((game) => (
                <span
                  key={game}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-[#7C3AED]/40 bg-[#7C3AED]/10 text-purple-600 dark:text-purple-300 font-mono text-xs font-bold"
                >
                  🎮 {game}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Role & Rank details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
          <div className="p-2.5 rounded-lg border border-slate-200/60 dark:border-[#2A1B42] bg-slate-50/50 dark:bg-[#0A0512]/50">
            <span className="text-[10px] text-slate-400 block">Rank Tertinggi</span>
            <strong className="text-slate-800 dark:text-slate-200">{user.highestRank || "Bebas"}</strong>
          </div>
          <div className="p-2.5 rounded-lg border border-slate-200/60 dark:border-[#2A1B42] bg-slate-50/50 dark:bg-[#0A0512]/50">
            <span className="text-[10px] text-slate-400 block">Role Utama</span>
            <strong className="text-[#7C3AED] dark:text-[#A78BFA]">{user.primaryRole || "Flex"}</strong>
          </div>
          <div className="p-2.5 rounded-lg border border-slate-200/60 dark:border-[#2A1B42] bg-slate-50/50 dark:bg-[#0A0512]/50">
            <span className="text-[10px] text-slate-400 block">Transaksi Rekber</span>
            <strong className="text-emerald-500">{stats.successfulSales}x Sukses</strong>
          </div>
          <div className="p-2.5 rounded-lg border border-slate-200/60 dark:border-[#2A1B42] bg-slate-50/50 dark:bg-[#0A0512]/50">
            <span className="text-[10px] text-slate-400 block">Party LFG Dibuat</span>
            <strong className="text-slate-800 dark:text-slate-200">{stats.lfgCount}x</strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TAB JEJAK AKTIVITAS (STALKING FEED)                                     */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("forum")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === "forum"
                ? "bg-[#7C3AED] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <MessageSquare size={14} />
            <span>💬 Diskusi &amp; Komentar ({forumPosts.length + forumComments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tournaments")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === "tournaments"
                ? "bg-[#7C3AED] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Trophy size={14} />
            <span>🏆 Turnamen &amp; Prestasi ({tournamentHistory.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("marketplace")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === "marketplace"
                ? "bg-[#7C3AED] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ShoppingBag size={14} />
            <span>🛒 Lapak Aktif ({marketplaceListings.length})</span>
          </button>
        </div>

        {/* ================= TAB 1: FORUM POSTS & COMMENTS ================= */}
        {activeTab === "forum" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Thread Forum */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#2E1E45]">
                <span>Thread Dibuat ({forumPosts.length})</span>
                <span className="text-[10px] text-slate-400 font-mono">Forum Guild</span>
              </h3>

              {forumPosts.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center italic">
                  Petualang ini belum pernah menerbitkan thread diskusi.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-[#2E1E45]">
                  {forumPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/forum/${post.id}`}
                      className="block py-3 hover:bg-slate-50 dark:hover:bg-[#1A1526]/50 rounded-lg px-2 transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-mono text-[#7C3AED] dark:text-[#A78BFA] uppercase">
                          {post.category.toLowerCase().replaceAll("_", " ")}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(post.createdAt).toLocaleDateString("id-ID")}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-[#7C3AED] transition-colors">
                        {post.title}
                      </h4>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span>👍 {post.likes} Suka</span>
                        <span className="text-[#7C3AED] dark:text-[#A78BFA] flex items-center gap-0.5">
                          Buka <ExternalLink size={11} />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Komentar Forum */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#2E1E45]">
                <span>Komentar Terbaru ({forumComments.length})</span>
                <span className="text-[10px] text-slate-400 font-mono">Suara Komunitas</span>
              </h3>

              {forumComments.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center italic">
                  Belum ada komentar forum yang ditulis oleh petualang ini.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-[#2E1E45]">
                  {forumComments.map((comment) => (
                    <Link
                      key={comment.id}
                      href={`/forum/${comment.post.id}`}
                      className="block py-3 hover:bg-slate-50 dark:hover:bg-[#1A1526]/50 rounded-lg px-2 transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">
                          Pada: {comment.post.title}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(comment.createdAt).toLocaleDateString("id-ID")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        &quot;{comment.content}&quot;
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: TOURNAMENTS & ACHIEVEMENTS ================= */}
        {activeTab === "tournaments" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left 1 Col: Badges & Achievements */}
            <div className="space-y-4">
              {/* Lencana Kehormatan */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] space-y-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Flame size={14} className="text-[#7C3AED]" /> Lencana Kehormatan
                </h3>
                {user.badges && user.badges.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {user.badges.map((b) => (
                      <span
                        key={b}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 dark:bg-[#1E1A3A] text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 flex items-center gap-1"
                      >
                        <Flame size={11} className="text-[#7C3AED]" /> {b}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Belum ada lencana yang diraih.</p>
                )}
              </div>

              {/* Achievements Unlocked */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] space-y-2.5">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-500" /> Pencapaian Guild
                </h3>
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      ach.unlocked
                        ? "bg-purple-500/10 border-purple-500/30 text-slate-900 dark:text-white"
                        : "bg-slate-50/50 dark:bg-[#08060B]/50 border-slate-200 dark:border-[#2E1E45] opacity-50 text-slate-400"
                    }`}
                  >
                    <div>
                      <span className="font-bold block text-[11px]">{ach.title}</span>
                      <span className="text-[10px] text-slate-400">{ach.desc}</span>
                    </div>
                    <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded ${ach.unlocked ? "text-emerald-500 bg-emerald-500/15" : "text-slate-400"}`}>
                      {ach.unlocked ? "TERBUKA" : "LOCKED"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 2 Cols: Tournaments Participated */}
            <div className="md:col-span-2 p-5 rounded-2xl border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#2E1E45]">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500" /> Riwayat Turnamen &amp; Roster Tim ({tournamentHistory.length})
                </h3>
                <Link href="/events?view=turnamen" className="text-xs font-bold text-[#7C3AED] hover:underline">
                  Arena Turnamen →
                </Link>
              </div>

              {tournamentHistory.length === 0 ? (
                <p className="text-xs text-slate-400 py-12 text-center italic">
                  Petualang ini belum pernah mendaftar dalam turnamen resmi guild.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {tournamentHistory.map((item) => (
                    <Link
                      key={item.id}
                      href={`/events/turnamen/${item.tournament.id}`}
                      className="p-4 rounded-xl border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] hover:border-[#7C3AED] transition group block"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
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
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#7C3AED] transition-colors truncate">
                        {item.tournament.title}
                      </h4>
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-[#2E1E45]/60 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-[#A78BFA]">
                        <span>Tim: <strong className="text-slate-800 dark:text-slate-200">{item.teamName}</strong></span>
                        <span className="text-[#7C3AED] group-hover:underline font-bold">Bagan ➔</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: MARKETPLACE LISTINGS ================= */}
        {activeTab === "marketplace" && (
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#2E1E45]">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag size={16} className="text-[#7C3AED]" /> Lapak Barang &amp; Jasa yang Sedang Dijual ({marketplaceListings.length})
              </h3>
              <Link href="/marketplace" className="text-xs font-bold text-[#7C3AED] hover:underline">
                Jelajahi Pasar Guild →
              </Link>
            </div>

            {marketplaceListings.length === 0 ? (
              <p className="text-xs text-slate-400 py-12 text-center italic">
                Saat ini tidak ada lapak aktif yang dijual oleh petualang ini.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketplaceListings.map((item) => {
                  const mData = item.marketData as Record<string, unknown> | null;
                  const price = typeof mData?.price === "number" ? mData.price : 0;
                  const game = typeof mData?.game === "string" ? mData.game : "Item Gaming";

                  return (
                    <Link
                      key={item.id}
                      href={`/marketplace/${item.id}`}
                      className="p-4 rounded-xl border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] hover:border-[#7C3AED] transition group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span className="text-[#7C3AED] dark:text-[#A78BFA] font-bold">{game}</span>
                          <span>{new Date(item.createdAt).toLocaleDateString("id-ID")}</span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#7C3AED] transition-colors line-clamp-2">
                          {item.title}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-[#2E1E45]/60 flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-emerald-500">
                          {price > 0 ? `Rp ${price.toLocaleString("id-ID")}` : "Hubungi Penjual"}
                        </span>
                        <span className="text-xs font-bold text-[#7C3AED] group-hover:underline">
                          Cek Lapak ➔
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Universal Report Dialog */}
      <UniversalReportDialog
        open={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        targetType="USER"
        targetId={user.id}
        targetName={`@${user.username || "Petualang"}`}
        onSuccess={(msg) => setReportNotice(msg)}
      />

      {reportNotice && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xl animate-in fade-in slide-in-from-bottom-3 flex items-center gap-2">
          <Check size={16} />
          <span>{reportNotice}</span>
          <button type="button" onClick={() => setReportNotice("")} className="ml-2 hover:opacity-80">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
