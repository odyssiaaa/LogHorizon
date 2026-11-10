"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { createRealtimeClient, type SealedLiveQuery } from "@neon/realtime/client";
import { Flag, Pin, Plus, MessageCircle, Search, Trash2, X } from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { LoginPrompt, ReportDialog } from "@/components/interaction-dialogs";
import { DiscordAvatar } from "@/components/discord-avatar";
import { PostReactions, type PostReaction } from "@/components/post-reactions";
import { motion } from "framer-motion";

type Category = "GENERAL_CHAT" | "PROMOTION" | "FEEDBACK";
type BoardPost = {
  id: string;
  title: string;
  content: string;
  category: Category;
  isPinned: boolean;
  likes: number;
  dislikes: number;
  createdAt: string;
  author: { id: string; username: string | null; avatar: string | null; role: string; isPremium: boolean };
  votes: { value: Exclude<PostReaction, null> }[];
};
type ForumLiveRow = { id: string };
type LiveState = "connecting" | "live" | "stale" | "error" | "closed" | "unavailable";

const categories: { id: Category; slug: string; label: string; description: string }[] = [
  { id: "GENERAL_CHAT", slug: "f/general-chat", label: "Obrolan Umum", description: "Ngobrol apa saja seputar game dan guild." },
  { id: "PROMOTION", slug: "f/promotion", label: "Promosi Konten", description: "Bagikan konten, stream, atau karya gaming-mu." },
  { id: "FEEDBACK", slug: "f/feedback", label: "Aspirasi & Saran", description: "Bantu LogHorizon jadi guild yang lebih baik." },
];

export function ForumBoard({ realtimeUrl }: { realtimeUrl: string }) {
  const [category, setCategory] = useState<Category>("GENERAL_CHAT");
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [search, setSearch] = useState("");
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

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ category });
    if (search) query.set("search", search);
    fetch(`/api/posts?${query}`)
      .then(async (response) => {
        const data = await readApiResponse<BoardPost[]>(response, "Gagal memuat thread.");
        if (active) {
          setPosts(data);
          setError("");
        }
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Gagal memuat thread."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
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

  async function report(postId: string) {
    if (!user) {
      setLoginAction("melaporkan postingan");
      return;
    }
    setReportId(postId);
  }

  async function deletePost(postId: string) {
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

  function createThread() {
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
    <main className="community-page">
      <div className="page-shell">
        <div className="forum-heading">
          <div><p className="section-kicker">RUANG DISKUSI GUILD</p><h1>Forum <span>Komunitas</span></h1><p className="muted-copy">Temukan party, berbagi cerita, dan tumbuh bersama para petualang.</p></div>
          {status === "loading" ? <span className="nav-loading" /> : <button className="button button-primary" onClick={createThread}><Plus size={17} /> Buat Thread Baru</button>}
        </div>
        <div className="forum-tabs" role="tablist" aria-label="Kategori sub-forum">
          {categories.map((item) => <button key={item.id} role="tab" aria-selected={category === item.id} className={category === item.id ? "forum-tab active" : "forum-tab"} onClick={() => { if (category !== item.id) { setLoading(true); setCategory(item.id); } }}><span>{item.slug}</span>{item.label}</button>)}
        </div>
        <form className="market-search forum-search" role="search" onSubmit={(event) => { event.preventDefault(); setLoading(true); setSearch(searchValue.trim()); }}>
          <Search size={17} />
          <input maxLength={120} value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Cari judul, isi, atau nama anggota…" aria-label="Cari diskusi" />
          <button type="submit">Cari</button>
          {search && <button type="button" onClick={() => { setSearchValue(""); setSearch(""); setLoading(true); }}>Hapus</button>}
        </form>
        <div className="forum-category-intro"><div><span className="category-bullet" /> <strong>{activeCategory.slug}</strong><p>{activeCategory.description}</p></div><div className="forum-feed-status"><span>{posts.length} thread</span><span className={`live-status live-${liveState}`}>{liveState === "live" ? "Live" : liveState === "connecting" ? "Menghubungkan…" : liveState === "stale" ? "Memperbarui…" : liveState === "error" ? "Live terputus" : "Live tidak aktif"}</span></div></div>
        {liveError && <div className="inline-error" role="status">{liveError}</div>}
        {message && <div className="inline-notice" role="status">{message}<button aria-label="Tutup notifikasi" onClick={() => setMessage("")}><X size={15} /></button></div>}
        {error && <div className="inline-error" role="alert">{error}</div>}
        <section className="post-list" aria-live="polite">
          {loading ? <div className="empty-state">Memuat diskusi…</div> : posts.length ? posts.map((post, index) => <motion.article className={`forum-post ${post.isPinned ? "pinned-post" : ""}`} key={`${post.id}-${post.likes}-${post.dislikes}-${post.votes?.[0]?.value ?? "none"}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.035 }}>
            <PostReactions postId={post.id} likes={post.likes} dislikes={post.dislikes} reaction={post.votes?.[0]?.value ?? null} onLoginRequired={() => setLoginAction("memberi reaksi")} onChange={(result) => setPosts((current) => current.map((entry) => entry.id === post.id ? { ...entry, ...result, votes: result.reaction ? [{ value: result.reaction }] : [] } : entry))} />
            <div className="post-main">{post.isPinned && <span className="pinned-label"><Pin size={13} /> PINNED</span>}<Link className="post-title" href={`/forum/${post.id}`}>{post.title}</Link><p className="post-excerpt">{post.content}</p><div className="post-meta"><span className="post-author"><DiscordAvatar src={post.author.avatar} username={post.author.username} /><span>oleh <strong className={post.author.isPremium ? "premium-username" : undefined}>{post.author.username ?? "Gamer"}</strong></span></span><span>{new Date(post.createdAt).toLocaleDateString("id-ID")}</span><Link href={`/forum/${post.id}`}><MessageCircle size={14} /> Diskusi</Link><button className="report-button" onClick={() => report(post.id)}><Flag size={13} /> Report Post</button>{user && (user.id === post.author.id || user.role === "ADMIN" || user.role === "MODERATOR") && <button className="report-button text-red-500 hover:text-red-400" onClick={() => void deletePost(post.id)} title="Hapus postingan"><Trash2 size={13} /> Hapus</button>}</div></div>
          </motion.article>) : <div className="empty-state">{search ? `Tidak ada diskusi di ${activeCategory.slug} yang cocok dengan pencarian.` : `Belum ada thread di ${activeCategory.slug}. Jadilah yang pertama memulai percakapan.`}</div>}
        </section>
      </div>
      {compose && <ThreadModal category={category} canPin={Boolean(user?.isPremium)} onClose={() => setCompose(false)} onCreated={() => { setCompose(false); setLoading(true); setRefreshKey((value) => value + 1); }} />}
      <LoginPrompt open={Boolean(loginAction)} action={loginAction} onClose={() => setLoginAction("")} />
      <ReportDialog postId={reportId} open={Boolean(reportId)} onClose={() => setReportId(null)} onSuccess={setMessage} />
    </main>
  );
}

function ThreadModal({ category, canPin, onClose, onCreated }: { category: Category; canPin: boolean; onClose: () => void; onCreated: () => void }) {
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
      const response = await fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, title, content, isPinned }) });
      await readApiResponse<unknown>(response, "Thread tidak dapat dibuat.");
      onCreated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Thread tidak dapat dibuat.");
    } finally { setSaving(false); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="thread-modal-title"><button className="modal-close" onClick={onClose} aria-label="Tutup"><X size={19} /></button><p className="section-kicker">MULAI DISKUSI</p><h2 id="thread-modal-title">Buat Thread Baru</h2><form className="stack-form" onSubmit={submit}><label>Kategori<input value={categories.find((item) => item.id === category)?.slug} readOnly /></label><label>Judul thread<input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Apa yang ingin kamu diskusikan?" /></label><label>Isi thread<textarea required maxLength={10000} rows={6} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Ceritakan lebih lanjut…" /></label>{canPin && <label className="form-checkbox"><input type="checkbox" checked={isPinned} onChange={(event) => setIsPinned(event.target.checked)} /> Sematkan postingan (Premium, maks. 3)</label>}{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary" disabled={saving}>{saving ? "Mengirim…" : "Publikasikan thread"}</button></form></section></div>;
}
