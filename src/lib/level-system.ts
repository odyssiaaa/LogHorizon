/**
 * Sistem Level & Kurva XP Progresif LogHorizon (Progressive RPG Leveling Curve)
 *
 * Rumus Progresif (Tanpa Batas Mentok):
 * - Level 1 ➔ 2: Butuh 100 XP (cepat & ramah bagi pemula).
 * - Kebutuhan XP untuk naik ke level berikutnya bertambah secara progresif:
 *   xpNeededForNextLevel(level) = Math.round(100 * Math.pow(level, 1.35))
 *
 * Contoh Skala:
 * - Lv. 1 ➔ 2: 100 XP
 * - Lv. 2 ➔ 3: ~255 XP
 * - Lv. 5 ➔ 6: ~880 XP
 * - Lv. 10 ➔ 11: ~2.240 XP
 * - Lv. 25 ➔ 26: ~7.700 XP
 * - Lv. 50+: puluhan ribu XP!
 */

export interface LevelProgress {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
}

/**
 * Menghitung kebutuhan XP untuk naik dari `level` saat ini ke `level + 1`.
 */
export function xpNeededForNextLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return Math.round(100 * Math.pow(safeLevel, 1.35));
}

/**
 * Menghitung Level dan Progress Bar XP secara seragam.
 * Mendukung masukan total lifetime XP maupun pasangan (level, inLevelXp).
 *
 * @param xp Total XP yang dimiliki (atau in-level XP jika currentLevel diberikan)
 * @param currentLevel Level saat ini (opsional, jika data DB menyimpan in-level XP)
 */
export function calculateLevelFromXp(xp: number, currentLevel?: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(Number(xp) || 0));

  if (typeof currentLevel === "number" && currentLevel >= 1) {
    const level = Math.floor(currentLevel);
    const nextLevelXp = xpNeededForNextLevel(level);
    const currentLevelXp = Math.min(nextLevelXp, safeXp);
    const progressPercent = Math.min(
      100,
      Math.max(0, Math.round((currentLevelXp / nextLevelXp) * 100))
    );
    return {
      level,
      currentLevelXp,
      nextLevelXp,
      progressPercent,
    };
  }

  // Jika dihitung dari total kumulatif XP dari Level 1
  let level = 1;
  let remainingXp = safeXp;

  while (true) {
    const needed = xpNeededForNextLevel(level);
    if (remainingXp >= needed) {
      remainingXp -= needed;
      level += 1;
    } else {
      break;
    }
  }

  const nextLevelXp = xpNeededForNextLevel(level);
  const currentLevelXp = remainingXp;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((currentLevelXp / nextLevelXp) * 100))
  );

  return {
    level,
    currentLevelXp,
    nextLevelXp,
    progressPercent,
  };
}

/**
 * Helper untuk mendapatkan progres level saat ini dari (level, xpInLevel)
 */
export function getLevelProgress(level: number, xpInLevel: number): LevelProgress {
  return calculateLevelFromXp(xpInLevel, level);
}

/**
 * Menghitung kenaikan level progresif ketika pengguna mendapatkan tambahan XP.
 * Dipakai saat transaksi pemberian XP (absen harian, forum, quest, redeem, gacha).
 */
export function calculateProgressiveLevelUp(
  currentLevel: number,
  currentInLevelXp: number,
  addedXp: number
): {
  newLevel: number;
  newInLevelXp: number;
  levelsGained: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  let level = Math.max(1, Math.floor(Number(currentLevel) || 1));
  let remainingXp = Math.max(0, Math.floor(Number(currentInLevelXp) || 0)) + Math.max(0, Math.floor(Number(addedXp) || 0));
  const startLevel = level;

  while (true) {
    const needed = xpNeededForNextLevel(level);
    if (remainingXp >= needed) {
      remainingXp -= needed;
      level += 1;
    } else {
      break;
    }
  }

  const nextLevelXp = xpNeededForNextLevel(level);
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((remainingXp / nextLevelXp) * 100))
  );

  return {
    newLevel: level,
    newInLevelXp: remainingXp,
    levelsGained: level - startLevel,
    nextLevelXp,
    progressPercent,
  };
}
