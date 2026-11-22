import { Prisma } from "@prisma/client";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getArmoryItem } from "@/lib/armory-catalog";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk berbelanja di Armory.", 401);

  const body = await request.json().catch(() => ({}));
  const { itemId } = body;
  if (!itemId || typeof itemId !== "string") {
    return jsonError("ID item kosmetik wajib disertakan.", 400);
  }

  const catalogItem = getArmoryItem(itemId);
  if (!catalogItem) {
    return jsonError("Item kosmetik tidak ditemukan dalam katalog Armory.", 404);
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Query user with fresh balance
        const currentUser = await tx.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            username: true,
            xp: true,
            cosmetics: { where: { itemId }, select: { id: true } },
          },
        });

        if (!currentUser) throw new Error("Pengguna tidak ditemukan.");

        if (currentUser.cosmetics.length > 0) {
          throw new Error("Kamu sudah memiliki item kosmetik ini.");
        }

        if (currentUser.xp < catalogItem.priceXp) {
          throw new Error(
            `XP kamu tidak mencukupi. Butuh ${catalogItem.priceXp} XP, saat ini kamu memiliki ${currentUser.xp} XP.`
          );
        }

        // Deduct XP atomically
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            xp: { decrement: catalogItem.priceXp },
            ...(catalogItem.type === "AVATAR_FRAME"
              ? { equippedAvatarFrame: catalogItem.id }
              : { equippedCustomTitle: catalogItem.id }),
          },
          select: {
            id: true,
            xp: true,
            equippedAvatarFrame: true,
            equippedCustomTitle: true,
          },
        });

        // Add cosmetic to user's inventory
        await tx.userCosmetic.create({
          data: {
            userId: user.id,
            itemId: catalogItem.id,
            itemType: catalogItem.type,
            itemName: catalogItem.name,
          },
        });

        return updatedUser;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    // Send notification
    void createNotification({
      userId: user.id,
      type: "SYSTEM",
      message: `🎉 Pembelian berhasil! "${catalogItem.name}" seharga ${catalogItem.priceXp} XP telah ditambahkan dan dipasang pada profilmu!`,
      link: "/profile",
    });

    return Response.json({
      success: true,
      message: `Berhasil membeli dan memasang ${catalogItem.name}!`,
      item: catalogItem,
      user: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses pembelian item.";
    return jsonError(message, 400);
  }
}
