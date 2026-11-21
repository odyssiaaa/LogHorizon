"use client";

import { useEffect, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { Sparkles, Crown, Lock, Gift, CheckCircle2, Loader2, PartyPopper } from "lucide-react";

interface ChestStatus {
  isLoggedIn: boolean;
  dateKey: string;
  secondsUntilReset: number;
  hasCheckedInToday: boolean;
  canOpen: boolean;
  alreadyOpened: boolean;
  todayClaim: {
    rewardType: string;
    rewardValue: string;
    claimedAt: string;
  } | null;
  activeTitle: string | null;
}

interface OpenReward {
  rewardType: "XP" | "TITLE";
  rewardValue: string;
  rewardTitle: string;
  level: number;
  xp: number;
}

export function RoyalChestWidget() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<ChestStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpening, setIsOpening] = useState(false);
  const [reward, setReward] = useState<OpenReward | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const fetchChestStatus = () => {
    if (status === "loading") return;
    if (!session?.user) {
      setLoading(false);
      return;
    }

    fetch("/api/user/chest")
      .then((res) => (res.ok ? res.json() : null))
      .then((resData: ChestStatus | null) => {
        if (resData) setData(resData);
      })
      .catch((err) => console.error("Failed to fetch chest status:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchChestStatus();
  }, [session, status]);

  const handleOpenChest = async () => {
    if (isOpening || !data?.canOpen) return;
    setIsOpening(true);
    setErrorMsg(null);

    try {
      // Tunggu jeda animasi bergetar 700ms sebelum reveal
      const [res] = await Promise.all([
        fetch("/api/user/chest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Gagal membuka peti harta.");
      }

      startTransition(() => {
        setReward(result);
        setData((prev) =>
          prev
            ? {
                ...prev,
                canOpen: false,
                alreadyOpened: true,
                todayClaim: {
                  rewardType: result.rewardType,
                  rewardValue: result.rewardValue,
                  claimedAt: new Date().toISOString(),
                },
                activeTitle: result.rewardType === "TITLE" ? result.rewardValue : prev.activeTitle,
              }
            : null
        );
      });
    } catch (err: unknown) {
      console.error("Open chest error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Gagal membuka peti harta kerajaan.");
    } finally {
      setIsOpening(false);
    }
  };

  if (loading) {
    return (
      <div className="p-5 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] flex items-center justify-center gap-2 text-slate-400 text-xs py-8">
        <Loader2 size={16} className="animate-spin text-amber-500" />
        <span>Memeriksa Peti Harta Kerajaan...</span>
      </div>
    );
  }

  const canOpen = data?.canOpen;
  const alreadyOpened = data?.alreadyOpened;
  const hasCheckedInToday = data?.hasCheckedInToday;

  return (
    <>
      <div className="relative overflow-hidden p-4 sm:p-5 rounded-xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-slate-900/5 dark:from-[#211604] dark:via-[#160A24] dark:to-[#0D0717] shadow-sm">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
          {/* Visual Chest Icon & Info */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Animated Royal Chest Illustration */}
            <div
              className={`relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl flex items-center justify-center transition-all ${
                canOpen
                  ? "cursor-pointer hover:scale-105 active:scale-95"
                  : "opacity-80"
              }`}
              onClick={() => {
                if (canOpen) handleOpenChest();
              }}
            >
              {/* Pulsing halo */}
              {canOpen && (
                <div className="absolute inset-0 rounded-2xl bg-amber-400/25 blur-md animate-pulse" />
              )}

              {/* Chest Icon Box */}
              <div
                className={`relative w-full h-full rounded-2xl border-2 flex flex-col items-center justify-center ${
                  canOpen
                    ? "bg-gradient-to-b from-amber-400/20 via-amber-500/20 to-purple-600/30 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)] " +
                      (isOpening ? "animate-chest-shake" : "animate-bounce")
                    : alreadyOpened
                    ? "bg-slate-100 dark:bg-[#1A102E] border-emerald-500/40 text-emerald-400"
                    : "bg-slate-100 dark:bg-[#140D22] border-slate-300 dark:border-slate-700 text-slate-400"
                }`}
              >
                {alreadyOpened ? (
                  <span className="text-3xl select-none">🎁</span>
                ) : canOpen ? (
                  <span className="text-3xl select-none animate-pulse">👑</span>
                ) : (
                  <span className="text-3xl select-none">🔒</span>
                )}
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase mt-1">
                  {alreadyOpened ? "TERBUKA" : canOpen ? "SIAP BUKA" : "TERKUNCI"}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Crown size={17} className="text-amber-400" />
                  <span>Peti Harta Kerajaan Harian</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-500 dark:text-amber-300 border border-amber-500/30">
                  Daily Royal Chest
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-md">
                Klaim Absen Harian untuk membuka 1x Peti Kerajaan gratis berisi hadiah acak:{" "}
                <span className="text-amber-500 dark:text-amber-300 font-semibold">
                  +50 s/d +500 XP
                </span>{" "}
                atau{" "}
                <span className="text-purple-500 dark:text-purple-300 font-semibold">
                  Title Sementara 24 Jam
                </span>
                !
              </p>

              {/* Status Notice */}
              <div className="mt-2 text-[11px] font-mono flex items-center justify-center sm:justify-start gap-1.5">
                {!hasCheckedInToday ? (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Lock size={12} />
                    <span>Selesaikan Absen Harian terlebih dahulu untuk membuka kunci peti.</span>
                  </span>
                ) : alreadyOpened ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>
                      Hadiah hari ini sudah diklaim (
                      {data?.todayClaim?.rewardType === "TITLE"
                        ? data.todayClaim.rewardValue
                        : `+${data?.todayClaim?.rewardValue} XP`}
                      ). Peti reset pukul 00:00 WIB.
                    </span>
                  </span>
                ) : (
                  <span className="text-amber-500 dark:text-amber-300 font-bold flex items-center gap-1 animate-pulse">
                    <Sparkles size={12} />
                    <span>Peti siap dibuka! Klik tombol di samping untuk mengambil hadiahmu!</span>
                  </span>
                )}
              </div>

              {/* Active Temporary Title Indicator */}
              {data?.activeTitle && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/15 border border-purple-500/40 text-purple-300 text-[11px] font-mono font-bold">
                  <span>✨ Title Aktif:</span>
                  <span className="text-amber-300 underline">{data.activeTitle}</span>
                  <span className="text-[10px] text-purple-400">(Tampil di Forum &amp; Leaderboard)</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="shrink-0 w-full sm:w-auto">
            {canOpen ? (
              <button
                type="button"
                disabled={isOpening}
                onClick={handleOpenChest}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 shadow-lg shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isOpening ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-slate-950" />
                    <span>Membuka Peti...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Buka Peti Kerajaan</span>
                  </>
                )}
              </button>
            ) : alreadyOpened ? (
              <div className="px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 size={14} />
                <span>Selesai Dibuka</span>
              </div>
            ) : (
              <div className="px-4 py-2 rounded-lg bg-slate-200/50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-500 font-mono text-xs flex items-center justify-center gap-1.5">
                <Lock size={13} />
                <span>Klaim Absen Dulu</span>
              </div>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2 rounded bg-red-500/15 border border-red-500/30 text-red-400 text-xs text-center font-mono">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Reward Reveal Modal */}
      {reward && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#160C26] border-2 border-amber-400 shadow-2xl p-6 text-center space-y-4 animate-scale-up">
            {/* Ambient golden aura */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/25 rounded-full blur-2xl pointer-events-none" />

            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-lg">
              {reward.rewardType === "TITLE" ? "👑" : "💰"}
            </div>

            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-500">
                Peti Harta Kerajaan Terbuka!
              </span>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {reward.rewardTitle}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                {reward.rewardType === "TITLE"
                  ? "Gelar kehormatan ini berlaku selama 24 jam dan langsung menghiasi namamu di Forum dan Leaderboard!"
                  : `Total XP kamu bertambah dan level petualangmu kini Level ${reward.level}!`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setReward(null)}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold font-mono text-xs uppercase tracking-wider shadow-md cursor-pointer transition active:scale-95"
            >
              Terima Kasih, Ambil Hadiah!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
