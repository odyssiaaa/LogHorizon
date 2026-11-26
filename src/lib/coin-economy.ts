/**
 * Horizon Coin (🪙 HC) Central Economy Configuration
 * Single Source of Truth untuk kurs nilai tukar, paket Top-Up QRIS, dan kalkulasi bonus koin.
 */

export const COIN_RATE_IDR = 100; // 1 HC = Rp 100, 100 HC = Rp 10.000

export interface TopupPackage {
  id: string;
  name: string;
  priceIdr: number;
  baseCoins: number;
  bonusCoins: number;
  totalCoins: number;
  badge?: string;
  badgeColor?: string;
  savingsText?: string;
  icon: string;
  description: string;
  popular?: boolean;
  bestValue?: boolean;
  sultan?: boolean;
}

export const TOPUP_PACKAGES: TopupPackage[] = [
  {
    id: "starter",
    name: "Starter Pouch",
    priceIdr: 10_000,
    baseCoins: 100,
    bonusCoins: 0,
    totalCoins: 100,
    savingsText: "Tanpa bonus • Cocok untuk coba 1x Gacha",
    icon: "🪙",
    description: "Kantong koin dasar untuk petualang pemula yang ingin menjajal sistem gacha atau belanja kosmetik awal.",
  },
  {
    id: "adventurer",
    name: "Adventurer Chest",
    priceIdr: 25_000,
    baseCoins: 250,
    bonusCoins: 25,
    totalCoins: 275,
    badge: "HEMAT 10%",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    savingsText: "Bonus +25 HC (Ekstra 10%)",
    icon: "⚔️",
    description: "Peti bekal ekspedisi dengan bonus ekstra koin untuk sewa petualang di papan kontrak misi.",
  },
  {
    id: "guild_vault",
    name: "Guild Vault",
    priceIdr: 50_000,
    baseCoins: 500,
    bonusCoins: 75,
    totalCoins: 575,
    badge: "🔥 PALING POPULER",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    savingsText: "Bonus +75 HC (Ekstra 15%) • Cukup 5x Multi Summon",
    icon: "🔮",
    popular: true,
    description: "Pilihan paling favorit para member! Cukup untuk 1x 5-Multi Summon Royal Gacha atau Frame Epic Armory.",
  },
  {
    id: "sovereign",
    name: "Sovereign Treasury",
    priceIdr: 100_000,
    baseCoins: 1_000,
    bonusCoins: 200,
    totalCoins: 1_200,
    badge: "⭐ BEST VALUE",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    savingsText: "Bonus +200 HC (Ekstra 20%) • Nilai Terbaik",
    icon: "👑",
    bestValue: true,
    description: "Kombinasi nilai terbaik kerajaan LogHorizon dengan bonus masif untuk koleksi Frame Legendary dan Gelar Prestisius.",
  },
  {
    id: "emperor_mythic",
    name: "Emperor Mythic Pack",
    priceIdr: 250_000,
    baseCoins: 2_500,
    bonusCoins: 650,
    totalCoins: 3_150,
    badge: "💎 SULTAN EDITION",
    badgeColor: "bg-gradient-to-r from-amber-500/30 to-rose-500/30 text-amber-200 border-amber-400/50",
    savingsText: "Bonus +650 HC (Ekstra 26%) • Paling Maksimal",
    icon: "🔥",
    sultan: true,
    description: "Pundi-pundi terbesar sang Kaisar! Bonus melimpah untuk memborong seluruh koleksi Armory Mythic dan mendominasi guild.",
  },
];

/**
 * Konversi Horizon Coins ke nilai estimasi IDR
 */
export function coinsToIdr(coins: number): number {
  return coins * COIN_RATE_IDR;
}

/**
 * Konversi nominal IDR ke nilai dasar Horizon Coins
 */
export function idrToCoins(idr: number): number {
  return Math.floor(idr / COIN_RATE_IDR);
}

/**
 * Cari paket topup berdasarkan ID
 */
export function getTopupPackage(id: string): TopupPackage | undefined {
  return TOPUP_PACKAGES.find((pkg) => pkg.id === id);
}

/**
 * Hitung koin dasar, bonus koin, dan total koin yang diterima berdasarkan nominal transfer IDR
 */
export function calculateCoinsForAmount(amountIdr: number): {
  baseCoins: number;
  bonusCoins: number;
  totalCoins: number;
  packageMatched?: TopupPackage;
} {
  const matched = TOPUP_PACKAGES.find((p) => p.priceIdr === amountIdr);
  if (matched) {
    return {
      baseCoins: matched.baseCoins,
      bonusCoins: matched.bonusCoins,
      totalCoins: matched.totalCoins,
      packageMatched: matched,
    };
  }

  const base = Math.floor(amountIdr / COIN_RATE_IDR);
  let bonus = 0;
  if (amountIdr >= 250_000) {
    bonus = Math.floor(base * 0.26);
  } else if (amountIdr >= 100_000) {
    bonus = Math.floor(base * 0.2);
  } else if (amountIdr >= 50_000) {
    bonus = Math.floor(base * 0.15);
  } else if (amountIdr >= 25_000) {
    bonus = Math.floor(base * 0.1);
  }

  return {
    baseCoins: base,
    bonusCoins: bonus,
    totalCoins: base + bonus,
  };
}
