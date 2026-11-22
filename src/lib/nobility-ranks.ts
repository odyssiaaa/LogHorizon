/**
 * LogHorizon European Societal & Nobility Rank System (Lv. 1 – 100+)
 * Pure civil & nobility hierarchy based on level progression.
 * Excludes palace ruler / staff castes (Emperor, Prince, Lord Commander).
 */

export interface NobilityRankTier {
  minLevel: number;
  maxLevel: number | null;
  name: string;
  nativeTitle: string;
  rankKey: string;
  color: string;
  colorClass: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  icon: string;
  description: string;
}

export const NOBILITY_RANKS: NobilityRankTier[] = [
  {
    minLevel: 1,
    maxLevel: 4,
    name: "Peasant",
    nativeTitle: "🌾 Peasant (Petani)",
    rankKey: "peasant",
    color: "#D97706",
    colorClass: "text-amber-700 dark:text-amber-300",
    badgeBg: "bg-amber-900/15 dark:bg-amber-950/30",
    badgeBorder: "border-amber-700/30 dark:border-amber-600/30",
    badgeText: "text-amber-800 dark:text-amber-300",
    icon: "🌾",
    description: "Rakyat jelata pemula yang baru merintis langkah awal di guild LogHorizon.",
  },
  {
    minLevel: 5,
    maxLevel: 9,
    name: "Artisan",
    nativeTitle: "⚒️ Townsfolk / Artisan (Pengrajin)",
    rankKey: "artisan",
    color: "#78716C",
    colorClass: "text-stone-700 dark:text-stone-300",
    badgeBg: "bg-stone-500/15 dark:bg-stone-800/30",
    badgeBorder: "border-stone-500/30",
    badgeText: "text-stone-700 dark:text-stone-300",
    icon: "⚒️",
    description: "Masyarakat kota terampil yang mulai aktif berkontribusi di komunitas.",
  },
  {
    minLevel: 10,
    maxLevel: 19,
    name: "Squire",
    nativeTitle: "🛡️ Squire (Pengawal)",
    rankKey: "squire",
    color: "#3B82F6",
    colorClass: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-500/15 dark:bg-blue-950/30",
    badgeBorder: "border-blue-500/30",
    badgeText: "text-blue-600 dark:text-blue-400",
    icon: "🛡️",
    description: "Pendamping ksatria yang terlatih dalam pertempuran dan koordinasi party.",
  },
  {
    minLevel: 20,
    maxLevel: 29,
    name: "Chevalier",
    nativeTitle: "⚔️ Chevalier / Baronet",
    rankKey: "chevalier",
    color: "#14B8A6",
    colorClass: "text-teal-600 dark:text-teal-400",
    badgeBg: "bg-teal-500/15 dark:bg-teal-950/30",
    badgeBorder: "border-teal-500/30",
    badgeText: "text-teal-600 dark:text-teal-300",
    icon: "⚔️",
    description: "Ksatria bergelar yang telah membuktikan ketangkasan di berbagai arena guild.",
  },
  {
    minLevel: 30,
    maxLevel: 39,
    name: "Baron",
    nativeTitle: "📜 Baron",
    rankKey: "baron",
    color: "#6366F1",
    colorClass: "text-indigo-600 dark:text-indigo-400",
    badgeBg: "bg-indigo-500/15 dark:bg-indigo-950/30",
    badgeBorder: "border-indigo-500/30",
    badgeText: "text-indigo-600 dark:text-indigo-300",
    icon: "📜",
    description: "Bangsawan pemilik wilayah manor pertama dengan wewenang ekonomi mandiri.",
  },
  {
    minLevel: 40,
    maxLevel: 49,
    name: "Viscount",
    nativeTitle: "⚜️ Viscount",
    rankKey: "viscount",
    color: "#8B5CF6",
    colorClass: "text-purple-600 dark:text-purple-400",
    badgeBg: "bg-purple-500/15 dark:bg-purple-950/30",
    badgeBorder: "border-purple-500/30",
    badgeText: "text-purple-600 dark:text-purple-300",
    icon: "⚜️",
    description: "Gubernur kadipaten bawahan yang mengawasi ketertiban dan kemakmuran distrik.",
  },
  {
    minLevel: 50,
    maxLevel: 64,
    name: "Count",
    nativeTitle: "🏅 Count / Earl",
    rankKey: "count",
    color: "#EC4899",
    colorClass: "text-pink-600 dark:text-pink-400",
    badgeBg: "bg-pink-500/15 dark:bg-pink-950/30",
    badgeBorder: "border-pink-500/30",
    badgeText: "text-pink-600 dark:text-pink-300",
    icon: "🏅",
    description: "Penguasa satu daerah feodal penuh (county) yang memimpin pasukan kesatria wilayah.",
  },
  {
    minLevel: 65,
    maxLevel: 79,
    name: "Marquess",
    nativeTitle: "💠 Marquess",
    rankKey: "marquess",
    color: "#06B6D4",
    colorClass: "text-cyan-600 dark:text-cyan-400",
    badgeBg: "bg-cyan-500/15 dark:bg-cyan-950/30",
    badgeBorder: "border-cyan-500/30",
    badgeText: "text-cyan-600 dark:text-cyan-300",
    icon: "💠",
    description: "Penjaga benteng perbatasan utama kerajaan dengan pengaruh militer yang disegani.",
  },
  {
    minLevel: 80,
    maxLevel: 94,
    name: "Duke",
    nativeTitle: "🦁 Duke (Adipati)",
    rankKey: "duke",
    color: "#F59E0B",
    colorClass: "text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-500/15 dark:bg-amber-950/30",
    badgeBorder: "border-amber-500/40",
    badgeText: "text-amber-600 dark:text-amber-300",
    icon: "🦁",
    description: "Pilar utama kerajaan pemegang kadipaten agung dan pengaruh setara bangsawan tinggi.",
  },
  {
    minLevel: 95,
    maxLevel: 100,
    name: "Grand Duke",
    nativeTitle: "🌟 Grand Duke / Sovereign Peer (Adipati Agung)",
    rankKey: "grand_duke",
    color: "#EAB308",
    colorClass: "text-amber-500 dark:text-yellow-300",
    badgeBg: "bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20",
    badgeBorder: "border-amber-500/50",
    badgeText: "text-amber-600 dark:text-yellow-300",
    icon: "🌟",
    description: "Strata tertinggi masyarakat sipil dan bangsawan berdaulat dengan reputasi legendaris.",
  },
];

export interface NobilityRankResult extends NobilityRankTier {
  fullTitle: string;
  level: number;
  stars?: string;
  isMaxTier: boolean;
}

/**
 * Returns the modular European Nobility Rank based on user level (1 to 100+).
 * Never caps: levels > 100 dynamically earn prestige stars (Grand Duke ★, ★★, etc.)
 */
export function getEuropeanNobilityRank(level: number): NobilityRankResult {
  const safeLevel = Math.max(1, Math.floor(level || 1));

  if (safeLevel > 100) {
    const starCount = Math.min(5, Math.floor((safeLevel - 100) / 10) + 1);
    const stars = "★".repeat(starCount);
    const base = NOBILITY_RANKS[NOBILITY_RANKS.length - 1];
    return {
      ...base,
      maxLevel: null,
      stars,
      level: safeLevel,
      isMaxTier: true,
      fullTitle: `🌟 Grand Duke ${stars} (Lv.${safeLevel})`,
      nativeTitle: `🌟 Grand Duke ${stars} (Adipati Agung)`,
    };
  }

  const found = NOBILITY_RANKS.find(
    (tier) => safeLevel >= tier.minLevel && (tier.maxLevel === null || safeLevel <= tier.maxLevel)
  );

  const rank = found || NOBILITY_RANKS[0];
  return {
    ...rank,
    level: safeLevel,
    isMaxTier: safeLevel >= 95,
    fullTitle: `${rank.nativeTitle} (Lv.${safeLevel})`,
  };
}
