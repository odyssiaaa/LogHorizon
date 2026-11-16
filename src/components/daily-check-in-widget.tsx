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
      <div className="w-full p-4 rounded-none border border-[#2E1E45] bg-[#130921] animate-pulse flex items-center justify-between mb-6">
        <div className="h-5 bg-[#1A0E2E] rounded-none w-1/3"></div>
        <div className="h-8 bg-[#1A0E2E] rounded-none w-32"></div>
      </div>
    );
  }

  // Not logged in
  if (!session?.user) {
    return (
      <div className="w-full p-4 sm:p-5 rounded-none border border-[#2E1E45] bg-[#130921] flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shadow-sm text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-none bg-[#1A0E2E] border border-[#2E1E45] flex items-center justify-center text-[#7C3AED] shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <h3 className="font-display text-sm font-extrabold uppercase tracking-tight text-[#F8FAFC] flex items-center gap-1.5">
              <span>⚡ ABSEN HARIAN GUILD (+15 XP)</span>
            </h3>
            <p className="text-xs text-[#A78BFA] font-sans mt-0.5">
              Masuk untuk klaim bonus XP harian dan kumpulkan streak kehadiranmu!
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signIn("discord")}
          className="px-4 py-2 rounded-none text-xs font-mono font-bold uppercase tracking-wider bg-[#7C3AED] text-[#F8FAFC] hover:bg-[#6D28D9] border border-[#7C3AED] transition whitespace-nowrap self-start sm:self-auto"
        >
          Masuk Discord
        </button>
      </div>
    );
  }

  const isClaimed = data?.alreadyCheckedIn || !data?.canCheckIn;
  const streak = data?.streak ?? 0;

  return (
    <div className="w-full p-4 sm:p-5 rounded-none border border-[#2E1E45] bg-[#130921] relative overflow-hidden mb-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-none flex items-center justify-center shrink-0 border transition-all ${
              isClaimed
                ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]"
                : "bg-[#1A0E2E] border-[#7C3AED]/50 text-[#F59E0B]"
            }`}
          >
            {isClaimed ? <CheckCircle2 size={22} /> : <Zap size={22} />}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-sm sm:text-base font-extrabold uppercase tracking-tight text-[#F8FAFC]">
                {isClaimed ? "ABSEN HARIAN TERVERIFIKASI" : "KLAIM ABSEN HARIAN"}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[11px] font-mono font-bold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30">
                <Flame size={12} className="text-[#F59E0B]" />
                <span>STREAK: {streak} HARI</span>
              </span>
            </div>

            <p className="text-xs text-[#A78BFA] mt-0.5 flex items-center gap-1.5 flex-wrap font-sans">
              {isClaimed ? (
                <>
                  <Clock size={12} className="text-[#A78BFA] shrink-0" />
                  <span>
                    Sudah absen hari ini • Reset kalender WIB dalam:{" "}
                    <strong className="font-mono text-[#F8FAFC] font-bold">
                      {formatTimeRemaining(countdown)}
                    </strong>
                  </span>
                </>
              ) : (
                <span>
                  Klaim sekarang untuk mendapatkan <strong className="font-mono text-[#F8FAFC] font-bold">+15 XP</strong> dan tingkatkan level karaktermu.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 self-start sm:self-auto">
          {isClaimed ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-none text-xs font-mono font-bold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 cursor-default">
              <CheckCircle2 size={14} />
              <span>TERKLAIM HARI INI</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={claiming}
              onClick={handleClaim}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-none text-xs font-mono font-bold uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F8FAFC] border border-[#7C3AED] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              <Sparkles size={14} className="text-[#F59E0B]" />
              <span>{claiming ? "Mengklaim…" : "⚡ KLAIM ABSEN (+15 XP)"}</span>
            </button>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="mt-3 p-2.5 rounded-none bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-xs font-mono font-semibold flex items-center gap-2">
          <CheckCircle2 size={14} />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
}
