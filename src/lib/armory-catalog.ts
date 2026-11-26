export type CosmeticItemType = "AVATAR_FRAME" | "CUSTOM_TITLE";
export type ArmoryTier = "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";

export interface ArmoryItem {
  id: string;
  name: string;
  description: string;
  type: CosmeticItemType;
  priceXp: number;
  priceCoins: number;
  previewColor: string;
  tier?: ArmoryTier;
  badgeText?: string;
  frameClasses?: string;
  discordEffectType?:
    | "arcane_vortex"
    | "cyber_valkyrie"
    | "crimson_dragon"
    | "golden_sovereign"
    | "frost_monarch"
    | "emerald_spirit"
    | "celestial_astral"
    | "thunder_sovereign"
    | "seraphim_divinity";
}

export const ARMORY_ITEMS: ArmoryItem[] = [
  // ==========================================
  // 9 DISCORD-STYLE ANIMATED AVATAR FRAMES (TIER RARE -> MYTHIC)
  // ==========================================
  {
    id: "frame_royal_purple",
    name: "🔮 Royal Arcane Vortex",
    description: "Cincin garis energi ungu neon berputar halus dengan pendar cahaya magis lembut dan bintang berkilau ala Discord Avatar Decoration.",
    type: "AVATAR_FRAME",
    priceXp: 500,
    priceCoins: 300,
    previewColor: "#A855F7",
    tier: "RARE",
    frameClasses: "ring-2 ring-purple-500 shadow-[0_0_16px_rgba(168,85,247,0.85)]",
    discordEffectType: "arcane_vortex",
  },
  {
    id: "frame_cyber_pulse",
    name: "⚡ Cyber Valkyrie Halo",
    description: "Lingkaran ganda hologram cyan-ungu futuristik dengan sayap sirkuit mini berdenyut di sisi kiri-kanan dan visor sci-fi.",
    type: "AVATAR_FRAME",
    priceXp: 800,
    priceCoins: 500,
    previewColor: "#06B6D4",
    tier: "RARE",
    frameClasses: "ring-2 ring-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.9)]",
    discordEffectType: "cyber_valkyrie",
  },
  {
    id: "frame_frost_monarch",
    name: "❄️ Frost Monarch Ring",
    description: "Mahkota kristal es tajam mengelilingi avatar dengan partikel kristal salju abadi yang berputar anggun dan aura dingin membeku.",
    type: "AVATAR_FRAME",
    priceXp: 900,
    priceCoins: 750,
    previewColor: "#38BDF8",
    tier: "EPIC",
    frameClasses: "ring-2 ring-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.9)]",
    discordEffectType: "frost_monarch",
  },
  {
    id: "frame_emerald_spirit",
    name: "🌿 Emerald Forest Spirit",
    description: "Sulur daun emas-zamrud hidup dari hutan purba dengan titik cahaya kunang-kunang mistis melayang dan spora alam berkedip.",
    type: "AVATAR_FRAME",
    priceXp: 1000,
    priceCoins: 900,
    previewColor: "#10B981",
    tier: "EPIC",
    frameClasses: "ring-2 ring-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.9)]",
    discordEffectType: "emerald_spirit",
  },
  {
    id: "frame_crimson_dragon",
    name: "🐉 Crimson Dragon Crest",
    description: "Tanduk naga merah menyala perkasa dengan cincin bara api berputar dan lidah api membara berselimut pendar crimson garang.",
    type: "AVATAR_FRAME",
    priceXp: 1200,
    priceCoins: 1100,
    previewColor: "#EF4444",
    tier: "EPIC",
    frameClasses: "ring-2 ring-rose-500 shadow-[0_0_18px_rgba(239,68,68,0.9)]",
    discordEffectType: "crimson_dragon",
  },
  {
    id: "frame_celestial_astral",
    name: "🌌 Celestial Astral Orbit",
    description: "Dua cincin orbit planet & rasi bintang berputar berlawanan arah dengan planet mikro dan kilau cahaya galaksi ungu-emas.",
    type: "AVATAR_FRAME",
    priceXp: 1600,
    priceCoins: 1500,
    previewColor: "#818CF8",
    tier: "LEGENDARY",
    frameClasses: "ring-2 ring-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.9)]",
    discordEffectType: "celestial_astral",
  },
  {
    id: "frame_thunder_sovereign",
    name: "⚡ Thunder Sovereign Aura",
    description: "Cincin petir biru-emas bertegangan tinggi dengan sambaran kilat bercabang dinamis dan lonjakan plasma listrik dewata.",
    type: "AVATAR_FRAME",
    priceXp: 2000,
    priceCoins: 1900,
    previewColor: "#EAB308",
    tier: "LEGENDARY",
    frameClasses: "ring-2 ring-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.95)]",
    discordEffectType: "thunder_sovereign",
  },
  {
    id: "frame_golden_sovereign",
    name: "👑 Golden Sovereign Wings",
    description: "Mahkota raja emas murni bertatahkan permata merah di puncak avatar, diapit sepasang sayap emas berlapis mengepak lembut dan kilau cahaya agung.",
    type: "AVATAR_FRAME",
    priceXp: 2500,
    priceCoins: 2500,
    previewColor: "#F59E0B",
    tier: "MYTHIC",
    frameClasses: "ring-[3px] ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.95)]",
    discordEffectType: "golden_sovereign",
  },
  {
    id: "frame_seraphim_divinity",
    name: "🔥 Seraphim Eternal Divinity",
    description: "Bingkai mahakarya tertinggi dengan 6 sayap cahaya kosmik ungu-emas megah, lingkaran rune magis berputar berlapis, bintang jatuh, dan pendar aura mythic paling prestisius!",
    type: "AVATAR_FRAME",
    priceXp: 5000,
    priceCoins: 4500,
    previewColor: "#F59E0B",
    tier: "MYTHIC",
    frameClasses: "ring-[3.5px] ring-amber-400 shadow-[0_0_30px_rgba(245,158,11,1),0_0_20px_rgba(168,85,247,0.85)]",
    discordEffectType: "seraphim_divinity",
  },

  // ==========================================
  // 8 EUROPEAN JOB / CLASS & REPUTATION TITLES
  // ==========================================
  {
    id: "title_royal_alchemist",
    name: "🧪 Royal Alchemist",
    description: "Pakar ramuan mistis dan alkimia kerajaan peramu elixir kemenangan pertempuran.",
    type: "CUSTOM_TITLE",
    priceXp: 300,
    priceCoins: 200,
    previewColor: "#10B981",
    tier: "RARE",
    badgeText: "🧪 Royal Alchemist",
  },
  {
    id: "title_shadow_assassin",
    name: "🗡️ Shadow Assassin",
    description: "Pembunuh bayangan senyap yang melenyapkan musuh dalam sekejap mata tanpa jejak.",
    type: "CUSTOM_TITLE",
    priceXp: 450,
    priceCoins: 300,
    previewColor: "#8B5CF6",
    tier: "RARE",
    badgeText: "🗡️ Shadow Assassin",
  },
  {
    id: "title_iron_vanguard",
    name: "🛡️ Iron Vanguard",
    description: "Benteng pertahanan terdepan berkepribadian baja pelindung garda guild.",
    type: "CUSTOM_TITLE",
    priceXp: 500,
    priceCoins: 400,
    previewColor: "#64748B",
    tier: "RARE",
    badgeText: "🛡️ Iron Vanguard",
  },
  {
    id: "title_master_merchant",
    name: "⚖️ Master Merchant",
    description: "Saudagar ulung penguasa pasar rekber dan transaksi terpercaya di seluruh LogHorizon.",
    type: "CUSTOM_TITLE",
    priceXp: 600,
    priceCoins: 500,
    previewColor: "#F59E0B",
    tier: "EPIC",
    badgeText: "⚖️ Master Merchant",
  },
  {
    id: "title_grand_ranger",
    name: "🏹 Grand Ranger",
    description: "Pemanah ulung penjaga rimba dan penembak sasaran akurat dari kejauhan tanpa luput.",
    type: "CUSTOM_TITLE",
    priceXp: 750,
    priceCoins: 600,
    previewColor: "#10B981",
    tier: "EPIC",
    badgeText: "🏹 Grand Ranger",
  },
  {
    id: "title_arcane_sage",
    name: "📖 Arcane Sage",
    description: "Cendekiawan sihir purba pemegang rahasia semesta dan strategi agung guild.",
    type: "CUSTOM_TITLE",
    priceXp: 900,
    priceCoins: 800,
    previewColor: "#3B82F6",
    tier: "EPIC",
    badgeText: "📖 Arcane Sage",
  },
  {
    id: "title_dragon_slayer",
    name: "🐉 Dragon Slayer",
    description: "Penakluk binatang purba dan naga legendaris pemegang kehormatan tertinggi ksatria dengan aura api merah membara.",
    type: "CUSTOM_TITLE",
    priceXp: 1200,
    priceCoins: 1200,
    previewColor: "#EF4444",
    tier: "LEGENDARY",
    badgeText: "🐉 Dragon Slayer",
  },
  {
    id: "title_mythic_chronicle",
    name: "🌟 Mythic Chronicle",
    description: "Sang pencatat sejarah abadi pencapaian legenda terbesar seluruh kerajaan LogHorizon dengan pendar emas-pelangi berkilau.",
    type: "CUSTOM_TITLE",
    priceXp: 2500,
    priceCoins: 2000,
    previewColor: "#F59E0B",
    tier: "MYTHIC",
    badgeText: "🌟 Mythic Chronicle",
  },

  // Legacy Titles (Backwards Compatibility)
  {
    id: "title_vanguard",
    name: "⚔️ Vanguard",
    description: "Gelar ksatria garda terdepan pelindung rekan seperjuangan.",
    type: "CUSTOM_TITLE",
    priceXp: 400,
    priceCoins: 250,
    previewColor: "#3B82F6",
    tier: "RARE",
    badgeText: "⚔️ Vanguard",
  },
  {
    id: "title_shadow_sniper",
    name: "🏹 Shadow Sniper",
    description: "Penembak jitu mematikan yang mengintai dari kegelapan malam.",
    type: "CUSTOM_TITLE",
    priceXp: 600,
    priceCoins: 350,
    previewColor: "#10B981",
    tier: "RARE",
    badgeText: "🏹 Shadow Sniper",
  },
  {
    id: "title_mvp_hunter",
    name: "🔥 MVP Hunter",
    description: "Pemburu gelar pemain terbaik di setiap arena pertandingan esports.",
    type: "CUSTOM_TITLE",
    priceXp: 750,
    priceCoins: 500,
    previewColor: "#F97316",
    tier: "EPIC",
    badgeText: "🔥 MVP Hunter",
  },
  {
    id: "title_high_roller",
    name: "💎 High Roller",
    description: "Sang penguasa perbendaharaan dan aset elit guild berstatus agung.",
    type: "CUSTOM_TITLE",
    priceXp: 1200,
    priceCoins: 1000,
    previewColor: "#EC4899",
    tier: "LEGENDARY",
    badgeText: "💎 High Roller",
  },
];

export function getArmoryItem(id: string): ArmoryItem | undefined {
  if (id === "frame_royal_arcane_vortex") return ARMORY_ITEMS.find((i) => i.id === "frame_royal_purple");
  if (id === "frame_cyber_valkyrie_halo") return ARMORY_ITEMS.find((i) => i.id === "frame_cyber_pulse");
  if (id === "frame_crimson_dragon_crest") return ARMORY_ITEMS.find((i) => i.id === "frame_crimson_dragon");
  if (id === "frame_golden_sovereign_wings") return ARMORY_ITEMS.find((i) => i.id === "frame_golden_sovereign");
  if (id === "frame_frost_monarch_ring") return ARMORY_ITEMS.find((i) => i.id === "frame_frost_monarch");
  if (id === "frame_emerald_spirit_crest") return ARMORY_ITEMS.find((i) => i.id === "frame_emerald_spirit");
  if (id === "frame_celestial_astral_orbit") return ARMORY_ITEMS.find((i) => i.id === "frame_celestial_astral");
  if (id === "frame_thunder_sovereign_aura") return ARMORY_ITEMS.find((i) => i.id === "frame_thunder_sovereign");
  if (id === "frame_seraphim_eternal_divinity") return ARMORY_ITEMS.find((i) => i.id === "frame_seraphim_divinity");
  return ARMORY_ITEMS.find((item) => item.id === id);
}

export function getArmoryItemTier(id: string): ArmoryTier {
  const item = getArmoryItem(id);
  return item?.tier ?? "RARE";
}

export function getAvatarFrameEffectType(
  frameId?: string | null
): ArmoryItem["discordEffectType"] | null {
  if (!frameId) return null;
  const item = getArmoryItem(frameId);
  return item?.discordEffectType ?? null;
}

export function getAvatarFrameClasses(frameId?: string | null): string {
  if (!frameId) return "";
  const item = getArmoryItem(frameId);
  return item?.frameClasses ?? "";
}

export function getCustomTitleBadge(titleId?: string | null): string | null {
  if (!titleId) return null;
  const item = getArmoryItem(titleId);
  return item?.badgeText ?? null;
}

/**
 * Returns tailored CSS styling based on title luxury tier:
 * - Mythic: animated rainbow-gold shimmer gradient text & glow
 * - Legendary: fiery dragon red-orange gradient text & glow
 * - Epic: illuminated gemstone text & border
 * - Rare: clean refined badge
 */
export function getCustomTitleStyle(titleId?: string | null): string {
  if (!titleId) return "";
  const item = getArmoryItem(titleId);
  const tier = item?.tier ?? "RARE";

  if (titleId === "title_mythic_chronicle" || tier === "MYTHIC") {
    return "bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-amber-200 font-extrabold border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.45)]";
  }

  if (titleId === "title_dragon_slayer") {
    return "bg-gradient-to-r from-rose-950/80 via-red-900/60 to-orange-950/80 text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-300 to-amber-400 font-extrabold border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.35)]";
  }

  if (tier === "LEGENDARY") {
    return "bg-gradient-to-r from-amber-950/80 to-purple-950/80 text-amber-300 border border-amber-500/40 font-bold shadow-[0_0_8px_rgba(245,158,11,0.3)]";
  }

  if (tier === "EPIC") {
    return "bg-purple-950/60 text-purple-300 border border-purple-500/40 font-bold";
  }

  return "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold";
}
