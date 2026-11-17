import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";

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
      ...(typeof discordAnnouncementChannelId === "string" ? { discordAnnouncementChannelId: discordAnnouncementChannelId.trim() } : {}),
      ...(typeof discordGiveawayChannelId === "string" ? { discordGiveawayChannelId: discordGiveawayChannelId.trim() || null } : {}),
      ...(typeof discordInfoLiveChannelId === "string" ? { discordInfoLiveChannelId: discordInfoLiveChannelId.trim() || null } : {}),
      ...(typeof discordPartnershipChannelId === "string" ? { discordPartnershipChannelId: discordPartnershipChannelId.trim() || null } : {}),
      ...(typeof discordLfgChannelId === "string" ? { discordLfgChannelId: discordLfgChannelId.trim() || null } : {}),
      ...(typeof discordModLogChannelId === "string" ? { discordModLogChannelId: discordModLogChannelId.trim() || null } : {}),
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
      discordAnnouncementChannelId: typeof discordAnnouncementChannelId === "string" && discordAnnouncementChannelId.trim() ? discordAnnouncementChannelId.trim() : "1547552373629780038",
      discordGiveawayChannelId: typeof discordGiveawayChannelId === "string" ? discordGiveawayChannelId.trim() || null : null,
      discordInfoLiveChannelId: typeof discordInfoLiveChannelId === "string" ? discordInfoLiveChannelId.trim() || null : null,
      discordPartnershipChannelId: typeof discordPartnershipChannelId === "string" ? discordPartnershipChannelId.trim() || null : null,
      discordLfgChannelId: typeof discordLfgChannelId === "string" ? discordLfgChannelId.trim() || null : null,
      discordModLogChannelId: typeof discordModLogChannelId === "string" ? discordModLogChannelId.trim() || null : null,
      aiKnowledgeBase: typeof aiKnowledgeBase === "string" ? aiKnowledgeBase.trim() : null,
    },
  });

  return Response.json({ success: true, config, message: "Pengaturan website berhasil diperbarui!" });
}
