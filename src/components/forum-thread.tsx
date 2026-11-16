"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, Flag, MessageCircle, Pin, Send, Trash2, X } from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { LoginPrompt, ReportDialog } from "@/components/interaction-dialogs";
import { DiscordAvatar } from "@/components/discord-avatar";
import { PostReactions, type PostReaction } from "@/components/post-reactions";
import { ShareButton } from "@/components/share-button";
import { ImageUploader } from "@/components/ui/image-uploader";
import { useLiveSync } from "@/hooks/use-live-sync";

type CommentRecord = {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  author: { id: string; username: string | null; avatar: string | null; isPremium: boolean; role?: string };
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
  author: { id?: string; username: string | null; avatar: string | null; isPremium: boolean; role?: string };
  comments: CommentRecord[];
};

function FormattedPostContent({ text, onImageClick }: { text: string; onImageClick?: (src: string) => void }) {
  const imageRegex = /!\[(.*?)\]\(((?:data:image\/[^)]+|https?:\/\/[^)]+|\/[^)]+))\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imageRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={lastIndex} className="whitespace-pre-wrap">
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }
    const alt = match[1] || "Lampiran gambar";
    const src = match[2];
    parts.push(
      <span key={match.index} className="block my-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="mt-2 max-h-80 w-auto rounded-lg border border-[#2A1B42] bg-[#09040F] object-contain cursor-zoom-in hover:border-[#7C3AED] transition-all shadow-md"
          onClick={() => onImageClick?.(src)}
        />
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={lastIndex} className="whitespace-pre-wrap">
        {text.slice(lastIndex)}
      </span>
    );
  }

  return <>{parts.length > 0 ? parts : <span className="whitespace-pre-wrap">{text}</span>}</>;
}

export function ForumThread({ id }: { id: string }) {
  const [thread, setThread] = useState<ThreadRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [commentImg, setCommentImg] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loginAction, setLoginAction] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
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

  // Smart Live Sync: Refresh thread & komentar setiap 10 detik dan seketika saat tab kembali aktif
  useLiveSync(() => {
    setRefreshKey((prev) => prev + 1);
  }, { intervalMs: 10000, revalidateOnFocus: true });

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
      let finalBody = body;
      if (!parentId && commentImg) {
        finalBody = `${body}\n\n![Lampiran](${commentImg})`;
      }
      const response = await fetch(`/api/posts/${id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: finalBody, parentId }) });
      await readApiResponse<unknown>(response, "Komentar gagal dikirim.");
      setComment("");
      setCommentImg("");
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

  async function togglePin() {
    if (!thread || (user?.role !== "ADMIN" && user?.role !== "MODERATOR")) return;
    const nextPin = !thread.isPinned;
    setThread({ ...thread, isPinned: nextPin });
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: nextPin }),
      });
      await readApiResponse(res, "Gagal mengubah status sematan.");
      setError(nextPin ? "Laporan berhasil: Thread disematkan (PINNED)." : "Laporan berhasil: Sematan thread dilepas.");
    } catch (err) {
      setThread({ ...thread, isPinned: !nextPin });
      setError(err instanceof Error ? err.message : "Gagal mengubah status pin.");
    }
  }

  if (loading) return <main className="community-page py-12 text-center text-[#A78BFA] font-mono text-xs"><div className="empty-state">MEMUAT THREAD…</div></main>;
  if (!thread) return <main className="community-page page-shell py-12 text-center max-w-xl mx-auto"><div className="p-3 text-xs font-mono text-red-400 bg-red-950/20 border border-red-500/30 rounded-none mb-4">{error || "Thread tidak ditemukan."}</div><Link className="inline-flex items-center gap-1.5 text-xs font-mono text-[#A78BFA] hover:text-[#F8FAFC]" href="/forum"><ArrowLeft size={16} /> KEMBALI KE FORUM</Link></main>;

  const renderComments = (parentId: string | null, depth = 0): React.ReactNode => (commentsByParent.get(parentId) ?? []).map((item) => (
    <article className="comment-card p-4 rounded-none border border-[#2E1E45] bg-[#130921] my-2" key={item.id} style={{ marginLeft: depth ? `${Math.min(depth, 3) * 16}px` : undefined }}>
      <div className="flex items-start gap-3">
        <DiscordAvatar className="comment-avatar shrink-0" src={item.author.avatar} username={item.author.username} size={28} />
        <div className="comment-content min-w-0 flex-1">
          <div className="comment-meta flex flex-wrap items-center gap-2">
            <strong className={(item.author.isPremium || item.author.username === ".odyssia") ? "premium-username" : "text-[#F8FAFC] font-bold text-xs"}>{item.author.username ?? "Gamer"}</strong>
            {(item.author.username?.toLowerCase() === ".odyssia" || item.author.username?.toLowerCase() === "odyssia") ? (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30">👑 Emperor</span>
            ) : item.author.role === "ADMIN" ? (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/30">✨ Prince</span>
            ) : item.author.role === "MODERATOR" ? (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-blue-500/15 text-blue-400 border border-blue-500/30">⚔️ Mod</span>
            ) : null}
            <time className="text-[11px] font-mono text-[#A78BFA]/70">{new Date(item.createdAt).toLocaleString("id-ID")}</time>
          </div>
          <div className="break-words mt-2 text-xs sm:text-sm leading-relaxed text-[#F8FAFC]/90 font-sans"><FormattedPostContent text={item.content} onImageClick={setLightboxImg} /></div>
          {!user?.isBanned && (
            <button
              className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-mono text-[#A78BFA] hover:text-[#F8FAFC] uppercase tracking-wider"
              onClick={() => {
                if (!user) {
                  setLoginAction("membalas komentar");
                  return;
                }
                setReplyTo(replyTo === item.id ? null : item.id);
                setReplyText("");
              }}
            >
              <MessageCircle size={13} /> Balas
            </button>
          )}
          {replyTo === item.id && (
            <form className="reply-form mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); void sendComment(item.id, replyText); }}>
              <textarea
                required
                maxLength={5000}
                rows={2}
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder={`Balas ${item.author.username ?? "gamer"}…`}
                className="w-full p-2.5 rounded-none border border-[#2E1E45] bg-[#1A0E2E] text-[#F8FAFC] font-sans text-xs focus:outline-none focus:border-[#7C3AED]"
              />
              <button className="px-3 py-1.5 rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F8FAFC] border border-[#7C3AED]" disabled={sending}>
                <Send size={12} className="inline mr-1" /> Balas
              </button>
            </form>
          )}
          <div className="nested-comments mt-2">{renderComments(item.id, depth + 1)}</div>
        </div>
      </div>
    </article>
  ));

  return (
    <main className="community-page py-8 sm:py-12 w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 overflow-x-hidden">
      <div className="page-shell px-0 sm:px-0 thread-layout">
        <div>
          <Link className="back-link inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#A78BFA] hover:text-[#F8FAFC] mb-4 uppercase tracking-wider" href="/forum">
            <ArrowLeft size={16} /> KEMBALI KE FORUM
          </Link>
          <article className="thread-card p-5 sm:p-7 rounded-none border border-[#2E1E45] bg-[#130921]">
            {thread.isPinned && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#A78BFA] uppercase tracking-wider mb-2">
                <Pin size={12} className="text-[#7C3AED]" /> PINNED THREAD
              </span>
            )}
            <p className="section-kicker font-mono text-xs font-bold text-[#A78BFA] uppercase tracking-wider">
              {thread.category.toLowerCase().replaceAll("_", " ")}
            </p>
            <h1 className="page-title font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#F8FAFC] uppercase tracking-tight break-words mt-2 leading-tight">
              {thread.title}
            </h1>
            <div className="thread-meta flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#A78BFA] font-mono my-3 pt-2 border-t border-[#2E1E45]">
              <span className="post-author flex items-center gap-1.5">
                <DiscordAvatar src={thread.author.avatar} username={thread.author.username} size={20} />
                <span>oleh <Link href={`/u/${thread.author.username ?? "user"}`} className={`hover:underline ${(thread.author.isPremium || thread.author.username === ".odyssia") ? "premium-username" : "font-semibold text-[#F8FAFC]"}`}>{thread.author.username ?? "Gamer"}</Link>
                  {(thread.author.username?.toLowerCase() === ".odyssia" || thread.author.username?.toLowerCase() === "odyssia") ? (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 ml-1.5">👑 Emperor</span>
                  ) : thread.author.role === "ADMIN" ? (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/30 ml-1.5">✨ Prince / Princess</span>
                  ) : thread.author.role === "MODERATOR" ? (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-blue-500/15 text-blue-400 border border-blue-500/30 ml-1.5">⚔️ Lord Commander</span>
                  ) : null}
                </span>
              </span>
              <span>•</span>
              <span>{new Date(thread.createdAt).toLocaleString("id-ID")}</span>
            </div>
            <PostReactions postId={thread.id} likes={thread.likes} dislikes={thread.dislikes} reaction={thread.votes?.[0]?.value ?? null} onLoginRequired={() => setLoginAction("memberi reaksi")} />
            <div className="thread-body break-words leading-relaxed text-sm sm:text-base my-5 text-[#F8FAFC]/90 font-sans">
              <FormattedPostContent text={thread.content} onImageClick={setLightboxImg} />
            </div>
            <div className="thread-actions flex flex-wrap items-center gap-2 sm:gap-3 pt-3 border-t border-[#2E1E45]">
              <ShareButton url={`/forum/${thread.id}`} title={thread.title} text={`Baca dan diskusikan di Forum LogHorizon: ${thread.title}`} label="Bagikan Diskusi 🔗" variant="outline" />
              <button className="text-xs font-mono text-[#A78BFA] hover:text-rose-400 inline-flex items-center gap-1.5" onClick={reportPost}>
                <Flag size={14} /> Report
              </button>
              {user && (user.role === "ADMIN" || user.role === "MODERATOR") && (
                <button
                  className={`text-xs font-mono inline-flex items-center gap-1.5 ${thread.isPinned ? "text-[#A78BFA] font-bold" : "text-[#A78BFA]/70 hover:text-[#F8FAFC]"}`}
                  onClick={() => void togglePin()}
                  title={thread.isPinned ? "Lepas Pin" : "Pin Thread"}
                >
                  <Pin size={14} /> {thread.isPinned ? "Lepas Pin" : "Pin Thread"}
                </button>
              )}
              {user && (user.role === "ADMIN" || user.role === "MODERATOR" || user.id === thread.author?.id) && (
                <button className="text-xs font-mono text-red-400 hover:text-red-300 inline-flex items-center gap-1.5 ml-auto" onClick={() => void deleteThread()}>
                  <Trash2 size={14} /> Hapus
                </button>
              )}
            </div>
          </article>
          {error && <div className="p-3 text-xs font-mono text-red-400 bg-red-950/20 border border-red-500/30 rounded-none mt-3" role="status">{error}<button className="ml-2" onClick={() => setError("")} aria-label="Tutup"><X size={15} /></button></div>}
          <section className="comments-section mt-8">
            <div className="section-heading flex items-center justify-between gap-3 mb-4 border-b border-[#2E1E45] pb-3">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-[#F8FAFC]">Diskusi</h2>
              <span className="text-xs font-mono text-[#A78BFA]">{thread.comments.length} KOMENTAR</span>
            </div>
            {user && !user.isBanned ? (
              <form className="comment-compose space-y-3 p-4 rounded-none border border-[#2E1E45] bg-[#130921]" onSubmit={(event) => { event.preventDefault(); void sendComment(null, comment); }}>
                <textarea
                  required
                  maxLength={5000}
                  rows={3}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Bagikan pendapatmu…"
                  className="w-full p-2.5 rounded-none border border-[#2E1E45] bg-[#1A0E2E] text-[#F8FAFC] font-sans text-sm focus:outline-none focus:border-[#7C3AED]"
                />
                <ImageUploader
                  value={commentImg}
                  onChange={setCommentImg}
                  label="Lampiran Gambar (Opsional)"
                  description="Pilih foto langsung dari galeri HP atau PC. Otomatis dikompresi."
                />
                <button className="w-full sm:w-auto px-4 py-2 rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F8FAFC] border border-[#7C3AED] flex items-center justify-center gap-2" disabled={sending}>
                  <Send size={15} /> Kirim komentar
                </button>
              </form>
            ) : user?.isBanned ? (
              <p className="p-3 text-xs font-mono text-red-400 bg-red-950/20 border border-red-500/30 rounded-none">Akun kamu sedang dibatasi dan tidak dapat berkomentar.</p>
            ) : (
              <button className="w-full sm:w-auto px-4 py-2.5 rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-[#1A0E2E] text-[#A78BFA] border border-[#2E1E45] hover:border-[#7C3AED]" onClick={() => setLoginAction("berkomentar")}>
                Login untuk ikut berdiskusi
              </button>
            )}
            <div className="comments-list space-y-3 mt-6">{renderComments(null)}</div>
            {!thread.comments.length && <div className="p-8 text-center font-mono text-xs text-[#A78BFA] rounded-none border border-[#2E1E45] bg-[#130921] mt-4">Belum ada komentar. Jadilah yang pertama membalas.</div>}
          </section>
        </div>
      </div>
      <LoginPrompt open={Boolean(loginAction)} action={loginAction} onClose={() => setLoginAction("")} />
      <ReportDialog postId={id} open={reportOpen} onClose={() => setReportOpen(false)} onSuccess={setError} />
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
