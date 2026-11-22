"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Sparkles, CheckCircle2, ArrowRight, Award, Loader2, Clock } from "lucide-react";

export interface QuestItem {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardXp: number;
  icon: string;
  actionUrl: string;
  actionLabel: string;
  current: number;
  isCompleted: boolean;
  isClaimed: boolean;
  canClaim: boolean;
}

interface QuestsResponse {
  isLoggedIn: boolean;
  dateKey: string;
  secondsUntilReset: number;
  quests: QuestItem[];
  summary: {
    totalQuests: number;
    totalCompleted: number;
    totalClaimed: number;
    allDone: boolean;
  };
}

interface DailyQuestsWidgetProps {
  isCompact?: boolean;
}

export function DailyQuestsWidget({ isCompact = false }: DailyQuestsWidgetProps) {
  const { data: session, status } = useSession();
  const [data, setData] = useState<QuestsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const fetchQuests = () => {
    if (status === "loading") return;
    if (!session?.user) {
      setLoading(false);
      return;
    }

    fetch("/api/user/quests")
      .then((res) => (res.ok ? res.json() : null))
      .then((resData: QuestsResponse | null) => {
        if (resData) setData(resData);
      })
      .catch((err) => console.error("Failed to load quests:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQuests();
  }, [session, status]);

  const handleClaim = async (questId: string) => {
    if (claimingId) return;
    setClaimingId(questId);
    setClaimMessage(null);

    // Optimistic UI update
    startTransition(() => {
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          quests: prev.quests.map((q) =>
            q.id === questId ? { ...q, isClaimed: true, canClaim: false } : q
          ),
          summary: {
            ...prev.summary,
            totalClaimed: prev.summary.totalClaimed + 1,
            allDone: prev.summary.totalClaimed + 1 === prev.summary.totalQuests,
          },
        };
      });
    });

    try {
      const res = await fetch("/api/user/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Gagal mengklaim misi.");
      }

      setClaimMessage(result.message || "Hadiah berhasil diklaim!");
      // Refetch for fresh state
      setTimeout(() => {
        fetchQuests();
      }, 500);
    } catch (err: unknown) {
      console.error("Claim error:", err);
      // Rollback
      fetchQuests();
      setClaimMessage(err instanceof Error ? err.message : "Gagal mengklaim misi.");
    } finally {
      setClaimingId(null);
    }
  };

  if (status === "unauthenticated" || (!session?.user && status !== "loading")) {
    return null;
  }

  if (status === "loading" || loading) {
    if (!session?.user) return null;
    return (
      <div className="p-5 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] flex items-center justify-center gap-2 text-slate-400 text-xs py-8">
        <Loader2 size={16} className="animate-spin text-[#7C3AED]" />
        <span>Memuat Misi Petualang Harian...</span>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const quests = data?.quests ?? [];
  const summary = data?.summary;

  return (
    <div className="p-4 sm:p-5 rounded-xl border-2 border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-[#1F1433] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#A78BFA] flex items-center justify-center font-bold text-sm shrink-0">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Misi Petualang Harian
              </h3>
              {summary && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/30">
                  {summary.totalClaimed}/{summary.totalQuests} Selesai
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Reset setiap pukul 00:00 WIB • Total +155 XP Harian
            </p>
          </div>
        </div>

        {isCompact && (
          <Link
            href="/profile"
            className="text-xs font-semibold text-[#7C3AED] dark:text-[#A78BFA] hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Semua Misi</span>
            <ArrowRight size={12} />
          </Link>
        )}
      </div>

      {/* Claim Message feedback */}
      {claimMessage && (
        <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <Sparkles size={14} className="shrink-0 text-emerald-500" />
          <span>{claimMessage}</span>
        </div>
      )}

      {/* Quests List */}
      <div className="grid grid-cols-1 gap-2.5">
        {quests.map((q) => {
          const progressPercent = Math.min(100, Math.round((q.current / q.target) * 100));

          return (
            <div
              key={q.id}
              className={`p-3 rounded-lg border transition-all ${
                q.isClaimed
                  ? "bg-slate-50/70 dark:bg-[#150D24]/40 border-slate-200/60 dark:border-[#221538]/60 opacity-80"
                  : q.canClaim
                  ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/40 shadow-xs"
                  : "bg-slate-50 dark:bg-[#170E28] border-slate-200 dark:border-[#26173D]"
              } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
            >
              {/* Info */}
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-xl shrink-0 select-none mt-0.5">{q.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {q.title}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#C4B5FD]">
                      +{q.rewardXp} XP
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    {q.description}
                  </p>

                  {/* Progress Bar */}
                  <div className="mt-2 flex items-center gap-2 max-w-xs">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-[#2A1B42] overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          q.isClaimed
                            ? "bg-emerald-500"
                            : q.canClaim
                            ? "bg-amber-500 animate-pulse"
                            : "bg-[#7C3AED]"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 shrink-0">
                      {q.current}/{q.target}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="shrink-0 self-end sm:self-center">
                {q.isClaimed ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 size={13} />
                    <span>Selesai Diklaim</span>
                  </span>
                ) : q.canClaim ? (
                  <button
                    type="button"
                    disabled={claimingId === q.id}
                    onClick={() => handleClaim(q.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold font-mono bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {claimingId === q.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Sparkles size={13} />
                    )}
                    <span>Klaim +{q.rewardXp} XP</span>
                  </button>
                ) : (
                  <Link
                    href={q.actionUrl}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-white dark:bg-[#1F1433] border border-slate-300 dark:border-[#2A1B42] text-slate-700 dark:text-slate-200 hover:border-[#7C3AED] hover:text-[#7C3AED] dark:hover:text-[#A78BFA] transition shadow-2xs"
                  >
                    <span>{q.actionLabel}</span>
                    <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
