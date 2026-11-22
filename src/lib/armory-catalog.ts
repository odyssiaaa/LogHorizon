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
}

export const ARMORY_ITEMS: ArmoryItem[] = [
  // AVATAR FRAMES
  {
    id: "frame_royal_purple",
    name: "Royal Purple Aura",
    description: "Aura ungu mistis khas kerajaan LogHorizon dengan pendaran neon halus.",
    type: "AVATAR_FRAME",
    priceXp: 500,
    previewColor: "#A855F7",
    frameClasses: "ring-2 ring-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.75)]",
  },
  {
    id: "frame_cyber_pulse",
    name: "Cyber Neon Pulse",
    description: "Garis siber neon cyan berdenyut futuristik untuk para petualang sci-fi.",
    type: "AVATAR_FRAME",
    priceXp: 800,
    previewColor: "#06B6D4",
    frameClasses: "ring-2 ring-cyan-400 shadow-[0_0_14px_rgba(6,182,212,0.8)] animate-pulse",
  },
  {
    id: "frame_crimson_dragon",
    name: "Crimson Dragon Border",
    description: "Bingkai kobaran api naga merah menyala melambangkan keberanian tanpa batas.",
    type: "AVATAR_FRAME",
    priceXp: 1000,
    previewColor: "#F43F5E",
    frameClasses: "ring-2 ring-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.85)] border border-amber-500/60",
  },
  {
    id: "frame_golden_sovereign",
    name: "Golden Sovereign Frame",
    description: "Mahakarya zirah emas murni berkilau khusus para petualang terhebat guild.",
    type: "AVATAR_FRAME",
    priceXp: 2500,
    previewColor: "#F59E0B",
    frameClasses: "ring-[3px] ring-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.9)] border-2 border-yellow-200",
  },

  // CUSTOM TITLES
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
  return ARMORY_ITEMS.find((item) => item.id === id);
}

export function getAvatarFrameClasses(frameId?: string | null): string {
  if (!frameId) return "";
  const item = ARMORY_ITEMS.find((it) => it.id === frameId && it.type === "AVATAR_FRAME");
  return item?.frameClasses ?? "";
}

export function getCustomTitleBadge(titleId?: string | null): string | null {
  if (!titleId) return null;
  const item = ARMORY_ITEMS.find((it) => it.id === titleId && it.type === "CUSTOM_TITLE");
  return item?.badgeText ?? null;
}
