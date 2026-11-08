"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, Flag, MessageCircle, Pin, Send, Sparkles, X } from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { LoginPrompt, ReportDialog } from "@/components/interaction-dialogs";

type CommentRecord = {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  author: { id: string; username: string | null; avatar: string | null };
};
type ThreadRecord = {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  author: { username: string | null };
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
  const [summary, setSummary] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [summarizing, setSummarizing] = useState(false);
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

  async function summarizeThread() {
    if (!user) {
      setLoginAction("membuat ringkasan AI");
      return;
    }
    if (user.isBanned) {
      setSummaryError("Akun kamu sedang dibatasi dan tidak dapat menggunakan fitur AI.");
      return;
    }
    setSummarizing(true);
    setSummaryError("");
    try {
      const response = await fetch("/api/ai/forum-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: id }),
      });
      const result = await readApiResponse<{ summary: string }>(response, "Ringkasan AI gagal dibuat.");
      setSummary(result.summary);
    } catch (reason) {
      setSummaryError(reason instanceof Error ? reason.message : "Ringkasan AI gagal dibuat.");
    } finally {
      setSummarizing(false);
    }
  }

  if (loading) return <main className="community-page"><div className="empty-state">Memuat thread…</div></main>;
  if (!thread) return <main className="community-page page-shell"><div className="inline-error">{error || "Thread tidak ditemukan."}</div><Link className="text-link" href="/forum"><ArrowLeft size={16} /> Kembali ke forum</Link></main>;

  const renderComments = (parentId: string | null, depth = 0): React.ReactNode => (commentsByParent.get(parentId) ?? []).map((item) => (
    <article className="comment-card" key={item.id} style={{ marginLeft: depth ? `${Math.min(depth, 4) * 18}px` : undefined }}>
      <div className="comment-avatar">{(item.author.username ?? "G").slice(0, 1).toUpperCase()}</div>
      <div className="comment-content"><div className="comment-meta"><strong>{item.author.username ?? "Gamer"}</strong><time>{new Date(item.createdAt).toLocaleString("id-ID")}</time></div><p>{item.content}</p>
        {!user?.isBanned && <button className="reply-button" onClick={() => {
          if (!user) {
            setLoginAction("membalas komentar");
            return;
          }
          setReplyTo(replyTo === item.id ? null : item.id);
          setReplyText("");
        }}><MessageCircle size={13} /> Balas</button>}
        {replyTo === item.id && <form className="reply-form" onSubmit={(event) => { event.preventDefault(); void sendComment(item.id, replyText); }}><textarea required maxLength={5000} rows={2} value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder={`Balas ${item.author.username ?? "gamer"}…`} /><button className="button button-primary button-small" disabled={sending}><Send size={14} /> Balas</button></form>}
        <div className="nested-comments">{renderComments(item.id, depth + 1)}</div>
      </div>
    </article>
  ));

  return <main className="community-page"><div className="page-shell thread-layout"><div><Link className="back-link" href="/forum"><ArrowLeft size={16} /> Kembali ke forum</Link>
    <article className="thread-card">{thread.isPinned && <span className="pinned-label"><Pin size={13} /> PINNED</span>}<p className="section-kicker">{thread.category.toLowerCase().replaceAll("_", " ")}</p><h1>{thread.title}</h1><div className="thread-meta">oleh <strong>{thread.author.username ?? "Gamer"}</strong> · {new Date(thread.createdAt).toLocaleString("id-ID")} · {thread.upvotes - thread.downvotes} poin</div><div className="thread-body">{thread.content}</div><div className="thread-actions"><button className="button button-quiet button-small" onClick={() => void summarizeThread()} disabled={summarizing}><Sparkles size={14} /> {summarizing ? "Merangkum…" : "Ringkas dengan AI"}</button><button className="report-button" onClick={reportPost}><Flag size={14} /> Report Post</button></div>{summaryError && <div className="inline-error" role="status">{summaryError}</div>}{summary && <section className="thread-summary" aria-label="Ringkasan AI"><strong><Sparkles size={14} /> Ringkasan AI</strong><p>{summary}</p></section>}</article>
    {error && <div className={error.startsWith("Laporan berhasil") ? "inline-notice" : "inline-error"} role="status">{error}<button onClick={() => setError("")} aria-label="Tutup"><X size={15} /></button></div>}
    <section className="comments-section"><div className="section-heading"><h2>Diskusi</h2><span>{thread.comments.length} komentar</span></div>
      {user && !user.isBanned ? <form className="comment-compose" onSubmit={(event) => { event.preventDefault(); void sendComment(null, comment); }}><textarea required maxLength={5000} rows={3} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Bagikan pendapatmu…" /><button className="button button-primary" disabled={sending}><Send size={15} /> Kirim komentar</button></form> : user?.isBanned ? <p className="banned-note">Akun kamu sedang dibatasi dan tidak dapat berkomentar.</p> : <button className="button button-quiet" onClick={() => setLoginAction("berkomentar")}>Login untuk ikut berdiskusi</button>}
      <div className="comments-list">{renderComments(null)}</div>
      {!thread.comments.length && <div className="empty-state">Belum ada komentar. Jadilah yang pertama membalas.</div>}
    </section>
  </div></div>
    <LoginPrompt open={Boolean(loginAction)} action={loginAction} onClose={() => setLoginAction("")} />
    <ReportDialog postId={id} open={reportOpen} onClose={() => setReportOpen(false)} onSuccess={setError} />
  </main>;
}
