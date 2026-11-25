"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, Trophy, MessageCircle } from "lucide-react";

export default function EventsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to client console for diagnostic transparency
    console.error("[Events Page Error Boundary Caught]:", error);
  }, [error]);

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg p-6 sm:p-8 rounded-2xl bg-[#11091D]/95 dark:bg-[#11091D]/95 border-2 border-[#7C3AED]/60 shadow-[0_0_50px_rgba(124,58,237,0.25)] text-center backdrop-blur-md">
        {/* Glow Badge & Icon */}
        <div className="size-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#7C3AED]/20 to-rose-500/20 border border-[#7C3AED]/50 flex items-center justify-center text-[#A78BFA] shadow-lg">
          <AlertTriangle className="size-8 text-amber-400 animate-pulse" />
        </div>

        <p className="text-[11px] font-mono uppercase tracking-widest text-[#A78BFA] font-bold mb-1">
          ARENA SYSTEM RECOVERY // FAILSAFE
        </p>

        <h1 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-tight mb-2">
          Gagal Memuat Arena &amp; Turnamen
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans mb-6">
          Terjadi gangguan koneksi atau data pertandingan sedang dalam proses sinkronisasi real-time. Jangan khawatir, akun dan data pendaftaranmu tetap aman.
        </p>

        {error?.message && (
          <div className="mb-6 p-3 rounded-xl bg-black/50 border border-purple-500/20 text-left">
            <span className="text-[10px] font-mono text-slate-400 block mb-1 uppercase font-semibold">
              Detail Error:
            </span>
            <code className="text-xs font-mono text-rose-300 break-words block">
              {error.message}
            </code>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full h-11 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-white border border-[#7C3AED] inline-flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Coba Muat Ulang</span>
          </button>

          <Link
            href="/"
            className="w-full h-11 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 inline-flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Home size={14} />
            <span>Beranda</span>
          </Link>
        </div>

        <div className="mt-4 pt-4 border-t border-purple-500/20 flex items-center justify-center gap-4 text-xs font-mono">
          <Link
            href="/hall-of-winners"
            className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1.5 transition-colors"
          >
            <Trophy size={13} />
            <span>Hall of Winners</span>
          </Link>
          <span className="text-slate-600">•</span>
          <a
            href="https://discord.gg/aJvbVyTxNb"
            target="_blank"
            rel="noreferrer"
            className="text-[#A78BFA] hover:text-white inline-flex items-center gap-1.5 transition-colors"
          >
            <MessageCircle size={13} />
            <span>Bantuan Discord</span>
          </a>
        </div>
      </div>
    </main>
  );
}
