import { Metadata } from "next";
import Link from "next/link";
import { RulesGuideTabs } from "@/components/rules-guide-tabs";
import { BookOpen, Shield, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Pusat Aturan, Regulasi Esports & FAQ | LogHorizon",
  description: "Pedoman resmi kode etik guild, regulasi turnamen esports, panduan transaksi rekber escrow, dan FAQ fitur komunitas LogHorizon.",
};

export const instant = false;

export default function RulesPage() {
  return (
    <main className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7C3AED] dark:text-[#A78BFA] hover:underline"
        >
          <ArrowLeft size={15} /> Kembali ke Beranda
        </Link>
        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
          <Link href="/privacy" className="hover:text-slate-800 dark:hover:text-white transition">
            Kebijakan Privasi
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-slate-800 dark:hover:text-white transition">
            Syarat &amp; Ketentuan
          </Link>
        </div>
      </div>

      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-sm mb-8 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/30">
          <BookOpen size={13} />
          <span>KONSTITUSI &amp; PANDUAN RESMI LOGHORIZON</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Pusat Regulasi, Etika &amp; Panduan Komunitas
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
          Ketahui aturan main berpetualang di LogHorizon: dari kode etik anti-toxic, regulasi baku turnamen esports, sistem perlindungan transaksi Rekber 3-Pihak, hingga tanya-jawab seputar fitur guild.
        </p>
      </div>

      {/* Interactive Tabs Component */}
      <RulesGuideTabs />
    </main>
  );
}
