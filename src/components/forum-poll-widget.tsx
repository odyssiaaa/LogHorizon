"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { CheckCircle2, BarChart2, Lock } from "lucide-react";
import { readApiResponse } from "@/lib/api-response";

export type PollOptionData = {
  id: string;
  text: string;
  order: number;
  votesCount: number;
  percentage: number;
};

export type PollData = {
  id: string;
  question: string;
  totalVotes: number;
  userVotedOptionId: string | null;
  options: PollOptionData[];
};

export function ForumPollWidget({
  postId,
  initialPoll,
  onVoted,
}: {
  postId: string;
  initialPoll: PollData;
  onVoted?: (updatedPoll: PollData) => void;
}) {
  const { data: session } = useSession();
  const [poll, setPoll] = useState<PollData>(initialPoll);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState("");

  const hasVoted = Boolean(poll.userVotedOptionId);

  async function handleVote(optionId: string) {
    if (!session?.user) {
      setError("Silakan login dengan Discord untuk memberikan suara.");
      return;
    }
    if (hasVoted || voting) return;

    setVoting(true);
    setError("");

    // Optimistic update
    const previous = { ...poll };
    const updatedOptions = poll.options.map((opt) => {
      const isSelected = opt.id === optionId;
      const newVotes = opt.votesCount + (isSelected ? 1 : 0);
      return {
        ...opt,
        votesCount: newVotes,
      };
    });
    const newTotal = poll.totalVotes + 1;
    const computedOptions = updatedOptions.map((opt) => ({
      ...opt,
      percentage: newTotal > 0 ? Math.round((opt.votesCount / newTotal) * 100) : 0,
    }));

    setPoll({
      ...poll,
      totalVotes: newTotal,
      userVotedOptionId: optionId,
      options: computedOptions,
    });

    try {
      const res = await fetch(`/api/posts/${postId}/poll/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });
      const data = await readApiResponse<{ poll: PollData }>(res, "Gagal mencatat suara.");
      setPoll(data.poll);
      onVoted?.(data.poll);
    } catch (err) {
      setPoll(previous);
      setError(err instanceof Error ? err.message : "Gagal memberikan suara.");
    } finally {
      setVoting(false);
    }
  }

  return (
    <div className="mb-6 p-4 sm:p-5 rounded-none border border-purple-500/30 bg-[#120822] shadow-xl relative overflow-hidden">
      {/* Accent corner tag */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-none bg-purple-500/20 text-[#A78BFA] flex items-center justify-center shrink-0">
            <BarChart2 size={16} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400">
              POLLING DISKUSI FORUM
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
              {poll.question}
            </h3>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-purple-950/60 border border-purple-800/40 text-[11px] font-mono text-purple-300">
            {hasVoted ? (
              <>
                <Lock size={10} className="text-emerald-400" />
                <span>Suara Terkunci</span>
              </>
            ) : (
              <span>1 Suara / User</span>
            )}
          </span>
          <p className="text-[10px] font-mono text-gray-400 mt-0.5">
            Total {poll.totalVotes} suara
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-3 p-2 text-xs font-mono text-red-400 bg-red-950/30 border border-red-500/30">
          {error}
        </p>
      )}

      {/* Options List */}
      <div className="space-y-2.5">
        {poll.options.map((opt) => {
          const isUserChoice = poll.userVotedOptionId === opt.id;

          return (
            <div
              key={opt.id}
              onClick={() => !hasVoted && handleVote(opt.id)}
              className={`relative overflow-hidden p-3 rounded-none border transition-all ${
                hasVoted
                  ? isUserChoice
                    ? "border-emerald-500/60 bg-emerald-950/20"
                    : "border-[#2A1B42] bg-[#1A0E2E]/60 cursor-default"
                  : "border-[#2A1B42] hover:border-purple-500 bg-[#1A0E2E] hover:bg-[#23133D] cursor-pointer"
              }`}
            >
              {/* Progress Bar Fill */}
              {hasVoted && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-700 pointer-events-none ${
                    isUserChoice ? "bg-emerald-500/20" : "bg-purple-600/15"
                  }`}
                  style={{ width: `${opt.percentage}%` }}
                />
              )}

              <div className="relative z-10 flex items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-4 h-4 rounded-none border flex items-center justify-center shrink-0 ${
                      isUserChoice
                        ? "border-emerald-400 bg-emerald-500 text-white"
                        : "border-purple-400/50"
                    }`}
                  >
                    {isUserChoice && <CheckCircle2 size={12} className="stroke-[3]" />}
                  </div>
                  <span
                    className={`font-medium break-words ${
                      isUserChoice ? "text-emerald-300 font-bold" : "text-gray-200"
                    }`}
                  >
                    {opt.text}
                  </span>
                </div>

                <div className="shrink-0 flex items-center gap-2 font-mono text-xs">
                  {hasVoted && (
                    <>
                      <span className="text-gray-400">{opt.votesCount} suara</span>
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded-none ${
                          isUserChoice
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-purple-500/10 text-purple-300"
                        }`}
                      >
                        {opt.percentage}%
                      </span>
                    </>
                  )}
                  {!hasVoted && (
                    <button
                      type="button"
                      disabled={voting}
                      className="px-3 py-1 rounded-none text-xs font-bold uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                    >
                      Pilih
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
