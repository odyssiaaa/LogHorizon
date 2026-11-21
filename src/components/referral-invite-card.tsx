"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Copy, Check, Users, Award, Sparkles, Loader2, Share2 } from "lucide-react";
import { DiscordAvatar } from "@/components/discord-avatar";

interface ReferralData {
  isLoggedIn: boolean;
  referralCode: string;
  referralLink: string;
  invitedCount: number;
  totalXpEarned: number;
  hasGuildRecruiterBadge: boolean;
  referredBy: string | null;
  referredFriends: Array<{
    id: string;
    username: string;
    avatar: string | null;
    level: number;
    joinedAt: string;
  }>;
}

export function ReferralInviteCard() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      setLoading(false);
      return;
    }

    fetch("/api/user/referral")
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (resData) setData(resData);
      })
      .catch((err) => console.error("Referral fetch error:", err))
      .finally(() => setLoading(false));
  }, [session, status]);

  const handleCopy = async () => {
    if (!data?.referralLink) return;
    try {
      await navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = data.referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="p-5 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] flex items-center justify-center gap-2 text-slate-400 text-xs py-8">
        <Loader2 size={16} className="animate-spin text-[#7C3AED]" />
        <span>Memuat Tautan Undangan Teman...</span>
      </div>
    );
  }

  const invitedCount = data?.invitedCount ?? 0;
  const targetRecruiter = 3;
  const recruiterPercent = Math.min(100, Math.round((invitedCount / targetRecruiter) * 100));

  return (
    <div className="p-4 sm:p-5 rounded-xl border-2 border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] shadow-sm space-y-4">
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#1F1433] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-500 dark:text-emerald-300 flex items-center justify-center text-lg shrink-0">
            🤝
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Undang Teman &amp; Dapatkan +200 XP
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Referral Program
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Ajak sesama gamer bergabung ke guild LogHorizon dan raih keuntungan bersama!
            </p>
          </div>
        </div>

        {/* Badge Recruiter Status */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#170E28] border border-slate-200 dark:border-[#281840] shrink-0">
          <Award size={15} className={data?.hasGuildRecruiterBadge ? "text-amber-400" : "text-slate-400"} />
          <div className="text-left">
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 leading-none">
              Lencana Khusus:
            </div>
            <div className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200 leading-tight">
              🎖️ Guild Recruiter {data?.hasGuildRecruiterBadge ? "✅" : `(${invitedCount}/3)`}
            </div>
          </div>
        </div>
      </div>

      {/* Rewards Explanatory Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#150D24] border border-slate-200 dark:border-[#221538] flex items-center gap-2.5">
          <span className="text-xl">🎁</span>
          <div>
            <div className="font-bold text-slate-900 dark:text-white">Teman Baru Dapat +100 XP</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Bonus sambutan otomatis setelah login perdana via tautanmu.
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#150D24] border border-slate-200 dark:border-[#221538] flex items-center gap-2.5">
          <span className="text-xl">👑</span>
          <div>
            <div className="font-bold text-slate-900 dark:text-white">Kamu Dapat +200 XP</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Langsung masuk ke profilmu untuk setiap teman yang bergabung!
            </div>
          </div>
        </div>
      </div>

      {/* 1-Click Copy Link Box */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Share2 size={13} className="text-[#7C3AED]" />
          <span>Tautan Undangan Resmi Milikmu:</span>
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#0E061A] border border-slate-300 dark:border-[#2A1B42] text-xs font-mono text-slate-800 dark:text-slate-200 truncate select-all">
            {data?.referralLink || "Memuat tautan..."}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              copied
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                : "bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-md shadow-[#7C3AED]/25 hover:scale-102 active:scale-98"
            }`}
          >
            {copied ? (
              <>
                <Check size={14} />
                <span>Tersalin! ✅</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Salin Tautan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Recruiter Progress Bar */}
      <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#170E28] border border-slate-200 dark:border-[#26173D] space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Progres Lencana &quot;🎖️ Guild Recruiter&quot;
          </span>
          <span className="font-mono font-bold text-[#7C3AED] dark:text-[#A78BFA]">
            {invitedCount}/3 Teman
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-[#2A1B42] overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              data?.hasGuildRecruiterBadge ? "bg-emerald-500" : "bg-[#7C3AED]"
            }`}
            style={{ width: `${recruiterPercent}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
          {data?.hasGuildRecruiterBadge
            ? "🎉 Selamat! Kamu telah mengantongi Lencana Guild Recruiter resmi."
            : `Ajak ${Math.max(0, 3 - invitedCount)} teman lagi untuk membuka lencana eksklusif ini!`}
        </p>
      </div>

      {/* List of Referred Friends */}
      {data?.referredFriends && data.referredFriends.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#1F1433]">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Users size={13} className="text-[#7C3AED]" />
              <span>Teman yang Kamu Ajak ({data.referredFriends.length})</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-500 font-bold">
              +{data.totalXpEarned} XP Didapatkan
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {data.referredFriends.map((friend) => (
              <div
                key={friend.id}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#140C22] border border-slate-200 dark:border-[#24163A] flex items-center gap-2"
              >
                <div className="relative w-7 h-7 rounded-full overflow-hidden bg-[#7C3AED]/20 shrink-0">
                  <DiscordAvatar
                    src={friend.avatar}
                    username={friend.username}
                    size={28}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {friend.username}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Level {friend.level}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
