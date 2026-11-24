import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getArmoryItem } from "@/lib/armory-catalog";
import { isGuildOwner } from "@/lib/auth-guard";
import { hasAllFramesTrial } from "@/lib/trial-helper";

export async function POST(request: Request) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan.", 401);

  const body = await request.json().catch(() => ({}));
  const { itemId, type } = body;

  if (type !== "AVATAR_FRAME" && type !== "CUSTOM_TITLE") {
    return jsonError("Tipe kosmetik tidak valid.", 400);
  }

  // Unequip
  if (!itemId) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data:
        type === "AVATAR_FRAME"
          ? { equippedAvatarFrame: null }
          : { equippedCustomTitle: null },
      select: {
        id: true,
        equippedAvatarFrame: true,
        equippedCustomTitle: true,
      },
    });

    return Response.json({
      success: true,
      message: `${type === "AVATAR_FRAME" ? "Bingkai avatar" : "Gelar kustom"} berhasil dilepas.`,
      user: updated,
    });
  }

  const catalogItem = getArmoryItem(itemId);
  if (!catalogItem) {
    return jsonError("Item kosmetik tidak valid.", 400);
  }

  const isOwner = isGuildOwner(user);
  const trialHasAllFrames = type === "AVATAR_FRAME" && hasAllFramesTrial(user);

  // Equip: verify ownership (Bypassed for Guild Owner / Emperor .odyssia or active Trial)
  if (!isOwner && !trialHasAllFrames) {
    const owned = await prisma.userCosmetic.findUnique({
      where: {
        userId_itemId: {
          userId: user.id,
          itemId,
        },
      },
    });

    if (!owned) {
      return jsonError("Kamu belum memiliki item kosmetik ini.", 403);
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data:
      type === "AVATAR_FRAME"
        ? { equippedAvatarFrame: itemId }
        : { equippedCustomTitle: itemId },
    select: {
      id: true,
      equippedAvatarFrame: true,
      equippedCustomTitle: true,
    },
  });

  return Response.json({
    success: true,
    message: `${catalogItem.name} berhasil dipasang!`,
    user: updated,
  });
}
