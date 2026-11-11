"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, Flag, MessageCircle, Pin, Send, Trash2, X } from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { LoginPrompt, ReportDialog } from "@/components/interaction-dialogs";
import { DiscordAvatar } from "@/components/discord-avatar";
import { PostReactions, type PostReaction } from "@/components/post-reactions";

type CommentRecord = {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  author: { id: string; username: string | null; avatar: string | null; isPremium: boolean };
};
type ThreadRecord = {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  likes: number;
  dislikes: number;
  votes: { value: Exclude<PostReaction, null> }[];
  createdAt: string;
  authorId?: string;
  author: { id?: string; username: string | null; avatar: string | null; isPremium: boolean };
  comments: CommentRecord[];
};

export function ForumThread({ id }: { id: string }) {
  const [thread, setThread] = useState<ThreadRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loginAction, setLoginAction] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;

  useEffect(() => {
    let active = true;
    fetch(`/api/posts/${id}`)
      .then(async (response) => {
        const data = await readApiResponse<ThreadRecord>(response, "Thread tidak ditemukan.");
        if (active) {
          setThread(data);
          setError("");
        }
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Gagal memuat thread."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, refreshKey]);

  async function deleteThread() {
    if (!confirm("Apakah kamu yakin ingin menghapus thread ini secara permanen?")) return;
    try {
      const response = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      await readApiResponse<unknown>(response, "Gagal menghapus thread.");
      window.location.href = "/forum";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menghapus thread.");
    }
  }

  const commentsByParent = useMemo(() => {
    const groups = new Map<string | null, CommentRecord[]>();
    for (const item of thread?.comments ?? []) {
      const parent = item.parentId && thread?.comments.some((entry) => entry.id === item.parentId) ? item.parentId : null;
      groups.set(parent, [...(groups.get(parent) ?? []), item]);
    }
    return groups;
  }, [thread?.comments]);

  async function sendComment(parentId: string | null, body: string) {
    if (!user) {
      setLoginAction("berkomentar");
      return;
    }
    if (user.isBanned) {
      setError("Akun kamu sedang dibatasi dan tidak dapat berkomentar.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/posts/${id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: body, parentId }) });
      await readApiResponse<unknown>(response, "Komentar gagal dikirim.");
      setComment("");
      setReplyText("");
      setReplyTo(null);
      setLoading(true);
      setRefreshKey((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Komentar gagal dikirim."); }
    finally { setSending(false); }
  }

  function reportPost() {
    if (!user) {
      setLoginAction("melaporkan postingan");
      return;
    }
    setReportOpen(true);
  }

  if (loading) return <main className="community-page"><div className="empty-state">Memuat thread…</div></main>;
  if (!thread) return <main className="community-page page-shell"><div className="inline-error">{error || "Thread tidak ditemukan."}</div><Link className="text-link" href="/forum"><ArrowLeft size={16} /> Kembali ke forum</Link></main>;

  const renderComments = (parentId: string | null, depth = 0): React.ReactNode => (commentsByParent.get(parentId) ?? []).map((item) => (
    <article className="comment-card" key={item.id} style={{ marginLeft: depth ? `${Math.min(depth, 3) * 12}px` : undefined }}>
      <DiscordAvatar className="comment-avatar" src={item.author.avatar} username={item.author.username} />
      <div className="comment-content min-w-0 flex-1"><div className="comment-meta flex flex-wrap items-center gap-2"><strong className={item.author.isPremium ? "premium-username" : undefined}>{item.author.username ?? "Gamer"}</strong><time className="text-[11px] text-gray-400">{new Date(item.createdAt).toLocaleString("id-ID")}</time></div><p className="break-words mt-1 text-xs sm:text-sm leading-relaxed">{item.content}</p>
        {!user?.isBanned && <button className="reply-button" onClick={() => {
          if (!user) {
            setLoginAction("membalas komentar");
            return;
          }
          setReplyTo(replyTo === item.id ? null : item.id);
          setReplyText("");
        }}><MessageCircle size={13} /> Balas</button>}
        {replyTo === item.id && <form className="reply-form mt-2" onSubmit={(event) => { event.preventDefault(); void sendComment(item.id, replyText); }}><textarea required maxLength={5000} rows={2} value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder={`Balas ${item.author.username ?? "gamer"}…`} className="w-full" /><button className="button button-primary button-small" disabled={sending}><Send size={14} /> Balas</button></form>}
        <div className="nested-comments mt-2">{renderComments(item.id, depth + 1)}</div>
      </div>
    </article>
  ));

  return <main className="community-page py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full max-w-full overflow-x-hidden"><div className="page-shell px-0 sm:px-0 thread-layout"><div><Link className="back-link inline-flex items-center gap-1.5 text-xs font-bold text-[#9D4EDD] mb-4" href="/forum"><ArrowLeft size={16} /> Kembali ke forum</Link>
    <article className="thread-card p-4 sm:p-6 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">{thread.isPinned && <span className="pinned-label"><Pin size={13} /> PINNED</span>}<p className="section-kicker text-xs font-bold text-[#9D4EDD] uppercase tracking-wider">{thread.category.toLowerCase().replaceAll("_", " ")}</p><h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white break-words mt-2 leading-tight">{thread.title}</h1><div className="thread-meta flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500 my-3"><span className="post-author"><DiscordAvatar src={thread.author.avatar} username={thread.author.username} /><span>oleh <Link href={`/u/${thread.author.username ?? "user"}`} className={`hover:underline ${thread.author.isPremium ? "premium-username" : "font-semibold text-gray-800 dark:text-gray-200"}`}>{thread.author.username ?? "Gamer"}</Link></span></span> · {new Date(thread.createdAt).toLocaleString("id-ID")}</div><PostReactions postId={thread.id} likes={thread.likes} dislikes={thread.dislikes} reaction={thread.votes?.[0]?.value ?? null} onLoginRequired={() => setLoginAction("memberi reaksi")} /><div className="thread-body break-words leading-relaxed text-sm sm:text-base my-4 text-gray-700 dark:text-gray-300">{thread.content}</div><div className="thread-actions flex flex-wrap items-center gap-2 sm:gap-3"><button className="report-button" onClick={reportPost}><Flag size={14} /> Report Post</button>{user && (user.role === "ADMIN" || user.role === "MODERATOR" || user.id === thread.author?.id) && <button className="report-button text-red-500 hover:text-red-400" onClick={() => void deleteThread()}><Trash2 size={14} /> Hapus Thread</button>}</div></article>
    {error && <div className={error.startsWith("Laporan berhasil") ? "inline-notice mt-3" : "inline-error mt-3"} role="status">{error}<button onClick={() => setError("")} aria-label="Tutup"><X size={15} /></button></div>}
    <section className="comments-section mt-8"><div className="section-heading flex items-center justify-between gap-3 mb-4"><h2 className="text-xl sm:text-2xl font-bold">Diskusi</h2><span className="text-xs text-gray-400">{thread.comments.length} komentar</span></div>
      {user && !user.isBanned ? <form className="comment-compose" onSubmit={(event) => { event.preventDefault(); void sendComment(null, comment); }}><textarea required maxLength={5000} rows={3} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Bagikan pendapatmu…" className="w-full" /><button className="button button-primary w-full sm:w-auto" disabled={sending}><Send size={15} /> Kirim komentar</button></form> : user?.isBanned ? <p className="banned-note">Akun kamu sedang dibatasi dan tidak dapat berkomentar.</p> : <button className="button button-quiet w-full sm:w-auto" onClick={() => setLoginAction("berkomentar")}>Login untuk ikut berdiskusi</button>}
      <div className="comments-list space-y-4 mt-6">{renderComments(null)}</div>
      {!thread.comments.length && <div className="empty-state mt-4">Belum ada komentar. Jadilah yang pertama membalas.</div>}
    </section>
  </div></div>
    <LoginPrompt open={Boolean(loginAction)} action={loginAction} onClose={() => setLoginAction("")} />
    <ReportDialog postId={id} open={reportOpen} onClose={() => setReportOpen(false)} onSuccess={setError} />
  </main>;
}
