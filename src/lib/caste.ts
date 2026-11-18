/**
 * Centralized Guild Caste & Hierarchy Logic for LogHorizon
 * Re-exports core caste logic from @/lib/auth-guard.
 */

export * from "@/lib/auth-guard";
import { isGuildOwner, CasteUserLike } from "@/lib/auth-guard";

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
