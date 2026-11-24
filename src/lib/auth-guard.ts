import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { User, Role } from "@prisma/client";
import { logSecurityIncident } from "@/lib/satpam-guardian";

import { isGuildOwner, isStaff, isAdmin, isEmperor, getCasteTitle, getCasteBadgeStyle, type CasteUserLike } from "@/lib/caste-hierarchy";
export { isGuildOwner, isStaff, isAdmin, isEmperor, getCasteTitle, getCasteBadgeStyle, type CasteUserLike };

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
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user && (!user.lastActiveAt || Date.now() - new Date(user.lastActiveAt).getTime() > 60_000)) {
    void prisma.user
      .update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      })
      .catch(() => null);
  }
  return user;
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
 * Strict Owner Odyssia Guard:
 * Strictly limited to the sole Guild Owner account (.odyssia).
 * Verifies directly against DB. Rejects all others (even ADMIN/MODERATOR) with 403 Forbidden.
 */
export async function requireOwnerOdyssia() {
  const user = await authenticatedUser();
  if (!user) return { user: null, response: jsonError("Login diperlukan.", 401) } as const;

  const isOwner =
    isGuildOwner(user) ||
    (user.username && user.username.toLowerCase() === ".odyssia") ||
    (user.username && user.username.toLowerCase() === "odyssia");

  if (!isOwner) {
    void logSecurityIncident({
      userId: user.id,
      username: user.username ?? user.name ?? "Unauthorized User",
      action: "UNAUTHORIZED_EMPEROR_ACCESS_ATTEMPT",
      reason: "Percobaan akses panel mutlak Emperor Sovereign oleh non-owner",
      content: `User @${user.username} (ID: ${user.id}, Role: ${user.role}) mencoba mengakses Emperor Sovereign Control tanpa wewenang mutlak.`,
      severity: "CRITICAL",
    });
    return {
      user: null,
      response: jsonError("Akses ditolak: Hanya pemilik tunggal (.odyssia) yang memiliki wewenang Emperor Sovereign.", 403),
    } as const;
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
