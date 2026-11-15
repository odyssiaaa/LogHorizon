/**
 * Centralized Guild Caste & Hierarchy Logic for LogHorizon
 * 
 * Absolute Hierarchy:
 * - 👑 Emperor: Exclusive to Owner (.odyssia)
 * - ✨ Prince / Princess: High Council & Admins (role === 'ADMIN')
 * - ⚔️ Lord Commander: Elite Moderators (role === 'MODERATOR')
 * - 💎 Noble Patron: Top Benefactors / Donors
 * - 🎮 Adventurer: Guild Members (role === 'MEMBER')
 */

export type CasteUserLike = {
  id?: string | null;
  username?: string | null;
  name?: string | null;
  discordId?: string | null;
  email?: string | null;
  role?: string | null;
  isPremium?: boolean | null;
  badges?: string[] | null;
};

/**
 * Checks whether the user is the sole Guild Owner (.odyssia).
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
  return "🎮 Adventurer";
}

/**
 * Sanitizes badges array so that "👑 Emperor" is NEVER granted to anyone except .odyssia.
 */
export function sanitizeBadges(user?: CasteUserLike | null, badges: string[] = []): string[] {
  const isOwner = isGuildOwner(user);
  if (isOwner) {
    const list = badges.filter((b) => !b.includes("Emperor"));
    return ["👑 Emperor", ...list];
  }
  // Remove any Emperor badge if accidentally stored or inherited
  const filtered = badges.filter((b) => !b.includes("Emperor"));
  if (user?.role === "ADMIN" && !filtered.some((b) => b.includes("Prince"))) {
    return ["✨ Prince / Princess", ...filtered];
  }
  if (user?.role === "MODERATOR" && !filtered.some((b) => b.includes("Lord Commander"))) {
    return ["⚔️ Lord Commander", ...filtered];
  }
  return filtered;
}

/**
 * Returns styling and label badge metadata for rendering.
 */
export function getCasteBadgeMeta(user?: CasteUserLike | null): {
  label: string;
  className: string;
  isOwner: boolean;
} {
  if (isGuildOwner(user)) {
    return {
      label: "👑 Emperor",
      className: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
      isOwner: true,
    };
  }
  if (user?.role === "ADMIN") {
    return {
      label: "✨ Prince / Princess",
      className: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
      isOwner: false,
    };
  }
  if (user?.role === "MODERATOR") {
    return {
      label: "⚔️ Lord Commander",
      className: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
      isOwner: false,
    };
  }
  return {
    label: "🎮 Member",
    className: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
    isOwner: false,
  };
}
