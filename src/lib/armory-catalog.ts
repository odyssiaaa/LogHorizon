export type CosmeticItemType = "AVATAR_FRAME" | "CUSTOM_TITLE";

export interface ArmoryItem {
  id: string;
  name: string;
  description: string;
  type: CosmeticItemType;
  priceXp: number;
  previewColor: string;
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
    | "thunder_sovereign";
}

export const ARMORY_ITEMS: ArmoryItem[] = [
  // ==========================================
  // 8 DISCORD-STYLE ANIMATED AVATAR FRAMES
  // ==========================================
  {
    id: "frame_royal_purple",
    name: "🔮 Royal Arcane Vortex",
    description: "Cincin energi sihir ungu kerajaan berputar anggun dengan taburan partikel bintang bercahaya ala Discord Avatar Decoration.",
    type: "AVATAR_FRAME",
    priceXp: 500,
    previewColor: "#A855F7",
    frameClasses: "ring-2 ring-purple-500 shadow-[0_0_16px_rgba(168,85,247,0.85)]",
    discordEffectType: "arcane_vortex",
  },
  {
    id: "frame_cyber_pulse",
    name: "⚡ Cyber Valkyrie Halo",
    description: "Sepasang sayap hologram cyan-ungu berdenyut futuristik di kedua sisi avatar dengan garis laser neon sci-fi.",
    type: "AVATAR_FRAME",
    priceXp: 800,
    previewColor: "#06B6D4",
    frameClasses: "ring-2 ring-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.9)]",
    discordEffectType: "cyber_valkyrie",
  },
  {
    id: "frame_frost_monarch",
    name: "❄️ Frost Monarch Ring",
    description: "Mahkota kristal es kutub utara berputar dingin dengan kristal salju abadi dan aura pembeku waktu.",
    type: "AVATAR_FRAME",
    priceXp: 900,
    previewColor: "#38BDF8",
    frameClasses: "ring-2 ring-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.9)]",
    discordEffectType: "frost_monarch",
  },
  {
    id: "frame_emerald_spirit",
    name: "🌿 Emerald Forest Spirit",
    description: "Sulur daun zamrud magis hutan purba dengan kelopak bercahaya dan spora hijau mistis yang berkedip lembut.",
    type: "AVATAR_FRAME",
    priceXp: 1000,
    previewColor: "#10B981",
    frameClasses: "ring-2 ring-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.9)]",
    discordEffectType: "emerald_spirit",
  },
  {
    id: "frame_crimson_dragon",
    name: "🐉 Crimson Dragon Crest",
    description: "Tanduk naga purba megah dan kobaran api merah membara yang menyelimuti seluruh tepi lingkaran avatar.",
    type: "AVATAR_FRAME",
    priceXp: 1200,
    previewColor: "#EF4444",
    frameClasses: "ring-2 ring-rose-500 shadow-[0_0_18px_rgba(239,68,68,0.9)]",
    discordEffectType: "crimson_dragon",
  },
  {
    id: "frame_celestial_astral",
    name: "🌌 Celestial Astral Orbit",
    description: "Orbit galaksi kosmik bertahtakan gugusan bintang galaksi dalam perputaran rasi bintang legendaris.",
    type: "AVATAR_FRAME",
    priceXp: 1600,
    previewColor: "#818CF8",
    frameClasses: "ring-2 ring-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.9)]",
    discordEffectType: "celestial_astral",
  },
  {
    id: "frame_thunder_sovereign",
    name: "⚡ Thunder Sovereign Aura",
    description: "Kilatan petir emas-kuning menyambar di sekeliling avatar dengan lonjakan plasma listrik bertenaga dewa.",
    type: "AVATAR_FRAME",
    priceXp: 2000,
    previewColor: "#EAB308",
    frameClasses: "ring-2 ring-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.95)]",
    discordEffectType: "thunder_sovereign",
  },
  {
    id: "frame_golden_sovereign",
    name: "👑 Golden Sovereign Wings",
    description: "Mahkota emas murni bertahtakan batu permata agung dengan sayap cahaya keemasan yang beranimasi kilau gemilang.",
    type: "AVATAR_FRAME",
    priceXp: 2500,
    previewColor: "#F59E0B",
    frameClasses: "ring-[3px] ring-amber-400 shadow-[0_0_22px_rgba(245,158,11,0.95)]",
    discordEffectType: "golden_sovereign",
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
    previewColor: "#10B981",
    badgeText: "🧪 Royal Alchemist",
  },
  {
    id: "title_shadow_assassin",
    name: "🗡️ Shadow Assassin",
    description: "Pembunuh bayangan senyap yang melenyapkan musuh dalam sekejap mata tanpa jejak.",
    type: "CUSTOM_TITLE",
    priceXp: 450,
    previewColor: "#8B5CF6",
    badgeText: "🗡️ Shadow Assassin",
  },
  {
    id: "title_iron_vanguard",
    name: "🛡️ Iron Vanguard",
    description: "Benteng pertahanan terdepan berkepribadian baja pelindung garda guild.",
    type: "CUSTOM_TITLE",
    priceXp: 500,
    previewColor: "#64748B",
    badgeText: "🛡️ Iron Vanguard",
  },
  {
    id: "title_master_merchant",
    name: "⚖️ Master Merchant",
    description: "Saudagar ulung penguasa pasar rekber dan transaksi terpercaya di seluruh LogHorizon.",
    type: "CUSTOM_TITLE",
    priceXp: 600,
    previewColor: "#F59E0B",
    badgeText: "⚖️ Master Merchant",
  },
  {
    id: "title_grand_ranger",
    name: "🏹 Grand Ranger",
    description: "Pemanah ulung penjaga rimba dan penembak sasaran akurat dari kejauhan tanpa luput.",
    type: "CUSTOM_TITLE",
    priceXp: 750,
    previewColor: "#10B981",
    badgeText: "🏹 Grand Ranger",
  },
  {
    id: "title_arcane_sage",
    name: "📖 Arcane Sage",
    description: "Cendekiawan sihir purba pemegang rahasia semesta dan strategi agung guild.",
    type: "CUSTOM_TITLE",
    priceXp: 900,
    previewColor: "#3B82F6",
    badgeText: "📖 Arcane Sage",
  },
  {
    id: "title_dragon_slayer",
    name: "🐉 Dragon Slayer",
    description: "Penakluk binatang purba dan naga legendaris pemegang kehormatan tertinggi ksatria.",
    type: "CUSTOM_TITLE",
    priceXp: 1200,
    previewColor: "#EF4444",
    badgeText: "🐉 Dragon Slayer",
  },
  {
    id: "title_mythic_chronicle",
    name: "🌟 Mythic Chronicle",
    description: "Sang pencatat sejarah abadi pencapaian legenda terbesar seluruh kerajaan LogHorizon.",
    type: "CUSTOM_TITLE",
    priceXp: 1500,
    previewColor: "#EC4899",
    badgeText: "🌟 Mythic Chronicle",
  },

  // Legacy Titles (Backwards Compatibility)
  {
    id: "title_vanguard",
    name: "⚔️ Vanguard",
    description: "Gelar ksatria garda terdepan pelindung rekan seperjuangan.",
    type: "CUSTOM_TITLE",
    priceXp: 400,
    previewColor: "#3B82F6",
    badgeText: "⚔️ Vanguard",
  },
  {
    id: "title_shadow_sniper",
    name: "🏹 Shadow Sniper",
    description: "Penembak jitu mematikan yang mengintai dari kegelapan malam.",
    type: "CUSTOM_TITLE",
    priceXp: 600,
    previewColor: "#10B981",
    badgeText: "🏹 Shadow Sniper",
  },
  {
    id: "title_mvp_hunter",
    name: "🔥 MVP Hunter",
    description: "Pemburu gelar pemain terbaik di setiap arena pertandingan esports.",
    type: "CUSTOM_TITLE",
    priceXp: 750,
    previewColor: "#F97316",
    badgeText: "🔥 MVP Hunter",
  },
  {
    id: "title_high_roller",
    name: "💎 High Roller",
    description: "Sang penguasa perbendaharaan dan aset elit guild berstatus agung.",
    type: "CUSTOM_TITLE",
    priceXp: 1200,
    previewColor: "#EC4899",
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
  return ARMORY_ITEMS.find((item) => item.id === id);
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
