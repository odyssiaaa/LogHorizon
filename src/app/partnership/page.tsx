import { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  Trophy,
  Users,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Crown,
  Medal,
  Flame,
  Gamepad2,
  Swords,
  Layers,
  CheckCircle2,
  Check,
  ChevronRight,
  Send,
  HelpCircle,
  MessageCircle,
} from "lucide-react";
import { PartnershipProposalForm } from "@/components/partnership-proposal-form";

export const metadata: Metadata = {
  title: "Kemitraan B2B & Sponsorship Resmi • LogHorizon",
  description:
    "Akselerasikan visibilitas brand Anda bersama komunitas gaming multi-game terbesar LogHorizon. Peluang sponsorship turnamen esports, media barter, dan kolaborasi brand terpercaya.",
};

export const instant = false;

export default async function PartnershipPage() {
  await connection();

  const [
    totalUsers,
    totalTournaments,
    totalParties,
    sponsors,
    siteConfig,
  ] = await Promise.all([
    prisma.user.count().catch(() => 0),
    prisma.tournament.count().catch(() => 0),
    prisma.guildParty.count().catch(() => 0),
    prisma.sponsor.findMany({ orderBy: { createdAt: "desc" }, take: 8 }).catch(() => []),
    prisma.siteConfig.findUnique({ where: { id: "default" } }).catch(() => null),
  ]);

  const discordInviteUrl = siteConfig?.discordInviteUrl || "https://discord.gg/aJvbVyTxNb";

  return (
    <main className="w-full max-w-full overflow-x-hidden bg-[#F8FAFC] dark:bg-[#09040F] text-[#0F172A] dark:text-[#F8FAFC] transition-colors duration-300">
      {/* BREADCRUMB */}
      <div className="border-b border-slate-200 dark:border-[#2E1E45] bg-white/50 dark:bg-[#0E061A]/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-500 dark:text-[#A78BFA]">
            <Link href="/" className="hover:text-[#7C3AED] dark:hover:text-white transition">
              Beranda
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-bold">Kemitraan &amp; Sponsorship</span>
          </div>
          <Link
            href="/donate"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#7C3AED] dark:text-[#A78BFA] hover:underline font-bold"
          >
            <span>Donasi Kas Komunitas</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 01 / HERO B2B PITCH DECK                                              */}
      {/* ===================================================================== */}
      <section className="relative py-14 sm:py-20 border-b border-slate-200 dark:border-[#2E1E45] overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 relative z-10">
          <div className="max-w-3xl text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45] font-mono text-xs select-none">
              <span className="size-2 rounded-full bg-[#7C3AED] animate-pulse shrink-0" />
              <span className="text-[#7C3AED] dark:text-[#A78BFA] font-bold tracking-widest uppercase">
                B2B SPONSORSHIP &amp; PARTNERSHIP ECOSYSTEM
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-[#F8FAFC] leading-tight">
                Akselerasikan Brand Anda Bersama{" "}
                <span className="text-[#7C3AED] dark:text-[#A78BFA]">LogHorizon.</span>
              </h1>
              <p className="font-sans text-base sm:text-lg text-slate-600 dark:text-[#A78BFA] leading-relaxed">
                Jangkau ribuan gamer aktif, tim esports amatir &amp; semi-pro, dan konten kreator lintas genre PC, konsol, dan mobile dengan eksposur brand yang terukur, organik, dan berdampak nyata.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <a
                href="#proposal-form"
                className="px-6 py-3.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-mono font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 border border-[#7C3AED] transition-colors shadow-lg hover:shadow-purple-500/25"
              >
                <span>Ajukan Kemitraan Sekarang</span>
                <ArrowRight size={16} />
              </a>
              <a
                href={discordInviteUrl}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3.5 bg-white dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45] hover:border-[#7C3AED] text-slate-800 dark:text-[#F8FAFC] font-mono font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <span>Hubungi Manajemen via Discord</span>
                <ExternalLink size={15} className="text-[#7C3AED]" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 02 / 4 REAL-TIME REACH METRIC CARDS                                  */}
      {/* ===================================================================== */}
      <section className="py-12 border-b border-slate-200 dark:border-[#2E1E45] bg-slate-50/50 dark:bg-[#0E061A]/50">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="mb-6 text-left">
            <span className="font-mono text-xs font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider block mb-1">
              METRIK AUDIENS &amp; JANGKAUAN
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-slate-900 dark:text-[#F8FAFC]">
              Ekosistem Komunitas yang Bertumbuh Organik
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1 */}
            <div className="p-5 bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2E1E45] shadow-sm text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Petualang Terdaftar</span>
                <Users size={18} className="text-[#7C3AED]" />
              </div>
              <div className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                {totalUsers > 0 ? `${totalUsers}+` : "500+"}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Member terverifikasi aktif di portal web dan server Discord resmi.
              </p>
            </div>

            {/* Metric 2 */}
            <div className="p-5 bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2E1E45] shadow-sm text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Turnamen &amp; Event</span>
                <Trophy size={18} className="text-amber-500" />
              </div>
              <div className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                {totalTournaments > 0 ? totalTournaments : "10+"}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Turnamen musiman dengan bagan transparan, live streaming, dan prizepool resmi.
              </p>
            </div>

            {/* Metric 3 */}
            <div className="p-5 bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2E1E45] shadow-sm text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Divisi Game Utama</span>
                <Gamepad2 size={18} className="text-emerald-500" />
              </div>
              <div className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                4 Divisi
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                FPS / Shooter, MOBA, RPG / Open World, dan Casual Party Game.
              </p>
            </div>

            {/* Metric 4 */}
            <div className="p-5 bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2E1E45] shadow-sm text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Skuad &amp; Guild Party</span>
                <Swords size={18} className="text-purple-400" />
              </div>
              <div className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                {totalParties > 0 ? totalParties : "20+"}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Party tetap antar member yang berkompetisi di ladder guild dan turnamen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 03 / 3 TIER PACKAGES & BENEFITS                                       */}
      {/* ===================================================================== */}
      <section className="py-14 sm:py-20 border-b border-slate-200 dark:border-[#2E1E45]">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="text-left space-y-2 mb-10 max-w-2xl">
            <span className="font-mono text-xs font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider block">
              PAKET KEMITRAAN &amp; SPONSORSHIP RESMI
            </span>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold uppercase text-slate-900 dark:text-[#F8FAFC]">
              Pilih Skema Kolaborasi yang Selaras dengan Brand Anda
            </h2>
            <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-[#A78BFA] leading-relaxed">
              Kami menawarkan fleksibilitas bentuk kemitraan: mulai dari dukungan hadiah turnamen, penempatan aset branding, hingga aktivasi eksklusif di Discord Voice dan platform LogHorizon.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* TIER 1 */}
            <div className="p-6 sm:p-8 bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2E1E45] shadow-sm flex flex-col justify-between text-left space-y-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45] font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Medal size={13} className="text-slate-400" />
                  <span>TIER 1 • COMMUNITY &amp; MEDIA</span>
                </div>
                <div>
                  <h3 className="font-display text-xl font-extrabold uppercase text-slate-900 dark:text-[#F8FAFC]">
                    Community &amp; Media Partner
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Ideal untuk media gaming, komunitas mitra, dan brand rintisan yang ingin memperluas jangkauan awareness secara resiprokal.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-[#2E1E45] space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Logo brand di bagian Footer &amp; Showcase Partner website</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Cross-promotion resmi di Discord channel <code>#🤝・partnership</code></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Penyebutan nama mitra dalam rilis warta turnamen &amp; event guild</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Badge <em>Verified Partner</em> pada profil perwakilan komunitas</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <a
                  href="#proposal-form"
                  className="w-full py-2.5 px-4 bg-slate-100 dark:bg-[#1A0E2E] hover:bg-slate-200 dark:hover:bg-[#251540] border border-slate-200 dark:border-[#2E1E45] text-slate-900 dark:text-[#F8FAFC] font-mono text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <span>Pilih Paket Tier 1</span>
                  <ChevronRight size={14} />
                </a>
              </div>
            </div>

            {/* TIER 2 (RECOMMENDED / HIGHLIGHT) */}
            <div className="p-6 sm:p-8 bg-gradient-to-b from-[#7C3AED]/10 via-[#11091D] to-[#11091D] border-2 border-[#7C3AED] shadow-xl flex flex-col justify-between text-left space-y-6 relative">
              <div className="absolute -top-3 right-6 bg-[#7C3AED] text-white font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 shadow-md">
                Paling Diminati Brand
              </div>

              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 border border-amber-500/30 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Trophy size={13} className="text-amber-500" />
                  <span>TIER 2 • TOURNAMENT TITLE &amp; PRIZE</span>
                </div>
                <div>
                  <h3 className="font-display text-xl font-extrabold uppercase text-slate-900 dark:text-[#F8FAFC]">
                    Tournament Title &amp; Prize Sponsor
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Sponsori kompetisi esports musiman dengan penamaan turnamen resmi dan jangkauan langsung ke ratusan peserta dan penonton.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-[#2E1E45] space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <Check size={15} className="text-amber-500 shrink-0 mt-0.5" />
                    <span><strong>Penamaan turnamen resmi:</strong> <em>LogHorizon Cup powered by [Brand]</em></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check size={15} className="text-amber-500 shrink-0 mt-0.5" />
                    <span>Logo brand di bagan pertandingan publik, livestream overlay, &amp; e-sertifikat</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check size={15} className="text-amber-500 shrink-0 mt-0.5" />
                    <span>Pin highlight promosi produk/diskon di Forum Resmi LogHorizon</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check size={15} className="text-amber-500 shrink-0 mt-0.5" />
                    <span>Broadcast pesan sponsor via Discord Announcement &amp; WhatsApp kapten tim</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check size={15} className="text-amber-500 shrink-0 mt-0.5" />
                    <span>Distribusi voucher / produk brand sebagai hadiah tambahan turnamen</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <a
                  href="#proposal-form"
                  className="w-full py-3 px-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  <span>Pilih Paket Tier 2 (Rekomendasi)</span>
                  <ChevronRight size={14} />
                </a>
              </div>
            </div>

            {/* TIER 3 */}
            <div className="p-6 sm:p-8 bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2E1E45] shadow-sm flex flex-col justify-between text-left space-y-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 font-mono text-xs font-bold text-amber-500">
                  <Crown size={13} className="text-amber-400" />
                  <span>TIER 3 • STRATEGIC BENEFACTOR</span>
                </div>
                <div>
                  <h3 className="font-display text-xl font-extrabold uppercase text-slate-900 dark:text-[#F8FAFC]">
                    Official Guild Benefactor
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Kemitraan jangka panjang dengan hak branding eksklusif tertinggi di seluruh aset ekosistem guild LogHorizon.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-[#2E1E45] space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <Check size={15} className="text-[#7C3AED] shrink-0 mt-0.5" />
                    <span><strong>Penempatan banner permanen:</strong> Beranda &amp; showcase sponsor utama</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check size={15} className="text-[#7C3AED] shrink-0 mt-0.5" />
                    <span>Gelar kehormatan bangsawan <em>Noble Patron / High Merchant</em> di Discord &amp; web</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check size={15} className="text-[#7C3AED] shrink-0 mt-0.5" />
                    <span>Dedicated text &amp; voice channel khusus brand di server Discord resmi</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check size={15} className="text-[#7C3AED] shrink-0 mt-0.5" />
                    <span>Penyelenggaraan sesi AMA (Tanya Jawab) &amp; Product Demo langsung di Discord Stage</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check size={15} className="text-[#7C3AED] shrink-0 mt-0.5" />
                    <span>Akses prioritas laporan demografi peserta event untuk riset pasar brand</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <a
                  href="#proposal-form"
                  className="w-full py-2.5 px-4 bg-slate-100 dark:bg-[#1A0E2E] hover:bg-slate-200 dark:hover:bg-[#251540] border border-slate-200 dark:border-[#2E1E45] text-slate-900 dark:text-[#F8FAFC] font-mono text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <span>Pilih Paket Tier 3</span>
                  <ChevronRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 04 / FORMULIR PROPOSAL KEMITRAAN (INTERACTIVE CLIENT COMPONENT)      */}
      {/* ===================================================================== */}
      <section className="py-14 sm:py-20 border-b border-slate-200 dark:border-[#2E1E45]" id="proposal-form">
        <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-8">
          <PartnershipProposalForm />
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 05 / DIRECT CONTACT & FAQ                                             */}
      {/* ===================================================================== */}
      <section className="py-12 bg-slate-50/50 dark:bg-[#0E061A]/50">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            {/* Kontak Langsung */}
            <div className="space-y-4 p-6 bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2E1E45]">
              <div className="flex items-center gap-2 text-[#7C3AED] dark:text-[#A78BFA] font-mono text-xs font-bold uppercase tracking-wider">
                <MessageCircle size={15} />
                <span>Narahubung Eksekutif</span>
              </div>
              <h3 className="font-display text-xl font-bold uppercase text-slate-900 dark:text-[#F8FAFC]">
                Diskusi Langsung dengan Owner
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#A78BFA] leading-relaxed">
                Ingin berdiskusi secara informal atau memerlukan proposal sponsorship berformat PDF kustom? Hubungi founder &amp; Emperor LogHorizon:
              </p>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Discord Owner:</span>
                  <span className="font-bold text-slate-900 dark:text-white">.odyssia</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Server Discord:</span>
                  <a
                    href={discordInviteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#7C3AED] hover:underline font-bold inline-flex items-center gap-1"
                  >
                    <span>discord.gg/aJvbVyTxNb</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>

            {/* FAQ Ringkas */}
            <div className="space-y-4 p-6 bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2E1E45]">
              <div className="flex items-center gap-2 text-[#7C3AED] dark:text-[#A78BFA] font-mono text-xs font-bold uppercase tracking-wider">
                <HelpCircle size={15} />
                <span>FAQ Kemitraan</span>
              </div>
              <h3 className="font-display text-xl font-bold uppercase text-slate-900 dark:text-[#F8FAFC]">
                Pertanyaan yang Sering Diajukan
              </h3>
              <div className="space-y-3 text-xs text-slate-600 dark:text-[#A78BFA] leading-relaxed">
                <div>
                  <strong className="text-slate-900 dark:text-white block mb-0.5">
                    Apakah menerima sponsor dalam bentuk produk / merchandise?
                  </strong>
                  <span>
                    Ya! Kami menyambut kerja sama barter produk (seperti mouse, keyboard, headset, atau merchandise gaming) untuk dijadikan prize pool atau giveaway resmi turnamen.
                  </span>
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-white block mb-0.5">
                    Berapa lama proses persetujuan proposal?
                  </strong>
                  <span>
                    Proposal Anda akan ditinjau dalam waktu maksimal 1x24 jam kerja, dan tim manajemen kami akan menghubungi nomor WhatsApp terdaftar.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
