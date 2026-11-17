import Link from "next/link";
import Image from "next/image";
import { HeroLogo } from "@/components/hero-logo";
import { GuildAnnouncementCard } from "@/components/guild-announcement-card";
import { AnnouncementPopupModal } from "@/components/announcement-popup-modal";
import {
  ArrowUpRight,
  AudioLines,
  Compass,
  Gamepad2,
  Globe2,
  Radio,
  ShieldCheck,
  Swords,
  Trophy,
  UsersRound,
  Zap,
} from "lucide-react";

import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

export const instant = false;

function parsePrizePool(prizeStr: string | null | undefined): number {
  if (!prizeStr) return 0;
  const digits = prizeStr.replace(/\D/g, "");
  if (!digits) return 0;
  const num = parseInt(digits, 10);
  return isNaN(num) ? 0 : num;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const divisions = [
  { title: "FPS / Shooter", games: "Valorant · Apex Legends · CS2", icon: Swords, code: "DIV-01" },
  { title: "MOBA / Strategy", games: "Mobile Legends · Dota 2 · LoL", icon: Compass, code: "DIV-02" },
  { title: "RPG / Open World", games: "Genshin Impact · Elden Ring · Wuthering Waves", icon: Globe2, code: "DIV-03" },
  { title: "Casual / Party", games: "Party Animals · Minecraft · Roblox", icon: Gamepad2, code: "DIV-04" },
];

const benefits = [
  { title: "Guild Serba Ada", copy: "Dari ranked kompetitif sampai mabar santai, selalu ada party yang cocok.", icon: UsersRound, tag: "MATCHMAKING" },
  { title: "Voice Channel Aktif", copy: "Mabar terasa lebih seru dan taktis dengan rekan satu frekuensi 24/7.", icon: AudioLines, tag: "24/7 LOW LATENCY" },
  { title: "Event & Turnamen", copy: "Asah skill tim, ikuti turnamen berkala, dan rebut hadiah kejayaan bersama guild.", icon: Trophy, tag: "SEASONAL LEAGUE" },
];

const roleGroups = [
  {
    title: "Kasta Penguasa",
    subtitle: "Petinggi & Pembuat Kebijakan Guild",
    roles: [
      { name: "👑 Emperor", desc: "Pemilik tunggal guild (Owner) dengan kendali absolut atas arah dan visi komunitas (.odyssia)." },
      { name: "✨ Prince / Princess", desc: "Manajemen eksekutif tingkat tinggi yang mengelola event akbar dan divisi." },
      { name: "📘 Grand Chancellor", desc: "Manajemen inti pengatur infrastruktur, bot, dan regulasi internal guild." },
    ],
  },
  {
    title: "Kasta Penjaga",
    subtitle: "Pasukan Pengawas Ketertiban & Moderasi",
    roles: [
      { name: "⚔️ Lord Commander", desc: "Moderator elit garda depan: mengamankan forum, membersihkan spam, dan menegakkan sanksi." },
    ],
  },
  {
    title: "Kasta Khusus Donatur",
    subtitle: "Penyokong Utama Kas & Ekosistem Guild",
    roles: [
      { name: "💎 Noble Patron", desc: "Gelar bangsawan kehormatan tertinggi penyokong hadiah turnamen komunitas." },
      { name: "👑 High Merchant", desc: "Saudagar elit pendukung stabilitas kas bulanan dan operasional server." },
      { name: "🛡️ Knight", desc: "Ksatria pelindung yang aktif menyumbang operasional harian komunitas." },
    ],
  },
  {
    title: "Kasta Warga & Kreator",
    subtitle: "Petualang Aktif Penghidup Suasana",
    roles: [
      { name: "📢 Streamer", desc: "Kreator konten siaran langsung resmi komunitas." },
      { name: "🎨 Artist", desc: "Kreator karya seni visual, fanart, dan grafis guild." },
      { name: "🎵 Music Lover", desc: "Pecinta dan kurator musik di voice room komunitas." },
      { name: "👥 Citizen & 🎮 Gamer", desc: "Warga setia dan petualang tangguh yang memadati arena mabar setiap hari." },
    ],
  },
];

export default async function Home() {
  await connection();
  const now = new Date();
  const [
    config,
    sponsors,
    totalMembers,
    activeTournaments,
    latestTournament,
    activeLfgCount,
    latestLfg,
    approvedDonationsSum,
    escrowCount,
  ] = await Promise.all([
    prisma.siteConfig.findUnique({ where: { id: "default" } }).catch(() => null),
    prisma.sponsor.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []),
    prisma.user.count().catch(() => 0),
    prisma.tournament.findMany({
      where: { status: { in: ["REGISTRATION", "ONGOING", "OPEN"] } },
      select: { prizePool: true },
    }).catch(() => []),
    prisma.tournament.findFirst({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: { id: true, title: true, game: true, status: true, format: true },
    }).catch(() => null),
    prisma.lfgPost.count({
      where: { status: "OPEN", expiresAt: { gt: now } },
    }).catch(() => 0),
    prisma.lfgPost.findFirst({
      where: { status: "OPEN", expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
      select: { id: true, game: true, targetRank: true, maxSlots: true, description: true },
    }).catch(() => null),
    prisma.donation.aggregate({
      where: { status: { in: ["APPROVED", "SUCCEEDED"] } },
      _sum: { amount: true },
    }).catch(() => ({ _sum: { amount: 0 } })),
    prisma.escrowTransaction.count().catch(() => 0),
  ]);

  const totalPrizePool = activeTournaments.reduce((acc, t) => acc + parsePrizePool(t.prizePool), 0);
  const activeTournamentCount = activeTournaments.length;
  const verifiedKas = approvedDonationsSum._sum.amount ?? 0;
  const discordInviteUrl = config?.discordInviteUrl || "https://discord.gg/aJvbVyTxNb";

  return (
    <main className="w-full max-w-full overflow-x-hidden bg-[#F8FAFC] dark:bg-[#09040F] text-[#0F172A] dark:text-[#F8FAFC] transition-colors duration-300">
      {/* ===================================================================== */}
      {/* 3. HERO SECTION (Asymmetric 12-Column Grid: 7 Left : 5 Right)          */}
      {/* ===================================================================== */}
      <section className="relative py-10 sm:py-14 md:py-18 lg:py-20 border-b border-slate-200 dark:border-[#2E1E45]">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* KOLOM KIRI (7 Kolom): Headline, Deskripsi, CTA, dan 4 Metrik Statistik */}
            <div className="lg:col-span-7 text-left space-y-6">
              {/* Badge Mono di Atas */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45] font-mono text-xs select-none">
                <span className="size-2 rounded-full bg-[#10B981] animate-pulse shrink-0" />
                <span className="text-[#7C3AED] dark:text-[#A78BFA] font-bold tracking-widest uppercase">
                  MULTI-GAME COMMUNITY // LOGHORIZON HQ
                </span>
              </div>

              {/* Headline & Sub-headline */}
              <div className="space-y-2">
                <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC] uppercase leading-none select-none">
                  LOG<span className="text-[#7C3AED] dark:text-[#A78BFA]">HORIZON</span>
                </h1>
                <p className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-[#F8FAFC] uppercase tracking-tight leading-snug">
                  FIND YOUR PARTY.<br />
                  <span className="text-[#7C3AED] dark:text-[#A78BFA]">BEYOND THE HORIZON.</span>
                </p>
              </div>

              {/* Deskripsi Asli */}
              <p className="font-sans text-sm sm:text-base md:text-lg text-slate-600 dark:text-[#A78BFA] max-w-xl leading-relaxed">
                Satu guild untuk semua petualang. Temukan rekan mabar sefrekuensi di PC, konsol, dan mobile, apa pun genre dan game favoritmu.
              </p>

              {/* CTA Buttons (Strict rounded-none) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <a
                  className="px-6 py-3.5 rounded-none bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-sans font-bold text-sm inline-flex items-center justify-center gap-2 border border-[#7C3AED] transition-colors shadow-sm"
                  href={discordInviteUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>Masuk Guild (Join Discord)</span>
                  <ArrowUpRight size={17} />
                </a>
                <a
                  className="px-6 py-3.5 rounded-none bg-white dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45] hover:border-[#7C3AED] hover:bg-slate-50 dark:hover:bg-[#1A0E2E] text-slate-800 dark:text-[#F8FAFC] font-sans font-semibold text-sm inline-flex items-center justify-center transition-colors shadow-sm dark:shadow-none"
                  href="#flight-board"
                >
                  Jelajahi Komunitas
                </a>
              </div>

              {/* Baris 4 Metrik Statistik (Data-Dense JetBrains Mono - 100% Real DB Data) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-200 dark:border-[#2E1E45]">
                <div className="p-3 bg-white dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45] shadow-sm dark:shadow-none min-w-0">
                  <span className="font-mono text-[10px] text-slate-500 dark:text-[#A78BFA] uppercase block truncate">TOTAL PETUALANG</span>
                  <strong className="font-mono text-base sm:text-lg lg:text-xl font-bold text-slate-900 dark:text-[#F8FAFC] block mt-0.5 whitespace-nowrap truncate">
                    {totalMembers} Petualang
                  </strong>
                  <span className="font-mono text-[10px] text-emerald-600 dark:text-[#10B981] mt-0.5 block truncate">● 100% Akun Terdaftar</span>
                </div>

                <div className="p-3 bg-white dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45] shadow-sm dark:shadow-none min-w-0">
                  <span className="font-mono text-[10px] text-slate-500 dark:text-[#A78BFA] uppercase block truncate">PRIZE POOL AKTIF</span>
                  <strong className="font-mono text-base sm:text-lg lg:text-xl font-bold text-amber-600 dark:text-[#F59E0B] block mt-0.5 whitespace-nowrap truncate">
                    {formatRupiah(totalPrizePool)}
                  </strong>
                  <span className="font-mono text-[10px] text-slate-500 dark:text-[#A78BFA] mt-0.5 block truncate">
                    {activeTournamentCount} Turnamen Aktif
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45] shadow-sm dark:shadow-none min-w-0">
                  <span className="font-mono text-[10px] text-slate-500 dark:text-[#A78BFA] uppercase block truncate">ACTIVE PARTY LFG</span>
                  <strong className="font-mono text-base sm:text-lg lg:text-xl font-bold text-slate-900 dark:text-[#F8FAFC] block mt-0.5 whitespace-nowrap truncate">
                    {activeLfgCount} Party
                  </strong>
                  <span className="font-mono text-[10px] text-emerald-600 dark:text-[#10B981] mt-0.5 block truncate">
                    {activeLfgCount > 0 ? "Mabar Siap Tempur" : "Belum Ada Mabar"}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45] shadow-sm dark:shadow-none min-w-0">
                  <span className="font-mono text-[10px] text-slate-500 dark:text-[#A78BFA] uppercase block truncate">ESCROW &amp; REKBER</span>
                  <strong className="font-mono text-base sm:text-lg lg:text-xl font-bold text-emerald-600 dark:text-[#10B981] block mt-0.5 whitespace-nowrap truncate">
                    {escrowCount > 0 ? `${escrowCount} Transaksi` : "100% Aman"}
                  </strong>
                  <span className="font-mono text-[10px] text-emerald-600 dark:text-[#10B981] mt-0.5 block truncate">
                    ● Kas Guild Terlindungi
                  </span>
                </div>
              </div>
            </div>

            {/* KOLOM KANAN (5 Kolom): Emblem Kompas + LIVE GUILD FLIGHT BOARD */}
            <div className="lg:col-span-5 space-y-4" id="flight-board">
              {/* Emblem Kompas Ungu LogHorizon */}
              <div className="p-6 bg-white dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45] flex flex-col items-center justify-center relative overflow-hidden text-center shadow-sm dark:shadow-none">
                <span className="absolute top-2 left-3 font-mono text-[10px] text-[#7C3AED]">+</span>
                <span className="absolute top-2 right-3 font-mono text-[10px] text-[#7C3AED]">+</span>
                <span className="absolute bottom-2 left-3 font-mono text-[10px] text-[#7C3AED]">+</span>
                <span className="absolute bottom-2 right-3 font-mono text-[10px] text-[#7C3AED]">+</span>
                <HeroLogo />
                <div className="mt-3 text-center">
                  <span className="font-mono text-[11px] text-slate-500 dark:text-[#A78BFA] uppercase tracking-wider block">
                    COMPASS CREST // SEJAK 2026
                  </span>
                  <span className="font-display font-bold text-xs text-slate-900 dark:text-[#F8FAFC] uppercase mt-0.5 block">
                    GERBANG UTAMA PETUALANG MULTI-GAME
                  </span>
                </div>
              </div>

              {/* LIVE GUILD FLIGHT BOARD (Data-Dense Airport Schedule Style - Real Time) */}
              <div className="bg-white dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45] divide-y divide-slate-100 dark:divide-[#2E1E45] rounded-none shadow-sm dark:shadow-none">
                <div className="p-3.5 bg-slate-100 dark:bg-[#09040F] flex items-center justify-between font-mono text-xs text-slate-900 dark:text-[#F8FAFC]">
                  <span className="font-bold flex items-center gap-2">
                    <Radio size={14} className="text-[#10B981] animate-pulse" />
                    <span>LIVE GUILD FLIGHT BOARD</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-[#10B981] font-bold">● DISPATCH AKTIF</span>
                </div>

                {/* Match Turnamen LIVE / Real Time */}
                <div className="p-3.5 hover:bg-slate-50 dark:hover:bg-[#1A0E2E] transition-colors">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#7C3AED] dark:text-[#A78BFA] font-bold">TURNAMEN LOGHORIZON</span>
                    {latestTournament ? (
                      <span className={`font-bold px-1.5 py-0.2 border ${
                        latestTournament.status === "ONGOING"
                          ? "text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30 animate-pulse"
                          : latestTournament.status === "REGISTRATION" || latestTournament.status === "OPEN"
                            ? "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30"
                            : "text-[#A78BFA] bg-[#A78BFA]/10 border-[#A78BFA]/30"
                      }`}>
                        {latestTournament.status === "ONGOING"
                          ? "LIVE MATCH"
                          : latestTournament.status === "REGISTRATION" || latestTournament.status === "OPEN"
                            ? "REGISTRASI BUKA"
                            : latestTournament.status}
                      </span>
                    ) : (
                      <span className="text-gray-500 font-bold px-1.5 py-0.2 bg-gray-500/10 border border-gray-500/30">
                        OFFLINE
                      </span>
                    )}
                  </div>
                  <div className="font-display font-bold text-sm text-slate-900 dark:text-[#F8FAFC] mt-1">
                    {latestTournament ? latestTournament.title : "Belum ada turnamen aktif"}
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 dark:text-[#A78BFA] mt-1">
                    <span>
                      {latestTournament
                        ? `Divisi: ${latestTournament.game} (${latestTournament.format})`
                        : "Tunggu pengumuman turnamen season berikutnya"}
                    </span>
                    <Link href="/events?view=turnamen" className="text-[#7C3AED] hover:underline font-bold">
                      {latestTournament ? "Bagan Turnamen ➔" : "Lihat Jadwal ➔"}
                    </Link>
                  </div>
                </div>

                {/* Party LFG Real Time */}
                <div className="p-3.5 hover:bg-slate-50 dark:hover:bg-[#1A0E2E] transition-colors">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#7C3AED] dark:text-[#A78BFA] font-bold">CARI TEMAN MABAR (LFG)</span>
                    {latestLfg ? (
                      <span className="text-amber-600 dark:text-[#F59E0B] font-bold px-1.5 py-0.2 bg-amber-500/10 border border-amber-500/30">
                        SLOT TERBUKA
                      </span>
                    ) : (
                      <span className="text-gray-500 font-bold px-1.5 py-0.2 bg-gray-500/10 border border-gray-500/30">
                        STANDBY
                      </span>
                    )}
                  </div>
                  <div className="font-display font-bold text-sm text-slate-900 dark:text-[#F8FAFC] mt-1">
                    {latestLfg
                      ? `${latestLfg.game} // ${latestLfg.description}`
                      : "Belum ada party mabar aktif • Buat Party Sekarang"}
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 dark:text-[#A78BFA] mt-1">
                    <span>
                      {latestLfg
                        ? `Target: ${latestLfg.targetRank || "Bebas"} (${latestLfg.maxSlots} Slot)`
                        : "Jadilah pelopor party pertamamu di komunitas"}
                    </span>
                    <Link href="/events?view=mabar" className="text-[#7C3AED] hover:underline font-bold">
                      {latestLfg ? "Gabung Party ➔" : "Buat Party ➔"}
                    </Link>
                  </div>
                </div>

                {/* Status Antrean Rekber Escrow */}
                <div className="p-3.5 hover:bg-slate-50 dark:hover:bg-[#1A0E2E] transition-colors">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#7C3AED] dark:text-[#A78BFA] font-bold">REKBER / ESCROW GUILD</span>
                    <span className="text-emerald-600 dark:text-[#10B981] font-bold px-1.5 py-0.2 bg-emerald-500/10 border border-emerald-500/30">
                      ESCROW READY
                    </span>
                  </div>
                  <div className="font-display font-bold text-sm text-slate-900 dark:text-[#F8FAFC] mt-1">
                    Transaksi Jual-Beli Akun &amp; Item Dijamin Kas Guild
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 dark:text-[#A78BFA] mt-1">
                    <span>{escrowCount > 0 ? `${escrowCount} Transaksi Terlindungi` : "Kas Guild Siap Mengawal Transaksi Pertama"}</span>
                    <Link href="/marketplace" className="text-[#7C3AED] hover:underline font-bold">
                      Buka Lapak Rekber ➔
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OFFICIAL GUILD ANNOUNCEMENT BOARD (PROMINENT FULL-WIDTH CARD) */}
      <GuildAnnouncementCard />

      {/* ===================================================================== */}
      {/* 01 / TENTANG GUILD (Clean Editorial Block)                             */}
      {/* ===================================================================== */}
      <section className="py-12 md:py-16 border-b border-slate-200 dark:border-[#2E1E45]" id="about-section">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="font-mono text-xs font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider mb-2">01 / TENTANG GUILD</div>
          <div className="mt-2 max-w-3xl text-left space-y-3">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC] uppercase">
              Tak perlu menjelajah <span className="text-[#7C3AED] dark:text-[#A78BFA]">sendirian.</span>
            </h2>
            <p className="font-sans text-sm sm:text-base text-slate-600 dark:text-[#A78BFA] leading-relaxed">
              LogHorizon adalah kompas bagi para solo queue gamer untuk menemukan rekan mabar (party) yang tepat.
              Kenalan baru, teman satu guild, dan petualangan epik berikutnya berawal dari sini.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 02 / DIVISI GAME (Data-Dense Sharp Cards)                             */}
      {/* ===================================================================== */}
      <section className="py-12 md:py-16 border-b border-slate-200 dark:border-[#2E1E45]">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="mb-8 text-left">
            <div className="font-mono text-xs font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider mb-2">02 / PILIH PETUALANGANMU</div>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC] uppercase">
              Satu guild. Banyak dunia.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {divisions.map(({ title, games, icon: Icon, code }) => (
              <article
                className="relative p-5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] hover:border-[#7C3AED] transition-all flex flex-col justify-between shadow-sm dark:shadow-none"
                key={title}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="size-10 rounded-none bg-slate-100 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45] text-[#7C3AED] dark:text-[#A78BFA] flex items-center justify-center">
                      <Icon size={20} />
                    </div>
                    <span className="text-xs font-mono text-[#7C3AED] dark:text-[#A78BFA] font-bold">{code}</span>
                  </div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-[#F8FAFC] uppercase">{title}</h3>
                  <p className="mt-1.5 font-mono text-xs text-slate-600 dark:text-[#A78BFA] leading-relaxed">{games}</p>
                </div>
                <div className="mt-6 pt-3 border-t border-slate-200 dark:border-[#2E1E45] flex items-center justify-between">
                  <span className="font-mono text-[11px] text-emerald-600 dark:text-[#10B981]">● Voice Room Standby</span>
                  <Link href="/events?view=mabar" aria-label={`Cari party ${title}`} className="text-[#7C3AED] dark:text-[#A78BFA] hover:text-[#6D28D9] dark:hover:text-[#F8FAFC] transition-colors">
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-start gap-3">
            <Link
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-none text-xs sm:text-sm font-mono font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-white border border-[#7C3AED] transition-colors shadow-sm"
              href="/events?view=mabar"
            >
              <span>Temukan Party (LFG Mabar)</span>
              <ArrowUpRight size={16} />
            </Link>
            <Link
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-none text-xs sm:text-sm font-mono font-bold border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] hover:border-[#7C3AED] text-slate-800 dark:text-[#F8FAFC] transition-colors shadow-sm dark:shadow-none"
              href="/marketplace"
            >
              <span>Buka Marketplace &amp; Rekber</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 03 / KEUNTUNGAN GUILD (Sharp Modular Grid)                            */}
      {/* ===================================================================== */}
      <section className="py-12 md:py-16 border-b border-slate-200 dark:border-[#2E1E45]">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="font-mono text-xs font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider mb-2">03 / KENAPA LOGHORIZON</div>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC] uppercase text-left">
            Party yang baik mengubah <span className="text-[#7C3AED] dark:text-[#A78BFA]">segalanya.</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {benefits.map(({ title, copy, icon: Icon, tag }) => (
              <article
                className="p-5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] hover:border-[#7C3AED] transition-all flex flex-col justify-between shadow-sm dark:shadow-none"
                key={title}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="size-10 rounded-none bg-slate-100 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45] text-[#7C3AED] dark:text-[#A78BFA] flex items-center justify-center">
                      <Icon size={20} />
                    </div>
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-[#10B981] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30">
                      {tag}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-[#F8FAFC] uppercase">{title}</h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-[#A78BFA] leading-relaxed">{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 04 / ATURAN KOMUNITAS                                                 */}
      {/* ===================================================================== */}
      <section className="py-12 md:py-16 border-b border-slate-200 dark:border-[#2E1E45]" id="rules">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
            <div className="text-left space-y-3">
              <div className="font-mono text-xs font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider">04 / KODE ETIK PETUALANG</div>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC] uppercase">
                Petualangan seru dimulai dari <span className="text-[#7C3AED] dark:text-[#A78BFA]">saling menghargai.</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A78BFA] leading-relaxed">
                Seluruh anggota guild diikat oleh komitmen sportivitas dan rasa saling menghargai. Pelanggaran berat seperti cheat dan penipuan ditindak tegas tanpa kompromi.
              </p>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 p-4 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-sm dark:shadow-none">
                <ShieldCheck size={20} className="text-[#10B981] shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-600 dark:text-[#A78BFA] leading-relaxed">
                  <strong className="text-slate-900 dark:text-[#F8FAFC]">Fair Play &amp; No Toxic</strong>: Junjung tinggi sportivitas dan saling menghormati rekan party di setiap kanal suara.
                </span>
              </li>
              <li className="flex items-start gap-3 p-4 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-sm dark:shadow-none">
                <UsersRound size={20} className="text-[#7C3AED] shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-600 dark:text-[#A78BFA] leading-relaxed">
                  <strong className="text-slate-900 dark:text-[#F8FAFC]">Solidaritas Tinggi</strong>: Bantu anggota guild yang membutuhkan, jangan tinggalkan tim di tengah pertempuran.
                </span>
              </li>
              <li className="flex items-start gap-3 p-4 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-sm dark:shadow-none">
                <Compass size={20} className="text-[#F59E0B] shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-600 dark:text-[#A78BFA] leading-relaxed">
                  <strong className="text-slate-900 dark:text-[#F8FAFC]">Keamanan Bersama</strong>: Nol toleransi terhadap penipuan (scam) maupun cheat ilegal. Transaksi wajib lewat Rekber.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 05 / STRUKTUR KASTA & HIERARKI KOMUNITAS                              */}
      {/* ===================================================================== */}
      <section className="py-12 md:py-16 border-b border-slate-200 dark:border-[#2E1E45]" id="roles">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="text-left">
              <div className="font-mono text-xs font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider mb-2">05 / STRUKTUR KOMUNITAS</div>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC] uppercase">
                Hierarki &amp; Peran di dalam Guild.
              </h2>
            </div>
            <Link href="/leaderboard" className="font-mono text-xs font-bold text-[#7C3AED] hover:underline inline-flex items-center gap-1.5 self-start sm:self-auto">
              Papan Peringkat Guild <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roleGroups.map((group) => (
              <article className="rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] p-5 shadow-sm dark:shadow-none" key={group.title}>
                <div className="pb-3 mb-3 border-b border-slate-200 dark:border-[#2E1E45]">
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-[#F8FAFC] uppercase">{group.title}</h3>
                  <p className="font-mono text-xs text-slate-500 dark:text-[#A78BFA] mt-0.5">{group.subtitle}</p>
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-[#2E1E45]/60">
                  {group.roles.map((role) => (
                    <li key={role.name} className="py-3 first:pt-0 last:pb-0">
                      <div className="font-mono font-bold text-xs tracking-wide text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                        {role.name}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-[#A78BFA] mt-1 leading-relaxed">
                        {role.desc}
                      </p>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 06 / SPONSOR RESMI                                                    */}
      {/* ===================================================================== */}
      <section className="py-12 border-y border-slate-200 dark:border-[#2A1B42] bg-slate-100/60 dark:bg-[#0B0613]">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="text-left">
            <p className="font-mono text-xs font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider mb-2">
              06 / PARTNER &amp; SPONSOR RESMI GUILD
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC] uppercase">
              Dukungan yang menjaga guild terus bergerak.
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-[#A78BFA] max-w-xl">
              Mitra dan sponsor terverifikasi yang mendanai turnamen serta operasional server LogHorizon.
            </p>
          </div>

          {sponsors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {sponsors.map((sp) => {
                const linkHref = sp.websiteUrl || "#";
                return (
                  <a
                    key={sp.id}
                    href={linkHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex items-center justify-center min-h-[140px] sm:min-h-[170px] p-6 sm:p-8 rounded-none bg-white dark:bg-[#11091D] border-2 border-slate-200 dark:border-[#2A1B42] hover:border-[#9D4EDD] shadow-sm dark:shadow-none hover:shadow-[0_0_30px_rgba(157,78,221,0.25)] transition-all duration-300"
                    title={sp.websiteUrl ? `Kunjungi ${sp.name}` : sp.name}
                  >
                    {/* Ikon panah pojok kecil (↗) sebagai penanda visual link klik */}
                    <span className="absolute top-3.5 right-3.5 p-1 text-slate-400 dark:text-[#A78BFA]/50 group-hover:text-[#7C3AED] dark:group-hover:text-[#C77DFF] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200">
                      <ArrowUpRight size={18} />
                    </span>

                    {sp.logoUrl ? (
                      <div className="relative w-full h-20 sm:h-28 max-w-[260px] flex items-center justify-center">
                        <Image
                          src={sp.logoUrl}
                          alt={sp.name || "Sponsor"}
                          fill
                          className="object-contain filter grayscale-[25%] group-hover:grayscale-0 transition-all duration-300 drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center">
                        <span className="font-display font-bold text-base sm:text-lg uppercase tracking-wider text-slate-900 dark:text-[#F8FAFC] group-hover:text-[#7C3AED] dark:group-hover:text-[#C77DFF] transition-colors">
                          {sp.name}
                        </span>
                        {sp.tier && (
                          <span className="mt-1.5 font-mono text-[10px] text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-widest px-2 py-0.5 bg-purple-50 dark:bg-[#1A0E2E] border border-purple-200 dark:border-[#2A1B42]">
                            {sp.tier}
                          </span>
                        )}
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="p-8 sm:p-12 text-center border-2 border-dashed border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] mt-8 shadow-sm dark:shadow-none">
              <p className="font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-[#A78BFA]">
                Slot Sponsor Terbuka untuk Mitra Komunitas
              </p>
              <p className="font-display text-sm font-bold text-slate-900 dark:text-[#F8FAFC] mt-1">
                Daftarkan Brand Anda Menjadi Sponsor Turnamen &amp; Komunitas LogHorizon
              </p>
            </div>
          )}

          <div className="mt-8 p-6 sm:p-8 rounded-none border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] flex flex-col sm:flex-row items-center justify-between gap-5 text-left shadow-sm dark:shadow-none">
            <div className="space-y-1">
              <p className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-[#F8FAFC] uppercase">
                Ingin Menjadi Mitra Resmi atau Sponsor Turnamen Guild?
              </p>
              <p className="text-xs text-slate-600 dark:text-[#A78BFA] max-w-xl leading-relaxed">
                Dukung prizepool kompetisi esports dan operasional server. Dapatkan badge kehormatan, eksposur brand di kartu showcase, serta peran eksklusif di ekosistem LogHorizon.
              </p>
            </div>
            <Link
              href="/donate"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-none text-xs font-mono font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] border border-[#7C3AED] transition-colors shrink-0 shadow-sm"
            >
              <span>Ajukan Kemitraan / Jadi Benefactor ➔</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 07 / CTA BANNER (Editorial Brutalism Strip)                           */}
      {/* ===================================================================== */}
      <section className="py-12 md:py-16" id="join">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="p-6 sm:p-10 rounded-none bg-white dark:bg-[#130921] border-2 border-[#7C3AED] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 shadow-md dark:shadow-none">
            <div className="space-y-1 text-left">
              <p className="font-mono text-xs font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider">07 / GABUNG GUILD</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F8FAFC] uppercase">
                Sudah siap melampaui horizon?
              </h2>
              <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-[#A78BFA]">
                Gabung sekarang bersama {totalMembers} petualang lintas platform PC, konsol, dan mobile.
              </p>
            </div>
            <a
              className="px-6 py-3.5 rounded-none bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-sans font-bold text-sm inline-flex items-center justify-center gap-2 border border-[#7C3AED] transition-colors whitespace-nowrap self-stretch sm:self-auto shadow-sm"
              href={discordInviteUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span>Connect Discord</span>
              <ArrowUpRight size={17} />
            </a>
          </div>
        </div>
      </section>

      {/* TIMED VISITOR ANNOUNCEMENT POPUP MODAL */}
      <AnnouncementPopupModal />
    </main>
  );
}