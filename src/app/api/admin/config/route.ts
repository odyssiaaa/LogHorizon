import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const DEFAULT_DISCORD_CHANNELS = {
  discordAnnouncementChannelId: "1547552373629780038",
  discordGiveawayChannelId: "1547552377396011118",
  discordInfoLiveChannelId: "1547552381221339149",
  discordPartnershipChannelId: "1572235405770887269",
  discordShopChannelId: "1547552452725973093",
  discordLfgChannelId: "1547552498833825874",
  discordModLogChannelId: "1547552557868777552",
};

export async function GET() {
  const access = await requireStaff(["ADMIN"]);
  if (access.response) return access.response;

  const config = await prisma.siteConfig.findUnique({
    where: { id: "default" },
  });

  const resolved = config
    ? {
        ...config,
        discordAnnouncementChannelId: config.discordAnnouncementChannelId || DEFAULT_DISCORD_CHANNELS.discordAnnouncementChannelId,
        discordGiveawayChannelId: config.discordGiveawayChannelId || DEFAULT_DISCORD_CHANNELS.discordGiveawayChannelId,
        discordInfoLiveChannelId: config.discordInfoLiveChannelId || DEFAULT_DISCORD_CHANNELS.discordInfoLiveChannelId,
        discordPartnershipChannelId: config.discordPartnershipChannelId || DEFAULT_DISCORD_CHANNELS.discordPartnershipChannelId,
        discordShopChannelId: config.discordShopChannelId || DEFAULT_DISCORD_CHANNELS.discordShopChannelId,
        discordLfgChannelId: config.discordLfgChannelId || DEFAULT_DISCORD_CHANNELS.discordLfgChannelId,
        discordModLogChannelId: config.discordModLogChannelId || DEFAULT_DISCORD_CHANNELS.discordModLogChannelId,
      }
    : {
        id: "default",
        statMembers: "1,200+",
        statParties: "450+",
        statVoice: "24/7",
        qrisImageUrl: "/qris-guild.png",
        rekberAccount: "BCA 1234567890 a.n LogHorizon",
        rekberFee: 5000,
        monthlyGoal: 5000000,
        minDonation: 10000,
        discordInviteUrl: "https://discord.gg/aJvbVyTxNb",
        discordWebhookUrl: null,
        ...DEFAULT_DISCORD_CHANNELS,
      };

  return Response.json({ success: true, config: resolved });
}

export async function PATCH(request: Request) {
  const access = await requireStaff(["ADMIN"]);
  if (access.response) return access.response;

  const payload: unknown = await request.json();
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  const {
    statMembers,
    statParties,
    statVoice,
    qrisImageUrl,
    rekberAccount,
    rekberFee,
    monthlyGoal,
    minDonation,
    discordInviteUrl,
    discordWebhookUrl,
    discordAnnouncementChannelId,
    discordGiveawayChannelId,
    discordInfoLiveChannelId,
    discordPartnershipChannelId,
    discordShopChannelId,
    discordLfgChannelId,
    discordModLogChannelId,
    aiKnowledgeBase,
  } = body;

  const config = await prisma.siteConfig.upsert({
    where: { id: "default" },
    update: {
      ...(typeof statMembers === "string" ? { statMembers: statMembers.trim() } : {}),
      ...(typeof statParties === "string" ? { statParties: statParties.trim() } : {}),
      ...(typeof statVoice === "string" ? { statVoice: statVoice.trim() } : {}),
      ...(typeof qrisImageUrl === "string" ? { qrisImageUrl: qrisImageUrl.trim() } : {}),
      ...(typeof rekberAccount === "string" ? { rekberAccount: rekberAccount.trim() } : {}),
      ...(Number.isSafeInteger(Number(rekberFee)) ? { rekberFee: Math.max(0, Number(rekberFee)) } : {}),
      ...(Number.isSafeInteger(Number(monthlyGoal)) ? { monthlyGoal: Math.max(0, Number(monthlyGoal)) } : {}),
      ...(Number.isSafeInteger(Number(minDonation)) ? { minDonation: Math.max(1000, Number(minDonation)) } : {}),
      ...(typeof discordInviteUrl === "string" ? { discordInviteUrl: discordInviteUrl.trim() } : {}),
      ...(typeof discordWebhookUrl === "string" ? { discordWebhookUrl: discordWebhookUrl.trim() } : {}),
      ...(typeof discordAnnouncementChannelId === "string" ? { discordAnnouncementChannelId: discordAnnouncementChannelId.trim() || DEFAULT_DISCORD_CHANNELS.discordAnnouncementChannelId } : {}),
      ...(typeof discordGiveawayChannelId === "string" ? { discordGiveawayChannelId: discordGiveawayChannelId.trim() || DEFAULT_DISCORD_CHANNELS.discordGiveawayChannelId } : {}),
      ...(typeof discordInfoLiveChannelId === "string" ? { discordInfoLiveChannelId: discordInfoLiveChannelId.trim() || DEFAULT_DISCORD_CHANNELS.discordInfoLiveChannelId } : {}),
      ...(typeof discordPartnershipChannelId === "string" ? { discordPartnershipChannelId: discordPartnershipChannelId.trim() || DEFAULT_DISCORD_CHANNELS.discordPartnershipChannelId } : {}),
      ...(typeof discordShopChannelId === "string" ? { discordShopChannelId: discordShopChannelId.trim() || DEFAULT_DISCORD_CHANNELS.discordShopChannelId } : {}),
      ...(typeof discordLfgChannelId === "string" ? { discordLfgChannelId: discordLfgChannelId.trim() || DEFAULT_DISCORD_CHANNELS.discordLfgChannelId } : {}),
      ...(typeof discordModLogChannelId === "string" ? { discordModLogChannelId: discordModLogChannelId.trim() || DEFAULT_DISCORD_CHANNELS.discordModLogChannelId } : {}),
      ...(typeof aiKnowledgeBase === "string" ? { aiKnowledgeBase: aiKnowledgeBase.trim() } : {}),
    },
    create: {
      id: "default",
      statMembers: typeof statMembers === "string" && statMembers.trim() ? statMembers.trim() : "1,200+",
      statParties: typeof statParties === "string" && statParties.trim() ? statParties.trim() : "450+",
      statVoice: typeof statVoice === "string" && statVoice.trim() ? statVoice.trim() : "24/7",
      qrisImageUrl: typeof qrisImageUrl === "string" && qrisImageUrl.trim() ? qrisImageUrl.trim() : "/qris-guild.png",
      rekberAccount: typeof rekberAccount === "string" && rekberAccount.trim() ? rekberAccount.trim() : "BCA 1234567890 a.n LogHorizon",
      rekberFee: Number(rekberFee) || 5000,
      monthlyGoal: Number(monthlyGoal) || 5000000,
      minDonation: Number(minDonation) || 10000,
      discordInviteUrl: typeof discordInviteUrl === "string" && discordInviteUrl.trim() ? discordInviteUrl.trim() : "https://discord.gg/aJvbVyTxNb",
      discordWebhookUrl: typeof discordWebhookUrl === "string" ? discordWebhookUrl.trim() : null,
      discordAnnouncementChannelId: typeof discordAnnouncementChannelId === "string" && discordAnnouncementChannelId.trim() ? discordAnnouncementChannelId.trim() : DEFAULT_DISCORD_CHANNELS.discordAnnouncementChannelId,
      discordGiveawayChannelId: typeof discordGiveawayChannelId === "string" && discordGiveawayChannelId.trim() ? discordGiveawayChannelId.trim() : DEFAULT_DISCORD_CHANNELS.discordGiveawayChannelId,
      discordInfoLiveChannelId: typeof discordInfoLiveChannelId === "string" && discordInfoLiveChannelId.trim() ? discordInfoLiveChannelId.trim() : DEFAULT_DISCORD_CHANNELS.discordInfoLiveChannelId,
      discordPartnershipChannelId: typeof discordPartnershipChannelId === "string" && discordPartnershipChannelId.trim() ? discordPartnershipChannelId.trim() : DEFAULT_DISCORD_CHANNELS.discordPartnershipChannelId,
      discordShopChannelId: typeof discordShopChannelId === "string" && discordShopChannelId.trim() ? discordShopChannelId.trim() : DEFAULT_DISCORD_CHANNELS.discordShopChannelId,
      discordLfgChannelId: typeof discordLfgChannelId === "string" && discordLfgChannelId.trim() ? discordLfgChannelId.trim() : DEFAULT_DISCORD_CHANNELS.discordLfgChannelId,
      discordModLogChannelId: typeof discordModLogChannelId === "string" && discordModLogChannelId.trim() ? discordModLogChannelId.trim() : DEFAULT_DISCORD_CHANNELS.discordModLogChannelId,
      aiKnowledgeBase: typeof aiKnowledgeBase === "string" ? aiKnowledgeBase.trim() : null,
    },
  });

  const resolved = {
    ...config,
    discordAnnouncementChannelId: config.discordAnnouncementChannelId || DEFAULT_DISCORD_CHANNELS.discordAnnouncementChannelId,
    discordGiveawayChannelId: config.discordGiveawayChannelId || DEFAULT_DISCORD_CHANNELS.discordGiveawayChannelId,
    discordInfoLiveChannelId: config.discordInfoLiveChannelId || DEFAULT_DISCORD_CHANNELS.discordInfoLiveChannelId,
    discordPartnershipChannelId: config.discordPartnershipChannelId || DEFAULT_DISCORD_CHANNELS.discordPartnershipChannelId,
    discordShopChannelId: config.discordShopChannelId || DEFAULT_DISCORD_CHANNELS.discordShopChannelId,
    discordLfgChannelId: config.discordLfgChannelId || DEFAULT_DISCORD_CHANNELS.discordLfgChannelId,
    discordModLogChannelId: config.discordModLogChannelId || DEFAULT_DISCORD_CHANNELS.discordModLogChannelId,
  };

  return Response.json({ success: true, config: resolved, message: "Pengaturan website berhasil diperbarui!" });
}
