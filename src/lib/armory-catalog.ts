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
  discordEffectType?: "arcane_vortex" | "cyber_valkyrie" | "crimson_dragon" | "golden_sovereign";
}

export const ARMORY_ITEMS: ArmoryItem[] = [
  // ==========================================
  // DISCORD-STYLE ANIMATED AVATAR FRAMES
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
  // CUSTOM JOB / CLASS & REPUTATION TITLES
  // ==========================================
  {
    id: "title_royal_alchemist",
    name: "🧪 Royal Alchemist",
    description: "Pakar ramuan mistis dan alkimia kerajaan peramu elixir kemenangan pertempuran.",
    type: "CUSTOM_TITLE",
    priceXp: 400,
    previewColor: "#10B981",
    badgeText: "🧪 Royal Alchemist",
  },
  {
    id: "title_shadow_assassin",
    name: "🗡️ Shadow Assassin",
    description: "Pembunuh bayangan senyap yang melenyapkan musuh dalam sekejap mata tanpa jejak.",
    type: "CUSTOM_TITLE",
    priceXp: 600,
    previewColor: "#8B5CF6",
    badgeText: "🗡️ Shadow Assassin",
  },
  {
    id: "title_dragon_slayer",
    name: "🐉 Dragon Slayer",
    description: "Penakluk binatang purba dan naga legendaris pemegang kehormatan tertinggi ksatria.",
    type: "CUSTOM_TITLE",
    priceXp: 800,
    previewColor: "#EF4444",
    badgeText: "🐉 Dragon Slayer",
  },
  {
    id: "title_master_merchant",
    name: "⚖️ Master Merchant",
    description: "Saudagar ulung penguasa pasar rekber dan transaksi terpercaya di seluruh LogHorizon.",
    type: "CUSTOM_TITLE",
    priceXp: 1000,
    previewColor: "#F59E0B",
    badgeText: "⚖️ Master Merchant",
  },
  {
    id: "title_arcane_sage",
    name: "📖 Arcane Sage",
    description: "Cendekiawan sihir purba pemegang rahasia semesta dan strategi agung guild.",
    type: "CUSTOM_TITLE",
    priceXp: 1200,
    previewColor: "#3B82F6",
    badgeText: "📖 Arcane Sage",
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
  return ARMORY_ITEMS.find((item) => item.id === id);
}

export function getAvatarFrameEffectType(frameId?: string | null): "arcane_vortex" | "cyber_valkyrie" | "crimson_dragon" | "golden_sovereign" | null {
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
