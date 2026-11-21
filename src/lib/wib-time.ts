/**
 * Centralized WIB (UTC+7) Date and Time Utilities for LogHorizon
 */

export function getWibDateInfo(date: Date = new Date()): {
  dateKey: string;
  startOfTodayUtc: Date;
  endOfTodayUtc: Date;
  secondsUntilReset: number;
} {
  // WIB is UTC+7
  const wibTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const y = wibTime.getUTCFullYear();
  const m = wibTime.getUTCMonth();
  const d = wibTime.getUTCDate();
  const dateKey = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  // Midnight WIB converted back to UTC
  const midnightWibInUtc = Date.UTC(y, m, d) - 7 * 60 * 60 * 1000;
  const startOfTodayUtc = new Date(midnightWibInUtc);
  const nextMidnightWibInUtc = midnightWibInUtc + 24 * 60 * 60 * 1000;
  const endOfTodayUtc = new Date(nextMidnightWibInUtc);
  const secondsUntilReset = Math.max(0, Math.floor((nextMidnightWibInUtc - date.getTime()) / 1000));

  return {
    dateKey,
    startOfTodayUtc,
    endOfTodayUtc,
    secondsUntilReset,
  };
}
