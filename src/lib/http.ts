import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import type { Role } from "@prisma/client";
import { logSecurityIncident } from "@/lib/satpam-guardian";

export async function authenticatedUser(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

export async function activeUser(): Promise<User | null> {
  const user = await authenticatedUser();
  return user && !user.isBanned ? user : null;
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

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

  if (!roles.includes(user.role)) {
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

