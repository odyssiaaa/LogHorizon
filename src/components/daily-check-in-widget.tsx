"use client";

import { useEffect, useState, useTransition } from "react";
import { useSession, signIn } from "next-auth/react";
import { Flame, Zap, CheckCircle2, Clock, Sparkles } from "lucide-react";

interface CheckInData {
  canCheckIn: boolean;
  alreadyCheckedIn: boolean;
  streak: number;
  lastCheckInAt: string | null;
  secondsUntilReset: number;
  level?: number;
  xp?: number;
}

export function DailyCheckInWidget() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<CheckInData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [countdown, setCountdown] = useState<number>(0);
  const [, startTransition] = useTransition();

  // Load check-in state
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    fetch("/api/user/checkin")
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (!isMounted || !resData) return;
        setData(resData);
        if (resData.secondsUntilReset) {
          setCountdown(resData.secondsUntilReset);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session, status]);

  // Countdown timer for next reset
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  async function handleClaim() {
    if (!session?.user || claiming || (data && !data.canCheckIn)) return;

    // Snapshot state sebelumnya untuk rollback jika request gagal
    const prevData = data;
    const currentStreak = data?.streak ?? 0;
    const currentXp = data?.xp ?? 0;

    // Optimistic UI 0ms: langsung ubah tombol menjadi klaim sukses
    startTransition(() => {
      setData({
        canCheckIn: false,
        alreadyCheckedIn: true,
        streak: currentStreak + 1,
        lastCheckInAt: new Date().toISOString(),
        secondsUntilReset: 86400,
        level: data?.level ?? 1,
        xp: currentXp + 15,
      });
      setCountdown(86400);
      setSuccessMessage("Absen berhasil! +15 XP diperoleh!");
    });

    setClaiming(true);

    try {
      const res = await fetch("/api/user/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Gagal absen harian.");
      }

      startTransition(() => {
        setData({
          canCheckIn: false,
          alreadyCheckedIn: true,
          streak: result.streak,
          lastCheckInAt: result.lastCheckInAt,
          secondsUntilReset: 86400,
          level: result.level,
          xp: result.xp,
        });
        setCountdown(86400);
        setSuccessMessage(result.message || "Absen berhasil! +15 XP diperoleh!");
      });
    } catch (err) {
      console.error("Checkin error:", err);
      // Rollback jika error
      startTransition(() => {
        setData(prevData);
        setSuccessMessage("");
      });
    } finally {
      setClaiming(false);
    }
  }

  function formatTimeRemaining(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}j ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}d`;
  }

  if (status === "loading" || loading) {
    return (
      <div className="w-full p-4 rounded-2xl border border-gray-200 dark:border-[#211C2B] bg-white/50 dark:bg-[#120F17]/50 animate-pulse flex items-center justify-between">
        <div className="h-5 bg-purple-500/20 rounded w-1/3"></div>
        <div className="h-8 bg-purple-500/20 rounded-xl w-32"></div>
      </div>
    );
  }

  // Not logged in
  if (!session?.user) {
    return (
      <div className="w-full p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-[#211C2B] bg-gradient-to-r from-purple-950/20 via-[#130F1A] to-[#161220] flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#9D4EDD]/15 border border-[#9D4EDD]/30 flex items-center justify-center text-[#9D4EDD] shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <span>⚡ Absen Harian Guild (+15 XP)</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Masuk untuk klaim bonus XP harian dan kumpulkan streak kehadiranmu!
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signIn("discord")}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#9D4EDD] text-white hover:bg-[#8338EC] transition shadow-xs whitespace-nowrap self-start sm:self-auto"
        >
          Masuk Discord
        </button>
      </div>
    );
  }

  const isClaimed = data?.alreadyCheckedIn || !data?.canCheckIn;
  const streak = data?.streak ?? 0;

  return (
    <div className="w-full p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-[#211C2B] bg-gradient-to-r from-purple-950/30 via-[#130F1A] to-[#181324] relative overflow-hidden mb-6 shadow-md transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
              isClaimed
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-gradient-to-br from-[#9D4EDD]/30 to-amber-500/30 border-[#9D4EDD]/50 text-amber-300 shadow-[0_0_15px_rgba(157,78,221,0.3)] animate-pulse"
            }`}
          >
            {isClaimed ? <CheckCircle2 size={22} /> : <Zap size={22} />}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">
                {isClaimed ? "Absen Harian Terverifikasi" : "Klaim Absen Harian"}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Flame size={12} className="text-amber-400 animate-bounce" />
                <span>Streak: {streak} Hari</span>
              </span>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              {isClaimed ? (
                <>
                  <Clock size={12} className="text-gray-400 shrink-0" />
                  <span>
                    Sudah absen hari ini • Reset kalender WIB dalam:{" "}
                    <strong className="font-mono text-purple-300 font-bold">
                      {formatTimeRemaining(countdown)}
                    </strong>
                  </span>
                </>
              ) : (
                <span>
                  Klaim sekarang untuk mendapatkan <strong className="text-purple-300 font-bold">+15 XP</strong> dan tingkatkan level karaktermu.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 self-start sm:self-auto">
          {isClaimed ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default">
              <CheckCircle2 size={14} />
              <span>TERKLAIM HARI INI</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={claiming}
              onClick={handleClaim}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-[#9D4EDD] to-purple-600 text-white hover:from-[#8338EC] hover:to-purple-700 active:scale-95 transition-all shadow-[0_0_20px_rgba(157,78,221,0.4)] disabled:opacity-50 disabled:pointer-events-none"
            >
              <Sparkles size={14} className="animate-spin text-amber-300" />
              <span>{claiming ? "Mengklaim…" : "⚡ Klaim Absen (+15 XP)"}</span>
            </button>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <CheckCircle2 size={14} />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
}
