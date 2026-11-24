import Link from "next/link";
import { Trophy, Crown, Medal, Swords, Users, ExternalLink, Sparkles, ChevronRight } from "lucide-react";
import { DiscordAvatar } from "@/components/discord-avatar";
import { getCasteTitle, getCasteBadgeStyle } from "@/lib/caste-hierarchy";
import { getCustomTitleBadge } from "@/lib/armory-catalog";

interface TopAdventurer {
  id: string;
  username: string | null;
  avatar: string | null;
  level: number;
  xp: number;
  role: string;
  isPremium?: boolean;
  trialType?: string | null;
  trialExpiresAt?: Date | string | null;
  equippedAvatarFrame?: string | null;
  equippedCustomTitle?: string | null;
  partyMembership?: {
    party: {
      name: string;
      tag: string;
    };
  } | null;
}

interface TopParty {
  id: string;
  name: string;
  tag: string;
  primaryGame: string;
  emblemColor: string;
  totalPartyXp: number;
  membersCount: number;
}

interface ChampionEntry {
  id: string;
  tournamentTitle: string;
  game: string;
  season?: string | null;
  championTeam: string;
  prizePool?: string | null;
  crownedAt: Date | string;
}

interface PodiumShowcaseProps {
  topAdventurers: TopAdventurer[];
  topParties: TopParty[];
  latestChampions: ChampionEntry[];
}

export function HomepagePodiumShowcase({
  topAdventurers,
  topParties,
  latestChampions,
}: PodiumShowcaseProps) {
  const podiumAccents = [
    {
      label: "Juara 1",
      badge: "🥇 EMAS",
      border: "border-amber-400/60 dark:border-amber-400/50",
      bg: "bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent",
      tagColor: "text-amber-500 dark:text-amber-400 bg-amber-500/15 border-amber-500/30",
      rankNum: "1",
    },
    {
      label: "Juara 2",
      badge: "🥈 PERAK",
      border: "border-slate-300 dark:border-slate-400/40",
      bg: "bg-gradient-to-br from-slate-400/10 via-slate-400/5 to-transparent",
      tagColor: "text-slate-600 dark:text-slate-300 bg-slate-500/15 border-slate-400/30",
      rankNum: "2",
    },
    {
      label: "Juara 3",
      badge: "🥉 PERUNGGU",
      border: "border-amber-700/60 dark:border-amber-600/40",
      bg: "bg-gradient-to-br from-amber-700/10 via-amber-700/5 to-transparent",
      tagColor: "text-amber-700 dark:text-amber-500 bg-amber-700/15 border-amber-700/30",
      rankNum: "3",
    },
  ];

  return (
    <section className="py-12 md:py-16 border-b border-slate-200 dark:border-[#2E1E45] relative overflow-hidden">
      {/* Subtle Glow Background Accents */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8 text-left">
          <div>
            <div className="font-mono text-xs font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Crown size={14} className="text-amber-400" />
              <span>PODIUM PRESTASI &amp; HALL OF FAME GUILD</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-[#F8FAFC]">
              👑 Tahta Juara &amp; Top Petualang
            </h2>
          </div>
          <p className="font-mono text-xs text-slate-500 dark:text-[#A78BFA] max-w-sm">
            Apresiasi tertinggi bagi petualang paling aktif dan tim peraih kejayaan di arena kompetisi.
          </p>
        </div>

        {/* 2-Column Balanced Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* ========================================================================= */}
          {/* KOLOM KIRI: TOP 3 PETUALANG & TOP GUILD PARTY */}
          {/* ========================================================================= */}
          <div className="p-5 sm:p-6 rounded-none bg-white dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45] shadow-sm flex flex-col justify-between space-y-5 text-left">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-[#2E1E45]">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <Trophy size={16} />
                  </span>
                  <div>
                    <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                      Top 3 Petualang Terhebat
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-gray-400">
                      Peringkat Level &amp; XP Guild
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  LEADERBOARD
                </span>
              </div>

              {/* Top 3 List */}
              <div className="space-y-3">
                {topAdventurers.slice(0, 3).map((adv, idx) => {
                  const style = podiumAccents[idx] || podiumAccents[2];
                  const casteTitle = getCasteTitle(adv);
                  const casteStyle = getCasteBadgeStyle(adv);
                  const customTitleBadge = getCustomTitleBadge(adv.equippedCustomTitle);
                  const partyTag = adv.partyMembership?.party?.tag;

                  return (
                    <div
                      key={adv.id}
                      className={`p-3.5 rounded-none border ${style.border} ${style.bg} transition-all duration-200 flex items-center justify-between gap-3`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Rank Badge */}
                        <div className="relative shrink-0 flex items-center justify-center">
                          <span className={`w-7 h-7 rounded-full font-mono text-xs font-black flex items-center justify-center border shadow-sm ${style.tagColor}`}>
                            #{style.rankNum}
                          </span>
                        </div>

                        {/* Avatar with Frame */}
                        <div className="shrink-0">
                          <DiscordAvatar
                            src={adv.avatar}
                            username={adv.username ?? "Gamer"}
                            size={42}
                            frameId={adv.equippedAvatarFrame}
                          />
                        </div>

                        {/* Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={`/u/${encodeURIComponent(adv.username ?? "")}`}
                              className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white hover:text-[#7C3AED] dark:hover:text-[#A78BFA] transition-colors truncate"
                            >
                              @{adv.username ?? "Gamer"}
                            </Link>
                            {partyTag && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#7C3AED]/20 text-purple-300 border border-[#7C3AED]/40">
                                [{partyTag}]
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${casteStyle.border} ${casteStyle.bg} ${casteStyle.text}`}>
                              {casteTitle}
                            </span>
                            {customTitleBadge && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                {customTitleBadge}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Level & XP */}
                      <div className="shrink-0 text-right">
                        <span className="font-mono text-xs sm:text-sm font-black text-[#7C3AED] dark:text-[#A78BFA] block">
                          Lv. {adv.level}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-gray-400">
                          {adv.xp.toLocaleString("id-ID")} XP
                        </span>
                      </div>
                    </div>
                  );
                })}

                {topAdventurers.length === 0 && (
                  <div className="py-6 text-center text-xs font-mono text-slate-500 dark:text-gray-400">
                    Belum ada data petualang terdaftar.
                  </div>
                )}
              </div>

              {/* Mini Spotlight: Top Guild Party */}
              {topParties.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#2E1E45]">
                  <div className="text-[11px] font-mono text-slate-500 dark:text-gray-400 mb-2 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1 text-slate-700 dark:text-gray-300 uppercase">
                      <Users size={12} className="text-[#7C3AED]" /> Top Guild Party (Squad Terkuat):
                    </span>
                    <span className="text-[10px] text-purple-400">XP SQUAD</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {topParties.slice(0, 2).map((party) => (
                      <div
                        key={party.id}
                        className="p-2.5 rounded border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#180E2B] flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-900 dark:text-white block truncate">
                            {party.name} <span className="text-purple-400 font-mono">[{party.tag}]</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 dark:text-gray-400 truncate block">
                            {party.primaryGame} • {party.membersCount} Anggota
                          </span>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] font-black text-amber-500">
                          {party.totalPartyXp.toLocaleString("id-ID")} XP
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <Link
              href="/leaderboard"
              className="w-full py-2.5 px-4 rounded-none font-mono text-xs font-bold text-center border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] hover:border-[#7C3AED] hover:text-[#7C3AED] text-slate-800 dark:text-[#F8FAFC] transition inline-flex items-center justify-center gap-1.5 shadow-sm group"
            >
              <span>Lihat Papan Peringkat Lengkap</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* ========================================================================= */}
          {/* KOLOM KANAN: ARSIP PEMENANG TURNAMEN (HALL OF CHAMPIONS) */}
          {/* ========================================================================= */}
          <div className="p-5 sm:p-6 rounded-none bg-white dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45] shadow-sm flex flex-col justify-between space-y-5 text-left">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-[#2E1E45]">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Medal size={16} />
                  </span>
                  <div>
                    <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                      Hall of Champions
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-gray-400">
                      Arsip Sang Juara Turnamen
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  CHAMPIONS
                </span>
              </div>

              {/* Champions Showcase or First Tournament Spotlight */}
              {latestChampions.length > 0 ? (
                <div className="space-y-3">
                  {latestChampions.map((champ) => (
                    <div
                      key={champ.id}
                      className="p-4 rounded-none border border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-purple-500/5 to-transparent flex flex-col justify-between space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <Crown size={11} /> JUARA 1 RESMI
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 dark:text-gray-400">
                          {new Date(champ.crownedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-display text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="text-amber-400">👑</span>
                          <span>{champ.championTeam}</span>
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-gray-300 mt-0.5">
                          Turnamen: <strong className="text-purple-400">{champ.tournamentTitle}</strong>
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-200 dark:border-[#2E1E45]/80">
                        <span className="text-purple-400 font-bold uppercase">{champ.game}</span>
                        {champ.prizePool && (
                          <span className="text-emerald-500 font-bold">
                            Hadiah: {champ.prizePool}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Spotlight Card: Perebutkan Tahta Juara Perdana */
                <div className="p-5 rounded-none border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-[#1A0B2E] to-[#120721] text-left space-y-3.5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={11} /> PRESTASI KEJAYAAN
                    </span>
                    <span className="text-[10px] font-mono text-purple-300">Season 1</span>
                  </div>

                  <div>
                    <h4 className="font-display text-lg sm:text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                      <span>🔥 Perebutkan Tahta Juara Perdana</span>
                    </h4>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                      Belum ada tim yang dinobatkan di Hall of Winners! Jadilah legenda pertama yang mengukir nama timmu di prasasti emas keabadian LogHorizon Cup S1.
                    </p>
                  </div>

                  <div className="p-3 rounded border border-purple-500/30 bg-[#0E061A]/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-purple-300 font-bold flex items-center gap-1.5">
                      <Swords size={14} className="text-amber-400" /> Mobile Legends &amp; Multi-Game
                    </span>
                    <span className="text-amber-400 font-bold">Prizepool Tunai + E-Sertifikat</span>
                  </div>

                  <Link
                    href="/events?view=turnamen"
                    className="inline-flex items-center gap-2 text-xs font-mono font-bold text-amber-300 hover:text-amber-200 underline pt-1"
                  >
                    <span>Daftarkan Timmu Sekarang &amp; Raih Mahkota Juara →</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Action Button */}
            <Link
              href="/hall-of-winners"
              className="w-full py-2.5 px-4 rounded-none font-mono text-xs font-bold text-center border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] hover:border-[#7C3AED] hover:text-[#7C3AED] text-slate-800 dark:text-[#F8FAFC] transition inline-flex items-center justify-center gap-1.5 shadow-sm group"
            >
              <span>Jelajahi Hall of Winners</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
