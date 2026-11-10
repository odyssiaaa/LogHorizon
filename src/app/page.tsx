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
              <Link className="button button-quiet" href="/forum">Jelajahi komunitas</Link>
            </div>
            <div className="hero-proof"><span><UsersRound size={15} /> Teman baru</span><span><ShieldCheck size={15} /> Komunitas aman</span><span><Gamepad2 size={15} /> Semua game</span></div>
          </div>
          <div className="hero-emblem-wrap"><Image className="hero-logo" src="/loghorizon-logo.png" alt="Logo komunitas LogHorizon: Find your party. Beyond the horizon." width={768} height={768} priority /></div>
        </div>
      </section>

      <section className="section-shell about-section">
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
      </section>

      <section className="section-shell community-section">
        <div className="section-kicker">03 / KENAPA LOGHORIZON</div><h2>Party yang baik mengubah <span>segalanya.</span></h2>
        <div className="benefit-grid">{benefits.map(({ title, copy, icon: Icon }) => <article className="benefit-card" key={title}><div className="benefit-icon"><Icon size={21} /></div><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className="section-shell rules-section" id="rules">
        <div><div className="section-kicker">04 / MAIN BARENG, TETAP NYAMAN</div><h2>Petualangan seru dimulai dari <span>saling menghargai.</span></h2></div>
        <ul className="rules-list"><li><ShieldCheck size={19} /><span><strong>Fair Play & No Toxic</strong> — tetap sportif dan saling menghormati.</span></li><li><UsersRound size={19} /><span><strong>Solidaritas Tinggi</strong> — bantu teman guild, jangan tinggalkan party.</span></li><li><Compass size={19} /><span><strong>Keamanan Bersama</strong> — No Scam / Cheat, jujur dan jaga komunitas.</span></li></ul>
      </section>

      <section className="join-banner section-shell" id="join">
        <div><p className="section-kicker">PARTY-MU MENUNGGU</p><h2>Sudah siap melampaui horizon?</h2></div>
        <a className="button button-discord" href="https://discord.gg/aJvbVyTxNb" target="_blank" rel="noreferrer">Connect Discord <ArrowUpRight size={17} /></a>
      </section>
    </main>
  );
}
