import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  AudioLines,
  Compass,
  Crown,
  Gamepad2,
  Globe2,
  Headphones,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
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
    <main>
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-glow" aria-hidden="true" />
        <div className="page-shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" /> MULTI-GAME COMMUNITY</p>
            <h1>LOG<span>HORIZON</span></h1>
            <p className="hero-tagline">FIND YOUR PARTY.<br />BEYOND THE HORIZON.</p>
            <p className="hero-description">
              Satu guild untuk semua petualang. Temukan rekan mabar sefrekuensi di PC, konsol,
              dan mobile—apa pun genre dan game favoritmu.
            </p>
            <div className="hero-actions">
              <a className="button button-discord button-large" href="https://discord.gg/aJvbVyTxNb" target="_blank" rel="noreferrer">
                Masuk Guild <span>(Join Discord)</span><ArrowUpRight size={18} />
              </a>
              <a className="button button-quiet" href="#about-section">Jelajahi Komunitas</a>
            </div>
            <div className="hero-stats">
              <div><strong>1,200+</strong><span>Anggota Guild</span></div>
              <div><strong>400+</strong><span>Party Terbentuk</span></div>
              <div><strong>24/7</strong><span>Voice Room Aktif</span></div>
            </div>
          </div>
          <div className="hero-emblem-wrap">
            <Image
              className="hero-logo"
              src="/loghorizon-logo.png"
              alt="Logo komunitas LogHorizon: Find your party. Beyond the horizon."
              width={768}
              height={768}
              priority
            />
          </div>
        </div>
      </section>

      {/* 01 / TENTANG GUILD */}
      <section className="section-shell about-section" id="about-section">
        <div className="section-kicker">01 / TENTANG GUILD</div>
        <div className="about-content">
          <h2>Tak perlu menjelajah <span>sendirian.</span></h2>
          <p>
            LogHorizon adalah kompas bagi para solo queue gamer untuk menemukan rekan mabar (party) yang tepat.
            Kenalan baru, teman satu guild, dan petualangan epik berikutnya—semuanya bermula dari sini.
          </p>
        </div>
      </section>

      {/* 02 / DIVISI GAME */}
      <section className="section-shell division-section">
        <div className="section-heading">
          <div>
            <div className="section-kicker">02 / PILIH PETUALANGANMU</div>
            <h2>Satu guild. Banyak dunia.</h2>
          </div>
          <Link href="/forum" className="text-link">Temukan party <ArrowUpRight size={16} /></Link>
        </div>
        <div className="division-grid">
          {divisions.map(({ title, games, icon: Icon }, index) => (
            <article className="division-card" key={title}>
              <div className="division-index">0{index + 1}</div>
              <div className="division-icon"><Icon size={21} /></div>
              <h3>{title}</h3>
              <p>{games}</p>
              <Link href="/forum" aria-label={`Cari party ${title}`}><ArrowUpRight size={17} /></Link>
            </article>
          ))}
        </div>
        <Link className="marketplace-cta" href="/marketplace">
          Buka Forum Jual-Beli &amp; Promosi <ArrowUpRight size={17} />
        </Link>
      </section>

      {/* 03 / KEUNTUNGAN GUILD */}
      <section className="section-shell community-section">
        <div className="section-kicker">03 / KENAPA LOGHORIZON</div>
        <h2>Party yang baik mengubah <span>segalanya.</span></h2>
        <div className="benefit-grid">
          {benefits.map(({ title, copy, icon: Icon }) => (
            <article className="benefit-card" key={title}>
              <div className="benefit-icon"><Icon size={21} /></div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 04 / ATURAN KOMUNITAS */}
      <section className="section-shell rules-section" id="rules">
        <div>
          <div className="section-kicker">04 / MAIN BARENG, TETAP NYAMAN</div>
          <h2>Petualangan seru dimulai dari <span>saling menghargai.</span></h2>
        </div>
        <ul className="rules-list">
          <li>
            <ShieldCheck size={19} />
            <span><strong>Fair Play & No Toxic</strong> — Junjung tinggi sportivitas dan saling menghormati rekan party.</span>
          </li>
          <li>
            <UsersRound size={19} />
            <span><strong>Solidaritas Tinggi</strong> — Bantu anggota guild yang membutuhkan, jangan tinggalkan tim di tengah pertempuran.</span>
          </li>
          <li>
            <Compass size={19} />
            <span><strong>Keamanan Bersama</strong> — Nol toleransi terhadap penipuan (scam) maupun cheat ilegal.</span>
          </li>
        </ul>
      </section>

      {/* 05 / STRUKTUR KASTA & HIERARKI KOMUNITAS */}
      <section className="section-shell role-section" id="roles">
        <div className="section-heading">
          <div>
            <div className="section-kicker">05 / STRUKTUR KOMUNITAS</div>
            <h2>Hierarki &amp; Peran di dalam Guild.</h2>
          </div>
          <Link href="/leaderboard" className="text-link">Papan Peringkat Guild <ArrowUpRight size={16} /></Link>
        </div>
        <div className="role-grid">
          {roleGroups.map((group) => (
            <article className="role-card" key={group.title}>
              <div className="role-card-header">
                <h3>{group.title}</h3>
                <p>{group.subtitle}</p>
              </div>
              <ul className="role-card-list">
                {group.roles.map((role) => (
                  <li key={role.name}>
                    <div className="role-pill-name">{role.name}</div>
                    <p className="role-pill-desc">{role.desc}</p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* 06 / SPONSOR RESMI */}
      <section className="section-shell sponsors-section">
        <div>
          <p className="section-kicker">OFFICIAL SPONSORS</p>
          <h2>Dukungan yang menjaga guild terus bergerak.</h2>
          <p className="muted-copy">Mitra dan sponsor terverifikasi yang mendanai turnamen serta operasional server LogHorizon.</p>
        </div>
        <div className="sponsor-placeholder">Belum ada sponsor terverifikasi</div>
      </section>

      {/* CTA BANNER */}
      <section className="join-banner section-shell" id="join">
        <div>
          <p className="section-kicker">PARTY-MU MENUNGGU</p>
          <h2>Sudah siap melampaui horizon?</h2>
        </div>
        <a className="button button-discord" href="https://discord.gg/aJvbVyTxNb" target="_blank" rel="noreferrer">
          Connect Discord <ArrowUpRight size={17} />
        </a>
      </section>
    </main>
  );
}
