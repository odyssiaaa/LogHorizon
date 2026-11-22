"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Crown,
  Loader2,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";
import { DiscordAvatar } from "@/components/discord-avatar";

export type SearchedMember = {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  role: string;
  isOwner: boolean;
  isPremium: boolean;
  xp: number;
  level: number;
  bio?: string | null;
  inGameName?: string | null;
  favoriteGames?: string[];
  equippedAvatarFrame?: string | null;
  equippedCustomTitle?: string | null;
  lastActiveAt?: string | null;
  isOnline: boolean;
  lastSeenText: string;
  party?: {
    id: string;
    name: string;
    tag: string;
    emblemColor: string;
  } | null;
  followersCount: number;
  isFollowing?: boolean;
};

interface GlobalUserSearchProps {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  onSelectUser?: (user: SearchedMember) => void;
  variant?: "navbar" | "mobile";
}

export function GlobalUserSearch({
  className = "",
  inputClassName = "",
  placeholder = "Cari petualang...",
  onSelectUser,
  variant = "navbar",
}: GlobalUserSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchedMember[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (searchTerm: string) => {
    setQuery(searchTerm);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchTerm.trim().length < 2) {
      setResults([]);
      setTotalCount(0);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setIsOpen(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchTerm.trim())}&limit=6`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.users || []);
          setTotalCount(data.total || 0);
        }
      } catch (err) {
        console.error("Gagal mencari member:", err);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim().length >= 2) {
      setIsOpen(false);
      router.push(`/members?q=${encodeURIComponent(query.trim())}`);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search
          size={14}
          className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2 && results.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#0A0512] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition ${inputClassName}`}
        />
        {loading ? (
          <Loader2
            size={13}
            className="absolute right-2.5 text-[#7C3AED] animate-spin pointer-events-none"
          />
        ) : query.length > 0 ? (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X size={13} />
          </button>
        ) : null}
      </div>

      {/* Instant Suggestion Dropdown with Solid Background */}
      {isOpen && (
        <div
          className={`absolute ${
            variant === "mobile" ? "left-0 right-0" : "left-0 w-80 sm:w-96"
          } top-full mt-2 rounded-xl border border-[#7C3AED]/60 bg-white dark:bg-[#11091D] shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-[#2A1B42]/60 animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header Ringkas */}
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-[#0D0717] flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Users size={12} className="text-[#7C3AED]" />
              <span>HASIL PETUALANG ({results.length}{totalCount > results.length ? ` dari ${totalCount}` : ""})</span>
            </span>
            <span className="text-[10px] text-slate-400">Tekan Enter untuk direktori</span>
          </div>

          {/* List Hasil Petualang */}
          {results.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 size={15} className="animate-spin text-[#7C3AED]" />
                  <span>Mencari petualang…</span>
                </div>
              ) : (
                <span>Tidak ada petualang yang cocok dengan &quot;{query}&quot;</span>
              )}
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-[#2A1B42]/40">
              {results.map((user) => {
                return (
                  <div
                    key={user.id}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-[#1A0F2E] transition-colors flex items-center justify-between gap-2.5 group"
                  >
                    <Link
                      href={`/u/${user.username || ""}`}
                      onClick={() => {
                        setIsOpen(false);
                        onSelectUser?.(user);
                      }}
                      className="flex items-center gap-2.5 min-w-0 flex-1"
                    >
                      {/* Avatar with Frame */}
                      <div className="relative shrink-0">
                        <DiscordAvatar
                          src={user.avatar}
                          username={user.username}
                          frameId={user.equippedAvatarFrame}
                          size={40}
                          className="size-10 rounded-full border border-slate-200 dark:border-[#2A1B42]"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white dark:border-[#11091D] ${
                            user.isOnline ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600"
                          }`}
                          title={user.isOnline ? "Online Sekarang" : user.lastSeenText}
                        />
                      </div>

                      {/* Info & Badges */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {user.party?.tag && (
                            <span
                              className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold"
                              style={{
                                backgroundColor: `${user.party.emblemColor || "#7C3AED"}25`,
                                color: user.party.emblemColor || "#A78BFA",
                                border: `1px solid ${user.party.emblemColor || "#7C3AED"}50`,
                              }}
                            >
                              [{user.party.tag}]
                            </span>
                          )}
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-[#7C3AED] dark:group-hover:text-[#A78BFA] transition-colors">
                            {user.username || "Petualang"}
                          </span>

                          {/* Caste Badge */}
                          {user.isOwner ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                              <Crown size={9} /> Emperor
                            </span>
                          ) : user.role === "ADMIN" ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              Admin
                            </span>
                          ) : user.role === "MODERATOR" ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              Mod
                            </span>
                          ) : null}

                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-100 dark:bg-[#1A0F2E] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2A1B42]">
                            Lv.{user.level}
                          </span>
                        </div>

                        {/* Status Online & Game Favorit */}
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                          <span className={user.isOnline ? "text-emerald-500 font-semibold" : ""}>
                            {user.isOnline ? "🟢 Online" : user.lastSeenText}
                          </span>
                          {user.favoriteGames && user.favoriteGames.length > 0 && (
                            <span className="truncate max-w-[120px] text-slate-400 dark:text-slate-500">
                              • {user.favoriteGames[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={`/messages?to=${user.id}`}
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-[#2A1B42] hover:border-[#7C3AED] hover:bg-[#7C3AED]/10 text-slate-600 dark:text-slate-300 hover:text-[#7C3AED] dark:hover:text-[#A78BFA] transition-colors"
                        title={`Chat langsung dengan @${user.username}`}
                      >
                        <MessageSquare size={13} />
                      </Link>
                      <Link
                        href={`/u/${user.username || ""}`}
                        onClick={() => setIsOpen(false)}
                        className="px-2 py-1 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[10px] font-bold transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <User size={11} />
                        <span>Profil</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Link: Lihat Semua Petualang */}
          <Link
            href={`/members?q=${encodeURIComponent(query.trim())}`}
            onClick={() => setIsOpen(false)}
            className="block px-3.5 py-2.5 text-center text-xs font-bold text-[#7C3AED] dark:text-[#A78BFA] hover:bg-slate-50 dark:hover:bg-[#1A0F2E] transition-colors bg-white dark:bg-[#11091D]"
          >
            Lihat Semua Petualang di Direktori →
          </Link>
        </div>
      )}
    </div>
  );
}
