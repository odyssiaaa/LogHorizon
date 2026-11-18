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
        ...DEFAULT_DISCORD_CHANNELS,
      };

  return Response.json(
    { config: resolved },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
