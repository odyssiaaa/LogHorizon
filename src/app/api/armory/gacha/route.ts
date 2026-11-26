import { NextResponse } from "next/server";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { ARMORY_ITEMS } from "@/lib/armory-catalog";
import { sendDiscordChannelMessage, DiscordEmbed } from "@/lib/discord-bot-sender";
import { createNotification } from "@/lib/notifications";
import { randomInt } from "crypto";
import { calculateProgressiveLevelUp, getLevelProgressFromXp } from "@/lib/level-system";
import { mutateHorizonCoinsInTransaction } from "@/lib/horizon-coin";

export type GachaRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export interface GachaDrop {
  id: string;
  name: string;
  description: string;
  rarity: GachaRarity;
  type:
    | "XP"
    | "HORIZON_COIN"
    | "FREE_TICKET"
    | "TEMP_TITLE"
    | "PERM_TITLE"
    | "PERM_FRAME"
    | "TRIAL_VIP"
    | "TRIAL_FRAMES"
    | "SPONSOR_VOUCHER"
    | "JACKPOT";
  amountXp?: number;
  amountCoins?: number;
  bonusTickets?: number;
  tempTitleValue?: string;
  cosmeticId?: string;
  trialDurationDays?: number;
  sponsorCode?: string;
  claimSerial?: string;
  sponsorName?: string;
  sponsorActionUrl?: string;
  isDuplicate?: boolean;
  convertedXp?: number;
  icon: string;
  glowColor: string;
}

// ========================================================
// EXPANDED PRIZE POOL (15+ DISTINCT ITEMS WITH CRYPTO RNG)
// ========================================================

const COMMON_DROPS: GachaDrop[] = [
  {
    id: "drop_hc_50",
    name: "🪙 Kantong Horizon Coins (+50 HC)",
    description: "Mata uang resmi kerajaan LogHorizon untuk belanja di Armory dan Papan Kontrak.",
    rarity: "COMMON",
    type: "HORIZON_COIN",
    amountCoins: 50,
    icon: "🪙",
    glowColor: "#EAB308",
  },
  {
    id: "drop_xp_coin_75",
    name: "💰 Kantong Koin Perunggu (+75 XP)",
    description: "Pundi-pundi koin perunggu bekal dasar petualang pemula.",
    rarity: "COMMON",
    type: "XP",
    amountXp: 75,
    icon: "💰",
    glowColor: "#94A3B8",
  },
  {
    id: "drop_xp_guild_120",
    name: "💎 Serpihan Kristal Guild (+120 XP)",
    description: "Serpihan kristal energi penyokong ekspedisi guild LogHorizon.",
    rarity: "COMMON",
    type: "XP",
    amountXp: 120,
    icon: "💎",
    glowColor: "#94A3B8",
  },
  {
    id: "drop_xp_scroll_150",
    name: "📜 Gulungan Latihan Petualang (+150 XP)",
    description: "Gulungan perkamen kuno berisi teknik dasar penjelajah ruang LogHorizon.",
    rarity: "COMMON",
    type: "XP",
    amountXp: 150,
    icon: "📜",
    glowColor: "#94A3B8",
  },
];

const RARE_DROPS: GachaDrop[] = [
  {
    id: "drop_hc_120",
    name: "💎 Peti Kristal Horizon Coins (+120 HC)",
    description: "Timbunan koin virtual berharga tinggi untuk petualang aktif.",
    rarity: "RARE",
    type: "HORIZON_COIN",
    amountCoins: 120,
    icon: "💎",
    glowColor: "#06B6D4",
  },
  {
    id: "drop_xp_treasure_250",
    name: "🎁 Peti Harta Kerajaan (+250 XP)",
    description: "Peti harta rampasan berharga dari reruntuhan kuno LogHorizon.",
    rarity: "RARE",
    type: "XP",
    amountXp: 250,
    icon: "🎁",
    glowColor: "#38BDF8",
  },
  {
    id: "drop_ticket_extra_1",
    name: "🎟️ Tiket Gacha Ekstra (+1 Free Summon Ticket)",
    description: "Tiket pemanggilan kerajaan ekstra. Dapat langsung digunakan untuk memanggil lagi!",
    rarity: "RARE",
    type: "FREE_TICKET",
    bonusTickets: 1,
    icon: "🎟️",
    glowColor: "#38BDF8",
  },
  {
    id: "drop_title_temp_fortune",
    name: "⏳ Gelar 24 Jam: 🍀 Fortune Seeker",
    description: "Gelar kehormatan pembawa keberuntungan selama 24 jam penuh.",
    rarity: "RARE",
    type: "TEMP_TITLE",
    tempTitleValue: "🍀 Fortune Seeker",
    icon: "🍀",
    glowColor: "#38BDF8",
  },
  {
    id: "drop_title_temp_vanguard",
    name: "⏳ Gelar 24 Jam: ⚡ Swift Vanguard",
    description: "Gelar kehormatan pelopor kilat terdepan selama 24 jam penuh.",
    rarity: "RARE",
    type: "TEMP_TITLE",
    tempTitleValue: "⚡ Swift Vanguard",
    icon: "⚡",
    glowColor: "#38BDF8",
  },
];

const EPIC_DROPS: GachaDrop[] = [
  {
    id: "drop_hc_300",
    name: "🪙 Pundi Emas Horizon Coins (+300 HC)",
    description: "Pundi emas kerajaan berlimpah koin untuk memperkuat perbekalan ekspedisi.",
    rarity: "EPIC",
    type: "HORIZON_COIN",
    amountCoins: 300,
    icon: "🪙",
    glowColor: "#A855F7",
  },
  {
    id: "drop_title_shadow_assassin",
    name: "🗡️ Gelar Permanen: Shadow Assassin",
    description: "Gelar ksatria bayangan abadi di profil dan papan peringkat LogHorizon.",
    rarity: "EPIC",
    type: "PERM_TITLE",
    cosmeticId: "title_shadow_assassin",
    icon: "🗡️",
    glowColor: "#A855F7",
  },
  {
    id: "drop_title_arcane_striker",
    name: "⚡ Gelar Permanen: Arcane Striker",
    description: "Gelar ksatria petir abadi eksklusif dari Royal Gacha Summon.",
    rarity: "EPIC",
    type: "PERM_TITLE",
    cosmeticId: "title_arcane_striker",
    icon: "⚡",
    glowColor: "#A855F7",
  },
  {
    id: "drop_title_royal_alchemist",
    name: "🧪 Gelar Permanen: Royal Alchemist",
    description: "Gelar pakar ramuan mistis abadi di profil dan papan peringkat LogHorizon.",
    rarity: "EPIC",
    type: "PERM_TITLE",
    cosmeticId: "title_royal_alchemist",
    icon: "🧪",
    glowColor: "#A855F7",
  },
  {
    id: "drop_trial_frames_3d",
    name: "🖼️ Trial 3 Hari: Semua Bingkai Efek Discord",
    description: "Akses bebas menggunakan seluruh Bingkai Efek Avatar Guild Armory selama 3 hari.",
    rarity: "EPIC",
    type: "TRIAL_FRAMES",
    trialDurationDays: 3,
    icon: "🖼️",
    glowColor: "#A855F7",
  },
  {
    id: "drop_xp_elite_500",
    name: "🔥 Pundi XP Elit (+500 XP)",
    description: "Kristal sihir murni berkekuatan dahsyat bernilai 500 XP instan.",
    rarity: "EPIC",
    type: "XP",
    amountXp: 500,
    icon: "🔥",
    glowColor: "#A855F7",
  },
];

const LEGENDARY_DROPS: GachaDrop[] = [
  {
    id: "drop_trial_vip_7d",
    name: "💎 Trial 7 Hari: VIP Noble Patron",
    description: "Status kebangsawanan eksklusif VIP Noble Patron lengkap dengan lencana berkilau selama 7 hari.",
    rarity: "LEGENDARY",
    type: "TRIAL_VIP",
    trialDurationDays: 7,
    icon: "💎",
    glowColor: "#F59E0B",
  },
  {
    id: "drop_perm_frame_royal",
    name: "🔮 Bingkai Efek Permanen: Royal Arcane Vortex",
    description: "Bingkai Avatar animasi Discord-style 🔮 Royal Arcane Vortex permanen di Guild Armory.",
    rarity: "LEGENDARY",
    type: "PERM_FRAME",
    cosmeticId: "frame_royal_purple",
    icon: "🔮",
    glowColor: "#F59E0B",
  },
  {
    id: "drop_perm_frame_crimson",
    name: "🐉 Bingkai Efek Permanen: Crimson Dragon Crest",
    description: "Bingkai Avatar animasi Discord-style 🐉 Crimson Dragon Crest permanen di Guild Armory.",
    rarity: "LEGENDARY",
    type: "PERM_FRAME",
    cosmeticId: "frame_crimson_dragon",
    icon: "🐉",
    glowColor: "#F59E0B",
  },
  {
    id: "drop_hc_jackpot_1500",
    name: "👑 JACKPOT HORIZON COINS (+1.500 HC)",
    description: "Perbendaharaan Tertinggi Kaisar Kerajaan! 1.500 Horizon Coins instan masuk ke saldomu!",
    rarity: "LEGENDARY",
    type: "HORIZON_COIN",
    amountCoins: 1500,
    icon: "👑",
    glowColor: "#F59E0B",
  },
  {
    id: "drop_jackpot_1500_tickets",
    name: "👑 JACKPOT KERAJAAN (+1.500 XP + 2 Tiket Gacha)",
    description: "Harta karun tertinggi perbendaharaan LogHorizon! 1.500 XP + 2 Tiket Pemanggilan Gratis!",
    rarity: "LEGENDARY",
    type: "JACKPOT",
    amountXp: 1500,
    bonusTickets: 2,
    icon: "👑",
    glowColor: "#F59E0B",
  },
];

/**
 * Pick drop from pool with cryptographic randomness, avoiding consecutive repeat when pool > 1
 */
function pickDropFromPool(pool: GachaDrop[], lastPickedId?: string): GachaDrop {
  if (pool.length === 1) return pool[0];
  const candidates =
    lastPickedId && pool.length > 1 ? pool.filter((item) => item.id !== lastPickedId) : pool;
  const list = candidates.length > 0 ? candidates : pool;
  const index = randomInt(0, list.length);
  return list[index];
}

export async function GET() {
  const user = await activeUser();
  if (!user) {
    return NextResponse.json({
      isLoggedIn: false,
      dailyGachaTickets: 0,
      xp: 0,
      horizonCoins: 0,
      gachaPityCounter: 0,
    });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      username: true,
      xp: true,
      horizonCoins: true,
      dailyGachaTickets: true,
      gachaPityCounter: true,
      tempTitle: true,
      tempTitleExpiresAt: true,
    },
  });

  const activeSponsorCodes = await prisma.redeemCode.findMany({
    where: {
      category: "SPONSOR_VOUCHER",
      includeInGachaPool: true,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      id: true,
      sponsorName: true,
      title: true,
      rewardValue: true,
      maxUses: true,
      usedCount: true,
    },
  });
  const availableSponsorDrops = activeSponsorCodes.filter((c) => c.usedCount < c.maxUses);

  return NextResponse.json({
    isLoggedIn: true,
    user: dbUser,
    rates: {
      legendary: "7%",
      epic: "18%",
      rare: "27%",
      common: "48%",
      pityGuarantee: "Pasti Epic / Legendary pada Tarikan ke-10 (Pity 10)",
      duplicateConversion: "Duplikat Rare (+200 XP), Epic (+450 XP), Legendary (+1.200 XP)",
    },
    activeSponsorDrops: availableSponsorDrops,
    hasActiveSponsorDrop: availableSponsorDrops.length > 0,
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
          horizonCoins: true,
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
      const coinCost = isMulti ? 450 : 100;
      const paymentMethod = String(body.paymentMethod || (availableTickets >= pullCount ? "TICKET" : "COIN")).toUpperCase();
      let usedTickets = 0;
      let usedCoins = 0;
      let usedXp = 0;

      if (paymentMethod === "TICKET" || (!body.paymentMethod && availableTickets >= pullCount)) {
        if (availableTickets < pullCount) {
          throw new Error(`INSUFFICIENT_TICKETS:${pullCount}:${availableTickets}`);
        }
        usedTickets = pullCount;
      } else if (paymentMethod === "COIN") {
        if ((dbUser.horizonCoins || 0) < coinCost) {
          throw new Error(`INSUFFICIENT_COINS:${coinCost}:${dbUser.horizonCoins || 0}`);
        }
        usedCoins = coinCost;
        const deductResult = await mutateHorizonCoinsInTransaction(
          tx,
          dbUser.id,
          -coinCost,
          "GACHA_SUMMON",
          `Summon Royal Gacha (${pullCount}x) (-${coinCost} HC)`
        );
        if (!deductResult.success) {
          throw new Error(deductResult.error || "INSUFFICIENT_COINS");
        }
      } else {
        if (dbUser.xp < xpCost) {
          throw new Error(`INSUFFICIENT_FUNDS:${xpCost}:${dbUser.xp}`);
        }
        usedXp = xpCost;
      }

      let currentPity = dbUser.gachaPityCounter ?? 0;
      const drops: GachaDrop[] = [];
      let totalXpGained = 0;
      let totalCoinsGained = 0;
      let totalBonusTickets = 0;
      let highestRarity: GachaRarity = "COMMON";
      let wonLegendary = false;
      let lastPickedId: string | undefined;

      // Track owned permanent items to prevent duplicates within this user's account & within the same batch
      const ownedCosmeticIds = new Set(dbUser.cosmetics.map((c) => c.itemId));

      // Dynamic Sponsor Voucher Gacha Pool
      const activeSponsorCodes = await tx.redeemCode.findMany({
        where: {
          category: "SPONSOR_VOUCHER",
          includeInGachaPool: true,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });

      const userClaimedCodeIds = new Set(
        (
          await tx.redeemClaim.findMany({
            where: { userId: dbUser.id },
            select: { redeemCodeId: true },
          })
        ).map((c) => c.redeemCodeId)
      );

      let availableSponsors = activeSponsorCodes.filter(
        (c) => c.usedCount < c.maxUses && !userClaimedCodeIds.has(c.id)
      );

      const wonSponsorVouchersList: { title: string; code: string; serial: string; sponsor: string }[] = [];

      for (let i = 0; i < pullCount; i++) {
        currentPity += 1;
        let rarity: GachaRarity = "COMMON";

        // Guaranteed Epic/Legendary on Pity 10
        if (currentPity >= 10) {
          currentPity = 0;
          const pityRoll = randomInt(0, 100);
          rarity = pityRoll < 28 ? "LEGENDARY" : "EPIC";
        } else {
          // Cryptographically secure weighted roll out of 10,000
          // Common: 48% (0..4799)
          // Rare: 27% (4800..7499)
          // Epic: 18% (7500..9299)
          // Legendary: 7% (9300..9999)
          const roll = randomInt(0, 10000);
          if (roll >= 9300) {
            rarity = "LEGENDARY";
            currentPity = 0; // Reset pity on Legendary
          } else if (roll >= 7500) {
            rarity = "EPIC";
          } else if (roll >= 4800) {
            rarity = "RARE";
          } else {
            rarity = "COMMON";
          }
        }

        let chosenTemplate: GachaDrop;
        if (rarity === "LEGENDARY") {
          wonLegendary = true;
          highestRarity = "LEGENDARY";

          // Dynamic Sponsor Drop Chance (35% if sponsor voucher exists with stock)
          if (availableSponsors.length > 0 && randomInt(0, 100) < 35) {
            const pickedIndex = randomInt(0, availableSponsors.length);
            const targetSponsor = availableSponsors[pickedIndex];

            // Atomically increment usage
            await tx.redeemCode.update({
              where: { id: targetSponsor.id },
              data: { usedCount: { increment: 1 } },
            });

            // Generate claim serial
            const serial = `LH-ODY-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

            // Create claim record
            await tx.redeemClaim.create({
              data: {
                redeemCodeId: targetSponsor.id,
                userId: dbUser.id,
                uniqueClaimSerial: serial,
                source: "ROYAL_GACHA",
              },
            });

            chosenTemplate = {
              id: `sponsor_voucher_${targetSponsor.id}`,
              name: `🏷️ ${targetSponsor.title}`,
              description: `Voucher Eksklusif ${targetSponsor.sponsorName || "OdyssiaVault"}. Kode Promo: ${targetSponsor.code} (No. Seri: ${serial}). Tersimpan di Dompet Voucher Saya.`,
              rarity: "LEGENDARY",
              type: "SPONSOR_VOUCHER",
              sponsorCode: targetSponsor.code,
              claimSerial: serial,
              sponsorName: targetSponsor.sponsorName || "OdyssiaVault",
              sponsorActionUrl:
                targetSponsor.sponsorActionUrl && !targetSponsor.sponsorActionUrl.includes("odyssiavault.com")
                  ? targetSponsor.sponsorActionUrl
                  : "http://odyssiavault.kiospremium.site/",
              icon: "🏷️",
              glowColor: "#F59E0B",
            };

            wonSponsorVouchersList.push({
              title: targetSponsor.title,
              code: targetSponsor.code,
              serial,
              sponsor: targetSponsor.sponsorName || "OdyssiaVault",
            });

            // Remove from pool for remaining pulls in this batch
            availableSponsors.splice(pickedIndex, 1);
            userClaimedCodeIds.add(targetSponsor.id);
          } else {
            chosenTemplate = pickDropFromPool(LEGENDARY_DROPS, lastPickedId);
          }
        } else if (rarity === "EPIC") {
          if (highestRarity !== "LEGENDARY") highestRarity = "EPIC";
          chosenTemplate = pickDropFromPool(EPIC_DROPS, lastPickedId);
        } else if (rarity === "RARE") {
          if (highestRarity === "COMMON") highestRarity = "RARE";
          chosenTemplate = pickDropFromPool(RARE_DROPS, lastPickedId);
        } else {
          chosenTemplate = pickDropFromPool(COMMON_DROPS, lastPickedId);
        }

        lastPickedId = chosenTemplate.id;

        // Clone drop object for individual pull modification
        const dropResult: GachaDrop = { ...chosenTemplate };

        // Duplicate Check & Conversion for Permanent Items (Custom Title / Avatar Frame)
        if (dropResult.type === "PERM_TITLE" || dropResult.type === "PERM_FRAME") {
          if (dropResult.cosmeticId && ownedCosmeticIds.has(dropResult.cosmeticId)) {
            // DUPLICATE DETECTED!
            const duplicateXp =
              dropResult.rarity === "LEGENDARY" ? 1200 : dropResult.rarity === "EPIC" ? 450 : 200;
            const duplicateCoins =
              dropResult.rarity === "LEGENDARY" ? 300 : dropResult.rarity === "EPIC" ? 120 : 50;
            dropResult.isDuplicate = true;
            dropResult.convertedXp = duplicateXp;
            totalXpGained += duplicateXp;
            totalCoinsGained += duplicateCoins;
            dropResult.description = `${dropResult.description} (Item permanen sudah dimiliki. Otomatis dikonversi menjadi +${duplicateCoins} HC & +${duplicateXp.toLocaleString("id-ID")} Bonus XP!)`;
          } else if (dropResult.cosmeticId) {
            // First time getting this item: add to owned set and create record
            ownedCosmeticIds.add(dropResult.cosmeticId);
            await tx.userCosmetic
              .create({
                data: {
                  userId: dbUser.id,
                  itemId: dropResult.cosmeticId,
                  itemName: dropResult.name,
                  itemType: dropResult.type === "PERM_FRAME" ? "AVATAR_FRAME" : "CUSTOM_TITLE",
                },
              })
              .catch(() => null);
          }
        } else if (dropResult.type === "HORIZON_COIN") {
          if (dropResult.amountCoins) totalCoinsGained += dropResult.amountCoins;
        } else if (dropResult.type === "JACKPOT") {
          if (dropResult.amountXp) totalXpGained += dropResult.amountXp;
          if (dropResult.bonusTickets) totalBonusTickets += dropResult.bonusTickets;
        } else if (dropResult.type === "FREE_TICKET") {
          if (dropResult.bonusTickets) totalBonusTickets += dropResult.bonusTickets;
        } else if (dropResult.type === "XP") {
          if (dropResult.amountXp) totalXpGained += dropResult.amountXp;
        } else if (dropResult.type === "TEMP_TITLE") {
          const titleValue = dropResult.tempTitleValue || "🍀 Fortune Seeker";
          const tempExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
          await tx.user.update({
            where: { id: dbUser.id },
            data: { tempTitle: titleValue, tempTitleExpiresAt: tempExpire },
          });
        } else if (dropResult.type === "TRIAL_VIP") {
          const trialExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await tx.user.update({
            where: { id: dbUser.id },
            data: { trialType: "VIP_PREMIUM", trialExpiresAt: trialExpire, trialGrantedBy: "Royal Gacha" },
          });
        } else if (dropResult.type === "TRIAL_FRAMES") {
          const trialExpire = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
          await tx.user.update({
            where: { id: dbUser.id },
            data: { trialType: "ALL_FRAMES", trialExpiresAt: trialExpire, trialGrantedBy: "Royal Gacha" },
          });
        }

        drops.push(dropResult);
      }

      // Process Horizon Coins gain if any drop yielded coins
      let latestCoins = (dbUser.horizonCoins || 0) - usedCoins;
      if (totalCoinsGained > 0) {
        const creditResult = await mutateHorizonCoinsInTransaction(
          tx,
          dbUser.id,
          totalCoinsGained,
          "GACHA_SUMMON",
          `Hadiah Drop Royal Gacha (+${totalCoinsGained} HC)`
        );
        latestCoins = creditResult.newBalance;
      }

      // Calculate final XP and Level progression
      const finalXp = Math.max(0, (dbUser.xp || 0) - usedXp + totalXpGained);
      const { level: finalLevel } = getLevelProgressFromXp(finalXp);

      const finalTickets = Math.max(0, availableTickets - usedTickets + totalBonusTickets);

      const updatedUser = await tx.user.update({
        where: { id: dbUser.id },
        data: {
          xp: Math.max(0, finalXp),
          level: finalLevel,
          dailyGachaTickets: finalTickets,
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
        updatedUser: {
          ...updatedUser,
          horizonCoins: latestCoins,
        },
        drops,
        usedTickets,
        usedCoins,
        usedXp,
        totalXpGained,
        totalCoinsGained,
        totalBonusTickets,
        wonLegendary,
        highestRarity,
        wonSponsorVouchers: wonSponsorVouchersList,
      };
    });

    // Notify target user
    const bonusTicketText = result.totalBonusTickets > 0 ? ` & +${result.totalBonusTickets} Tiket Ekstra` : "";
    await createNotification({
      userId: user.id,
      type: "SYSTEM",
      message: `🔮 Hasil Royal Gacha Summon: Kamu telah memanggil ${pullCount} item. Total perolehan: +${result.totalXpGained} XP${bonusTicketText}.`,
      link: "/profile?tab=gacha",
    }).catch(() => null);

    // If Legendary pulled: Discord Announcement to #🎮・gaming-lounge / #lfg
    if (result.wonLegendary) {
      const legendaryItem = result.drops.find((d) => d.rarity === "LEGENDARY");
      const isDuplicateNote = legendaryItem?.isDuplicate
        ? ` [Duplikat ➔ Dikonversi +${legendaryItem.convertedXp} XP]`
        : "";
      const embed: DiscordEmbed = {
        title: "👑 ROYAL GACHA SUMMON: LEGENDARY DROP!",
        description: `Lonceng istana berdentang! Petualang **@${result.updatedUser.username}** baru saja memperoleh hadiah **LEGENDARY** dari Royal Gacha Summon!\n\n🎁 **Hadiah:** ${legendaryItem?.name ?? "Hadiah Legendaris"}${isDuplicateNote}\n✨ *Kemegahan takdir berpihak pada yang berani!*`,
        color: 0xf59e0b, // Amber Gold
        fields: [
          { name: "👤 Petualang Beruntung", value: `@${result.updatedUser.username}`, inline: true },
          { name: "🌟 Kategori Rarity", value: "🌟 LEGENDARY (7%)", inline: true },
          { name: "⚡ Total Bonus XP", value: `+${result.totalXpGained} XP`, inline: true },
        ],
        footer: { text: "LogHorizon Royal Gacha • /profile?tab=gacha" },
        timestamp: new Date().toISOString(),
      };

      void sendDiscordChannelMessage("lfg", { embeds: [embed] }).catch((err) =>
        console.warn("[Gacha] Discord notice failed:", err)
      );
    }

    const bonusCoinsText = result.totalCoinsGained > 0 ? ` & +${result.totalCoinsGained.toLocaleString("id-ID")} HC` : "";
    return NextResponse.json({
      success: true,
      message: `Berhasil memanggil ${pullCount}x Royal Gacha! (+${result.totalXpGained} XP${bonusTicketText}${bonusCoinsText})`,
      drops: result.drops,
      user: result.updatedUser,
      usedTickets: result.usedTickets,
      usedCoins: result.usedCoins,
      usedXp: result.usedXp,
      totalXpGained: result.totalXpGained,
      totalCoinsGained: result.totalCoinsGained,
      totalBonusTickets: result.totalBonusTickets,
      wonLegendary: result.wonLegendary,
    });
  } catch (error: any) {
    if (error?.message?.startsWith("INSUFFICIENT_COINS")) {
      const parts = error.message.split(":");
      return jsonError(`Saldo Horizon Coins tidak mencukupi! Kamu butuh ${parts[1]} HC (saat ini ${parts[2]} HC). Silakan Top-Up atau gunakan opsi lain!`, 400);
    }
    if (error?.message?.startsWith("INSUFFICIENT_TICKETS")) {
      const parts = error.message.split(":");
      return jsonError(`Tiket Royal Gacha tidak mencukupi! Kamu butuh ${parts[1]} tiket (saat ini ${parts[2]} tiket).`, 400);
    }
    if (error?.message?.startsWith("INSUFFICIENT_FUNDS")) {
      const parts = error.message.split(":");
      return jsonError(`XP tidak mencukupi! Kamu butuh ${parts[1]} XP (saat ini ${parts[2]} XP).`, 400);
    }
    console.error("[Gacha Error]:", error);
    return jsonError(error?.message || "Terjadi kesalahan saat memanggil Royal Gacha.", 500);
  }
}
