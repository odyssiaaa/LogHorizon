import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { User, Role } from "@prisma/client";
import { logSecurityIncident } from "@/lib/satpam-guardian";

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
  if (user?.isPremium) {
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

/**
 * Standard JSON Error response helper
 */
export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/**
 * Authenticates user from session and queries DB
 */
export async function authenticatedUser(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

/**
 * Returns authenticated user only if not banned
 */
export async function activeUser(): Promise<User | null> {
  const user = await authenticatedUser();
  return user && !user.isBanned ? user : null;
}

/**
 * Staff route guard (Admin/Moderator)
 */
export async function requireStaff(roles: Role[] = ["ADMIN", "MODERATOR"]) {
  const user = await authenticatedUser();
  if (!user) return { user: null, response: jsonError("Login diperlukan.", 401) } as const;

  if (user.isBanned) {
    void logSecurityIncident({
      userId: user.id,
      username: user.username ?? user.name ?? "Banned User",
      action: "BANNED_USER_ADMIN_ACCESS_ATTEMPT",
      reason: "Percobaan akses endpoint staf/admin oleh akun yang sedang diblokir",
      content: `User @${user.username} (ID: ${user.id}) diblokir tetapi mencoba mengakses endpoint staf.`,
      severity: "CRITICAL",
    });
    return { user: null, response: jsonError("Akun Anda sedang dibatasi atau diblokir.", 403) } as const;
  }

  if (!roles.includes(user.role) && !isGuildOwner(user)) {
    void logSecurityIncident({
      userId: user.id,
      username: user.username ?? user.name ?? "Unauthorized User",
      action: "UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT",
      reason: `Percobaan akses endpoint ${roles.join("/")} oleh role ${user.role}`,
      content: `User @${user.username} (ID: ${user.id}, Role: ${user.role}) mencoba mengakses endpoint staf tanpa wewenang.`,
      severity: "HIGH",
    });
    return { user: null, response: jsonError("Akses tidak diizinkan.", 403) } as const;
  }

  return { user, response: null } as const;
}

/**
 * Admin-only route guard (Admin/Owner)
 */
export async function requireAdmin() {
  return requireStaff(["ADMIN"]);
}

/**
 * Emperor / Owner-only route guard
 */
export async function requireOwner() {
  const user = await authenticatedUser();
  if (!user) return { user: null, response: jsonError("Login diperlukan.", 401) } as const;

  if (!isGuildOwner(user)) {
    void logSecurityIncident({
      userId: user.id,
      username: user.username ?? user.name ?? "Unauthorized User",
      action: "UNAUTHORIZED_OWNER_ACCESS_ATTEMPT",
      reason: "Percobaan akses endpoint khusus Emperor oleh non-owner",
      content: `User @${user.username} (ID: ${user.id}) mencoba mengakses endpoint khusus Guild Owner.`,
      severity: "CRITICAL",
    });
    return { user: null, response: jsonError("Akses khusus Guild Owner (Emperor).", 403) } as const;
  }

  return { user, response: null } as const;
}

/**
 * Anti-IDOR Guard:
 * Asserts that the authenticated user owns the resource, or has staff privileges if allowed.
 * Automatically logs security incident if an unauthorized access is attempted.
 */
export async function assertResourceOwnership(
  user: User | null,
  resourceOwnerId: string,
  options: {
    allowStaff?: boolean;
    resourceName?: string;
  } = {}
): Promise<{ allowed: boolean; response: Response | null }> {
  if (!user) {
    return { allowed: false, response: jsonError("Login diperlukan.", 401) };
  }

  const { allowStaff = true, resourceName = "Sumber daya" } = options;
  const isOwner = user.id === resourceOwnerId;
  const staffAllowed = allowStaff && isStaff(user);

  if (!isOwner && !staffAllowed) {
    void logSecurityIncident({
      userId: user.id,
      username: user.username ?? user.name ?? "Unknown",
      action: "IDOR_VIOLATION_ATTEMPT",
      reason: `Percobaan manipulasi ${resourceName} milik user lain (ID: ${resourceOwnerId})`,
      content: `User @${user.username} (ID: ${user.id}) mencoba mengakses/memodifikasi ${resourceName} milik user ${resourceOwnerId} tanpa hak akses.`,
      severity: "HIGH",
    });

    return {
      allowed: false,
      response: jsonError(`Akses ditolak: Kamu tidak memiliki izin untuk mengelola ${resourceName} ini.`, 403),
    };
  }

  return { allowed: true, response: null };
}
