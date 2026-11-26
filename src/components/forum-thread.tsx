"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, Coins, Flag, MessageCircle, Pin, Send, Trash2, X } from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { LoginPrompt, ReportDialog } from "@/components/interaction-dialogs";
import { DiscordAvatar } from "@/components/discord-avatar";
import { PostReactions, type PostReaction } from "@/components/post-reactions";
import { ShareButton } from "@/components/share-button";
import { ImageUploader } from "@/components/ui/image-uploader";
import { useLiveSync } from "@/hooks/use-live-sync";
import { MentionHashtagInput, type MentionUser } from "@/components/mention-hashtag-input";
import { getActiveTempTitle } from "@/lib/caste";
import { ForumPollWidget, type PollData } from "@/components/forum-poll-widget";
import { getCustomTitleBadge } from "@/lib/armory-catalog";
import { StaffCardModerationMenu } from "@/components/staff-moderation-dropdown";

type CommentRecord = {
  id: string;
  postId: string;
  authorId?: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  tipsTotal?: number;
  author: {
    id: string;
    username: string | null;
    avatar: string | null;
    isPremium: boolean;
    role?: string;
    tempTitle?: string | null;
    tempTitleExpiresAt?: string | Date | null;
    equippedAvatarFrame?: string | null;
    equippedCustomTitle?: string | null;
    partyMembership?: {
      role: string;
      party: {
        name: string;
        tag: string;
        emblemColor: string;
      };
    } | null;
  };
};

type ThreadRecord = {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  likes: number;
  dislikes: number;
  tipsTotal?: number;
  votes: { value: Exclude<PostReaction, null> }[];
  createdAt: string;
  authorId?: string;
  author: {
    id?: string;
    username: string | null;
    avatar: string | null;
    isPremium: boolean;
    role?: string;
    tempTitle?: string | null;
    tempTitleExpiresAt?: string | Date | null;
    equippedAvatarFrame?: string | null;
    equippedCustomTitle?: string | null;
    partyMembership?: {
      role: string;
      party: {
        name: string;
        tag: string;
        emblemColor: string;
      };
    } | null;
  };
  poll?: PollData | null;
  comments: CommentRecord[];
};

import { UniversalTextRenderer } from "@/lib/text-parser";

function FormattedPostContent({ text, onImageClick }: { text: string; onImageClick?: (src: string) => void }) {
  return <UniversalTextRenderer content={text} onImageClick={onImageClick} routeButtonVariant="link" enableBlocks={true} />;
}

export function ForumThread({ id }: { id: string }) {
  const [thread, setThread] = useState<ThreadRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [commentImg, setCommentImg] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<CommentRecord | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [isSatpamTyping, setIsSatpamTyping] = useState(false);
  const [loginAction, setLoginAction] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const { data: session } = useSession();
  const user = session?.user;

  const threadRef = useRef<ThreadRecord | null>(thread);
  useEffect(() => {
    threadRef.current = thread;
  }, [thread]);

  const syncThreadData = useCallback(
    async (isBackground = false) => {
      try {
        const response = await fetch(`/api/posts/${id}`);
        const fresh = await readApiResponse<ThreadRecord>(response, "Thread tidak ditemukan.");

        const current = threadRef.current;
        if (!isBackground || !current) {
          setThread(fresh);
          setError("");
        } else {
          // Background sync: Deep equality check on comments & thread properties
          const currentComments = current.comments;
          const freshComments = fresh.comments;

          // Pertahankan komentar optimistik lokal yang sedang menunggu konfirmasi server
          const pendingOptimistic = currentComments.filter((c) => c.id.startsWith("temp-"));
          const freshIds = new Set(freshComments.map((c) => c.id));
          const mergedComments = [...freshComments];
          for (const opt of pendingOptimistic) {
            if (!freshIds.has(opt.id)) {
              mergedComments.push(opt);
            }
          }

          const isContentSame =
            current.likes === fresh.likes &&
            current.dislikes === fresh.dislikes &&
            current.isPinned === fresh.isPinned &&
            JSON.stringify(currentComments) === JSON.stringify(mergedComments);

          if (!isContentSame) {
            setThread({
              ...fresh,
              comments: mergedComments,
            });
          }

          // Matikan indikator typing jika balasan Satpam AI sudah tiba
          const hasSatpam = freshComments.some(
            (c) =>
              (c.author.username === "satpam-horizon" || c.author.username === "Satpam Horizon") &&
              Date.now() - new Date(c.createdAt).getTime() < 30000
          );
          if (hasSatpam) setIsSatpamTyping(false);
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
    [id]
  );

  useEffect(() => {
    void syncThreadData(false);
  }, [syncThreadData]);

  // Smart Live Sync: Polling 10 detik di latar belakang tanpa berkedip dan tanpa menutup reply box
  useLiveSync(() => {
    void syncThreadData(true);
  }, { intervalMs: 10000, revalidateOnFocus: true });

  // Daftar member relevan untuk mention autocomplete
  const relevantUsers: MentionUser[] = useMemo(() => {
    const map = new Map<string, MentionUser>();
    if (thread?.author?.username) {
      map.set(thread.author.username.toLowerCase(), {
        id: thread.author.id,
        username: thread.author.username,
        avatar: thread.author.avatar,
        role: thread.author.role,
        isPremium: thread.author.isPremium,
      });
    }
    for (const c of thread?.comments ?? []) {
      if (c.author?.username) {
        map.set(c.author.username.toLowerCase(), {
          id: c.author.id,
          username: c.author.username,
          avatar: c.author.avatar,
          role: c.author.role,
          isPremium: c.author.isPremium,
        });
      }
    }
    return Array.from(map.values());
  }, [thread]);

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

  async function deleteComment(commentId: string) {
    if (!confirm("Yakin ingin menghapus komentar ini?")) return;

    // Optimistic UI update: hapus komentar dan seluruh balasan anak di bawahnya seketika
    if (thread) {
      const idsToDelete = new Set<string>([commentId]);
      let addedMore = true;
      while (addedMore) {
        addedMore = false;
        for (const c of thread.comments) {
          if (c.parentId && idsToDelete.has(c.parentId) && !idsToDelete.has(c.id)) {
            idsToDelete.add(c.id);
            addedMore = true;
          }
        }
      }
      setThread({
        ...thread,
        comments: thread.comments.filter((c) => !idsToDelete.has(c.id)),
      });
    }

    try {
      const response = await fetch(`/api/forum/comments/${commentId}`, { method: "DELETE" });
      await readApiResponse<unknown>(response, "Gagal menghapus komentar.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menghapus komentar.");
      void syncThreadData(true);
    }
  }

  // 1-Level Flat Threading Structuring:
  // Root comments (Level 0) and flat list of descendant replies (Level 1)
  const { rootComments, repliesByRootId, commentMap } = useMemo(() => {
    const cMap = new Map<string, CommentRecord>();
    for (const c of thread?.comments ?? []) {
      cMap.set(c.id, c);
    }

    const roots: CommentRecord[] = [];
    const rootIds = new Set<string>();

    for (const c of thread?.comments ?? []) {
      if (!c.parentId || !cMap.has(c.parentId)) {
        roots.push(c);
        rootIds.add(c.id);
      }
    }

    function findRootId(commentId: string): string {
      let cur = cMap.get(commentId);
      while (cur?.parentId && cMap.has(cur.parentId)) {
        cur = cMap.get(cur.parentId);
      }
      return cur?.id ?? commentId;
    }

    const repliesMap = new Map<string, CommentRecord[]>();
    for (const c of thread?.comments ?? []) {
      if (!rootIds.has(c.id)) {
        const rootId = findRootId(c.id);
        const list = repliesMap.get(rootId) ?? [];
        list.push(c);
        repliesMap.set(rootId, list);
      }
    }

    return { rootComments: roots, repliesByRootId: repliesMap, commentMap: cMap };
  }, [thread?.comments]);

  // Handle Quick Inline Reply Start
  const handleStartReply = (target: CommentRecord) => {
    if (!user) {
      setLoginAction("membalas komentar");
      return;
    }
    if (replyTo === target.id) {
      setReplyTo(null);
      setReplyTarget(null);
      setReplyText("");
      return;
    }
    const isSatpam = target.author.username === "satpam-horizon" || target.author.username === "Satpam Horizon";
    setReplyTo(target.id);
    setReplyTarget(target);
    setReplyText(`@${isSatpam ? "satpam" : (target.author.username ?? "gamer")} `);
  };

  // Optimistic Comment Submission
  async function sendComment(parentId: string | null, body: string) {
    if (!user) {
      setLoginAction("berkomentar");
      return;
    }
    if (user.isBanned) {
      setError("Akun kamu sedang dibatasi dan tidak dapat berkomentar.");
      return;
    }
    const cleanBody = body.trim();
    if (!cleanBody) return;

    let finalBody = cleanBody;
    if (!parentId && commentImg) {
      finalBody = `${cleanBody}\n\n![Lampiran](${commentImg})`;
    }

    const isMentioningSatpam = /@satpam\b/i.test(finalBody);
    const isReplyingToSatpam = Boolean(
      parentId && (
        replyTarget?.author.username === "satpam-horizon" ||
        replyTarget?.author.username === "Satpam Horizon"
      )
    );
    const willTriggerSatpam = isMentioningSatpam || isReplyingToSatpam;

    // 0ms Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: CommentRecord = {
      id: tempId,
      postId: id,
      authorId: user.id,
      parentId,
      content: finalBody,
      createdAt: new Date().toISOString(),
      author: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        isPremium: Boolean(user.isPremium),
        role: user.role,
      },
    };

    if (thread) {
      setThread({
        ...thread,
        comments: [...thread.comments, optimisticComment],
      });
    }

    // Reset compose states immediately
    setComment("");
    setCommentImg("");
    setReplyText("");
    setReplyTo(null);
    setReplyTarget(null);
    setError("");

    if (willTriggerSatpam) {
      setIsSatpamTyping(true);
    }

    setSending(true);
    try {
      const response = await fetch(`/api/posts/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: finalBody, parentId }),
      });
      const realComment = await readApiResponse<CommentRecord>(response, "Komentar gagal dikirim.");

      // Replace optimistic comment with real server comment
      setThread((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: prev.comments.map((c) => (c.id === tempId ? realComment : c)),
        };
      });

      // Poll for Satpam AI response if triggered
      if (willTriggerSatpam) {
        setTimeout(() => void syncThreadData(true), 2500);
        setTimeout(() => void syncThreadData(true), 5000);
        setTimeout(() => void syncThreadData(true), 8000);
        // Safety timeout to turn off typing indicator after 20 seconds
        setTimeout(() => setIsSatpamTyping(false), 20000);
      }
    } catch (reason) {
      // Revert optimistic update on failure
      setThread((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: prev.comments.filter((c) => c.id !== tempId),
        };
      });
      setError(reason instanceof Error ? reason.message : "Komentar gagal dikirim.");
      setIsSatpamTyping(false);
    } finally {
      setSending(false);
    }
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

  // Render a single comment card (used for both Root and Replies)
  const renderCommentCard = (item: CommentRecord, isReply = false) => {
    const isSatpamBot = item.author.username === "satpam-horizon" || item.author.username === "Satpam Horizon";
    const isCommentAuthor = Boolean(user && (item.author.id === user.id || item.authorId === user.id || item.author.username === user.username));
    const isStaff = user?.role === "ADMIN" || user?.role === "MODERATOR" || user?.username === ".odyssia";
    const canDeleteComment = !user?.isBanned && (isCommentAuthor || isStaff);

    // Identify who this reply is addressing
    const targetParent = item.parentId ? commentMap.get(item.parentId) : null;
    const replyTargetUsername = targetParent?.author?.username ?? "gamer";

    return (
      <article
        key={item.id}
        className={`p-3.5 sm:p-4 rounded-lg my-2 transition-all w-full ${
          isSatpamBot
            ? "bg-[#7C3AED]/10 border-l-4 border-l-[#7C3AED] border border-slate-200 dark:border-[#2E1E45]"
            : isReply
            ? "border border-slate-200 dark:border-[#2E1E45]/80 bg-slate-50/80 dark:bg-[#160B29] shadow-sm"
            : "border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-sm"
        }`}
      >
        {/* Reply Indicator (↪ Membalas @username) */}
        {isReply && (
          <div className="text-[11px] font-mono text-[#7C3AED] dark:text-[#A78BFA] mb-1.5 flex items-center gap-1.5 select-none">
            <span>↪ Membalas</span>
            <Link
              href={`/u/${replyTargetUsername}`}
              className="font-semibold text-slate-800 dark:text-[#C4B5FD] hover:underline"
            >
              @{replyTargetUsername}
            </Link>
          </div>
        )}

        <div className="flex items-start gap-3">
          <DiscordAvatar className="comment-avatar shrink-0 mt-0.5" src={item.author.avatar} username={item.author.username} size={28} frameId={item.author.equippedAvatarFrame} />
          <div className="comment-content min-w-0 flex-1">
            {/* Header: Author + Badges + Timestamp */}
            <div className="comment-meta flex flex-wrap items-center gap-1.5">
              <strong className={isSatpamBot ? "font-bold text-[#7C3AED] dark:text-[#A78BFA]" : (item.author.isPremium || item.author.username === ".odyssia") ? "premium-username" : "text-slate-900 dark:text-[#F8FAFC] font-bold text-xs"}>
                {isSatpamBot ? "Satpam Horizon" : (item.author.username ?? "Gamer")}
              </strong>
              {item.author.partyMembership?.party?.tag && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-purple-500/20 text-purple-300 border border-purple-500/40 whitespace-nowrap">[{item.author.partyMembership.party.tag.trim()}]</span>
              )}
              {item.author.equippedCustomTitle && getCustomTitleBadge(item.author.equippedCustomTitle) && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 whitespace-nowrap">
                  {getCustomTitleBadge(item.author.equippedCustomTitle)}
                </span>
              )}
              {isSatpamBot ? (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#7C3AED] text-white shadow-sm flex items-center gap-1 whitespace-nowrap">
                  🛡️ SATPAM AI • BOT GUILD
                </span>
              ) : (item.author.username?.toLowerCase() === ".odyssia" || item.author.username?.toLowerCase() === "odyssia") ? (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 whitespace-nowrap">👑 Emperor</span>
              ) : item.author.role === "ADMIN" ? (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/30 whitespace-nowrap">✨ Prince</span>
              ) : item.author.role === "MODERATOR" ? (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 whitespace-nowrap">⚔️ Mod</span>
              ) : null}
              {getActiveTempTitle(item.author) && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap">
                  {getActiveTempTitle(item.author)}
                </span>
              )}
              {(item.tipsTotal ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                  <Coins size={11} className="text-amber-500 shrink-0" />
                  <span>+{item.tipsTotal} HC</span>
                </span>
              )}
              <span className="text-slate-400 dark:text-[#A78BFA]/40 text-[10px]">•</span>
              <time className="text-[11px] font-mono text-slate-500 dark:text-[#A78BFA]/70 whitespace-nowrap">{new Date(item.createdAt).toLocaleString("id-ID")}</time>
            </div>

            {/* Comment Body */}
            <div className="break-words mt-2 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-[#F8FAFC]/90 font-sans">
              <FormattedPostContent text={item.content} onImageClick={setLightboxImg} />
            </div>

            {/* Action Bar */}
            {!user?.isBanned && (
              <div className="mt-2.5 flex items-center gap-3 whitespace-nowrap">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#7C3AED] dark:text-[#A78BFA] hover:text-[#6D28D9] dark:hover:text-[#F8FAFC] uppercase tracking-wider transition-colors cursor-pointer"
                  onClick={() => handleStartReply(item)}
                >
                  <MessageCircle size={13} /> {isSatpamBot ? "Balas Satpam AI" : "Balas"}
                </button>
                {canDeleteComment && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-500 hover:text-rose-400 transition-colors cursor-pointer"
                    onClick={() => void deleteComment(item.id)}
                    title="Hapus komentar"
                  >
                    <Trash2 size={12} /> Hapus
                  </button>
                )}
              </div>
            )}

            {/* Inline Quick-Reply Box (Tepat di bawah komentar) */}
            {replyTo === item.id && (
              <div className="mt-3 p-3 rounded-lg border border-[#7C3AED]/50 bg-slate-50 dark:bg-[#1A0E2E] shadow-md animate-in fade-in duration-200">
                {/* Discord-Style Context Quote Bar */}
                <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-white dark:bg-[#11091D] border-l-2 border-[#7C3AED] text-xs font-mono text-[#7C3AED] dark:text-[#A78BFA] mb-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-400 dark:text-[#A78BFA]/70">Membalas</span>
                    <strong className="text-slate-900 dark:text-white font-semibold">
                      @{isSatpamBot ? "satpam" : (item.author.username ?? "gamer")}
                    </strong>
                    <span className="text-slate-500 dark:text-[#A78BFA]/60 truncate">
                      &ldquo;{item.content.replace(/!\[.*?\]\([^)]+\)/g, "").slice(0, 60)}...&rdquo;
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTo(null);
                      setReplyTarget(null);
                      setReplyText("");
                    }}
                    className="text-slate-400 hover:text-rose-400 p-0.5 shrink-0"
                    title="Batal balas"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Inline Mention/Hashtag Input */}
                <MentionHashtagInput
                  autoFocus
                  rows={2}
                  maxLength={5000}
                  value={replyText}
                  onChange={setReplyText}
                  onSubmit={() => void sendComment(item.id, replyText)}
                  relevantUsers={relevantUsers}
                  placeholder={
                    isSatpamBot
                      ? "Tanya atau balas Satpam Horizon... (Ctrl+Enter untuk kirim)"
                      : `Balas @${item.author.username ?? "gamer"}... (Ctrl+Enter untuk kirim)`
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-[#2E1E45] bg-white dark:bg-[#130921] text-slate-900 dark:text-[#F8FAFC] font-sans text-xs focus:outline-none focus:border-[#7C3AED]"
                />

                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-slate-400 dark:text-[#A78BFA]/60">
                    Shortcut: <strong>Ctrl + Enter</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyTo(null);
                        setReplyTarget(null);
                        setReplyText("");
                      }}
                      className="px-2.5 py-1 text-xs font-mono text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendComment(item.id, replyText)}
                      disabled={sending || !replyText.trim()}
                      className="px-3.5 py-1.5 rounded font-mono text-xs font-bold uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-white border border-[#7C3AED] shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send size={12} /> Kirim Balasan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <main className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-12 overflow-x-hidden">
      <div className="page-shell px-0 sm:px-0 thread-layout">
        <div>
          <Link className="back-link inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#7C3AED] dark:text-[#A78BFA] hover:text-[#6D28D9] dark:hover:text-[#F8FAFC] mb-4 uppercase tracking-wider" href="/forum">
            <ArrowLeft size={16} /> KEMBALI KE FORUM
          </Link>
          <article className="thread-card p-5 sm:p-7 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
            {thread.isPinned && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider mb-2">
                <Pin size={12} className="text-[#7C3AED]" /> PINNED THREAD
              </span>
            )}
            <p className="section-kicker font-mono text-xs font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider">
              {thread.category.toLowerCase().replaceAll("_", " ")}
            </p>
            <h1 className="page-title font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-[#F8FAFC] uppercase tracking-tight break-words mt-2 leading-tight">
              {thread.title}
            </h1>
            <div className="thread-meta flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#7C3AED] dark:text-[#A78BFA] font-mono my-3 pt-2 border-t border-slate-200 dark:border-[#2E1E45]">
              <span className="post-author flex items-center gap-1.5 flex-wrap">
                <DiscordAvatar src={thread.author.avatar} username={thread.author.username} size={20} frameId={thread.author.equippedAvatarFrame} />
                <span>oleh <Link href={`/u/${thread.author.username ?? "user"}`} className={`hover:underline ${(thread.author.isPremium || thread.author.username === ".odyssia") ? "premium-username" : "font-semibold text-slate-900 dark:text-[#F8FAFC]"}`}>{thread.author.username ?? "Gamer"}</Link>
                  {thread.author.partyMembership?.party?.tag && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-purple-500/20 text-purple-300 border border-purple-500/40 ml-1.5">[{thread.author.partyMembership.party.tag.trim()}]</span>
                  )}
                  {thread.author.equippedCustomTitle && getCustomTitleBadge(thread.author.equippedCustomTitle) && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 ml-1.5">
                      {getCustomTitleBadge(thread.author.equippedCustomTitle)}
                    </span>
                  )}
                  {(thread.author.username?.toLowerCase() === ".odyssia" || thread.author.username?.toLowerCase() === "odyssia") ? (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 ml-1.5">👑 Emperor</span>
                  ) : thread.author.role === "ADMIN" ? (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/30 ml-1.5">✨ Prince / Princess</span>
                  ) : thread.author.role === "MODERATOR" ? (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/30 ml-1.5">⚔️ Lord Commander</span>
                  ) : null}
                  {getActiveTempTitle(thread.author) && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-amber-500/15 text-amber-500 dark:text-amber-300 border border-amber-500/30 ml-1.5 whitespace-nowrap">
                      {getActiveTempTitle(thread.author)}
                    </span>
                  )}
                </span>
              </span>
              <span>•</span>
              <span>{new Date(thread.createdAt).toLocaleString("id-ID")}</span>
              {(thread.tipsTotal ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 ml-1.5 shrink-0">
                  <Coins size={11} className="text-amber-500 shrink-0" />
                  <span>+{thread.tipsTotal} HC Apresiasi</span>
                </span>
              )}
            </div>

            {/* Polling Voting Interaktif jika tersedia */}
            {thread.poll && (
              <ForumPollWidget
                postId={thread.id}
                initialPoll={thread.poll}
                onVoted={(p) => setThread((prev) => (prev ? { ...prev, poll: p } : null))}
              />
            )}

            <div className="thread-body break-words leading-relaxed text-sm sm:text-base my-5 text-slate-800 dark:text-[#F8FAFC]/90 font-sans">
              <FormattedPostContent text={thread.content} onImageClick={setLightboxImg} />
            </div>
            <div className="thread-actions flex items-center justify-between gap-3 pt-3.5 border-t border-slate-200 dark:border-[#2E1E45]">
              <PostReactions
                postId={thread.id}
                likes={thread.likes}
                dislikes={thread.dislikes}
                reaction={thread.votes?.[0]?.value ?? null}
                onLoginRequired={() => setLoginAction("memberi reaksi")}
              />

              <div className="flex items-center gap-2 sm:gap-2.5">
                <ShareButton
                  url={`/forum/${thread.id}`}
                  title={thread.title}
                  text={`Baca dan diskusikan di Forum LogHorizon: ${thread.title}`}
                  label="Bagikan Diskusi"
                  variant="outline"
                  className="h-8 px-2.5 text-xs rounded-md border border-slate-200 dark:border-[#2A1B42]"
                />
                <StaffCardModerationMenu
                  label=""
                  title="Opsi Diskusi"
                  openDirection="down"
                  actions={[
                    {
                      label: "Laporkan Diskusi",
                      icon: <Flag size={13} />,
                      danger: true,
                      onClick: reportPost,
                    },
                    ...(user && (user.role === "ADMIN" || user.role === "MODERATOR")
                      ? [
                          {
                            label: thread.isPinned ? "Lepas Sematan (Unpin)" : "Sematkan Thread (Pin)",
                            icon: <Pin size={13} />,
                            onClick: () => void togglePin(),
                          },
                        ]
                      : []),
                    ...(user && (user.role === "ADMIN" || user.role === "MODERATOR" || user.username === ".odyssia" || user.id === thread.author?.id || user.id === thread.authorId || user.username === thread.author?.username)
                      ? [
                          {
                            label: "Hapus Diskusi Thread",
                            icon: <Trash2 size={13} />,
                            danger: true,
                            onClick: () => void deleteThread(),
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            </div>
          </article>

          {error && (
            <div className="p-3 text-xs font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-500/30 rounded-none mt-3" role="status">
              {error}
              <button className="ml-2" onClick={() => setError("")} aria-label="Tutup"><X size={15} /></button>
            </div>
          )}

          {/* Discussion / Comments Section */}
          <section className="comments-section mt-8">
            <div className="section-heading flex items-center justify-between gap-3 mb-4 border-b border-slate-200 dark:border-[#2E1E45] pb-3">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-[#F8FAFC]">Diskusi</h2>
              <span className="text-xs font-mono text-[#7C3AED] dark:text-[#A78BFA]">{thread.comments.length} KOMENTAR</span>
            </div>

            {/* Root Comment Composer */}
            {user && !user.isBanned ? (
              <form
                className="comment-compose space-y-3 p-4 rounded-lg border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendComment(null, comment);
                }}
              >
                <MentionHashtagInput
                  rows={3}
                  maxLength={5000}
                  value={comment}
                  onChange={setComment}
                  onSubmit={() => void sendComment(null, comment)}
                  relevantUsers={relevantUsers}
                  placeholder="Bagikan pendapatmu... (Ctrl+Enter untuk kirim langsung)"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] text-slate-900 dark:text-[#F8FAFC] font-sans text-sm focus:outline-none focus:border-[#7C3AED]"
                />

                <p className="text-[11px] font-mono text-slate-500 dark:text-[#A78BFA] flex items-center gap-1.5 select-none">
                  <span>💡</span>
                  <span>Tips: Ketik <strong className="text-white bg-[#7C3AED] px-1.5 py-0.5 rounded">@satpam</strong> untuk berdiskusi dengan AI. Tekan <strong>Ctrl + Enter</strong> untuk kirim.</span>
                </p>

                <ImageUploader
                  value={commentImg}
                  onChange={setCommentImg}
                  label="Lampiran Gambar (Opsional)"
                  description="Pilih foto langsung dari galeri HP atau PC. Otomatis dikompresi."
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs font-mono text-slate-400 dark:text-[#A78BFA]/60 hidden sm:inline">
                    {comment.length} / 5000 karakter
                  </span>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-white border border-[#7C3AED] flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                    disabled={sending || !comment.trim()}
                  >
                    <Send size={15} /> Kirim komentar
                  </button>
                </div>
              </form>
            ) : user?.isBanned ? (
              <p className="p-3 text-xs font-mono text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-500/30 rounded-lg">
                Akun kamu sedang dibatasi dan tidak dapat berkomentar.
              </p>
            ) : (
              <button
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-[#1A0E2E] text-[#7C3AED] dark:text-[#A78BFA] border border-slate-300 dark:border-[#2E1E45] hover:border-[#7C3AED]"
                onClick={() => setLoginAction("berkomentar")}
              >
                Login untuk ikut berdiskusi
              </button>
            )}

            {/* Satpam Horizon Typing Indicator */}
            {isSatpamTyping && (
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/40 text-xs font-mono text-[#7C3AED] dark:text-[#C4B5FD] my-4 shadow-sm animate-pulse">
                <span className="text-base">🛡️</span>
                <span className="font-bold text-slate-900 dark:text-white">Satpam Horizon</span>
                <span>sedang meracik balasan...</span>
                <span className="inline-flex gap-1 ml-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce"></span>
                </span>
              </div>
            )}

            {/* Comments List (1-Level Flat Threading Layout) */}
            <div className="comments-list space-y-4 mt-6">
              {rootComments.map((root) => {
                const descendantReplies = repliesByRootId.get(root.id) ?? [];

                return (
                  <div key={root.id} className="root-thread-group">
                    {/* Level 0: Root Comment (Full Width) */}
                    {renderCommentCard(root, false)}

                    {/* Level 1: Flat Descendant Replies (Strictly 1 Indentation Level) */}
                    {descendantReplies.length > 0 && (
                      <div className="ml-4 sm:ml-6 pl-3 sm:pl-4 border-l-2 border-[#7C3AED]/40 mt-2 space-y-2.5">
                        {descendantReplies.map((reply) => renderCommentCard(reply, true))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!thread.comments.length && (
              <div className="p-8 text-center font-mono text-xs text-slate-500 dark:text-[#A78BFA] rounded-lg border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] mt-4">
                Belum ada komentar. Jadilah yang pertama membalas.
              </div>
            )}
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
