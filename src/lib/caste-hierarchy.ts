export type CasteUserLike = {
  id?: string | null;
  username?: string | null;
  name?: string | null;
  discordId?: string | null;
  email?: string | null;
  role?: string | null;
  isPremium?: boolean | null;
  badges?: string[] | null;
  tempTitle?: string | null;
  tempTitleExpiresAt?: Date | string | null;
  trialType?: string | null;
  trialExpiresAt?: Date | string | null;
};

/**
 * Checks whether the user is the sole Guild Owner / Emperor (.odyssia).
 * No other account can ever be Emperor regardless of their ADMIN role.
 */
export function isGuildOwner(user?: CasteUserLike | null): boolean {
  if (!user) return false;
  const username = (user.username ?? "").toLowerCase().trim();
  const name = (user.name ?? "").toLowerCase().trim();
  const email = (user.email ?? "").toLowerCase().trim();
  const discordId = (user.discordId ?? "").trim();

  return (
    username === ".odyssia" ||
    username === "odyssia" ||
    name === ".odyssia" ||
    name === "odyssia" ||
    discordId === "706661230835925042" ||
    email === "farrel.andhikapratama0905@gmail.com"
  );
}

export const isEmperor = isGuildOwner;

export function isAdmin(user?: CasteUserLike | null): boolean {
  if (!user) return false;
  return isGuildOwner(user) || user.role === "ADMIN";
}

export function isStaff(user?: CasteUserLike | null): boolean {
  if (!user) return false;
  return isGuildOwner(user) || user.role === "ADMIN" || user.role === "MODERATOR";
}

/**
 * Returns the exact title for the user based on absolute hierarchy.
 */
export function getCasteTitle(user?: CasteUserLike | null): string {
  if (isGuildOwner(user)) {
    return "👑 Emperor";
  }
  if (user?.role === "ADMIN") {
    return "✨ Prince / Princess";
  }
  if (user?.role === "MODERATOR") {
    return "⚔️ Lord Commander";
  }
  if (user?.isPremium) {
    return "💎 Noble Patron";
  }
  if (
    user?.trialType === "VIP_PREMIUM" &&
    user.trialExpiresAt &&
    new Date(user.trialExpiresAt).getTime() > Date.now()
  ) {
    return "💎 Noble Patron (⏳ Trial)";
  }
  return "🎮 Adventurer";
}

/**
 * Returns badge styling classes for the user's caste.
 */
export function getCasteBadgeStyle(user?: CasteUserLike | null): {
  bg: string;
  text: string;
  border: string;
  glow: string;
} {
  if (isGuildOwner(user)) {
    return {
      bg: "bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-amber-500/20",
      text: "text-amber-400 font-extrabold",
      border: "border-amber-400/60",
      glow: "shadow-[0_0_12px_rgba(245,158,11,0.35)]",
    };
  }
  if (user?.role === "ADMIN") {
    return {
      bg: "bg-purple-500/20",
      text: "text-purple-300 font-bold",
      border: "border-purple-400/50",
      glow: "shadow-[0_0_10px_rgba(168,85,247,0.25)]",
    };
  }
  if (user?.role === "MODERATOR") {
    return {
      bg: "bg-blue-500/20",
      text: "text-blue-300 font-bold",
      border: "border-blue-400/50",
      glow: "shadow-[0_0_8px_rgba(59,130,246,0.25)]",
    };
  }
  if (
    user?.isPremium ||
    (user?.trialType === "VIP_PREMIUM" &&
      user.trialExpiresAt &&
      new Date(user.trialExpiresAt).getTime() > Date.now())
  ) {
    return {
      bg: "bg-emerald-500/20",
      text: "text-emerald-300 font-bold",
      border: "border-emerald-400/50",
      glow: "shadow-[0_0_8px_rgba(16,185,129,0.25)]",
    };
  }
  return {
    bg: "bg-slate-500/10 dark:bg-slate-800/40",
    text: "text-slate-400 dark:text-slate-300 font-medium",
    border: "border-slate-300/30 dark:border-slate-700/50",
    glow: "",
  };
}
