import { NextResponse } from "next/server";
import { requireOwnerOdyssia } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const instant = false;

export async function GET(req: Request) {
  const { user: owner, response } = await requireOwnerOdyssia();
  if (response || !owner) return response;

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") || "").trim();

  try {
    const whereClause = search
      ? {
          OR: [
            { username: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
            { discordId: { contains: search } },
            { email: { contains: search, mode: "insensitive" as const } },
            { id: search },
          ],
        }
      : {};

    const users = await prisma.user.findMany({
      where: whereClause,
      take: 25,
      orderBy: [
        { xp: "desc" },
        { id: "desc" },
      ],
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
        discordId: true,
        email: true,
        role: true,
        xp: true,
        level: true,
        dailyGachaTickets: true,
        badges: true,
        isVerifiedSeller: true,
        checkInStreak: true,
        equippedAvatarFrame: true,
        equippedCustomTitle: true,
        trialType: true,
        trialExpiresAt: true,
        cosmetics: {
          select: {
            id: true,
            itemId: true,
            itemName: true,
            itemType: true,
          },
        },
      },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal memuat pengguna" }, { status: 500 });
  }
}
