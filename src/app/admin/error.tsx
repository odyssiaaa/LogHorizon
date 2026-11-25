"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin Module Error Boundary Caught]:", error);
  }, [error]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5 text-red-400">
          <ShieldAlert className="w-8 h-8 animate-pulse" />
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide mb-2">
          Kendala Panel Kontrol Admin
        </h2>

        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          Terjadi kesalahan tak terduga saat memuat data modul Administrator. Data rahasia dan sistem guild tetap aman.
        </p>

        {error?.message && (
          <div className="mb-6 p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-left text-xs text-red-300 font-mono overflow-x-auto max-h-32">
            <span className="font-semibold block text-red-400 mb-1">Pesan Error:</span>
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold text-sm shadow-lg hover:shadow-red-500/25 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Coba Muat Ulang
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-all flex items-center justify-center gap-2 border border-slate-700/60"
          >
            <Home className="w-4 h-4" />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
