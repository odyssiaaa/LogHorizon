import { Prisma, Role } from "@prisma/client";
import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await requireStaff();
  if (access.response) return access.response;

  const { id } = await params;
  if (id === access.user.id) {
    return Response.json({ error: "Akun admin sendiri tidak dapat diubah dari dashboard." }, { status: 400 });
  }

  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isBanned: true, xp: true, level: true, isPremium: true },
  });
  if (!existing) return Response.json({ error: "Member tidak ditemukan." }, { status: 404 });

  const updateData: Prisma.UserUpdateInput = {};

  // 1. Role Change (Admin only)
  if (Object.prototype.hasOwnProperty.call(data, "role")) {
    if (access.user.role !== "ADMIN") return Response.json({ error: "Hanya Admin yang dapat mengubah role." }, { status: 403 });
    if (typeof data.role !== "string" || !Object.values(Role).includes(data.role as Role)) {
      return Response.json({ error: "Role tidak valid." }, { status: 400 });
    }
    updateData.role = data.role as Role;
  }

  // 2. Ban / Unban
  if (Object.prototype.hasOwnProperty.call(data, "isBanned")) {
    if (typeof data.isBanned !== "boolean") return Response.json({ error: "Status ban tidak valid." }, { status: 400 });
    if (access.user.role === "MODERATOR" && existing.role !== Role.MEMBER) {
      return Response.json({ error: "Moderator hanya dapat membatasi akun Member." }, { status: 403 });
    }
    updateData.isBanned = data.isBanned;
  }

  // 3. Premium Status (Admin only)
  if (Object.prototype.hasOwnProperty.call(data, "isPremium")) {
    if (access.user.role !== "ADMIN") return Response.json({ error: "Hanya Admin yang dapat mengubah status premium." }, { status: 403 });
    if (typeof data.isPremium !== "boolean") return Response.json({ error: "Status premium tidak valid." }, { status: 400 });
    updateData.isPremium = data.isPremium;
  }

  // 4. XP adjustment (Admin only)
  if (Object.prototype.hasOwnProperty.call(data, "xp")) {
    if (access.user.role !== "ADMIN") return Response.json({ error: "Hanya Admin yang dapat mengubah XP." }, { status: 403 });
    const xpVal = Number(data.xp);
    if (!Number.isSafeInteger(xpVal) || xpVal < 0) return Response.json({ error: "XP tidak valid." }, { status: 400 });
    updateData.xp = xpVal;
  }

  // 5. Level adjustment (Admin only)
  if (Object.prototype.hasOwnProperty.call(data, "level")) {
    if (access.user.role !== "ADMIN") return Response.json({ error: "Hanya Admin yang dapat mengubah Level." }, { status: 403 });
    const lvlVal = Number(data.level);
    if (!Number.isSafeInteger(lvlVal) || lvlVal < 1 || lvlVal > 100) return Response.json({ error: "Level harus 1–100." }, { status: 400 });
    updateData.level = lvlVal;
  }

  if (Object.keys(updateData).length === 0) {
    return Response.json({ error: "Tidak ada parameter perubahan yang diberikan." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      username: true,
      avatar: true,
      discordId: true,
      role: true,
      isBanned: true,
      isPremium: true,
      xp: true,
      level: true,
      badges: true,
      joinedAt: true,
    },
  });

  return Response.json(user);
}
