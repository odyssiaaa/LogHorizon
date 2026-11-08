import { Role } from "@prisma/client";
import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await requireStaff();
  if (access.response) return access.response;

  const { id } = await params;
  if (id === access.user.id) return Response.json({ error: "Akun admin sendiri tidak dapat diubah dari dashboard." }, { status: 400 });

  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const hasRole = Object.prototype.hasOwnProperty.call(data, "role");
  const hasBan = Object.prototype.hasOwnProperty.call(data, "isBanned");
  if (hasRole === hasBan) return Response.json({ error: "Pilih tepat satu perubahan: role atau status ban." }, { status: 400 });

  if (hasRole && access.user.role !== "ADMIN") return Response.json({ error: "Hanya Admin yang dapat mengubah role." }, { status: 403 });
  if (hasRole && (typeof data.role !== "string" || !Object.values(Role).includes(data.role as Role))) {
    return Response.json({ error: "Role tidak valid." }, { status: 400 });
  }
  if (hasBan && typeof data.isBanned !== "boolean") {
    return Response.json({ error: "Status ban tidak valid." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return Response.json({ error: "Member tidak ditemukan." }, { status: 404 });
  if (hasBan && access.user.role === "MODERATOR") {
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (target && target.role !== Role.MEMBER) return Response.json({ error: "Moderator hanya dapat membatasi akun Member." }, { status: 403 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: hasRole ? { role: data.role as Role } : { isBanned: data.isBanned as boolean },
    select: { id: true, username: true, avatar: true, role: true, isBanned: true, joinedAt: true },
  });
  return Response.json(user);
}
