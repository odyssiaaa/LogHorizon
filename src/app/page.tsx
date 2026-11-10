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
  { title: "Guild Serba Ada", copy: "Dari ranked sampai santai, selalu ada party yang cocok.", icon: UsersRound },
  { title: "Voice Channel Aktif", copy: "Mabar terasa lebih seru dengan teman satu frekuensi.", icon: AudioLines },
  { title: "Event & Turnamen", copy: "Asah skill, ikuti event, dan rebut hadiah bersama guild.", icon: Trophy },
];

const roleGroups = [
  {
    title: "Kasta Penguasa",
    description: "Kepemimpinan dan kebijakan guild.",
    roles: [
      ["👑 Emperor", "Pemilik guild dan penentu arah komunitas."],
      ["✨ Prince / Princess", "Manajemen inti, infrastruktur, dan event besar."],
      ["📘 Grand Chancellor", "Manajemen inti dan kebijakan guild."],
    ],
  },
  {
    title: "Kasta Penjaga",
    description: "Keamanan, moderasi, dan ketertiban komunitas.",
    roles: [["⚔️ Lord Commander", "Moderator yang menjaga forum dan menindak pelanggaran."]],
  },
  {
    title: "Kasta Khusus Donatur",
    description: "Gelar kehormatan untuk kontributor komunitas.",
    roles: [
      ["💎 Noble Patron", "Penyokong turnamen komunitas."],
      ["👑 High Merchant", "Pendukung kas dan operasional guild."],
      ["🛡️ Knight", "Kontributor operasional komunitas."],
    ],
  },
  {
    title: "Kasta Warga",
    description: "Kreator dan petualang yang menghidupkan guild.",
    roles: [
      ["📢 Streamer", "Kreator konten siaran."],
      ["🎨 Artist", "Kreator karya visual."],
      ["🎵 Music Lover", "Pecinta dan kurator musik."],
      ["👥 Citizen", "Warga komunitas."],
      ["🎮 Gamer", "Petualang aktif lintas game."],
    ],
  },
];

export default function Home() {
  return (
    <main>
      <section className="hero-section">
        <div className="hero-glow" aria-hidden="true" />
        <div className="page-shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" /> MULTI-GAME COMMUNITY</p>
            <h1>LOG<span>HORIZON</span></h1>
            <p className="hero-tagline">FIND YOUR PARTY.<br />BEYOND THE HORIZON.</p>
            <p className="hero-description">
              Satu guild untuk semua petualang. Temukan teman mabar di PC, konsol,
              dan mobile—apa pun game favoritmu.
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
          <div className="hero-emblem-wrap"><Image className="hero-logo" src="/loghorizon-logo.png" alt="Logo komunitas LogHorizon: Find your party. Beyond the horizon." width={768} height={768} priority /></div>
        </div>
      </section>

      <section className="section-shell role-section" id="roles">
        <div className="section-heading"><div><div className="section-kicker">05 / STRUKTUR KOMUNITAS</div><h2>Peran di dalam guild.</h2></div><Link href="/#rules" className="text-link">Aturan komunitas <ArrowUpRight size={16} /></Link></div>
        <div className="role-groups">
          {roleGroups.map((group) => <article className="role-group" key={group.title}>
            <p className="section-kicker">{group.title}</p><p className="role-group-description">{group.description}</p>
            <ul>{group.roles.map(([name, description]) => <li key={name}><strong>{name}</strong><span>{description}</span></li>)}</ul>
          </article>)}
        </div>
      </section>

      <section className="section-shell about-section" id="about-section">
        <div className="section-kicker">01 / TENTANG GUILD</div>
        <div className="about-content">
          <h2>Tak perlu menjelajah <span>sendirian.</span></h2>
          <p>LogHorizon adalah kompas bagi solo gamer untuk menemukan rekan mabar (party) yang tepat. Kenalan baru, teman satu game, dan petualangan seru berikutnya—semuanya dimulai dari sini.</p>
        </div>
      </section>

      <section className="section-shell division-section">
        <div className="section-heading"><div><div className="section-kicker">02 / PILIH PETUALANGANMU</div><h2>Satu guild. Banyak dunia.</h2></div><Link href="/forum" className="text-link">Temukan party <ArrowUpRight size={16} /></Link></div>
        <div className="division-grid">
          {divisions.map(({ title, games, icon: Icon }, index) => (
            <article className="division-card" key={title}>
              <div className="division-index">0{index + 1}</div><div className="division-icon"><Icon size={21} /></div>
              <h3>{title}</h3><p>{games}</p><Link href="/forum" aria-label={`Cari party ${title}`}><ArrowUpRight size={17} /></Link>
            </article>
          ))}
        </div>
        <Link className="marketplace-cta" href="/marketplace">Buka Forum Jual-Beli &amp; Promosi <ArrowUpRight size={17} /></Link>
      </section>

      <section className="section-shell community-section">
        <div className="section-kicker">03 / KENAPA LOGHORIZON</div><h2>Party yang baik mengubah <span>segalanya.</span></h2>
        <div className="benefit-grid">{benefits.map(({ title, copy, icon: Icon }) => <article className="benefit-card" key={title}><div className="benefit-icon"><Icon size={21} /></div><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className="section-shell rules-section" id="rules">
        <div><div className="section-kicker">04 / MAIN BARENG, TETAP NYAMAN</div><h2>Petualangan seru dimulai dari <span>saling menghargai.</span></h2></div>
        <ul className="rules-list"><li><ShieldCheck size={19} /><span><strong>Fair Play & No Toxic</strong> — tetap sportif dan saling menghormati.</span></li><li><UsersRound size={19} /><span><strong>Solidaritas Tinggi</strong> — bantu teman guild, jangan tinggalkan party.</span></li><li><Compass size={19} /><span><strong>Keamanan Bersama</strong> — No Scam / Cheat, jujur dan jaga komunitas.</span></li></ul>
      </section>

      <section className="section-shell sponsors-section">
        <div><p className="section-kicker">OFFICIAL SPONSORS</p><h2>Dukungan yang menjaga guild terus bergerak.</h2><p className="muted-copy">Nama sponsor akan ditampilkan setelah pembayaran terverifikasi dan persetujuan publikasi tersedia.</p></div>
        <div className="sponsor-placeholder">Belum ada sponsor terverifikasi</div>
      </section>

      <section className="join-banner section-shell" id="join">
        <div><p className="section-kicker">PARTY-MU MENUNGGU</p><h2>Sudah siap melampaui horizon?</h2></div>
        <a className="button button-discord" href="https://discord.gg/aJvbVyTxNb" target="_blank" rel="noreferrer">Connect Discord <ArrowUpRight size={17} /></a>
      </section>
    </main>
  );
}
