"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { createRealtimeClient, type SealedLiveQuery } from "@neon/realtime/client";
import { Flag, Loader2, MessageCircle, Pin, Plus, Search, Trash2, X } from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { LoginPrompt, ReportDialog } from "@/components/interaction-dialogs";
import { DiscordAvatar } from "@/components/discord-avatar";
import { PostReactions, type PostReaction } from "@/components/post-reactions";
import { SkeletonForumCard, TacticalEmptyState } from "@/components/ui-feedback";
import { motion } from "framer-motion";
import type { ForumPostRecord } from "@/types/community";

type Category = "GENERAL_CHAT" | "PROMOTION" | "FEEDBACK";
type ForumLiveRow = { id: string };
type LiveState = "connecting" | "live" | "stale" | "error" | "closed" | "unavailable";

const categories: { id: Category; slug: string; label: string; description: string }[] = [
  { id: "GENERAL_CHAT", slug: "f/general-chat", label: "Obrolan Umum", description: "Ngobrol apa saja seputar game dan guild." },
  { id: "PROMOTION", slug: "f/promotion", label: "Promosi Konten", description: "Bagikan konten, stream, atau karya gaming-mu." },
  { id: "FEEDBACK", slug: "f/feedback", label: "Aspirasi & Saran", description: "Bantu LogHorizon jadi guild yang lebih baik." },
];

export function ForumBoard({ realtimeUrl }: { realtimeUrl: string }) {
  const [category, setCategory] = useState<Category>("GENERAL_CHAT");
  const [posts, setPosts] = useState<ForumPostRecord[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [compose, setCompose] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loginAction, setLoginAction] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<LiveState>("live");
  const [liveError, setLiveError] = useState("");
  const { data: session, status } = useSession();
  const user = session?.user;
  const activeCategory = categories.find((item) => item.id === category)!;

  // 500ms Debouncing Search System
  useEffect(() => {
    setIsSearching(true);
    const handler = setTimeout(() => {
      setSearch(searchValue.trim());
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchValue]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const query = new URLSearchParams({ category });
    if (search) query.set("search", search);

    fetch(`/api/posts?${query}`)
      .then(async (response) => {
        const data = await readApiResponse<ForumPostRecord[]>(response, "Gagal memuat thread.");
        if (active) {
          setPosts(data);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Gagal memuat thread.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category, refreshKey, search]);

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
          if (update.type === "changes" && active) setRefreshKey((value) => value + 1);
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
    <main className="community-page py-6 sm:py-10 px-4 sm:px-6 lg:px-10 max-w-[1400px] mx-auto w-full overflow-x-hidden">
      <div>
        <div className="forum-heading flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="text-left">
            <p className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-1">RUANG DISKUSI GUILD</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white break-words">Forum <span className="text-[#9D4EDD] dark:text-[#C77DFF]">Komunitas</span></h1>
            <p className="muted-copy text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Temukan party, berbagi cerita, dan tumbuh bersama para petualang.</p>
          </div>
          {status === "loading" ? (
            <span className="nav-loading" />
          ) : (
            <button className="button button-primary w-full sm:w-auto inline-flex items-center justify-center gap-2" onClick={handleCreateThread}>
              <Plus size={17} /> <span>Buat Thread Baru</span>
            </button>
          )}
        </div>

        {/* MODERN SEGMENTED CONTROL PILL TABS */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-[#120F17] border border-gray-200 dark:border-white/5 overflow-x-auto scrollbar-none my-4" role="tablist" aria-label="Kategori sub-forum">
          {categories.map((item) => {
            const isActive = category === item.id;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isActive}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 shrink-0 ${
                  isActive
                    ? "bg-[#9D4EDD] text-white shadow-sm shadow-[#9D4EDD]/25"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
                onClick={() => {
                  if (category !== item.id) {
                    setLoading(true);
                    setCategory(item.id);
                  }
                }}
              >
                <span className="font-mono text-[10px] opacity-75">{item.slug}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* 2-COLUMN DESKTOP LAYOUT (FEED + SIDEBAR) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-4">
          {/* MAIN COLUMN: SEARCH + SUB-FORUM STRIP + FEED */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {/* SEARCH BAR WITH FLEXBOX ALIGNMENT */}
            <form
              className="w-full"
              role="search"
              onSubmit={(event) => event.preventDefault()}
            >
              <div className="flex items-center gap-3 px-3.5 h-11 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#120F17] focus-within:border-[#9D4EDD] transition-colors">
                <div className="shrink-0 text-gray-400 flex items-center">
                  {isSearching ? <Loader2 size={16} className="animate-spin text-purple-500" /> : <Search size={16} />}
                </div>
                <input
                  maxLength={120}
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Cari thread atau kata kunci…"
                  aria-label="Cari diskusi"
                  className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 p-0"
                />
                {searchValue && (
                  <button
                    type="button"
                    className="shrink-0 text-xs text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium px-1"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#120F17]">
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-[#9D4EDD] shadow-[0_0_8px_#9D4EDD] shrink-0" />
                  <strong className="text-sm sm:text-base font-mono font-bold text-gray-900 dark:text-white break-words">
                    {activeCategory.slug}
                  </strong>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-[11px] font-mono shrink-0 text-gray-700 dark:text-gray-300">
                    {posts.length} thread
                  </span>
                </div>
                <p className="break-words text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {activeCategory.description}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 whitespace-nowrap self-start sm:self-auto">
                <span className={`live-status live-${liveState} whitespace-nowrap shrink-0`}>
                  {liveState === "live"
                    ? "Live"
                    : liveState === "connecting"
                      ? "Menghubungkan…"
                      : liveState === "stale"
                        ? "Memperbarui…"
                        : liveState === "error"
                          ? "Live terputus"
                          : "Live tidak aktif"}
                </span>
              </div>
            </div>

            {liveError && <div className="inline-error" role="status">{liveError}</div>}
            {message && (
              <div className="inline-notice" role="status">
                {message}
                <button aria-label="Tutup notifikasi" onClick={() => setMessage("")}>
                  <X size={15} />
                </button>
              </div>
            )}
            {error && <div className="inline-error" role="alert">{error}</div>}

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
                    className={`p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#120F17] hover:border-[#9D4EDD]/40 transition-all flex flex-col sm:flex-row gap-3 sm:gap-4 ${
                      post.isPinned ? "border-purple-500/30 bg-purple-950/5" : ""
                    }`}
                    key={`${post.id}-${post.likes}-${post.dislikes}-${post.votes?.[0]?.value ?? "none"}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.035 }}
                  >
                    {/* OPTIMISTIC REACTION COMPONENT */}
                    <div className="shrink-0 flex sm:flex-col items-center">
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
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      {post.isPinned && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#9D4EDD] uppercase mb-1">
                          <Pin size={11} /> PINNED THREAD
                        </span>
                      )}
                      <Link className="block text-base sm:text-lg font-bold break-words hover:text-[#9D4EDD] dark:hover:text-[#C77DFF] transition-colors leading-snug" href={`/forum/${post.id}`}>
                        {post.title}
                      </Link>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 break-words leading-relaxed mt-1 line-clamp-2">{post.content}</p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-400 dark:text-gray-500 mt-2.5 pt-2 border-t border-gray-100 dark:border-white/5">
                        <span className="flex items-center gap-1.5">
                          <DiscordAvatar src={post.author.avatar} username={post.author.username} size={20} />
                          <Link
                            href={`/u/${post.author.username ?? "user"}`}
                            className={`hover:underline ${(post.author.isPremium || post.author.role === "ADMIN" || post.author.username === ".odyssia") ? "premium-username" : "font-medium text-gray-700 dark:text-gray-300"}`}
                          >
                            {post.author.username ?? "Gamer"}
                          </Link>
                          {post.author.username?.toLowerCase() === ".odyssia" || post.author.username?.toLowerCase() === "odyssia" ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                              👑 Emperor
                            </span>
                          ) : post.author.role === "ADMIN" ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 shrink-0">
                              ✨ Prince
                            </span>
                          ) : post.author.role === "MODERATOR" ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
                              ⚔️ Mod
                            </span>
                          ) : null}
                        </span>
                        <span>•</span>
                        <span>{new Date(post.createdAt).toLocaleDateString("id-ID")}</span>
                        <span>•</span>
                        <Link href={`/forum/${post.id}`} className="hover:text-white inline-flex items-center gap-1">
                          <MessageCircle size={13} />
                          <span>Diskusi</span>
                        </Link>
                        {(user?.role === "ADMIN" || user?.role === "MODERATOR") && (
                          <button
                            type="button"
                            className={`inline-flex items-center gap-1 ml-auto ${post.isPinned ? "text-[#9D4EDD] font-bold" : "text-gray-400 hover:text-[#9D4EDD]"}`}
                            onClick={() => void handleTogglePin(post.id, post.isPinned)}
                            title={post.isPinned ? "Lepas sematan (Unpin)" : "Sematkan thread (Pin)"}
                          >
                            <Pin size={12} /> {post.isPinned ? "Unpin" : "Pin"}
                          </button>
                        )}
                        <button className="text-gray-400 hover:text-rose-400 inline-flex items-center gap-1" onClick={() => handleReportPost(post.id)}>
                          <Flag size={12} /> Laporkan
                        </button>
                        {user && (user.id === post.author.id || user.role === "ADMIN" || user.role === "MODERATOR") && (
                          <button
                            className="text-red-500 hover:text-red-400 inline-flex items-center gap-1"
                            onClick={() => void handleDeletePost(post.id)}
                            title="Hapus postingan"
                          >
                            <Trash2 size={12} />
                          </button>
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
                />
              )}
            </section>
          </div>

          {/* DESKTOP RIGHT SIDEBAR (CHANNELS & COMMUNITY GUIDE) */}
          <aside className="hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col gap-4 sticky top-20">
            {/* SUB-FORUM DIRECTORY CARD */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#120F17] space-y-3">
              <span className="text-[11px] font-bold text-[#9D4EDD] uppercase tracking-wider block">
                DIREKTORI SUB-FORUM
              </span>
              <div className="space-y-1">
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
                      className={`w-full text-left p-2.5 rounded-lg text-xs font-bold transition flex items-center justify-between ${
                        isActive
                          ? "bg-[#9D4EDD]/15 text-[#9D4EDD] dark:text-[#C77DFF] border border-[#9D4EDD]/30"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#181324]"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate">{cat.label}</p>
                        <p className="text-[10px] font-mono text-gray-400 truncate">{cat.slug}</p>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400 ml-2">➔</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PANDUAN FORUM GUILD */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#120F17] space-y-2.5 text-xs text-left">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                ETIKA FORUM LOGHORIZON
              </span>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-[11px] leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-[#9D4EDD] shrink-0 font-bold">•</span>
                  <span>Saling menghargai dan jaga sportivitas komunitas gamer.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#9D4EDD] shrink-0 font-bold">•</span>
                  <span>Promosi channel atau mabar diperbolehkan di <code>f/promotion</code>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#9D4EDD] shrink-0 font-bold">•</span>
                  <span>Gunakan tombol <strong>Report</strong> jika melihat spam atau penipuan.</span>
                </li>
              </ul>
            </div>

            {/* CTA BUAT THREAD */}
            <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-950/15 space-y-2 text-left">
              <h4 className="text-xs font-bold text-white">Punya Topik Menarik?</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Mulai obrolan baru dan temukan rekan mabar satu guild sekarang.
              </p>
              <button
                type="button"
                onClick={handleCreateThread}
                className="w-full mt-1 button button-primary text-xs font-bold py-2"
              >
                + Buat Thread Baru
              </button>
            </div>
          </aside>
        </div>
      </div>

      {compose && (
        <ThreadModal
          category={category}
          canPin={Boolean(user?.isPremium || user?.role === "ADMIN" || user?.username === ".odyssia")}
          onClose={() => setCompose(false)}
          onCreated={() => {
            setCompose(false);
            setLoading(true);
            setRefreshKey((value) => value + 1);
          }}
        />
      )}
      <LoginPrompt open={Boolean(loginAction)} action={loginAction} onClose={() => setLoginAction("")} />
      <ReportDialog postId={reportId} open={Boolean(reportId)} onClose={() => setReportId(null)} onSuccess={setMessage} />
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
  const [isPinned, setIsPinned] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title, content, isPinned }),
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
      className="modal-backdrop fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="modal-card w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto my-auto" role="dialog" aria-modal="true" aria-labelledby="thread-modal-title">
        <button className="modal-close" onClick={onClose} aria-label="Tutup">
          <X size={19} />
        </button>
        <p className="section-kicker">MULAI DISKUSI</p>
        <h2 id="thread-modal-title">Buat Thread Baru</h2>
        <form className="stack-form" onSubmit={submit}>
          <label>
            Kategori
            <input value={categories.find((item) => item.id === category)?.slug} readOnly />
          </label>
          <label>
            Judul thread
            <input
              required
              maxLength={180}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Apa yang ingin kamu diskusikan?"
            />
          </label>
          <label>
            Isi thread
            <textarea
              required
              maxLength={10000}
              rows={6}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Ceritakan lebih lanjut…"
            />
          </label>
          {canPin && (
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(event) => setIsPinned(event.target.checked)}
              />{" "}
              Sematkan postingan (Premium, maks. 3)
            </label>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary" disabled={saving}>
            {saving ? "Mengirim…" : "Publikasikan thread"}
          </button>
        </form>
      </section>
    </div>
  );
}
