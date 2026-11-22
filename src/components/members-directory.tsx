"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Check,
  Copy,
  Crown,
  Gamepad2,
  Loader2,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
  Trophy,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { DiscordAvatar } from "@/components/discord-avatar";
import type { SearchedMember } from "@/components/global-user-search";

const COMMON_GAMES = [
  "Semua Game",
  "Mobile Legends",
  "Valorant",
  "Genshin Impact",
  "Dota 2",
  "Honor of Kings",
  "PUBG Mobile",
  "Free Fire",
  "Roblox",
];

const ROLES = [
  { value: "", label: "Semua Kasta" },
  { value: "ADMIN", label: "👑 Staf & Admin" },
  { value: "MODERATOR", label: "⚔️ Moderator" },
  { value: "MEMBER", label: "🎮 Member Petualang" },
];

export function MembersDirectory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const initialQuery = searchParams.get("q") || "";
  const initialGame = searchParams.get("game") || "";
  const initialRole = searchParams.get("role") || "";
  const initialSort = searchParams.get("sort") || "active";
  const initialPage = parseInt(searchParams.get("page") || "1", 10);

  const [query, setQuery] = useState(initialQuery);
  const [selectedGame, setSelectedGame] = useState(initialGame);
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);

  const [members, setMembers] = useState<SearchedMember[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [followersCountMap, setFollowersCountMap] = useState<Record<string, number>>({});
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});

  // Sync state with URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selectedGame && selectedGame !== "Semua Game") params.set("game", selectedGame);
    if (selectedRole) params.set("role", selectedRole);
    if (sort !== "active") params.set("sort", sort);
    if (page > 1) params.set("page", String(page));

    const paramStr = params.toString();
    const url = `/members${paramStr ? `?${paramStr}` : ""}`;
    window.history.replaceState(null, "", url);
  }, [query, selectedGame, selectedRole, sort, page]);

  // Fetch Members
  useEffect(() => {
    let active = true;
    setLoading(true);

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (selectedGame && selectedGame !== "Semua Game") params.set("game", selectedGame);
        if (selectedRole) params.set("role", selectedRole);
        params.set("sort", sort);
        params.set("page", String(page));
        params.set("limit", "18");

        const res = await fetch(`/api/users/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (!active) return;
          const userList: SearchedMember[] = data.users || [];
          setMembers(userList);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);

          // Update follow states
          const nextFollowMap: Record<string, boolean> = {};
          const nextCountMap: Record<string, number> = {};
          userList.forEach((u) => {
            nextFollowMap[u.id] = Boolean(u.isFollowing);
            nextCountMap[u.id] = u.followersCount;
          });
          setFollowingMap((prev) => ({ ...prev, ...nextFollowMap }));
          setFollowersCountMap((prev) => ({ ...prev, ...nextCountMap }));
        }
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          console.error("Gagal memuat member:", err);
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, selectedGame, selectedRole, sort, page]);

  async function handleToggleFollow(targetUserId: string, targetUsername: string) {
    if (!currentUserId) {
      router.push("/api/auth/signin");
      return;
    }
    if (followLoading[targetUserId]) return;

    const isCurrentlyFollowing = Boolean(followingMap[targetUserId]);
    const currentCount = followersCountMap[targetUserId] || 0;

    // Optimistic update
    setFollowingMap((prev) => ({ ...prev, [targetUserId]: !isCurrentlyFollowing }));
    setFollowersCountMap((prev) => ({
      ...prev,
      [targetUserId]: isCurrentlyFollowing ? Math.max(0, currentCount - 1) : currentCount + 1,
    }));
    setFollowLoading((prev) => ({ ...prev, [targetUserId]: true }));

    try {
      const res = await fetch("/api/users/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFollowingMap((prev) => ({ ...prev, [targetUserId]: data.isFollowing }));
        setFollowersCountMap((prev) => ({ ...prev, [targetUserId]: data.followersCount }));
      } else {
        // Rollback
        setFollowingMap((prev) => ({ ...prev, [targetUserId]: isCurrentlyFollowing }));
        setFollowersCountMap((prev) => ({ ...prev, [targetUserId]: currentCount }));
      }
    } catch {
      // Rollback
      setFollowingMap((prev) => ({ ...prev, [targetUserId]: isCurrentlyFollowing }));
      setFollowersCountMap((prev) => ({ ...prev, [targetUserId]: currentCount }));
    } finally {
      setFollowLoading((prev) => ({ ...prev, [targetUserId]: false }));
    }
  }

  function copyInGameId(inGameId: string, userId: string) {
    navigator.clipboard.writeText(inGameId);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Card */}
      <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] shadow-sm space-y-4">
        {/* Search Bar Input */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Cari petualang berdasarkan username, nickname in-game, tag squad [TAG], atau game favorit…"
            className="w-full pl-10 pr-10 py-3 text-sm rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#08040E] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          {/* Game Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            {COMMON_GAMES.map((game) => {
              const isSelected = selectedGame === game || (!selectedGame && game === "Semua Game");
              return (
                <button
                  key={game}
                  type="button"
                  onClick={() => {
                    setSelectedGame(game === "Semua Game" ? "" : game);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                    isSelected
                      ? "bg-[#7C3AED] text-white shadow-xs"
                      : "bg-slate-100 dark:bg-[#1A0F2E] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#2A1B42]"
                  }`}
                >
                  {game}
                </button>
              );
            })}
          </div>

          {/* Role & Sorting Selectors */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              aria-label="Filter berdasarkan kasta atau role"
              className="h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#0A0512] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#7C3AED]"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            {/* Sorting Tabs */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-[#08040E] border border-slate-200 dark:border-[#2A1B42]">
              <button
                type="button"
                onClick={() => {
                  setSort("active");
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                  sort === "active"
                    ? "bg-[#7C3AED] text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Baru Aktif"
              >
                ⚡ Aktif
              </button>
              <button
                type="button"
                onClick={() => {
                  setSort("level");
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                  sort === "level"
                    ? "bg-[#7C3AED] text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Level Tertinggi"
              >
                🏆 Level
              </button>
              <button
                type="button"
                onClick={() => {
                  setSort("newest");
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                  sort === "newest"
                    ? "bg-[#7C3AED] text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Member Baru Bergabung"
              >
                ✨ Baru
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <Loader2 size={32} className="mx-auto text-[#7C3AED] animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Memuat daftar petualang guild LogHorizon…
          </p>
        </div>
      ) : members.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-purple-500/10 text-[#7C3AED] flex items-center justify-center">
            <Users size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Tidak ada petualang yang ditemukan
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Coba gunakan kata kunci lain atau reset filter game dan kasta untuk melihat seluruh anggota komunitas.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSelectedGame("");
              setSelectedRole("");
              setSort("active");
              setPage(1);
            }}
            className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold transition"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            const isMe = member.id === currentUserId;
            const isFollowing = Boolean(followingMap[member.id]);
            const followersCount = followersCountMap[member.id] ?? member.followersCount;

            return (
              <div
                key={member.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] hover:border-[#7C3AED]/70 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group"
              >
                <div className="space-y-3.5">
                  {/* Top Row: Avatar + Main Info */}
                  <div className="flex items-start gap-3.5">
                    <Link href={`/u/${member.username || ""}`} className="relative shrink-0">
                      <DiscordAvatar
                        src={member.avatar}
                        username={member.username}
                        frameId={member.equippedAvatarFrame}
                        size={56}
                        className="size-14 rounded-full border-2 border-slate-200 dark:border-[#2A1B42] group-hover:border-[#7C3AED] transition-colors"
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white dark:border-[#11091D] ${
                          member.isOnline ? "bg-emerald-500 shadow-xs" : "bg-slate-400 dark:bg-slate-600"
                        }`}
                        title={member.isOnline ? "Online Sekarang" : member.lastSeenText}
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {member.party?.tag && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black"
                            style={{
                              backgroundColor: `${member.party.emblemColor || "#7C3AED"}25`,
                              color: member.party.emblemColor || "#A78BFA",
                              border: `1px solid ${member.party.emblemColor || "#7C3AED"}60`,
                            }}
                            title={`Squad Party: ${member.party.name}`}
                          >
                            [{member.party.tag}]
                          </span>
                        )}

                        <Link
                          href={`/u/${member.username || ""}`}
                          className="font-black text-sm text-slate-900 dark:text-white hover:text-[#7C3AED] dark:hover:text-[#A78BFA] transition-colors truncate"
                        >
                          {member.username || "Petualang"}
                        </Link>

                        {member.isOwner ? (
                          <span className="p-0.5 rounded bg-amber-400 text-black shadow" title="Guild Emperor">
                            <Crown size={11} />
                          </span>
                        ) : null}
                      </div>

                      {/* Title & Level */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[11px]">
                        {member.equippedCustomTitle ? (
                          <span className="px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px]">
                            ✦ {member.equippedCustomTitle}
                          </span>
                        ) : (
                          <span className="text-[#7C3AED] dark:text-[#A78BFA] font-bold text-[11px]">
                            {member.isOwner
                              ? "👑 Guild Emperor"
                              : member.role === "ADMIN"
                              ? "✨ Prince / Princess"
                              : member.role === "MODERATOR"
                              ? "⚔️ Lord Commander"
                              : "🎮 Adventurer"}
                          </span>
                        )}

                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 dark:bg-[#1A0F2E] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2A1B42]">
                          Lv.{member.level}
                        </span>
                      </div>

                      {/* Online Status / Last Active */}
                      <div className="mt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        <span className={member.isOnline ? "text-emerald-500 font-semibold" : ""}>
                          {member.isOnline ? "🟢 Online Sekarang" : member.lastSeenText}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bio Preview */}
                  {member.bio ? (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed bg-slate-50 dark:bg-[#08040E] p-2.5 rounded-lg border border-slate-200/60 dark:border-[#2A1B42]/50 italic">
                      &quot;{member.bio}&quot;
                    </p>
                  ) : null}

                  {/* In-Game Nickname / Copy ID */}
                  {member.inGameName ? (
                    <div className="p-2 rounded-lg bg-slate-100/70 dark:bg-[#1A0F2E]/60 border border-slate-200 dark:border-[#2A1B42] flex items-center justify-between text-xs font-mono">
                      <div className="truncate mr-2">
                        <span className="text-slate-400 text-[10px] block">IGN / In-Game Nick:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                          {member.inGameName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyInGameId(member.inGameName || "", member.id)}
                        className="px-2 py-1 rounded bg-white dark:bg-[#0A0512] hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-[#2A1B42] flex items-center gap-1 transition"
                        title="Salin In-Game Nickname"
                      >
                        {copiedId === member.id ? (
                          <>
                            <Check size={11} className="text-emerald-500" />
                            <span className="text-emerald-500">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : null}

                  {/* Favorite Games Badges */}
                  {member.favoriteGames && member.favoriteGames.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {member.favoriteGames.slice(0, 3).map((g) => (
                        <span
                          key={g}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-[#1A0F2E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2A1B42]"
                        >
                          {g}
                        </span>
                      ))}
                      {member.favoriteGames.length > 3 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400">
                          +{member.favoriteGames.length - 3}
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Bottom Actions Row */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-[#2A1B42] flex items-center justify-between gap-2">
                  {/* Follow Stats */}
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{followersCount}</span> Pengikut
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Follow Toggle Button */}
                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => handleToggleFollow(member.id, member.username || "")}
                        disabled={followLoading[member.id]}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          isFollowing
                            ? "border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30"
                            : "bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-xs"
                        }`}
                      >
                        {followLoading[member.id] ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : isFollowing ? (
                          <>
                            <UserCheck size={13} />
                            <span>Mengikuti</span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={13} />
                            <span>Ikuti</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Chat 1-Klik */}
                    <Link
                      href={`/messages?to=${member.id}`}
                      className="p-2 rounded-lg border border-slate-200 dark:border-[#2A1B42] hover:border-[#7C3AED] hover:bg-[#7C3AED]/10 text-slate-700 dark:text-slate-300 hover:text-[#7C3AED] dark:hover:text-[#A78BFA] transition"
                      title={`Kirim Pesan Pribadi ke @${member.username}`}
                    >
                      <MessageSquare size={14} />
                    </Link>

                    {/* Lihat Profil */}
                    <Link
                      href={`/u/${member.username || ""}`}
                      className="p-2 rounded-lg border border-slate-200 dark:border-[#2A1B42] hover:border-[#7C3AED] hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition"
                      title="Lihat Profil Lengkap"
                    >
                      <User size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] text-xs font-bold disabled:opacity-40 transition"
          >
            ← Sebelumnya
          </button>
          <span className="px-3 py-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
            Halaman {page} dari {totalPages} ({total} Petualang)
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] text-xs font-bold disabled:opacity-40 transition"
          >
            Berikutnya →
          </button>
        </div>
      )}
    </div>
  );
}
