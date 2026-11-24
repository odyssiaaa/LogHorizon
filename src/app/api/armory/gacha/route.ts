import { NextResponse } from "next/server";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { ARMORY_ITEMS } from "@/lib/armory-catalog";
import { sendDiscordChannelMessage, DiscordEmbed } from "@/lib/discord-bot-sender";
import { createNotification } from "@/lib/notifications";

export type GachaRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export interface GachaDrop {
  id: string;
  name: string;
  description: string;
  rarity: GachaRarity;
  type: "XP" | "TEMP_TITLE" | "PERM_TITLE" | "PERM_FRAME" | "TRIAL_VIP" | "TRIAL_FRAMES";
  amountXp?: number;
  cosmeticId?: string;
  trialDurationDays?: number;
  icon: string;
  glowColor: string;
}

const COMMON_DROPS: GachaDrop[] = [
  {
    id: "drop_xp_75",
    name: "Kantong XP Kecil (+75 XP)",
    description: "Kantong kulit berisi kristal energi petualang pemula.",
    rarity: "COMMON",
    type: "XP",
    amountXp: 75,
    icon: "🪙",
    glowColor: "#94A3B8",
  },
  {
    id: "drop_xp_120",
    name: "Pundi XP Petualang (+120 XP)",
    description: "Pundi-pundi kristal perak penyokong ekspedisi guild.",
    rarity: "COMMON",
    type: "XP",
    amountXp: 120,
    icon: "💰",
    glowColor: "#94A3B8",
  },
];

const RARE_DROPS: GachaDrop[] = [
  {
    id: "drop_xp_250",
    name: "Kotak Harta Emas (+250 XP)",
    description: "Harta rampasan berharga dari reruntuhan kuno LogHorizon.",
    rarity: "RARE",
    type: "XP",
    amountXp: 250,
    icon: "✨",
    glowColor: "#38BDF8",
  },
  {
    id: "drop_title_fortune_seeker",
    name: "Gelar 24 Jam: 🍀 Fortune Seeker",
    description: "Gelar kehormatan pembawa keberuntungan selama 24 jam penuh.",
    rarity: "RARE",
    type: "TEMP_TITLE",
    icon: "🍀",
    glowColor: "#38BDF8",
  },
];

const EPIC_DROPS: GachaDrop[] = [
  {
    id: "drop_xp_500",
    name: "Relik Kristal Arcane (+500 XP)",
    description: "Kristal sihir murni berkekuatan dahsyat bernilai 500 XP.",
    rarity: "EPIC",
    type: "XP",
    amountXp: 500,
    icon: "🔮",
    glowColor: "#A855F7",
  },
  {
    id: "drop_title_arcane_striker",
    name: "Gelar Permanen: ⚡ Arcane Striker",
    description: "Gelar ksatria petir abadi eksklusif dari Royal Gacha Summon.",
    rarity: "EPIC",
    type: "PERM_TITLE",
    cosmeticId: "title_arcane_striker",
    icon: "⚡",
    glowColor: "#A855F7",
  },
  {
    id: "drop_trial_frames_3d",
    name: "3-Hari Trial: Seluruh Bingkai Avatar",
    description: "Akses bebas menggunakan seluruh 8 Bingkai Efek Avatar Guild Armory selama 3 hari.",
    rarity: "EPIC",
    type: "TRIAL_FRAMES",
    trialDurationDays: 3,
    icon: "🎭",
    glowColor: "#A855F7",
  },
];

const LEGENDARY_DROPS: GachaDrop[] = [
  {
    id: "drop_jackpot_1000",
    name: "JACKPOT KERAJAAN (+1,000 XP)!",
    description: "Harta karun tertinggi perbendaharaan LogHorizon!",
    rarity: "LEGENDARY",
    type: "XP",
    amountXp: 1000,
    icon: "👑",
    glowColor: "#F59E0B",
  },
  {
    id: "drop_trial_vip_7d",
    name: "7-Hari VIP Noble Patron Trial",
    description: "Status kebangsawanan eksklusif VIP Noble Patron lengkap dengan lencana berkilau selama 7 hari.",
    rarity: "LEGENDARY",
    type: "TRIAL_VIP",
    trialDurationDays: 7,
    icon: "💎",
    glowColor: "#F59E0B",
  },
  {
    id: "drop_perm_frame_royal",
    name: "Bingkai Permanen: 🔮 Royal Arcane Vortex",
    description: "Bingkai Avatar animasi Discord-style 🔮 Royal Arcane Vortex permanen di Guild Armory.",
    rarity: "LEGENDARY",
    type: "PERM_FRAME",
    cosmeticId: "frame_royal_purple",
    icon: "🔮",
    glowColor: "#F59E0B",
  },
  {
    id: "drop_perm_frame_cyber",
    name: "Bingkai Permanen: ⚡ Cyber Valkyrie Halo",
    description: "Bingkai Avatar animasi Discord-style ⚡ Cyber Valkyrie Halo permanen di Guild Armory.",
    rarity: "LEGENDARY",
    type: "PERM_FRAME",
    cosmeticId: "frame_cyber_pulse",
    icon: "⚡",
    glowColor: "#F59E0B",
  },
];

export async function GET() {
  const user = await activeUser();
  if (!user) {
    return NextResponse.json({
      isLoggedIn: false,
      dailyGachaTickets: 0,
      xp: 0,
      gachaPityCounter: 0,
    });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      username: true,
      xp: true,
      dailyGachaTickets: true,
      gachaPityCounter: true,
      tempTitle: true,
      tempTitleExpiresAt: true,
    },
  });

  return NextResponse.json({
    isLoggedIn: true,
    user: dbUser,
    rates: {
      legendary: "7%",
      epic: "18%",
      rare: "25%",
      common: "50%",
      pityGuarantee: "Pasti Epic / Legendary pada Tarikan ke-10 (Pity 10)",
    },
  });
}

export async function POST(req: Request) {
  const user = await activeUser();
  if (!user) {
    return jsonError("Silakan masuk (login) terlebih dahulu untuk memanggil Royal Gacha.", 401);
  }

  const body = await req.json().catch(() => ({}));
  const isMulti = body.type === "MULTI_5";
  const pullCount = isMulti ? 5 : 1;
  const xpCost = isMulti ? 700 : 150; // Multi 5 saves 50 XP

  // Atomic Gacha Execution
  try {
    const result = await prisma.$transaction(async (tx) => {
      const dbUser = await tx.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
          xp: true,
          level: true,
          dailyGachaTickets: true,
          gachaPityCounter: true,
          tempTitle: true,
          tempTitleExpiresAt: true,
          trialType: true,
          trialExpiresAt: true,
          trialGrantedBy: true,
          cosmetics: { select: { itemId: true } },
        },
      });

      if (!dbUser) throw new Error("USER_NOT_FOUND");

      const availableTickets = dbUser.dailyGachaTickets ?? 0;
      let usedTickets = 0;
      let usedXp = 0;

      if (availableTickets >= pullCount) {
        usedTickets = pullCount;
      } else {
        if (dbUser.xp < xpCost) {
          throw new Error(`INSUFFICIENT_FUNDS:${xpCost}:${dbUser.xp}`);
        }
        usedXp = xpCost;
      }

      let currentPity = dbUser.gachaPityCounter ?? 0;
      const drops: GachaDrop[] = [];
      let totalXpGained = 0;
      let highestRarity: GachaRarity = "COMMON";
      let wonLegendary = false;

      const ownedCosmeticIds = new Set(dbUser.cosmetics.map((c) => c.itemId));

      for (let i = 0; i < pullCount; i++) {
        currentPity += 1;
        let rarity: GachaRarity = "COMMON";

        // Guaranteed Epic/Legendary on Pity 10
        if (currentPity >= 10) {
          currentPity = 0;
          const pityRoll = Math.random();
          rarity = pityRoll < 0.28 ? "LEGENDARY" : "EPIC";
        } else {
          const roll = Math.random() * 100;
          if (roll < 7) {
            rarity = "LEGENDARY";
            currentPity = 0; // Reset pity on Legendary
          } else if (roll < 25) {
            rarity = "EPIC";
          } else if (roll < 50) {
            rarity = "RARE";
          } else {
            rarity = "COMMON";
          }
        }

        let chosenDrop: GachaDrop;
        if (rarity === "LEGENDARY") {
          wonLegendary = true;
          highestRarity = "LEGENDARY";
          chosenDrop = LEGENDARY_DROPS[Math.floor(Math.random() * LEGENDARY_DROPS.length)];
        } else if (rarity === "EPIC") {
          if (highestRarity !== "LEGENDARY") highestRarity = "EPIC";
          chosenDrop = EPIC_DROPS[Math.floor(Math.random() * EPIC_DROPS.length)];
        } else if (rarity === "RARE") {
          if (highestRarity === "COMMON") highestRarity = "RARE";
          chosenDrop = RARE_DROPS[Math.floor(Math.random() * RARE_DROPS.length)];
        } else {
          chosenDrop = COMMON_DROPS[Math.floor(Math.random() * COMMON_DROPS.length)];
        }

        drops.push(chosenDrop);

        if (chosenDrop.amountXp) {
          totalXpGained += chosenDrop.amountXp;
        }

        // Apply item reward directly
        if (chosenDrop.type === "TEMP_TITLE") {
          const tempExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
          await tx.user.update({
            where: { id: dbUser.id },
            data: { tempTitle: "🍀 Fortune Seeker", tempTitleExpiresAt: tempExpire },
          });
        } else if (chosenDrop.type === "TRIAL_VIP") {
          const trialExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await tx.user.update({
            where: { id: dbUser.id },
            data: { trialType: "VIP_PREMIUM", trialExpiresAt: trialExpire, trialGrantedBy: "Royal Gacha" },
          });
        } else if (chosenDrop.type === "TRIAL_FRAMES") {
          const trialExpire = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
          await tx.user.update({
            where: { id: dbUser.id },
            data: { trialType: "ALL_FRAMES", trialExpiresAt: trialExpire, trialGrantedBy: "Royal Gacha" },
          });
        } else if ((chosenDrop.type === "PERM_FRAME" || chosenDrop.type === "PERM_TITLE") && chosenDrop.cosmeticId) {
          if (!ownedCosmeticIds.has(chosenDrop.cosmeticId)) {
            ownedCosmeticIds.add(chosenDrop.cosmeticId);
            await tx.userCosmetic.create({
              data: {
                userId: dbUser.id,
                itemId: chosenDrop.cosmeticId,
                itemName: chosenDrop.name,
                itemType: chosenDrop.type === "PERM_FRAME" ? "AVATAR_FRAME" : "CUSTOM_TITLE",
              },
            }).catch(() => null);
          } else {
            // Already owned: convert to bonus XP
            totalXpGained += 300;
          }
        }
      }

      // Calculate final XP and Level progression
      let finalXp = dbUser.xp - usedXp + totalXpGained;
      let finalLevel = dbUser.level;
      while (finalXp >= finalLevel * 100) {
        finalXp -= finalLevel * 100;
        finalLevel += 1;
      }

      const updatedUser = await tx.user.update({
        where: { id: dbUser.id },
        data: {
          xp: Math.max(0, finalXp),
          level: finalLevel,
          dailyGachaTickets: Math.max(0, availableTickets - usedTickets),
          gachaPityCounter: currentPity,
        },
        select: {
          id: true,
          username: true,
          xp: true,
          level: true,
          dailyGachaTickets: true,
          gachaPityCounter: true,
          tempTitle: true,
          trialType: true,
          trialExpiresAt: true,
        },
      });

      return {
        updatedUser,
        drops,
        usedTickets,
        usedXp,
        totalXpGained,
        wonLegendary,
        highestRarity,
      };
    });

    // Notify target user
    await createNotification({
      userId: user.id,
      type: "SYSTEM",
      message: `🔮 Hasil Royal Gacha Summon: Kamu telah memanggil ${pullCount} item. Total perolehan XP: +${result.totalXpGained} XP.`,
      link: "/profile?tab=gacha",
    }).catch(() => null);

    // If Legendary pulled: Discord Announcement to #🎮・gaming-lounge
    if (result.wonLegendary) {
      const legendaryItem = result.drops.find((d) => d.rarity === "LEGENDARY");
      const embed: DiscordEmbed = {
        title: "👑 ROYAL GACHA SUMMON: LEGENDARY DROP!",
        description: `Lonceng istana berdentang! Petualang **@${result.updatedUser.username}** baru saja memperoleh hadiah **LEGENDARY** dari Royal Gacha Summon!\n\n🎁 **Hadiah:** ${legendaryItem?.name ?? "Hadiah Legendaris"}\n✨ *Kemegahan takdir berpihak pada yang berani!*`,
        color: 0xf59e0b, // Amber Gold
        fields: [
          { name: "👤 Petualang Beruntung", value: `@${result.updatedUser.username}`, inline: true },
          { name: "🌟 Kategori Rarity", value: "🌟 LEGENDARY (7%)", inline: true },
          { name: "⚡ Bonus XP Didapat", value: `+${result.totalXpGained} XP`, inline: true },
        ],
        footer: { text: "LogHorizon Royal Gacha • /profile?tab=gacha" },
        timestamp: new Date().toISOString(),
      };

      void sendDiscordChannelMessage("lfg", { embeds: [embed] }).catch((err) =>
        console.warn("[Gacha] Discord notice failed:", err)
      );
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memanggil ${pullCount}x Royal Gacha!`,
      drops: result.drops,
      user: result.updatedUser,
      usedTickets: result.usedTickets,
      usedXp: result.usedXp,
      totalXpGained: result.totalXpGained,
      wonLegendary: result.wonLegendary,
    });
  } catch (error: any) {
    if (error?.message?.startsWith("INSUFFICIENT_FUNDS")) {
      const parts = error.message.split(":");
      return jsonError(`XP tidak mencukupi! Kamu butuh ${parts[1]} XP (saat ini ${parts[2]} XP).`, 400);
    }
    console.error("[Gacha Error]:", error);
    return jsonError(error?.message || "Terjadi kesalahan saat memanggil Royal Gacha.", 500);
  }
}
