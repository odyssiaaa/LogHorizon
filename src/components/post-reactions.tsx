"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useSession } from "next-auth/react";
import { readApiResponse } from "@/lib/api-response";

export type PostReaction = "LIKE" | "DISLIKE" | null;

type Props = {
  postId: string;
  likes: number;
  dislikes: number;
  reaction: PostReaction;
  onLoginRequired: () => void;
  onChange?: (result: { likes: number; dislikes: number; reaction: PostReaction }) => void;
  className?: string;
};

export function PostReactions({ postId, likes, dislikes, reaction, onLoginRequired, onChange, className }: Props) {
  const { data: session } = useSession();
  const [counts, setCounts] = useState({ likes, dislikes, reaction });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function react(value: Exclude<PostReaction, null>) {
    if (!session?.user) {
      onLoginRequired();
      return;
    }
    if (session.user.isBanned) {
      setError("Akun yang sedang dibatasi tidak dapat memberi reaksi.");
      return;
    }
    if (pending) return;

    // Snapshot state sebelumnya untuk rollback jika request gagal
    const prevCounts = { ...counts };

    // Hitung optimistic UI secara lokal dalam 0ms
    let nextLikes = counts.likes;
    let nextDislikes = counts.dislikes;
    let nextReaction: PostReaction = value;

    if (counts.reaction === value) {
      // Toggle off
      nextReaction = null;
      if (value === "LIKE") nextLikes = Math.max(0, nextLikes - 1);
      if (value === "DISLIKE") nextDislikes = Math.max(0, nextDislikes - 1);
    } else {
      // Switch or new reaction
      if (value === "LIKE") {
        nextLikes += 1;
        if (counts.reaction === "DISLIKE") nextDislikes = Math.max(0, nextDislikes - 1);
      } else {
        nextDislikes += 1;
        if (counts.reaction === "LIKE") nextLikes = Math.max(0, nextLikes - 1);
      }
    }

    const optimisticResult = { likes: nextLikes, dislikes: nextDislikes, reaction: nextReaction };

    // Langsung update layar 0ms
    setCounts(optimisticResult);
    onChange?.(optimisticResult);
    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const result = await readApiResponse<{ likes: number; dislikes: number; reaction: PostReaction }>(response, "Reaksi gagal disimpan.");
      setCounts(result);
      onChange?.(result);
    } catch (reason) {
      // Rollback ke state sebelumnya jika terjadi kegagalan jaringan
      setCounts(prevCounts);
      onChange?.(prevCounts);
      setError(reason instanceof Error ? reason.message : "Reaksi gagal disimpan.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`post-reactions inline-flex items-center gap-1.5 ${className ?? ""}`} aria-label="Reaksi postingan">
      <button
        type="button"
        className={`reaction-button like-button h-8 px-2.5 rounded-md border border-slate-200 dark:border-[#2A1B42] text-xs inline-flex items-center gap-1.5 transition-all font-mono font-bold cursor-pointer ${
          counts.reaction === "LIKE"
            ? "active bg-purple-500/15 text-[#7C3AED] dark:text-[#A78BFA] border-[#7C3AED]/50"
            : "bg-slate-50 dark:bg-[#1A0E2E]/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-[#7C3AED]/40"
        }`}
        aria-label={`Suka, ${counts.likes}`}
        aria-pressed={counts.reaction === "LIKE"}
        disabled={pending}
        onClick={() => void react("LIKE")}
      >
        <ThumbsUp size={14} strokeWidth={2} />
        <span className="tabular-nums font-mono text-xs">{counts.likes.toLocaleString("id-ID")}</span>
      </button>
      <button
        type="button"
        className={`reaction-button dislike-button h-8 px-2.5 rounded-md border border-slate-200 dark:border-[#2A1B42] text-xs inline-flex items-center gap-1.5 transition-all font-mono font-bold cursor-pointer ${
          counts.reaction === "DISLIKE"
            ? "active bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/50"
            : "bg-slate-50 dark:bg-[#1A0E2E]/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-rose-500/40"
        }`}
        aria-label={`Tidak suka, ${counts.dislikes}`}
        aria-pressed={counts.reaction === "DISLIKE"}
        disabled={pending}
        onClick={() => void react("DISLIKE")}
      >
        <ThumbsDown size={14} strokeWidth={2} />
        <span className="tabular-nums font-mono text-xs">{counts.dislikes.toLocaleString("id-ID")}</span>
      </button>
      {error && <span className="text-[11px] text-rose-500 font-mono ml-1" role="status">{error}</span>}
    </div>
  );
}
