"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Sparkles, Calendar, Swords, ShieldCheck, ArrowRight, X } from "lucide-react";

export function StarterGuideCard() {
  const { data: session } = useSession();
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("loghorizon_starter_guide_dismissed");
      if (!saved) {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }
  }, []);

  // Only show if user is Level 1 or guest (or explicitly unauthenticated)
  const user = session?.user as { level?: number } | undefined;
  const isBeginner = !user || (typeof user.level === "number" ? user.level <= 1 : true);

  if (isDismissed || !isBeginner) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem("loghorizon_starter_guide_dismissed", "true");
    } catch {}
  };

  return (
    <div className="w-full my-6 p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-[#170C2A] via-[#1A0F30] to-[#11091D] border-2 border-[#7C3AED]/40 shadow-xl relative overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 size-48 rounded-full bg-[#7C3AED]/20 blur-3xl pointer-events-none" />

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition z-10"
        title="Tutup Panduan"
        aria-label="Tutup Panduan"
      >
        <X size={16} />
      </button>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-md bg-[#7C3AED]/30 border border-[#7C3AED] text-[#C4B5FD] font-mono text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-400 animate-spin" style={{ animationDuration: "6s" }} />
            PANDUAN PETUALANG BARU
          </span>
        </div>
        <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
          👋 Mulai Petualanganmu dalam 3 Langkah
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
          Ikuti langkah kilat berikut untuk mengumpulkan XP, naik kasta kerajaan, dan menikmati ekosistem gaming LogHorizon:
        </p>

        {/* 3 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 mt-5">
          {/* Step 1 */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 border border-purple-500/20 flex flex-col justify-between hover:border-purple-500/50 transition">
            <div>
              <div className="flex items-center gap-2.5 text-amber-400 mb-2">
                <div className="size-8 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                  <Calendar size={16} />
                </div>
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-amber-300">
                  LANGKAH 01
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">
                Klaim Absen Harian (+XP)
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Klaim 25 XP gratis setiap hari untuk mulai meningkatkan level dan membuka badge kasta petualang.
              </p>
            </div>
            <Link
              href="/profile"
              className="mt-3.5 inline-flex items-center justify-center gap-1.5 w-full min-h-[40px] px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition active:scale-95"
            >
              <span>Klaim Absen Sekarang</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 border border-purple-500/20 flex flex-col justify-between hover:border-purple-500/50 transition">
            <div>
              <div className="flex items-center gap-2.5 text-[#C4B5FD] mb-2">
                <div className="size-8 rounded-lg bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center shrink-0">
                  <Swords size={16} className="text-[#A78BFA]" />
                </div>
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#C4B5FD]">
                  LANGKAH 02
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">
                Gabung Mabar / Turnamen
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Cari teman mabar cepat di LFG party atau daftarkan tim kamu ke turnamen resmi berhadiah jutaan rupiah.
              </p>
            </div>
            <Link
              href="/events"
              className="mt-3.5 inline-flex items-center justify-center gap-1.5 w-full min-h-[40px] px-3 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold transition active:scale-95 shadow-md shadow-purple-950/40"
            >
              <span>Jelajahi Arena Mabar</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 border border-purple-500/20 flex flex-col justify-between hover:border-purple-500/50 transition">
            <div>
              <div className="flex items-center gap-2.5 text-emerald-400 mb-2">
                <div className="size-8 rounded-lg bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                  <ShieldCheck size={16} />
                </div>
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-emerald-300">
                  LANGKAH 03
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">
                Belanja Aman Pakai Rekber
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Beli akun, voucher, dan item game dengan perlindungan wasit escrow 3-pihak bebas scam & anti-tipu.
              </p>
            </div>
            <Link
              href="/marketplace"
              className="mt-3.5 inline-flex items-center justify-center gap-1.5 w-full min-h-[40px] px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition active:scale-95"
            >
              <span>Buka Marketplace</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}