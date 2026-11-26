import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isGuildOwner } from "@/lib/caste";

export type CoinTransactionType =
  | "DAILY_QUEST"
  | "WEEKLY_QUEST"
  | "PLAYER_QUEST_REWARD"
  | "PLAYER_QUEST_ESCROW"
  | "PLAYER_QUEST_REFUND"
  | "TOPUP_QRIS"
  | "GACHA_SUMMON"
  | "ARMORY_PURCHASE"
  | "EMPEROR_GIFT"
  | "REDEEM_CODE"
  | "TIP_SENT"
  | "TIP_RECEIVED";

export type { TopupPackage } from "@/lib/coin-economy";
export {
  COIN_RATE_IDR,
  TOPUP_PACKAGES,
  coinsToIdr,
  idrToCoins,
  getTopupPackage,
  calculateCoinsForAmount,
} from "@/lib/coin-economy";

export interface CoinPackage {
  id: string;
  coins: number;
  price: number;
  name: string;
  bonusText?: string;
  popular?: boolean;
}

export const HORIZON_COIN_PACKAGES: CoinPackage[] = [
  {
    id: "starter",
    coins: 100,
    price: 10000,
    name: "🪙 Starter Pouch (100 HC)",
    bonusText: "Tanpa bonus • Coba 1x Gacha",
  },
  {
    id: "adventurer",
    coins: 275,
    price: 25000,
    name: "⚔️ Adventurer Chest (275 HC)",
    bonusText: "Bonus +25 HC (Ekstra 10%)",
  },
  {
    id: "guild_vault",
    coins: 575,
    price: 50000,
    name: "🔮 Guild Vault (575 HC)",
    bonusText: "Bonus +75 HC (Cukup 5x Multi Summon)",
    popular: true,
  },
  {
    id: "sovereign",
    coins: 1200,
    price: 100000,
    name: "👑 Sovereign Treasury (1.200 HC)",
    bonusText: "Bonus +200 HC (Nilai Terbaik)",
  },
  {
    id: "emperor_mythic",
    coins: 3150,
    price: 250000,
    name: "🔥 Emperor Mythic Pack (3.150 HC)",
    bonusText: "Bonus +650 HC (Sultan Edition • Ekstra 26%)",
  },
];

/**
 * Mendapatkan periodKey WIB untuk Misi Harian ("YYYY-MM-DD")
 * dan Misi Mingguan ("YYYY-Www")
 */
export function getWibQuestPeriodKeys(date = new Date()): {
  dailyKey: string;
  weeklyKey: string;
  startOfTodayUtc: Date;
  startOfWeekUtc: Date;
  secondsUntilDailyReset: number;
  secondsUntilWeeklyReset: number;
} {
  // WIB is UTC+7
  const wibTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const y = wibTime.getUTCFullYear();
  const m = wibTime.getUTCMonth();
  const d = wibTime.getUTCDate();

  const dailyKey = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const startOfTodayUtc = new Date(Date.UTC(y, m, d) - 7 * 60 * 60 * 1000);

  // Weekly: Monday to Sunday
  // getUTCDay: 0 (Sun), 1 (Mon) .. 6 (Sat)
  const dayOfWeek = wibTime.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayDate = new Date(wibTime);
  mondayDate.setUTCDate(wibTime.getUTCDate() + diffToMonday);

  // Calculate ISO week number
  const startOfYear = new Date(Date.UTC(y, 0, 1));
  const weekNumber = Math.ceil(
    ((mondayDate.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getUTCDay() + 1) / 7
  );
  const weeklyKey = `${y}-W${String(weekNumber).padStart(2, "0")}`;

  const startOfWeekUtc = new Date(
    Date.UTC(mondayDate.getUTCFullYear(), mondayDate.getUTCMonth(), mondayDate.getUTCDate()) -
      7 * 60 * 60 * 1000
  );

  const nextDailyReset = new Date(startOfTodayUtc.getTime() + 24 * 60 * 60 * 1000);
  const secondsUntilDailyReset = Math.max(0, Math.floor((nextDailyReset.getTime() - date.getTime()) / 1000));

  const nextWeeklyReset = new Date(startOfWeekUtc.getTime() + 7 * 24 * 60 * 60 * 1000);
  const secondsUntilWeeklyReset = Math.max(0, Math.floor((nextWeeklyReset.getTime() - date.getTime()) / 1000));

  return {
    dailyKey,
    weeklyKey,
    startOfTodayUtc,
    startOfWeekUtc,
    secondsUntilDailyReset,
    secondsUntilWeeklyReset,
  };
}

/**
 * Mutasi Atomik Horizon Coins (Saldo User + Catatan Riwayat CoinTransaction)
 * Aman dari race condition, anti-saldo negatif.
 */
export async function mutateHorizonCoinsInTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  type: CoinTransactionType,
  description: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true, horizonCoins: true },
  });

  if (!user) {
    return { success: false, newBalance: 0, error: "USER_NOT_FOUND" };
  }

  const currentCoins = user.horizonCoins || 0;
  const isOwner = isGuildOwner(user);

  // Jika pengurangan saldo (amount < 0), pastikan saldo mencukupi (kecuali Owner)
  if (amount < 0 && !isOwner) {
    const required = Math.abs(amount);
    if (currentCoins < required) {
      return {
        success: false,
        newBalance: currentCoins,
        error: `INSUFFICIENT_COINS:${required}:${currentCoins}`,
      };
    }
  }

  const finalBalance = isOwner && amount < 0 && currentCoins < Math.abs(amount)
    ? 999999 // Owner perks
    : Math.max(0, currentCoins + amount);

  await tx.user.update({
    where: { id: userId },
    data: { horizonCoins: finalBalance },
  });

  await tx.coinTransaction.create({
    data: {
      userId,
      amount,
      type,
      description,
    },
  });

  return {
    success: true,
    newBalance: finalBalance,
  };
}

/**
 * Wrapper standalone untuk mutasi Horizon Coins di luar transaksi aktif
 */
export async function mutateHorizonCoins(
  userId: string,
  amount: number,
  type: CoinTransactionType,
  description: string
) {
  return prisma.$transaction(async (tx) => {
    return mutateHorizonCoinsInTransaction(tx, userId, amount, type, description);
  });
}
