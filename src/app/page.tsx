import Link from "next/link";
import Image from "next/image";
import { HeroLogo } from "@/components/hero-logo";
import { GuildBroadcastBanner } from "@/components/guild-broadcast-banner";
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

import { prisma } from "@/lib/prisma";

export const instant = false;

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
  const [config, sponsors, latestTournaments, latestLfg, escrowCount] = await Promise.all([
    prisma.siteConfig.findUnique({ where: { id: "default" } }).catch(() => null),
    prisma.sponsor.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []),
    prisma.tournament.findMany({
      take: 2,
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, game: true, status: true, prizePool: true, maxSlots: true },
    }).catch(() => []),
    prisma.lfgPost.findMany({
      take: 2,
      orderBy: { createdAt: "desc" },
      select: { id: true, game: true, targetRank: true, maxSlots: true, description: true },
    }).catch(() => []),
    prisma.escrowTransaction.count().catch(() => 0),
  ]);

  const statMembers = config?.statMembers || "2,480+";
  const statParties = config?.statParties || "450+";
  const statPrize = "Rp 39.000.000";
  const discordInviteUrl = config?.discordInviteUrl || "https://discord.gg/aJvbVyTxNb";

  return (
    <main className="w-full max-w-full overflow-x-hidden bg-[#09040F] text-[#F8FAFC]">
      {/* 24-HOUR ACTIVE GUILD BROADCAST BANNER */}
      <GuildBroadcastBanner />

      {/* ===================================================================== */}
      {/* 3. HERO SECTION (Asymmetric 12-Column Grid: 7 Left : 5 Right)          */}
      {/* ===================================================================== */}
      <section className="relative py-10 sm:py-14 md:py-18 lg:py-20 border-b border-[#2E1E45]">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* KOLOM KIRI (7 Kolom): Headline, Deskripsi, CTA, dan 4 Metrik Statistik */}
            <div className="lg:col-span-7 text-left space-y-6">
              {/* Badge Mono di Atas */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#130921] border border-[#2E1E45] font-mono text-xs select-none">
                <span className="size-2 rounded-full bg-[#10B981] animate-pulse shrink-0" />
                <span className="text-[#A78BFA] font-bold tracking-widest uppercase">
                  MULTI-GAME COMMUNITY // LOGHORIZON HQ
                </span>
              </div>

              {/* Headline & Sub-headline */}
              <div className="space-y-2">
                <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight text-[#F8FAFC] uppercase leading-none select-none">
                  LOG<span className="text-[#A78BFA]">HORIZON</span>
                </h1>
                <p className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F8FAFC] uppercase tracking-tight leading-snug">
                  FIND YOUR PARTY.<br />
                  <span className="text-[#A78BFA]">BEYOND THE HORIZON.</span>
                </p>
              </div>

              {/* Deskripsi Asli */}
              <p className="font-sans text-sm sm:text-base md:text-lg text-[#A78BFA] max-w-xl leading-relaxed">
                Satu guild untuk semua petualang. Temukan rekan mabar sefrekuensi di PC, konsol, dan mobile, apa pun genre dan game favoritmu.
              </p>

              {/* CTA Buttons (Strict rounded-none) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <a
                  className="px-6 py-3.5 rounded-none bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F8FAFC] font-sans font-bold text-sm inline-flex items-center justify-center gap-2 border border-[#7C3AED] transition-colors"
                  href={discordInviteUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>Masuk Guild (Join Discord)</span>
                  <ArrowUpRight size={17} />
                </a>
                <a
                  className="px-6 py-3.5 rounded-none bg-[#130921] border border-[#2E1E45] hover:border-[#7C3AED] hover:bg-[#1A0E2E] text-[#F8FAFC] font-sans font-semibold text-sm inline-flex items-center justify-center transition-colors"
                  href="#flight-board"
                >
                  Jelajahi Komunitas
                </a>
              </div>

              {/* Baris 4 Metrik Statistik (Data-Dense JetBrains Mono) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-[#2E1E45]">
                <div className="p-3 bg-[#130921] border border-[#2E1E45]">
                  <span className="font-mono text-[10px] text-[#A78BFA] uppercase block">TOTAL PETUALANG</span>
                  <strong className="font-mono text-xl sm:text-2xl font-bold text-[#F8FAFC] block mt-0.5">{statMembers}</strong>
                  <span className="font-mono text-[10px] text-[#10B981] mt-0.5 block">● 100% Terverifikasi</span>
                </div>

                <div className="p-3 bg-[#130921] border border-[#2E1E45]">
                  <span className="font-mono text-[10px] text-[#A78BFA] uppercase block">SEASON 1 PRIZE</span>
                  <strong className="font-mono text-xl sm:text-2xl font-bold text-[#F59E0B] block mt-0.5">{statPrize}</strong>
                  <span className="font-mono text-[10px] text-[#A78BFA] mt-0.5 block">4 Turnamen Aktif</span>
                </div>

                <div className="p-3 bg-[#130921] border border-[#2E1E45]">
                  <span className="font-mono text-[10px] text-[#A78BFA] uppercase block">ACTIVE PARTY LFG</span>
                  <strong className="font-mono text-xl sm:text-2xl font-bold text-[#F8FAFC] block mt-0.5">{statParties}</strong>
                  <span className="font-mono text-[10px] text-[#10B981] mt-0.5 block">PC / Konsol / HP</span>
                </div>

                <div className="p-3 bg-[#130921] border border-[#2E1E45]">
                  <span className="font-mono text-[10px] text-[#A78BFA] uppercase block">REKBER ESCROW</span>
                  <strong className="font-mono text-xl sm:text-2xl font-bold text-[#10B981] block mt-0.5">
                    {escrowCount > 0 ? `${escrowCount} TRX` : "100% AMAN"}
                  </strong>
                  <span className="font-mono text-[10px] text-[#A78BFA] mt-0.5 block">Dijamin Kas Guild</span>
                </div>
              </div>
            </div>

            {/* KOLOM KANAN (5 Kolom): Emblem Kompas + LIVE GUILD FLIGHT BOARD */}
            <div className="lg:col-span-5 space-y-4" id="flight-board">
              {/* Emblem Kompas Ungu LogHorizon */}
              <div className="p-6 bg-[#130921] border border-[#2E1E45] flex flex-col items-center justify-center relative overflow-hidden text-center">
                <span className="absolute top-2 left-3 font-mono text-[10px] text-[#7C3AED]">+</span>
                <span className="absolute top-2 right-3 font-mono text-[10px] text-[#7C3AED]">+</span>
                <span className="absolute bottom-2 left-3 font-mono text-[10px] text-[#7C3AED]">+</span>
                <span className="absolute bottom-2 right-3 font-mono text-[10px] text-[#7C3AED]">+</span>
                <HeroLogo />
                <div className="mt-3 text-center">
                  <span className="font-mono text-[11px] text-[#A78BFA] uppercase tracking-wider block">
                    COMPASS CREST // SEJAK 2026
                  </span>
                  <span className="font-display font-bold text-xs text-[#F8FAFC] uppercase mt-0.5 block">
                    GERBANG UTAMA PETUALANG MULTI-GAME
                  </span>
                </div>
              </div>

              {/* LIVE GUILD FLIGHT BOARD (Data-Dense Airport Schedule Style) */}
              <div className="bg-[#130921] border border-[#2E1E45] divide-y divide-[#2E1E45] rounded-none">
                <div className="p-3.5 bg-[#09040F] flex items-center justify-between font-mono text-xs text-[#F8FAFC]">
                  <span className="font-bold flex items-center gap-2">
                    <Radio size={14} className="text-[#10B981] animate-pulse" />
                    <span>LIVE GUILD FLIGHT BOARD</span>
                  </span>
                  <span className="text-[10px] text-[#10B981] font-bold">● DISPATCH AKTIF</span>
                </div>

                {/* Match Turnamen LIVE */}
                <div className="p-3.5 hover:bg-[#1A0E2E] transition-colors">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#A78BFA] font-bold">TURNAMEN LEAGUE S1</span>
                    <span className="text-[#10B981] font-bold px-1.5 py-0.2 bg-[#10B981]/10 border border-[#10B981]/30">
                      LIVE MATCH
                    </span>
                  </div>
                  <div className="font-display font-bold text-sm text-[#F8FAFC] mt-1">
                    {latestTournaments[0]?.title || "LOGHORIZON INVITATIONAL: VORTEX vs KRONOS"}
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#A78BFA] mt-1">
                    <span>Divisi: {latestTournaments[0]?.game || "Valorant"}</span>
                    <Link href="/events?view=turnamen" className="text-[#7C3AED] hover:underline font-bold">
                      Bagan Turnamen ➔
                    </Link>
                  </div>
                </div>

                {/* Party LFG yang Kurang Slot */}
                <div className="p-3.5 hover:bg-[#1A0E2E] transition-colors">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#A78BFA] font-bold">CARI TEMAN MABAR (LFG)</span>
                    <span className="text-[#F59E0B] font-bold px-1.5 py-0.2 bg-[#F59E0B]/10 border border-[#F59E0B]/30">
                      SLOT TERBUKA
                    </span>
                  </div>
                  <div className="font-display font-bold text-sm text-[#F8FAFC] mt-1">
                    {latestLfg[0]?.game || "Valorant"} // {latestLfg[0]?.description || "5-Stack Push Radiant (Mic On)"}
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#A78BFA] mt-1">
                    <span>Rank: {latestLfg[0]?.targetRank || "Ascendant 2+"}</span>
                    <Link href="/events?view=mabar" className="text-[#7C3AED] hover:underline font-bold">
                      Gabung Party ➔
                    </Link>
                  </div>
                </div>

                {/* Status Antrean Rekber Escrow */}
                <div className="p-3.5 hover:bg-[#1A0E2E] transition-colors">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#A78BFA] font-bold">REKBER / ESCROW GUILD</span>
                    <span className="text-[#10B981] font-bold px-1.5 py-0.2 bg-[#10B981]/10 border border-[#10B981]/30">
                      ESCROW READY
                    </span>
                  </div>
                  <div className="font-display font-bold text-sm text-[#F8FAFC] mt-1">
                    Transaksi Jual-Beli Akun &amp; Item Dijamin 100% Kas Guild
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#A78BFA] mt-1">
                    <span>Bebas Biaya Admin untuk Kasta Tinggi</span>
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

      {/* ===================================================================== */}
      {/* 01 / TENTANG GUILD (Clean Editorial Block)                             */}
      {/* ===================================================================== */}
      <section className="py-12 md:py-16 border-b border-[#2E1E45]" id="about-section">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="font-mono text-xs font-bold text-[#A78BFA] uppercase tracking-wider mb-2">01 / TENTANG GUILD</div>
          <div className="mt-2 max-w-3xl text-left space-y-3">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#F8FAFC] uppercase">
              Tak perlu menjelajah <span className="text-[#A78BFA]">sendirian.</span>
            </h2>
            <p className="font-sans text-sm sm:text-base text-[#A78BFA] leading-relaxed">
              LogHorizon adalah kompas bagi para solo queue gamer untuk menemukan rekan mabar (party) yang tepat.
              Kenalan baru, teman satu guild, dan petualangan epik berikutnya berawal dari sini.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 02 / DIVISI GAME (Data-Dense Sharp Cards)                             */}
      {/* ===================================================================== */}
      <section className="py-12 md:py-16 border-b border-[#2E1E45]">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-left">
            <div className="font-mono text-xs font-bold text-[#A78BFA] uppercase tracking-wider mb-2">02 / PILIH PETUALANGANMU</div>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#F8FAFC] uppercase">
              Satu guild. Banyak dunia.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {divisions.map(({ title, games, icon: Icon, code }) => (
              <article
                className="relative p-5 rounded-none border border-[#2E1E45] bg-[#130921] hover:border-[#7C3AED] transition-all flex flex-col justify-between"
                key={title}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="size-10 rounded-none bg-[#1A0E2E] border border-[#2E1E45] text-[#A78BFA] flex items-center justify-center">
                      <Icon size={20} />
                    </div>
                    <span className="text-xs font-mono text-[#A78BFA] font-bold">{code}</span>
                  </div>
                  <h3 className="font-display text-base font-bold text-[#F8FAFC] uppercase">{title}</h3>
                  <p className="mt-1.5 font-mono text-xs text-[#A78BFA] leading-relaxed">{games}</p>
                </div>
                <div className="mt-6 pt-3 border-t border-[#2E1E45] flex items-center justify-between">
                  <span className="font-mono text-[11px] text-[#10B981]">● Voice Room Standby</span>
                  <Link href="/events?view=mabar" aria-label={`Cari party ${title}`} className="text-[#A78BFA] hover:text-[#F8FAFC] transition-colors">
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-start gap-3">
            <Link
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-none text-xs sm:text-sm font-mono font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F8FAFC] border border-[#7C3AED] transition-colors"
              href="/events?view=mabar"
            >
              <span>Temukan Party (LFG Mabar)</span>
              <ArrowUpRight size={16} />
            </Link>
            <Link
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-none text-xs sm:text-sm font-mono font-bold border border-[#2E1E45] bg-[#130921] hover:border-[#7C3AED] text-[#F8FAFC] transition-colors"
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
      <section className="py-12 md:py-16 border-b border-[#2E1E45]">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="font-mono text-xs font-bold text-[#A78BFA] uppercase tracking-wider mb-2">03 / KENAPA LOGHORIZON</div>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#F8FAFC] uppercase text-left">
            Party yang baik mengubah <span className="text-[#A78BFA]">segalanya.</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {benefits.map(({ title, copy, icon: Icon, tag }) => (
              <article
                className="p-5 rounded-none border border-[#2E1E45] bg-[#130921] hover:border-[#7C3AED] transition-all flex flex-col justify-between"
                key={title}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="size-10 rounded-none bg-[#1A0E2E] border border-[#2E1E45] text-[#A78BFA] flex items-center justify-center">
                      <Icon size={20} />
                    </div>
                    <span className="font-mono text-[10px] text-[#10B981] px-2 py-0.5 bg-[#10B981]/10 border border-[#10B981]/30">
                      {tag}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-[#F8FAFC] uppercase">{title}</h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#A78BFA] leading-relaxed">{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 04 / ATURAN KOMUNITAS                                                 */}
      {/* ===================================================================== */}
      <section className="py-12 md:py-16 border-b border-[#2E1E45]" id="rules">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
            <div className="text-left space-y-3">
              <div className="font-mono text-xs font-bold text-[#A78BFA] uppercase tracking-wider">04 / KODE ETIK PETUALANG</div>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#F8FAFC] uppercase">
                Petualangan seru dimulai dari <span className="text-[#A78BFA]">saling menghargai.</span>
              </h2>
              <p className="text-xs sm:text-sm text-[#A78BFA] leading-relaxed">
                Seluruh anggota guild diikat oleh komitmen sportivitas dan rasa saling menghargai. Pelanggaran berat seperti cheat dan penipuan ditindak tegas tanpa kompromi.
              </p>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 p-4 rounded-none border border-[#2E1E45] bg-[#130921]">
                <ShieldCheck size={20} className="text-[#10B981] shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-[#A78BFA] leading-relaxed">
                  <strong className="text-[#F8FAFC]">Fair Play &amp; No Toxic</strong>: Junjung tinggi sportivitas dan saling menghormati rekan party di setiap kanal suara.
                </span>
              </li>
              <li className="flex items-start gap-3 p-4 rounded-none border border-[#2E1E45] bg-[#130921]">
                <UsersRound size={20} className="text-[#7C3AED] shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-[#A78BFA] leading-relaxed">
                  <strong className="text-[#F8FAFC]">Solidaritas Tinggi</strong>: Bantu anggota guild yang membutuhkan, jangan tinggalkan tim di tengah pertempuran.
                </span>
              </li>
              <li className="flex items-start gap-3 p-4 rounded-none border border-[#2E1E45] bg-[#130921]">
                <Compass size={20} className="text-[#F59E0B] shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-[#A78BFA] leading-relaxed">
                  <strong className="text-[#F8FAFC]">Keamanan Bersama</strong>: Nol toleransi terhadap penipuan (scam) maupun cheat ilegal. Transaksi wajib lewat Rekber.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 05 / STRUKTUR KASTA & HIERARKI KOMUNITAS                              */}
      {/* ===================================================================== */}
      <section className="py-12 md:py-16 border-b border-[#2E1E45]" id="roles">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="text-left">
              <div className="font-mono text-xs font-bold text-[#A78BFA] uppercase tracking-wider mb-2">05 / STRUKTUR KOMUNITAS</div>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#F8FAFC] uppercase">
                Hierarki &amp; Peran di dalam Guild.
              </h2>
            </div>
            <Link href="/leaderboard" className="font-mono text-xs font-bold text-[#7C3AED] hover:underline inline-flex items-center gap-1.5 self-start sm:self-auto">
              Papan Peringkat Guild <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roleGroups.map((group) => (
              <article className="rounded-none border border-[#2E1E45] bg-[#130921] p-5 shadow-sm" key={group.title}>
                <div className="pb-3 mb-3 border-b border-[#2E1E45]">
                  <h3 className="font-display text-base font-bold text-[#F8FAFC] uppercase">{group.title}</h3>
                  <p className="font-mono text-xs text-[#A78BFA] mt-0.5">{group.subtitle}</p>
                </div>
                <ul className="divide-y divide-[#2E1E45]/60">
                  {group.roles.map((role) => (
                    <li key={role.name} className="py-3 first:pt-0 last:pb-0">
                      <div className="font-mono font-bold text-xs tracking-wide text-[#F8FAFC] flex items-center gap-2">
                        {role.name}
                      </div>
                      <p className="text-xs text-[#A78BFA] mt-1 leading-relaxed">
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
      <section className="py-12 md:py-16 border-b border-[#2E1E45]">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-left">
            <p className="font-mono text-xs font-bold text-[#A78BFA] uppercase tracking-wider mb-2">06 / SPONSOR RESMI</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC] uppercase">
              Dukungan yang menjaga guild terus bergerak.
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#A78BFA] max-w-xl">
              Mitra dan sponsor terverifikasi yang mendanai turnamen serta operasional server LogHorizon.
            </p>
          </div>

          {sponsors.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
              {sponsors.map((sp) => (
                <div
                  key={sp.id}
                  className="p-4 rounded-none border border-[#2E1E45] bg-[#130921] flex flex-col items-center text-center justify-between gap-3"
                >
                  {sp.logoUrl ? (
                    <div className="relative w-16 h-16 rounded-none overflow-hidden">
                      <Image src={sp.logoUrl} alt={sp.name} fill className="object-contain" />
                    </div>
                  ) : (
                    <div className="size-12 rounded-none bg-[#1A0E2E] border border-[#2E1E45] text-[#A78BFA] flex items-center justify-center font-display font-bold text-lg">
                      {sp.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-display font-bold text-sm text-[#F8FAFC] uppercase">{sp.name}</h3>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-[#1A0E2E] border border-[#2E1E45] text-[#A78BFA] mt-1 inline-block">
                      {sp.tier}
                    </span>
                  </div>
                  {sp.websiteUrl && (
                    <a
                      href={sp.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-[#7C3AED] hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      Kunjungi <ArrowUpRight size={12} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-6 rounded-none border border-[#2E1E45] bg-[#130921] flex flex-col sm:flex-row items-center justify-between gap-5 text-left">
            <div className="space-y-1">
              <p className="font-display text-sm font-bold text-[#F8FAFC] uppercase">
                Ingin Menjadi Mitra Resmi atau Sponsor Turnamen Guild?
              </p>
              <p className="text-xs text-[#A78BFA] max-w-lg leading-relaxed">
                Dukung prizepool kompetisi esports dan operasional server. Dapatkan badge kehormatan, eksposur brand, serta peran eksklusif di ekosistem LogHorizon.
              </p>
            </div>
            <Link
              href="/donate"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-none text-xs font-mono font-bold text-[#F8FAFC] bg-[#7C3AED] hover:bg-[#6D28D9] border border-[#7C3AED] transition-colors shrink-0"
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
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 sm:p-10 rounded-none bg-[#130921] border border-[#7C3AED] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-1 text-left">
              <p className="font-mono text-xs font-bold text-[#A78BFA] uppercase tracking-wider">07 / GABUNG GUILD</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F8FAFC] uppercase">
                Sudah siap melampaui horizon?
              </h2>
              <p className="font-sans text-xs sm:text-sm text-[#A78BFA]">
                Gabung sekarang bersama {statMembers} petualang lintas platform PC, konsol, dan mobile.
              </p>
            </div>
            <a
              className="px-6 py-3.5 rounded-none bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F8FAFC] font-sans font-bold text-sm inline-flex items-center justify-center gap-2 border border-[#7C3AED] transition-colors whitespace-nowrap self-stretch sm:self-auto"
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
    </main>
  );
}