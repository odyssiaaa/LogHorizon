/**
 * Centralized Guild Caste & Hierarchy Logic for LogHorizon
 * Re-exports core caste logic from @/lib/auth-guard and European Nobility Rank System.
 */

export * from "@/lib/auth-guard";
export * from "@/lib/nobility-ranks";
import { isGuildOwner, CasteUserLike } from "@/lib/auth-guard";

/**
 * Checks if the user currently holds an active 24h temporary title from Royal Daily Chest.
 */
export function getActiveTempTitle(user?: CasteUserLike | null): string | null {
  if (!user?.tempTitle || !user?.tempTitleExpiresAt) return null;
  const exp = new Date(user.tempTitleExpiresAt).getTime();
  if (exp > Date.now()) {
    return user.tempTitle;
  }
  return null;
}

/**
 * Sanitizes badges array so that "👑 Emperor" is NEVER granted to anyone except .odyssia.
 * Also prepends any active temporary title from Royal Daily Chest.
 */
export function sanitizeBadges(user?: CasteUserLike | null, badges: string[] = []): string[] {
  const isOwner = isGuildOwner(user);
  const activeTempTitle = getActiveTempTitle(user);

  let result: string[] = [];
  if (isOwner) {
    const list = badges.filter((b) => !b.includes("Emperor"));
    result = ["👑 Emperor", ...list];
  } else {
    // Remove any Emperor badge if accidentally stored or inherited
    const filtered = badges.filter((b) => !b.includes("Emperor"));
    if (user?.role === "ADMIN" && !filtered.some((b) => b.includes("Prince"))) {
      result = ["✨ Prince / Princess", ...filtered];
    } else if (user?.role === "MODERATOR" && !filtered.some((b) => b.includes("Lord Commander"))) {
      result = ["⚔️ Lord Commander", ...filtered];
    } else {
      result = filtered;
    }
  }

  if (activeTempTitle && !result.includes(activeTempTitle)) {
    result = [activeTempTitle, ...result];
  }

  return result;
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
