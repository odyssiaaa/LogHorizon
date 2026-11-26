import { Prisma } from "@prisma/client";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getArmoryItem } from "@/lib/armory-catalog";
import { createNotification } from "@/lib/notifications";
import { isGuildOwner } from "@/lib/auth-guard";
import { mutateHorizonCoinsInTransaction } from "@/lib/horizon-coin";
import { getLevelProgressFromXp } from "@/lib/level-system";

export async function POST(request: Request) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk berbelanja di Armory.", 401);

  const body = await request.json().catch(() => ({}));
  const { itemId, paymentMethod: rawMethod } = body;
  const paymentMethod = String(rawMethod || "COIN").toUpperCase(); // "COIN" | "XP"
  if (!itemId || typeof itemId !== "string") {
    return jsonError("ID item kosmetik wajib disertakan.", 400);
  }

  const catalogItem = getArmoryItem(itemId);
  if (!catalogItem) {
    return jsonError("Item kosmetik tidak ditemukan dalam katalog Armory.", 404);
  }

  const priceCoins = catalogItem.priceCoins ?? Math.max(50, Math.round(catalogItem.priceXp / 5));

  const isOwner = isGuildOwner(user);
  if (isOwner) {
    // Owner bypass: Auto equip and register ownership without deducting any XP
    await prisma.userCosmetic.upsert({
      where: {
        userId_itemId: {
          userId: user.id,
          itemId: catalogItem.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        itemId: catalogItem.id,
        itemType: catalogItem.type,
        itemName: catalogItem.name,
      },
    });

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data:
        catalogItem.type === "AVATAR_FRAME"
          ? { equippedAvatarFrame: catalogItem.id }
          : { equippedCustomTitle: catalogItem.id },
      select: {
        id: true,
        xp: true,
        equippedAvatarFrame: true,
        equippedCustomTitle: true,
      },
    });

    return Response.json({
      success: true,
      message: `👑 Hak Istimewa Owner: "${catalogItem.name}" berhasil dibuka dan dipasang gratis (0 XP)!`,
      item: catalogItem,
      user: updatedUser,
    });
  }

  // Regular user flow with serializable transaction
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
            horizonCoins: true,
            cosmetics: { where: { itemId }, select: { id: true } },
          },
        });

        if (!currentUser) throw new Error("Pengguna tidak ditemukan.");

        if (currentUser.cosmetics.length > 0) {
          throw new Error("Kamu sudah memiliki item kosmetik ini.");
        }

        let remainingCoins = currentUser.horizonCoins || 0;
        let remainingXp = currentUser.xp || 0;

        if (paymentMethod === "COIN") {
          const coinResult = await mutateHorizonCoinsInTransaction(
            tx,
            user.id,
            -priceCoins,
            "ARMORY_PURCHASE",
            `Beli Item Armory: "${catalogItem.name}" (-${priceCoins} HC)`
          );
          if (!coinResult.success) {
            throw new Error(`Saldo Horizon Coins tidak mencukupi (Butuh ${priceCoins} HC, saldo saat ini ${currentUser.horizonCoins} HC).`);
          }
          remainingCoins = coinResult.newBalance;
        } else {
          if (currentUser.xp < catalogItem.priceXp) {
            throw new Error(
              `XP kamu tidak mencukupi. Butuh ${catalogItem.priceXp} XP, saat ini kamu memiliki ${currentUser.xp} XP.`
            );
          }
          remainingXp = Math.max(0, currentUser.xp - catalogItem.priceXp);
        }

        const newLevel = getLevelProgressFromXp(remainingXp).level;

        // Equip cosmetic item
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            ...(paymentMethod === "XP" ? { xp: remainingXp, level: newLevel } : {}),
            ...(catalogItem.type === "AVATAR_FRAME"
              ? { equippedAvatarFrame: catalogItem.id }
              : { equippedCustomTitle: catalogItem.id }),
          },
          select: {
            id: true,
            xp: true,
            level: true,
            horizonCoins: true,
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
      message:
        paymentMethod === "COIN"
          ? `🎉 Pembelian berhasil! "${catalogItem.name}" seharga ${priceCoins.toLocaleString("id-ID")} HC telah ditambahkan dan dipasang pada profilmu!`
          : `🎉 Pembelian berhasil! "${catalogItem.name}" seharga ${catalogItem.priceXp.toLocaleString("id-ID")} XP telah ditambahkan dan dipasang pada profilmu!`,
      link: "/profile",
    });

    return Response.json({
      success: true,
      message: `Berhasil membeli dan memasang ${catalogItem.name} (${paymentMethod === "COIN" ? `${priceCoins.toLocaleString("id-ID")} HC` : `${catalogItem.priceXp.toLocaleString("id-ID")} XP`})!`,
      item: catalogItem,
      user: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses pembelian item.";
    return jsonError(message, 400);
  }
}
