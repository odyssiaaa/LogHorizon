import { prisma } from "@/lib/prisma";

export async function GET() {
  const config = await prisma.siteConfig.findUnique({
    where: { id: "default" },
  });

  const resolved = config ?? {
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
  };

  return Response.json({ config: resolved });
}
