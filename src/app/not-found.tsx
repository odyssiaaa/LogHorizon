import Link from "next/link";
import { ArrowLeft, Compass, Home, Newspaper, ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] sm:w-[42rem] h-[30rem] sm:h-[42rem] bg-purple-600/10 dark:bg-[#9D4EDD]/15 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-lg w-full text-center p-6 sm:p-10 rounded-2xl border border-gray-200 dark:border-[#211C2B] bg-white/70 dark:bg-[#100D18]/80 backdrop-blur-xl shadow-2xl">
        {/* Cyber Tactical Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 text-[#9D4EDD] dark:text-[#C77DFF] text-xs font-bold tracking-widest uppercase mb-4">
          <ShieldAlert size={14} className="animate-pulse" />
          <span>DIMENSION DESYNC ERROR</span>
        </div>

        {/* Big Glitch 404 Header */}
        <h1 className="text-7xl sm:text-9xl font-black tracking-tighter text-gray-900 dark:text-white leading-none font-sans drop-shadow-sm">
          4<span className="text-[#9D4EDD] dark:text-[#C77DFF]">0</span>4
        </h1>

        <h2 className="text-lg sm:text-xl font-extrabold text-gray-800 dark:text-gray-100 mt-4 tracking-wide uppercase">
          Terjebak di Luar Batas Horizon
        </h2>

        <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-md mx-auto">
          Halaman yang kamu cari tidak ditemukan atau telah berpindah koordinat. Kompas guild gagal mendeteksi sinyal di zona ini.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-xs sm:text-sm font-bold text-white bg-[#9D4EDD] hover:bg-[#8338EC] transition-all shadow-md shadow-[#9D4EDD]/25"
          >
            <Home size={16} />
            <span>Kembali ke Beranda</span>
          </Link>

          <Link
            href="/forum"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#181324] border border-gray-200 dark:border-[#262033] hover:border-[#9D4EDD] transition-colors"
          >
            <Compass size={16} />
            <span>Buka Forum Guild</span>
          </Link>
        </div>

        {/* Footer Hint */}
        <p className="mt-6 text-[11px] font-mono text-gray-400 dark:text-gray-500">
          STATUS: 404_PAGE_NOT_FOUND • SECTOR_UNKNOWN
        </p>
      </div>
    </main>
  );
}
