import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { ARMORY_ITEMS } from "@/lib/armory-catalog";

export async function GET() {
  const user = await activeUser();
  if (!user) {
    return Response.json({
      catalog: ARMORY_ITEMS,
      user: null,
      ownedItemIds: [],
    });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      username: true,
      avatar: true,
      xp: true,
      level: true,
      equippedAvatarFrame: true,
      equippedCustomTitle: true,
      cosmetics: {
        select: {
          itemId: true,
          itemType: true,
          purchasedAt: true,
        },
      },
    },
  });

  if (!dbUser) return jsonError("Pengguna tidak ditemukan.", 404);

  return Response.json({
    catalog: ARMORY_ITEMS,
    user: {
      id: dbUser.id,
      username: dbUser.username,
      avatar: dbUser.avatar,
      xp: dbUser.xp,
      level: dbUser.level,
      equippedAvatarFrame: dbUser.equippedAvatarFrame,
      equippedCustomTitle: dbUser.equippedCustomTitle,
    },
    ownedItemIds: dbUser.cosmetics.map((c) => c.itemId),
  });
}
