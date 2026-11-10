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
};

export function PostReactions({ postId, likes, dislikes, reaction, onLoginRequired, onChange }: Props) {
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
      setError(reason instanceof Error ? reason.message : "Reaksi gagal disimpan.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="post-reactions" aria-label="Reaksi postingan">
      <button
        type="button"
        className={`reaction-button like-button${counts.reaction === "LIKE" ? " active" : ""}`}
        aria-label={`Suka, ${counts.likes}`}
        aria-pressed={counts.reaction === "LIKE"}
        disabled={pending}
        onClick={() => void react("LIKE")}
      >
        <ThumbsUp size={20} strokeWidth={2.25} />
        <span>{counts.likes.toLocaleString("id-ID")}</span>
      </button>
      <button
        type="button"
        className={`reaction-button dislike-button${counts.reaction === "DISLIKE" ? " active" : ""}`}
        aria-label={`Tidak suka, ${counts.dislikes}`}
        aria-pressed={counts.reaction === "DISLIKE"}
        disabled={pending}
        onClick={() => void react("DISLIKE")}
      >
        <ThumbsDown size={20} strokeWidth={2.25} />
        <span>{counts.dislikes.toLocaleString("id-ID")}</span>
      </button>
      {error && <span className="reaction-error" role="status">{error}</span>}
    </div>
  );
}
