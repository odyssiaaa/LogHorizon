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

export function formatLastSeen(dateInput?: Date | string | null): {
  isOnline: boolean;
  text: string;
} {
  if (!dateInput) {
    return { isOnline: false, text: "Belum aktif" };
  }
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return { isOnline: false, text: "Belum aktif" };
  }
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60)));
  if (diffMinutes < 5) {
    return { isOnline: true, text: "Online Sekarang" };
  }
  if (diffMinutes < 60) {
    return { isOnline: false, text: `Terakhir aktif ${diffMinutes}m lalu` };
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return { isOnline: false, text: `Terakhir aktif ${diffHours}j lalu` };
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return { isOnline: false, text: `Terakhir aktif ${diffDays}h lalu` };
  }
  return {
    isOnline: false,
    text: `Aktif ${date.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`,
  };
}

