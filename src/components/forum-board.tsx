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
  const [liveState, setLiveState] = useState<LiveState>(realtimeUrl ? "connecting" : "unavailable");
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
    <main className="community-page py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full max-w-full overflow-x-hidden">
      <div className="page-shell px-0 sm:px-0">
        <div className="forum-heading flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <p className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-1">RUANG DISKUSI GUILD</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white break-words">Forum <span className="text-[#9D4EDD] dark:text-[#C77DFF]">Komunitas</span></h1>
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

        {/* FORUM TABS WITH FRAMER MOTION TRANSITION */}
        <div className="forum-tabs relative flex overflow-x-auto scrollbar-none gap-2 border-b border-gray-200 dark:border-[#211C2B] pb-1 -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Kategori sub-forum">
          {categories.map((item) => {
            const isActive = category === item.id;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isActive}
                className={`relative px-4 py-3 text-sm font-bold transition-colors ${
                  isActive ? "text-purple-600 dark:text-purple-400" : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
                onClick={() => {
                  if (category !== item.id) {
                    setLoading(true);
                    setCategory(item.id);
                  }
                }}
              >
                <span className="mr-1.5 opacity-60 font-mono text-xs">{item.slug}</span>
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="activeForumTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9D4EDD]"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* SEARCH BAR WITH DEBOUNCE SPINNER */}
        <form
          className="market-search forum-search relative flex items-center"
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="absolute left-3.5 flex items-center pointer-events-none text-gray-400">
            {isSearching ? <Loader2 size={16} className="animate-spin text-purple-500" /> : <Search size={16} />}
          </div>
          <input
            maxLength={120}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Ketik untuk mencari (otomatis mencari setelah 0.5s)…"
            aria-label="Cari diskusi"
            className="pl-10 pr-20"
          />
          {searchValue && (
            <button
              type="button"
              className="absolute right-3 text-xs text-gray-400 hover:text-white"
              onClick={() => {
                setSearchValue("");
                setSearch("");
              }}
            >
              Hapus
            </button>
          )}
        </form>

        <div className="forum-category-intro">
          <div>
            <span className="category-bullet" /> <strong>{activeCategory.slug}</strong>
            <p>{activeCategory.description}</p>
          </div>
          <div className="forum-feed-status">
            <span>{posts.length} thread</span>
            <span className={`live-status live-${liveState}`}>
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
                className={`forum-post ${post.isPinned ? "pinned-post" : ""}`}
                key={`${post.id}-${post.likes}-${post.dislikes}-${post.votes?.[0]?.value ?? "none"}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.035 }}
              >
                {/* OPTIMISTIC REACTION COMPONENT */}
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
                <div className="post-main">
                  {post.isPinned && (
                    <span className="pinned-label">
                      <Pin size={13} /> PINNED
                    </span>
                  )}
                  <Link className="post-title text-base sm:text-lg font-bold break-words hover:text-[#9D4EDD] dark:hover:text-[#C77DFF] transition-colors" href={`/forum/${post.id}`}>
                    {post.title}
                  </Link>
                  <p className="post-excerpt text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words leading-relaxed mt-1.5">{post.content}</p>
                  <div className="post-meta flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500 dark:text-gray-400 mt-3">
                    <span className="post-author">
                      <DiscordAvatar src={post.author.avatar} username={post.author.username} />
                      <span>
                        oleh{" "}
                        <strong className={post.author.isPremium ? "premium-username" : undefined}>
                          {post.author.username ?? "Gamer"}
                        </strong>
                      </span>
                    </span>
                    <span>{new Date(post.createdAt).toLocaleDateString("id-ID")}</span>
                    <Link href={`/forum/${post.id}`}>
                      <MessageCircle size={14} /> Diskusi
                    </Link>
                    <button className="report-button" onClick={() => handleReportPost(post.id)}>
                      <Flag size={13} /> Report Post
                    </button>
                    {user && (user.id === post.author.id || user.role === "ADMIN" || user.role === "MODERATOR") && (
                      <button
                        className="report-button text-red-500 hover:text-red-400"
                        onClick={() => void handleDeletePost(post.id)}
                        title="Hapus postingan"
                      >
                        <Trash2 size={13} /> Hapus
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

      {compose && (
        <ThreadModal
          category={category}
          canPin={Boolean(user?.isPremium)}
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
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="thread-modal-title">
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
