/**
 * Sistem Level & Kurva XP Progresif LogHorizon (Single Source of Truth)
 *
 * Kurva RPG Progresif Dua Arah:
 * - Rumus XP per Tingkat (xpForSingleLevel(lvl)):
 *   Untuk naik dari lvl ke lvl + 1, dibutuhkan Math.round(100 * Math.pow(lvl, 1.35)) XP
 *   - Lv. 1 ➔ 2: 100 XP (Total 100 XP)
 *   - Lv. 2 ➔ 3: 255 XP (Total 355 XP)
 *   - Lv. 3 ➔ 4: 441 XP (Total 796 XP)
 *   - Lv. 4 ➔ 5: 650 XP (Total 1.446 XP)
 *   - Lv. 5 ➔ 6: 879 XP (Total 2.325 XP)
 *   - Lv. 10 ➔ 11: 2.239 XP (Total 10.366 XP)
 *   - Lv. 25 ➔ 26: 7.704 XP (Total ~67.000 XP)
 *   - Lv. 50+: puluhan ribu XP!
 */

export interface LevelProgress {
  level: number;
  totalXp: number;
  xpMinForCurrentLevel: number;
  xpForNextLevel: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
}

/**
 * Rumus XP per Tingkat: Kebutuhan XP untuk naik dari `lvl` ke `lvl + 1`.
 */
export function xpForSingleLevel(lvl: number): number {
  const safeLevel = Math.max(1, Math.floor(Number(lvl) || 1));
  return Math.round(100 * Math.pow(safeLevel, 1.35));
}

// Alias untuk kompatibilitas pemanggil lama
export const xpNeededForNextLevel = xpForSingleLevel;

/**
 * Fungsi 2: Level ➔ Total XP Minimum Kumulatif (Level ➔ XP)
 * Menghitung jumlah Total XP minimum yang tepat untuk mencapai `targetLevel`.
 * Misal jika targetLevel = 10, mengembalikan total akumulasi XP yang dibutuhkan dari Level 1 ke Level 10.
 */
export function getMinimumXpForLevel(targetLevel: number): number {
  const safeTarget = Math.max(1, Math.floor(Number(targetLevel) || 1));
  let totalMinXp = 0;
  for (let lvl = 1; lvl < safeTarget; lvl++) {
    totalMinXp += xpForSingleLevel(lvl);
  }
  return totalMinXp;
}

/**
 * Fungsi 1: Total XP ➔ Level & Progres Dua Arah (XP ➔ Level)
 * Menghitung Level asli, ambang minimum XP level tersebut, target XP level berikutnya, serta progressPercent.
 */
export function getLevelProgressFromXp(totalXp: number): LevelProgress {
  const safeTotalXp = Math.max(0, Math.floor(Number(totalXp) || 0));

  let level = 1;
  let xpMinForCurrentLevel = 0;
  let remainingXp = safeTotalXp;

  while (true) {
    const needed = xpForSingleLevel(level);
    if (remainingXp >= needed) {
      remainingXp -= needed;
      xpMinForCurrentLevel += needed;
      level += 1;
    } else {
      break;
    }
  }

  const xpForNextLevel = xpForSingleLevel(level);
  const currentLevelXp = remainingXp;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((currentLevelXp / xpForNextLevel) * 100))
  );

  return {
    level,
    totalXp: safeTotalXp,
    xpMinForCurrentLevel,
    xpForNextLevel,
    currentLevelXp,
    nextLevelXp: xpForNextLevel,
    progressPercent,
  };
}

/**
 * Helper kompatibilitas: Mengembalikan LevelProgress dari XP total (atau in-level)
 */
export function calculateLevelFromXp(xp: number, currentLevel?: number): LevelProgress {
  return getLevelProgressFromXp(xp);
}

/**
 * Helper kompatibilitas: Mengembalikan LevelProgress dari (level, xp)
 */
export function getLevelProgress(level: number, xp: number): LevelProgress {
  return getLevelProgressFromXp(xp);
}

/**
 * Helper untuk menghitung perolehan level ketika mendapatkan tambahan XP baru.
 */
export function calculateProgressiveLevelUp(
  currentLevel: number,
  currentXp: number,
  addedXp: number
) {
  const newTotalXp = Math.max(0, Math.floor(Number(currentXp) || 0)) + Math.max(0, Math.floor(Number(addedXp) || 0));
  const progress = getLevelProgressFromXp(newTotalXp);
  const startLevel = Math.max(1, Math.floor(Number(currentLevel) || 1));

  return {
    ...progress,
    newLevel: progress.level,
    newTotalXp,
    newInLevelXp: progress.currentLevelXp,
    levelsGained: Math.max(0, progress.level - startLevel),
  };
}
