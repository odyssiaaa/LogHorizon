import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { ARMORY_ITEMS } from "@/lib/armory-catalog";
import { isGuildOwner } from "@/lib/auth-guard";
import { hasAllFramesTrial } from "@/lib/trial-helper";

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
      name: true,
      email: true,
      discordId: true,
      role: true,
      avatar: true,
      xp: true,
      level: true,
      equippedAvatarFrame: true,
      equippedCustomTitle: true,
      trialType: true,
      trialExpiresAt: true,
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

  const isOwner = isGuildOwner(dbUser);
  const trialHasAllFrames = hasAllFramesTrial(dbUser);

  let ownedItemIds = isOwner
    ? ARMORY_ITEMS.map((item) => item.id)
    : dbUser.cosmetics.map((c) => c.itemId);

  if (trialHasAllFrames && !isOwner) {
    const frameIds = ARMORY_ITEMS.filter((i) => i.type === "AVATAR_FRAME").map((i) => i.id);
    ownedItemIds = Array.from(new Set([...ownedItemIds, ...frameIds]));
  }

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
      isOwner,
    },
    ownedItemIds,
  });
}
