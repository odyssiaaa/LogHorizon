import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import type { Role } from "@prisma/client";

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
  const user = await activeUser();
  if (!user) return { user: null, response: jsonError("Login diperlukan.", 401) } as const;
  if (!roles.includes(user.role)) return { user: null, response: jsonError("Akses tidak diizinkan.", 403) } as const;
  return { user, response: null } as const;
}
