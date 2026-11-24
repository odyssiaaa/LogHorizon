"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { createRealtimeClient, type SealedLiveQuery } from "@neon/realtime/client";
import { ArrowUp, Flag, Loader2, MessageCircle, Pin, Plus, Search, Trash2, X } from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { LoginPrompt, ReportDialog } from "@/components/interaction-dialogs";
import { DiscordAvatar } from "@/components/discord-avatar";
import { PostReactions, type PostReaction } from "@/components/post-reactions";
import { SkeletonForumCard, TacticalEmptyState } from "@/components/ui-feedback";
import { ShareButton } from "@/components/share-button";
import { motion } from "framer-motion";
import type { ForumPostRecord } from "@/types/community";
import { ImageUploader } from "@/components/ui/image-uploader";
import { useLiveSync } from "@/hooks/use-live-sync";
import { StaffCardModerationMenu } from "@/components/staff-moderation-dropdown";
import { DraggableScrollRow } from "@/components/draggable-scroll-row";
import { MentionHashtagInput } from "@/components/mention-hashtag-input";
import { getCustomTitleBadge } from "@/lib/armory-catalog";

type Category = "GENERAL_CHAT" | "PROMOTION" | "FEEDBACK";
type ForumLiveRow = { id: string };
type LiveState = "connecting" | "live" | "stale" | "error" | "closed" | "unavailable";

const categories: { id: Category; slug: string; label: string; description: string }[] = [
  { id: "GENERAL_CHAT", slug: "f/general-chat", label: "Obrolan Umum", description: "Ngobrol apa saja seputar game dan guild." },
  { id: "PROMOTION", slug: "f/promotion", label: "Promosi Konten", description: "Bagikan konten, stream, atau karya gaming-mu." },
  { id: "FEEDBACK", slug: "f/feedback", label: "Aspirasi & Saran", description: "Bantu LogHorizon jadi guild yang lebih baik." },
];

function parsePostContent(content: string): { cleanText: string; imageUrl: string | null } {
  const match = content.match(/!\[(.*?)\]\(((?:data:image\/[^)]+|https?:\/\/[^)]+|\/[^)]+))\)/);
  const imageUrl = match ? match[2] : null;
  const cleanText = content.replace(/!\[.*?\]\([^)]+\)/g, "").trim();
  return { cleanText, imageUrl };
}

export function ForumBoard({ realtimeUrl }: { realtimeUrl: string }) {
  const [category, setCategory] = useState<Category>("GENERAL_CHAT");
  const [posts, setPosts] = useState<ForumPostRecord[]>([]);
  const [pendingNewPosts, setPendingNewPosts] = useState<ForumPostRecord[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [compose, setCompose] = useState(false);
  const [loginAction, setLoginAction] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<LiveState>("live");
  const [liveError, setLiveError] = useState("");
  const { data: session, status } = useSession();
  const user = session?.user;
  const activeCategory = categories.find((item) => item.id === category)!;

  const postsRef = useRef<ForumPostRecord[]>(posts);
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  // Baca parameter ?tag= dari URL saat pertama kali dimuat
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tagParam = params.get("tag");
      if (tagParam) setSelectedTag(tagParam.replace(/^#/, ""));
    }
  }, []);

  // Hitung 5 Hashtag Terhangat (Populer & Dinamis dari Posts)
  const trendingHashtags = useMemo(() => {
    const counts = new Map<string, number>();
    const defaultTags = ["MobileLegends", "Valorant", "CariMabar", "TurnamenLH", "TipsBuild"];

    for (const p of posts) {
      const matches = `${p.title} ${p.content}`.match(/#([a-zA-Z0-9_]+)/g);
      if (matches) {
        for (const m of matches) {
          const clean = m.slice(1);
          counts.set(clean, (counts.get(clean) ?? 0) + 1);
        }
      }
    }

    const sortedTags = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t);

    const combined = [...sortedTags];
    for (const d of defaultTags) {
      if (!combined.includes(d)) combined.push(d);
    }

    return combined.slice(0, 5);
  }, [posts]);

  // 500ms Debouncing Search System
  useEffect(() => {
    setIsSearching(true);
    const handler = setTimeout(() => {
      setSearch(searchValue.trim());
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchValue]);

  // Fetch posts dengan pemisahan tegas antara loading awal vs background sync
  const fetchPosts = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        setLoading(true);
      }
      const query = new URLSearchParams({ category });
      if (search) query.set("search", search);
      if (selectedTag) query.set("tag", selectedTag);

      try {
        const response = await fetch(`/api/posts?${query}`);
        const fresh = await readApiResponse<ForumPostRecord[]>(response, "Gagal memuat thread.");

        if (!isBackground) {
          setPosts(fresh);
          setPendingNewPosts([]);
          setError("");
        } else {
          // Background sync: silent diffing & X-style pending pill
          const currentPosts = postsRef.current;
          const currentIds = new Set(currentPosts.map((p) => p.id));
          const brandNew = fresh.filter((p) => !currentIds.has(p.id));

          if (brandNew.length > 0) {
            const isScrolledDown = typeof window !== "undefined" && window.scrollY >= 100;
            if (isScrolledDown) {
              // User sedang membaca di bawah: jangan geser scroll, simpan di pending pill!
              setPendingNewPosts((prev) => {
                const prevIds = new Set(prev.map((p) => p.id));
                const additions = brandNew.filter((p) => !prevIds.has(p.id));
                return additions.length > 0 ? [...additions, ...prev] : prev;
              });
              // Tetap perbarui statistik interaksi (likes/replies) pada postingan yang sudah tampil
              setPosts((prev) =>
                prev.map((existing) => fresh.find((f) => f.id === existing.id) ?? existing)
              );
            } else {
              // User masih di paling atas: perbarui feed langsung secara mulus
              setPosts(fresh);
            }
          } else {
            // Cek apakah ada perubahan data pada postingan yang sudah ada
            const hasDataChanged = JSON.stringify(currentPosts) !== JSON.stringify(fresh);
            if (hasDataChanged) {
              setPosts(fresh);
            }
          }
        }
      } catch (reason) {
        if (!isBackground) {
          setError(reason instanceof Error ? reason.message : "Gagal memuat thread.");
        }
      } finally {
        if (!isBackground) {
          setLoading(false);
        }
      }
    },
    [category, search, selectedTag]
  );

  useEffect(() => {
    void fetchPosts(false);
  }, [fetchPosts]);

  // Smart Live Sync: Polling 12 detik di latar belakang tanpa berkedip dan tanpa memicu skeleton
  useLiveSync(() => {
    void fetchPosts(true);
  }, { intervalMs: 12000, revalidateOnFocus: true });

  const handleLoadPendingPosts = () => {
    setPosts((prev) => {
      const prevIds = new Set(prev.map((p) => p.id));
      const unadded = pendingNewPosts.filter((p) => !prevIds.has(p.id));
      return [...unadded, ...prev];
    });
    setPendingNewPosts([]);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (!realtimeUrl) return;
    let active = true;
    let client: ReturnType<typeof createRealtimeClient> | undefined;
    let subscription: ReturnType<ReturnType<typeof createRealtimeClient>["subscribe"]> | undefined;

    async function subscribeToForum() {
      try {
        const response = await fetch("/api/forum/live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category }),
        });
        const sealedQuery = await readApiResponse<SealedLiveQuery<ForumLiveRow>>(response, "Live update forum gagal disiapkan.");
        if (!active) return;

        client = createRealtimeClient({ url: realtimeUrl });
        subscription = client.subscribe(sealedQuery);
        subscription.onUpdate((update) => {
          if (update.type === "changes" && active) void fetchPosts(true);
        });
        subscription.onStateChange((state) => {
          if (!active) return;
          setLiveState(state.status);
          setLiveError(state.status === "error" ? state.error.message : "");
        });
      } catch (reason) {
        if (active) {
          setLiveState("error");
          setLiveError(reason instanceof Error ? reason.message : "Live update forum gagal disambungkan.");
        }
      }
    }

    void subscribeToForum();

    return () => {
      active = false;
      subscription?.unsubscribe();
      client?.close();
    };
  }, [category, realtimeUrl]);

  async function handleReportPost(postId: string) {
    if (!user) {
      setLoginAction("melaporkan postingan");
      return;
    }
    setReportId(postId);
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Apakah kamu yakin ingin menghapus thread ini?")) return;
    try {
      const response = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      await readApiResponse<unknown>(response, "Gagal menghapus thread.");
      setPosts((current) => current.filter((item) => item.id !== postId));
      setMessage("Thread berhasil dihapus.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menghapus thread.");
    }
  }

  async function handleTogglePin(postId: string, currentPin: boolean) {
    const nextPin = !currentPin;
    setPosts((prev) =>
      [...prev]
        .map((p) => (p.id === postId ? { ...p, isPinned: nextPin } : p))
        .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
    );

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: nextPin }),
      });
      await readApiResponse(res, "Gagal mengubah status sematan.");
      setMessage(nextPin ? "Thread berhasil disematkan (PINNED)." : "Sematan thread dilepas.");
    } catch (err) {
      setPosts((prev) =>
        [...prev]
          .map((p) => (p.id === postId ? { ...p, isPinned: currentPin } : p))
          .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
      );
      setError(err instanceof Error ? err.message : "Gagal mengubah status pin.");
    }
  }

  function handleCreateThread() {
    if (!user) {
      setLoginAction("membuat thread");
      return;
    }
    if (user.isBanned) {
      setMessage("Akun kamu sedang dibatasi dan tidak dapat membuat thread.");
      return;
    }
    setCompose(true);
  }

  return (
    <main className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-12 overflow-x-hidden">
      <div>
        <div className="forum-heading flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-slate-200 dark:border-[#2E1E45] pb-6">
          <div className="text-left">
            <p className="section-kicker text-xs font-mono font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-widest mb-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#7C3AED]" />
              RUANG DISKUSI GUILD // FORUM
            </p>
            <h1 className="page-title font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-[#F8FAFC] break-words">
              FORUM <span className="text-[#7C3AED] dark:text-[#A78BFA]">KOMUNITAS</span>
            </h1>
            <p className="muted-copy text-xs sm:text-sm text-slate-600 dark:text-[#A78BFA] mt-1.5 font-sans">
              Temukan party, berbagi cerita, strategi raid, dan tumbuh bersama para petualang LogHorizon.
            </p>
          </div>
          {status === "loading" ? (
            <span className="nav-loading" />
          ) : (
            <button
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-white border border-[#7C3AED] transition-colors shadow-sm"
              onClick={handleCreateThread}
            >
              <Plus size={16} /> <span>BUAT THREAD BARU</span>
            </button>
          )}
        </div>

        {/* MODERN SEGMENTED CONTROL PILL TABS (Mobile & Tablet only, Desktop uses right sidebar directory) */}
        <DraggableScrollRow className="lg:hidden my-4 w-full" role="tablist" aria-label="Kategori sub-forum">
          <div className="flex items-center gap-1.5 p-1 rounded-none bg-slate-100 dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45]">
            {categories.map((item) => {
              const isActive = category === item.id;
              return (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={isActive}
                  className={`px-3.5 py-2 rounded-none text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 shrink-0 border cursor-pointer ${
                    isActive
                      ? "bg-[#7C3AED] text-white border-[#7C3AED]"
                      : "bg-white dark:bg-[#1A0E2E] text-slate-600 dark:text-[#A78BFA] border-slate-200 dark:border-[#2E1E45] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:border-[#7C3AED]"
                  }`}
                  onClick={() => {
                    if (category !== item.id) {
                      setLoading(true);
                      setCategory(item.id);
                    }
                  }}
                >
                  <span className="text-[10px] opacity-75">{item.slug}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </DraggableScrollRow>

        {/* 2-COLUMN DESKTOP LAYOUT (FEED + SIDEBAR) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-4">
          {/* MAIN COLUMN: SEARCH + SUB-FORUM STRIP + FEED */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {/* 5 HASHTAG TERHANGAT STRIP */}
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-sm">
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-[#A78BFA] flex items-center gap-1.5 select-none shrink-0">
                <span className="text-[#F59E0B]">🔥</span> HASHTAG TERHANGAT:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 flex-1">
                {trendingHashtags.map((tag) => {
                  const isTagActive = selectedTag.toLowerCase() === tag.toLowerCase();
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const nextTag = isTagActive ? "" : tag;
                        setSelectedTag(nextTag);
                        setLoading(true);
                      }}
                      className={`text-xs font-mono px-2.5 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                        isTagActive
                          ? "bg-[#7C3AED] text-white font-bold shadow-md shadow-[#7C3AED]/30 border border-[#7C3AED]"
                          : "bg-slate-100 dark:bg-[#1A0E2E] text-slate-700 dark:text-[#A78BFA] hover:bg-[#7C3AED]/20 hover:text-[#7C3AED] dark:hover:text-white border border-slate-200 dark:border-[#2E1E45]"
                      }`}
                    >
                      <span>#{tag}</span>
                    </button>
                  );
                })}
                {selectedTag && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTag("");
                      setLoading(true);
                    }}
                    className="text-xs font-mono text-rose-500 hover:text-rose-400 ml-auto flex items-center gap-1 cursor-pointer"
                  >
                    <X size={12} /> Reset Filter #{selectedTag}
                  </button>
                )}
              </div>
            </div>

            {/* SEARCH BAR WITH FLEXBOX ALIGNMENT */}
            <form
              className="w-full"
              role="search"
              onSubmit={(event) => event.preventDefault()}
            >
              <div className="flex items-center gap-3 px-3.5 h-11 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] focus-within:border-[#7C3AED] transition-colors shadow-sm dark:shadow-none">
                <div className="shrink-0 text-slate-400 dark:text-[#A78BFA] flex items-center">
                  {isSearching ? <Loader2 size={16} className="animate-spin text-[#7C3AED]" /> : <Search size={16} />}
                </div>
                <input
                  maxLength={120}
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Cari thread atau kata kunci diskusi…"
                  aria-label="Cari diskusi"
                  className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#A78BFA]/50 p-0 font-sans"
                />
                {searchValue && (
                  <button
                    type="button"
                    className="shrink-0 text-xs text-slate-500 dark:text-[#A78BFA] hover:text-slate-900 dark:hover:text-[#F8FAFC] font-mono px-1 uppercase"
                    onClick={() => {
                      setSearchValue("");
                      setSearch("");
                    }}
                  >
                    Hapus
                  </button>
                )}
              </div>
            </form>

            {/* SUB-FORUM CATEGORY HEADER & THREAD COUNT BADGE */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-sm dark:shadow-none">
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="w-2 h-2 bg-[#7C3AED] shrink-0" />
                  <strong className="text-sm sm:text-base font-mono font-bold text-slate-900 dark:text-[#F8FAFC] break-words uppercase">
                    {activeCategory.slug}
                  </strong>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-100 dark:bg-[#1A0E2E] text-[11px] font-mono shrink-0 text-slate-600 dark:text-[#A78BFA]">
                    {posts.length} THREAD
                  </span>
                </div>
                <p className="break-words text-xs sm:text-sm text-slate-600 dark:text-[#A78BFA] mt-1 font-sans">
                  {activeCategory.description}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 whitespace-nowrap self-start sm:self-auto">
                <span className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider rounded-none border ${
                  liveState === "live"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-[#10B981] border-emerald-500/30"
                    : "bg-slate-100 dark:bg-[#1A0E2E] text-slate-600 dark:text-[#A78BFA] border-slate-200 dark:border-[#2E1E45]"
                }`}>
                  {liveState === "live"
                    ? "● LIVE SYNC"
                    : liveState === "connecting"
                      ? "MENYAMBUNG…"
                      : liveState === "stale"
                        ? "MEMPERBARUI…"
                        : liveState === "error"
                          ? "TERPUTUS"
                          : "OFFLINE"}
                </span>
              </div>
            </div>

            {liveError && <div className="p-3 text-xs font-mono text-red-400 bg-red-950/20 border border-red-500/30 rounded-none" role="status">{liveError}</div>}
            {message && (
              <div className="p-3 text-xs font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-500/30 rounded-none flex items-center justify-between gap-2" role="status">
                <span>{message}</span>
                <button aria-label="Tutup notifikasi" onClick={() => setMessage("")}>
                  <X size={15} />
                </button>
              </div>
            )}
            {error && <div className="p-3 text-xs font-mono text-red-400 bg-red-950/20 border border-red-500/30 rounded-none" role="alert">{error}</div>}

            {/* FLOATING NEW POSTS PILL (GAYA X / THREADS) */}
            {pendingNewPosts.length > 0 && (
              <div className="sticky top-20 z-40 flex justify-center py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  type="button"
                  onClick={handleLoadPendingPosts}
                  className="inline-flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-full shadow-2xl px-5 py-2.5 text-xs font-bold transition-transform hover:scale-105 cursor-pointer border border-white/20 animate-bounce"
                >
                  <ArrowUp size={14} />
                  <span>↑ Ada {pendingNewPosts.length} Diskusi Baru — Klik untuk Muat</span>
                </button>
              </div>
            )}

            {/* FORUM POSTS FEED & SKELETON LOADERS */}
            <section className="post-list space-y-3" aria-live="polite">
              {loading ? (
                <div className="space-y-3">
                  <SkeletonForumCard />
                  <SkeletonForumCard />
                  <SkeletonForumCard />
                </div>
              ) : posts.length ? (
                posts.map((post, index) => (
                  <motion.article
                    className={`p-4 sm:p-5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#8B5CF6]/70 active:scale-[0.98] flex flex-col gap-2.5 shadow-sm dark:shadow-none text-left ${
                      post.isPinned ? "border-l-4 border-l-[#7C3AED]" : ""
                    }`}
                    key={`${post.id}-${post.likes}-${post.dislikes}-${post.votes?.[0]?.value ?? "none"}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.035 }}
                  >
                    {/* Header Info: Author, Badges, Date & Pinned Badge */}
                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-slate-500 dark:text-[#A78BFA] font-mono">
                      <div className="flex items-center gap-2 flex-wrap">
                        <DiscordAvatar src={post.author.avatar} username={post.author.username} size={20} frameId={post.author.equippedAvatarFrame} />
                        <Link
                          href={`/u/${post.author.username ?? "user"}`}
                          className={`hover:underline ${(post.author.isPremium || post.author.role === "ADMIN" || post.author.username === ".odyssia") ? "premium-username" : "font-medium text-slate-900 dark:text-[#F8FAFC]"}`}
                        >
                          {post.author.username ?? "Gamer"}
                        </Link>
                        {post.author.partyMembership?.party?.tag && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0">
                            [{post.author.partyMembership.party.tag}]
                          </span>
                        )}
                        {post.author.equippedCustomTitle && getCustomTitleBadge(post.author.equippedCustomTitle) && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0">
                            {getCustomTitleBadge(post.author.equippedCustomTitle)}
                          </span>
                        )}
                        {post.author.username?.toLowerCase() === ".odyssia" || post.author.username?.toLowerCase() === "odyssia" ? (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 shrink-0">
                            👑 Emperor
                          </span>
                        ) : post.author.role === "ADMIN" ? (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/30 shrink-0">
                            ✨ Prince
                          </span>
                        ) : post.author.role === "MODERATOR" ? (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
                            ⚔️ Mod
                          </span>
                        ) : null}
                        <span>•</span>
                        <span>{new Date(post.createdAt).toLocaleDateString("id-ID")}</span>
                      </div>
                      {post.isPinned && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider shrink-0">
                          <Pin size={11} className="text-[#7C3AED]" /> PINNED THREAD
                        </span>
                      )}
                    </div>

                    {/* Thread Title */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link className="text-base sm:text-lg font-display font-bold uppercase tracking-tight break-words text-slate-900 dark:text-[#F8FAFC] hover:text-[#7C3AED] dark:hover:text-[#A78BFA] transition-colors leading-snug" href={`/forum/${post.id}`}>
                        {post.title}
                      </Link>
                      {post.poll && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-purple-950/60 text-purple-300 border border-purple-800/50 shrink-0">
                          📊 Polling
                        </span>
                      )}
                    </div>

                    {/* Hashtags */}
                    {(() => {
                      const tagsInPost = [...new Set(`${post.title} ${post.content}`.match(/#([a-zA-Z0-9_]+)/g) || [])];
                      if (!tagsInPost.length) return null;
                      return (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {tagsInPost.slice(0, 4).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedTag(t.slice(1));
                                setLoading(true);
                              }}
                              className="text-[11px] font-mono text-[#7C3AED] dark:text-[#A78BFA] hover:text-white bg-[#7C3AED]/10 hover:bg-[#7C3AED] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Body snippet & image */}
                    {(() => {
                      const { cleanText, imageUrl } = parsePostContent(post.content);
                      return (
                        <>
                          {cleanText ? (
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-sans break-words leading-relaxed mt-1 line-clamp-2">
                              {cleanText}
                            </p>
                          ) : null}
                          {imageUrl && (
                            <div className="mt-2.5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imageUrl}
                                alt="Lampiran Forum"
                                loading="lazy"
                                className="max-h-60 sm:max-h-80 w-auto rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-slate-100 dark:bg-[#09040F] object-contain cursor-zoom-in hover:border-[#7C3AED] transition-all shadow-md"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setLightboxImg(imageUrl);
                                }}
                              />
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Baris Aksi Bawah: Like & Dislike Horizontal + Diskusi, Share, Laporkan & Moderasi */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 mt-2 border-t border-slate-200 dark:border-[#2A1B42]">
                      <PostReactions
                        postId={post.id}
                        likes={post.likes}
                        dislikes={post.dislikes}
                        reaction={post.votes?.[0]?.value ?? null}
                        onLoginRequired={() => setLoginAction("memberi reaksi")}
                        onChange={(result) =>
                          setPosts((current) =>
                            current.map((entry) =>
                              entry.id === post.id
                                ? { ...entry, ...result, votes: result.reaction ? [{ value: result.reaction }] : [] }
                                : entry,
                            ),
                          )
                        }
                      />

                      <div className="flex items-center gap-2 sm:gap-2.5 text-xs font-mono text-slate-500 dark:text-[#A78BFA] flex-wrap">
                        <Link
                          href={`/forum/${post.id}`}
                          className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#1A0E2E]/60 hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:border-[#7C3AED]/40 inline-flex items-center gap-1.5 transition-colors font-bold"
                        >
                          <MessageCircle size={13} />
                          <span>Diskusi</span>
                        </Link>
                        <ShareButton
                          url={`/forum/${post.id}`}
                          title={`[Forum] ${post.title}`}
                          text={`Cek diskusi di Forum LogHorizon: ${post.title}`}
                          label="Share"
                          variant="ghost"
                          className="h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#1A0E2E]/60 hover:border-[#7C3AED]/40"
                        />
                        <button
                          type="button"
                          className="h-8 px-2 rounded-md hover:text-rose-400 inline-flex items-center gap-1 text-slate-400 dark:text-[#A78BFA]/70 transition-colors cursor-pointer"
                          onClick={() => handleReportPost(post.id)}
                          title="Laporkan postingan"
                        >
                          <Flag size={12} />
                          <span className="hidden sm:inline">Laporkan</span>
                        </button>

                        {/* Tombol Hapus Pemilik Thread Biasa */}
                        {user && !(user.role === "ADMIN" || user.role === "MODERATOR") && (user.id === post.author.id || user.username === post.author.username) && (
                          <button
                            type="button"
                            className="h-8 px-2 rounded-md text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 text-xs font-mono transition-colors cursor-pointer"
                            onClick={() => void handleDeletePost(post.id)}
                            title="Hapus postingan saya"
                          >
                            <Trash2 size={12} />
                            <span className="hidden sm:inline">Hapus</span>
                          </button>
                        )}

                        {/* Menu Moderasi Staf (Admin & Moderator) */}
                        {(user?.role === "ADMIN" || user?.role === "MODERATOR") && (
                          <StaffCardModerationMenu
                            actions={[
                              {
                                label: post.isPinned ? "Lepas Sematan (Unpin)" : "Sematkan Thread (Pin)",
                                icon: <Pin size={13} />,
                                onClick: () => handleTogglePin(post.id, post.isPinned),
                              },
                              {
                                label: "Hapus Paksa Thread",
                                icon: <Trash2 size={13} />,
                                danger: true,
                                onClick: () => handleDeletePost(post.id),
                              },
                            ]}
                          />
                        )}
                      </div>
                    </div>
                  </motion.article>
                ))
              ) : (
                <TacticalEmptyState
                  isSearch={Boolean(search)}
                  title={search ? "Pencarian Tidak Ditemukan" : `Sub-forum ${activeCategory.slug} Kosong`}
                  description={
                    search
                      ? `Tidak ada thread yang cocok dengan kata kunci "${search}". Coba kata kunci lainnya.`
                      : `Belum ada thread di kategori ${activeCategory.slug}. Jadilah petualang pertama yang membuat obrolan!`
                  }
                  actionPrimary={{
                    label: "+ Buat Thread Pertama",
                    onClick: () => {
                      if (!user) {
                        setLoginAction("membuat thread");
                      } else {
                        setCompose(true);
                      }
                    },
                  }}
                  actionSecondary={
                    search
                      ? {
                          label: "🔄 Reset Pencarian",
                          onClick: () => setSearch(""),
                        }
                      : undefined
                  }
                />
              )}
            </section>
          </div>

          {/* DESKTOP RIGHT SIDEBAR (CHANNELS & COMMUNITY GUIDE) */}
          <aside className="hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col gap-4 sticky top-20">
            {/* SUB-FORUM DIRECTORY CARD */}
            <div className="p-4 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] space-y-3 text-left shadow-sm dark:shadow-none">
              <span className="text-[11px] font-mono font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider block">
                DIREKTORI SUB-FORUM
              </span>
              <div className="space-y-1.5">
                {categories.map((cat) => {
                  const isActive = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setLoading(true);
                        setCategory(cat.id);
                      }}
                      className={`w-full text-left p-3 rounded-none text-xs font-mono font-bold transition flex items-center justify-between border ${
                        isActive
                          ? "bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#F8FAFC] border-[#7C3AED]"
                          : "bg-slate-50 dark:bg-[#1A0E2E] text-slate-700 dark:text-[#A78BFA] border-slate-200 dark:border-[#2E1E45] hover:border-[#7C3AED] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate uppercase">{cat.label}</p>
                        <p className="text-[10px] text-slate-500 dark:text-[#A78BFA]/70 truncate">{cat.slug}</p>
                      </div>
                      <span className="text-[10px] text-[#7C3AED] dark:text-[#A78BFA] ml-2">➔</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PANDUAN FORUM GUILD */}
            <div className="p-4 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] space-y-2.5 text-xs text-left shadow-sm dark:shadow-none">
              <span className="text-[11px] font-mono font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider block">
                ETIKA FORUM LOGHORIZON
              </span>
              <ul className="space-y-2 text-slate-600 dark:text-[#A78BFA] text-[11px] leading-relaxed font-sans">
                <li className="flex items-start gap-2">
                  <span className="text-[#7C3AED] shrink-0 font-bold font-mono">•</span>
                  <span>Saling menghargai dan jaga sportivitas komunitas gamer.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#7C3AED] shrink-0 font-bold font-mono">•</span>
                  <span>Promosi channel atau mabar diperbolehkan di <code className="font-mono text-slate-900 dark:text-[#F8FAFC]">f/promotion</code>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#7C3AED] shrink-0 font-bold font-mono">•</span>
                  <span>Gunakan tombol <strong className="text-slate-900 dark:text-[#F8FAFC]">Report</strong> jika melihat spam atau penipuan.</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {compose && (
        <ThreadModal
          category={category}
          canPin={Boolean(user?.isPremium || user?.role === "ADMIN" || user?.role === "MODERATOR" || user?.username === ".odyssia")}
          onClose={() => setCompose(false)}
          onCreated={() => {
            setCompose(false);
            void fetchPosts(false);
          }}
        />
      )}
      <LoginPrompt open={Boolean(loginAction)} action={loginAction} onClose={() => setLoginAction("")} />
      <ReportDialog postId={reportId} open={Boolean(reportId)} onClose={() => setReportId(null)} onSuccess={setMessage} />
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw] flex flex-col items-center">
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute -top-10 right-0 text-[#A78BFA] hover:text-[#F8FAFC] font-mono text-xs flex items-center gap-1.5 bg-[#1A0E2E] border border-[#2E1E45] px-3 py-1 cursor-pointer"
            >
              <X size={14} /> TUTUP [ESC]
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImg}
              alt="Preview Zoom Lightbox"
              className="max-h-[85vh] max-w-full rounded-none border border-[#7C3AED] object-contain shadow-2xl bg-[#09040F]"
            />
          </div>
        </div>
      )}
    </main>
  );
}

function ThreadModal({
  category,
  canPin,
  onClose,
  onCreated,
}: {
  category: Category;
  canPin: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachmentImg, setAttachmentImg] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [enablePoll, setEnablePoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function handleAddOption() {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, ""]);
    }
  }

  function handleRemoveOption(idx: number) {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  }

  function handleOptionChange(idx: number, val: string) {
    const updated = [...pollOptions];
    updated[idx] = val;
    setPollOptions(updated);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      let finalContent = content;
      if (attachmentImg) {
        finalContent += `\n\n![Lampiran Gambar](${attachmentImg})`;
      }

      const validPollOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (enablePoll && validPollOptions.length < 2) {
        throw new Error("Polling voting minimal membutuhkan 2 pilihan jawaban.");
      }

      const pollPayload =
        enablePoll && validPollOptions.length >= 2
          ? {
              question: pollQuestion.trim() || title.trim(),
              options: validPollOptions,
            }
          : undefined;

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title,
          content: finalContent,
          isPinned,
          poll: pollPayload,
        }),
      });
      await readApiResponse<unknown>(response, "Thread tidak dapat dibuat.");
      onCreated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Thread tidak dapat dibuat.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 bg-slate-900/60 dark:bg-[#09040F]/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="modal-card w-[calc(100vw-1.5rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto my-auto rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] p-4 sm:p-6 text-left relative shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="thread-modal-title">
        <button className="modal-close absolute top-5 right-5 text-slate-400 dark:text-[#A78BFA] hover:text-slate-900 dark:hover:text-[#F8FAFC]" onClick={onClose} aria-label="Tutup">
          <X size={19} />
        </button>
        <p className="section-kicker font-mono text-xs font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider mb-1">MULAI DISKUSI // FORUM</p>
        <h2 id="thread-modal-title" className="font-display text-2xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-[#F8FAFC] mb-5">Buat Thread Baru</h2>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-xs font-mono text-slate-600 dark:text-[#A78BFA] uppercase">
            Kategori
            <input className="mt-1 w-full p-2.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-100 dark:bg-[#1A0E2E] text-slate-800 dark:text-[#F8FAFC] font-mono text-xs cursor-not-allowed" value={categories.find((item) => item.id === category)?.slug} readOnly />
          </label>
          <label className="block text-xs font-mono text-slate-600 dark:text-[#A78BFA] uppercase">
            Judul thread
            <input
              required
              maxLength={180}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Apa yang ingin kamu diskusikan?"
              className="mt-1 w-full p-2.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] text-slate-900 dark:text-[#F8FAFC] font-sans text-sm focus:outline-none focus:border-[#7C3AED]"
            />
          </label>
          <label className="block text-xs font-mono text-slate-600 dark:text-[#A78BFA] uppercase">
            Isi thread
            <MentionHashtagInput
              rows={6}
              maxLength={10000}
              value={content}
              onChange={setContent}
              placeholder="Ceritakan lebih lanjut… (Gunakan @ untuk mention member/Satpam, # untuk topik. Ctrl+Enter untuk kirim)"
              className="mt-1 w-full p-2.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] text-slate-900 dark:text-[#F8FAFC] font-sans text-sm focus:outline-none focus:border-[#7C3AED]"
            />
          </label>
          <div>
            <ImageUploader
              value={attachmentImg}
              onChange={setAttachmentImg}
              label="Lampiran Gambar / Tangkapan Layar (Opsional)"
              description="Unggah tangkapan layar langsung dari galeri HP atau PC. Otomatis dikompresi."
            />
          </div>

          {/* OPSI POLLING VOTING INTERAKTIF */}
          <div className="p-3 border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E]/60 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-[#A78BFA] uppercase flex items-center gap-1.5">
                <span>+ Tambah Polling Voting</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-purple-500/20 text-purple-400 font-normal">
                  Opsional
                </span>
              </span>
              <input
                type="checkbox"
                checked={enablePoll}
                onChange={(e) => setEnablePoll(e.target.checked)}
                className="w-4 h-4 rounded-none accent-[#7C3AED]"
              />
            </label>

            {enablePoll && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-[#2E1E45]/80">
                <label className="block text-[11px] font-mono text-slate-600 dark:text-gray-400">
                  Pertanyaan Polling (Kosongkan jika sama dengan judul thread)
                  <input
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="Contoh: Siapa agen duelist terbaik di patch ini?"
                    maxLength={150}
                    className="mt-1 w-full p-2 border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] text-xs text-slate-900 dark:text-white"
                  />
                </label>

                <div className="space-y-1.5">
                  <span className="block text-[11px] font-mono text-slate-600 dark:text-gray-400">
                    Pilihan Jawaban (Maksimal 5)
                  </span>
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-gray-500 w-4">{idx + 1}.</span>
                      <input
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Opsi ${idx + 1}`}
                        maxLength={80}
                        required={enablePoll && idx < 2}
                        className="flex-1 p-1.5 border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] text-xs text-slate-900 dark:text-white"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="px-2 py-1 text-xs text-red-400 hover:text-red-300 border border-red-500/30"
                          title="Hapus opsi"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}

                  {pollOptions.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="mt-1.5 text-xs font-mono font-bold text-purple-400 hover:text-purple-300 hover:underline inline-flex items-center gap-1"
                    >
                      + Tambah Pilihan
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          {canPin && (
            <label className="flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-[#A78BFA] cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(event) => setIsPinned(event.target.checked)}
                className="rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] text-[#7C3AED] focus:ring-0"
              />{" "}
              Sematkan postingan (Premium, maks. 3)
            </label>
          )}
          {error && <p className="p-3 text-xs font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-500/30 rounded-none" role="alert">{error}</p>}
          <button className="w-full py-2.5 rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-white border border-[#7C3AED] transition-colors" disabled={saving}>
            {saving ? "Mengirim…" : "Publikasikan thread"}
          </button>
        </form>
      </section>
    </div>
  );
}
