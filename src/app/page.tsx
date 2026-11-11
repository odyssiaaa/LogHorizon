import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  AudioLines,
  Compass,
  Gamepad2,
  Globe2,
  ShieldCheck,
  Swords,
  Trophy,
  UsersRound,
} from "lucide-react";

const divisions = [
  { title: "FPS / Shooter", games: "Valorant · Apex Legends · CS2", icon: Swords },
  { title: "MOBA / Strategy", games: "Mobile Legends · Dota 2 · LoL", icon: Compass },
  { title: "RPG / Open World", games: "Genshin Impact · Elden Ring · Wuthering Waves", icon: Globe2 },
  { title: "Casual / Party", games: "Party Animals · Minecraft · Roblox", icon: Gamepad2 },
];

const benefits = [
  { title: "Guild Serba Ada", copy: "Dari ranked kompetitif sampai mabar santai, selalu ada party yang cocok.", icon: UsersRound },
  { title: "Voice Channel Aktif", copy: "Mabar terasa lebih seru dan taktis dengan rekan satu frekuensi 24/7.", icon: AudioLines },
  { title: "Event & Turnamen", copy: "Asah skill tim, ikuti turnamen berkala, dan rebut hadiah kejayaan bersama guild.", icon: Trophy },
];

const roleGroups = [
  {
    title: "Kasta Penguasa",
    subtitle: "Petinggi & Pembuat Kebijakan Guild",
    roles: [
      { name: "👑 Emperor", desc: "Pemilik tunggal guild (Owner) dengan kendali absolut atas arah dan visi komunitas." },
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

export default function Home() {
  return (
    <main className="w-full max-w-full overflow-x-hidden">
      {/* HERO SECTION */}
      <section className="hero-section relative overflow-hidden py-12 sm:py-16 md:py-24 border-b border-gray-200 dark:border-[#211C2B]">
        <div className="hero-glow" aria-hidden="true" />
        <div className="page-shell px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="hero-copy lg:col-span-7">
              <p className="eyebrow inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[#9D4EDD] dark:text-[#C77DFF] uppercase mb-2">
                <span className="status-dot w-2 h-2 rounded-full bg-[#42d99b] inline-block animate-pulse" />
                MULTI-GAME COMMUNITY
              </p>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-gray-900 dark:text-white break-words leading-none">
                LOG<span className="text-[#9D4EDD] dark:text-[#C77DFF]">HORIZON</span>
              </h1>
              <p className="hero-tagline text-lg sm:text-xl md:text-2xl font-extrabold tracking-wider text-gray-800 dark:text-gray-100 mt-4 leading-snug">
                FIND YOUR PARTY.<br className="hidden sm:inline" /> BEYOND THE HORIZON.
              </p>
              <p className="hero-description text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-lg mt-3 leading-relaxed">
                Satu guild untuk semua petualang. Temukan rekan mabar sefrekuensi di PC, konsol,
                dan mobile—apa pun genre dan game favoritmu.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 mt-6">
                <a className="button button-discord button-large w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold" href="https://discord.gg/aJvbVyTxNb" target="_blank" rel="noreferrer">
                  <span>Masuk Guild (Join Discord)</span>
                  <ArrowUpRight size={18} />
                </a>
                <a className="button button-quiet w-full sm:w-auto inline-flex items-center justify-center text-sm font-semibold" href="#about-section">
                  Jelajahi Komunitas
                </a>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-6 mt-8 pt-6 border-t border-gray-200 dark:border-[#211C2B] max-w-lg">
                <div>
                  <strong className="block text-xl sm:text-2xl font-black text-gray-900 dark:text-white">1,200+</strong>
                  <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">Anggota Guild</span>
                </div>
                <div>
                  <strong className="block text-xl sm:text-2xl font-black text-gray-900 dark:text-white">400+</strong>
                  <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">Party Terbentuk</span>
                </div>
                <div>
                  <strong className="block text-xl sm:text-2xl font-black text-gray-900 dark:text-white">24/7</strong>
                  <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">Voice Aktif</span>
                </div>
              </div>
            </div>
            <div className="hero-emblem-wrap lg:col-span-5 flex justify-center mt-6 lg:mt-0">
              <Image
                className="hero-logo w-44 sm:w-60 md:w-72 lg:w-full max-w-[320px] h-auto object-contain drop-shadow-2xl"
                src="/loghorizon-logo.png"
                alt="Logo komunitas LogHorizon: Find your party. Beyond the horizon."
                width={768}
                height={768}
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* 01 / TENTANG GUILD */}
      <section className="section-shell py-12 md:py-20 px-4 sm:px-6 lg:px-8 border-b border-gray-200 dark:border-[#211C2B]" id="about-section">
        <div className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-2">01 / TENTANG GUILD</div>
        <div className="about-content mt-2 max-w-3xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white break-words">
            Tak perlu menjelajah <span className="text-[#9D4EDD] dark:text-[#C77DFF]">sendirian.</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            LogHorizon adalah kompas bagi para solo queue gamer untuk menemukan rekan mabar (party) yang tepat.
            Kenalan baru, teman satu guild, dan petualangan epik berikutnya—semuanya bermula dari sini.
          </p>
        </div>
      </section>

      {/* 02 / DIVISI GAME */}
      <section className="section-shell py-12 md:py-20 px-4 sm:px-6 lg:px-8 border-b border-gray-200 dark:border-[#211C2B]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-2">02 / PILIH PETUALANGANMU</div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white break-words">
              Satu guild. Banyak dunia.
            </h2>
          </div>
          <Link href="/forum" className="text-link text-xs sm:text-sm font-bold text-[#9D4EDD] hover:underline inline-flex items-center gap-1.5 self-start sm:self-auto">
            Temukan party <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {divisions.map(({ title, games, icon: Icon }, index) => (
            <article className="division-card relative p-5 sm:p-6 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] hover:border-[#9D4EDD]/60 transition-all flex flex-col justify-between" key={title}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded bg-[#9D4EDD]/10 text-[#9D4EDD] dark:text-[#C77DFF] flex items-center justify-center">
                    <Icon size={20} />
                  </div>
                  <span className="text-[11px] font-mono text-gray-400">0{index + 1}</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white break-words">{title}</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{games}</p>
              </div>
              <div className="mt-4 pt-3 flex justify-end">
                <Link href="/forum" aria-label={`Cari party ${title}`} className="text-[#9D4EDD] hover:text-[#C77DFF]">
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link className="marketplace-cta inline-flex items-center gap-2 px-6 py-3 rounded-md text-xs sm:text-sm font-bold border border-gray-300 dark:border-[#262033] bg-white dark:bg-[#120F17] hover:border-[#9D4EDD] transition-colors" href="/marketplace">
            <span>Buka Forum Jual-Beli &amp; Promosi</span>
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>

      {/* 03 / KEUNTUNGAN GUILD */}
      <section className="section-shell py-12 md:py-20 px-4 sm:px-6 lg:px-8 border-b border-gray-200 dark:border-[#211C2B]">
        <div className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-2">03 / KENAPA LOGHORIZON</div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white break-words">
          Party yang baik mengubah <span className="text-[#9D4EDD] dark:text-[#C77DFF]">segalanya.</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-8">
          {benefits.map(({ title, copy, icon: Icon }) => (
            <article className="benefit-card p-5 sm:p-6 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] hover:border-[#9D4EDD]/60 transition-all" key={title}>
              <div className="w-10 h-10 rounded bg-[#9D4EDD]/10 text-[#9D4EDD] dark:text-[#C77DFF] flex items-center justify-center mb-4">
                <Icon size={20} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white break-words">{title}</h3>
              <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 04 / ATURAN KOMUNITAS */}
      <section className="section-shell py-12 md:py-20 px-4 sm:px-6 lg:px-8 border-b border-gray-200 dark:border-[#211C2B]" id="rules">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <div className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-2">04 / MAIN BARENG, TETAP NYAMAN</div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white break-words">
              Petualangan seru dimulai dari <span className="text-[#9D4EDD] dark:text-[#C77DFF]">saling menghargai.</span>
            </h2>
          </div>
          <ul className="rules-list space-y-4">
            <li className="flex items-start gap-3 p-4 rounded-md border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
              <ShieldCheck size={20} className="text-[#9D4EDD] shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Fair Play & No Toxic</strong> — Junjung tinggi sportivitas dan saling menghormati rekan party.
              </span>
            </li>
            <li className="flex items-start gap-3 p-4 rounded-md border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
              <UsersRound size={20} className="text-[#9D4EDD] shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Solidaritas Tinggi</strong> — Bantu anggota guild yang membutuhkan, jangan tinggalkan tim di tengah pertempuran.
              </span>
            </li>
            <li className="flex items-start gap-3 p-4 rounded-md border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
              <Compass size={20} className="text-[#9D4EDD] shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Keamanan Bersama</strong> — Nol toleransi terhadap penipuan (scam) maupun cheat ilegal.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* 05 / STRUKTUR KASTA & HIERARKI KOMUNITAS */}
      <section className="section-shell py-12 md:py-20 px-4 sm:px-6 lg:px-8 border-b border-gray-200 dark:border-[#211C2B]" id="roles">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-2">05 / STRUKTUR KOMUNITAS</div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white break-words">
              Hierarki &amp; Peran di dalam Guild.
            </h2>
          </div>
          <Link href="/leaderboard" className="text-link text-xs sm:text-sm font-bold text-[#9D4EDD] hover:underline inline-flex items-center gap-1.5 self-start sm:self-auto">
            Papan Peringkat Guild <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="role-grid grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {roleGroups.map((group) => (
            <article className="role-card rounded-md border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] p-4 sm:p-6 shadow-sm" key={group.title}>
              <div className="role-card-header pb-3 mb-4 border-b border-gray-100 dark:border-[#211C2B]">
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight break-words">{group.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{group.subtitle}</p>
              </div>
              <ul className="role-card-list space-y-2.5">
                {group.roles.map((role) => (
                  <li key={role.name} className="p-3 rounded bg-gray-50 dark:bg-[#16121F] border border-gray-100 dark:border-[#262033] transition-colors hover:border-[#9D4EDD]/40">
                    <div className="role-pill-name font-bold text-xs tracking-wide text-purple-900 dark:text-purple-300 flex items-center gap-2">
                      {role.name}
                    </div>
                    <p className="role-pill-desc text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed break-words">
                      {role.desc}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* 06 / SPONSOR RESMI */}
      <section className="section-shell py-12 md:py-16 px-4 sm:px-6 lg:px-8 border-b border-gray-200 dark:border-[#211C2B]">
        <div>
          <p className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-2">06 / SPONSOR RESMI</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white break-words">
            Dukungan yang menjaga guild terus bergerak.
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-xl">
            Mitra dan sponsor terverifikasi yang mendanai turnamen serta operasional server LogHorizon.
          </p>
        </div>
        <div className="mt-6 p-6 sm:p-8 rounded-lg border border-dashed border-gray-300 dark:border-[#2A2438] bg-white/40 dark:bg-[#120F17]/50 flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
          <div className="space-y-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              Ingin Menjadi Mitra Resmi atau Sponsor Turnamen Guild?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-lg leading-relaxed">
              Dukung prizepool kompetisi esports dan operasional server. Dapatkan badge kehormatan, eksposur brand, serta peran eksklusif di ekosistem LogHorizon.
            </p>
          </div>
          <Link
            href="/donate"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold text-white bg-[#9D4EDD] hover:bg-[#8338EC] transition-colors shrink-0 shadow-sm shadow-[#9D4EDD]/25"
          >
            <span>Ajukan Kemitraan / Jadi Benefactor ➡️</span>
          </Link>
        </div>
      </section>

      {/* 07 / CTA BANNER */}
      <section className="section-shell py-12 md:py-20 px-4 sm:px-6 lg:px-8" id="join">
        <div className="p-6 sm:p-10 rounded-xl bg-gradient-to-r from-purple-950/40 via-neutral-900/60 to-purple-950/30 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-1">07 / GABUNG GUILD</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white break-words">
              Sudah siap melampaui horizon?
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">Gabung sekarang bersama 1,200+ petualang lintas platform.</p>
          </div>
          <a className="button button-discord inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-bold text-white whitespace-nowrap self-stretch sm:self-auto" href="https://discord.gg/aJvbVyTxNb" target="_blank" rel="noreferrer">
            <span>Connect Discord</span>
            <ArrowUpRight size={17} />
          </a>
        </div>
      </section>
    </main>
  );
}