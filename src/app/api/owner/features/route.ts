import { NextResponse } from "next/server";
import { requireOwnerOdyssia } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { sendDiscordChannelMessage, DiscordEmbed } from "@/lib/discord-bot";

export const instant = false;

export async function GET(req: Request) {
  const { user: owner, response } = await requireOwnerOdyssia();
  if (response || !owner) return response;

  try {
    let config = await prisma.siteConfig.findUnique({
      where: { id: "default" },
      select: {
        featureGachaEnabled: true,
        featureArmoryEnabled: true,
        featureMarketplaceEnabled: true,
        featureDungeonEnabled: true,
        featureGuestTournamentEnabled: true,
        featurePartyEnabled: true,
        maintenanceMode: true,
        updatedAt: true,
      },
    });

    if (!config) {
      config = await prisma.siteConfig.create({
        data: { id: "default" },
        select: {
          featureGachaEnabled: true,
          featureArmoryEnabled: true,
          featureMarketplaceEnabled: true,
          featureDungeonEnabled: true,
          featureGuestTournamentEnabled: true,
          featurePartyEnabled: true,
          maintenanceMode: true,
          updatedAt: true,
        },
      });
    }

    return NextResponse.json({ config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal memuat konfigurasi fitur." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { user: owner, response } = await requireOwnerOdyssia();
  if (response || !owner) return response;

  const body = await req.json().catch(() => ({}));

  const allowedKeys = [
    "featureGachaEnabled",
    "featureArmoryEnabled",
    "featureMarketplaceEnabled",
    "featureDungeonEnabled",
    "featureGuestTournamentEnabled",
    "featurePartyEnabled",
    "maintenanceMode",
  ] as const;

  const updateData: Record<string, boolean> = {};
  const changedList: string[] = [];

  for (const key of allowedKeys) {
    if (typeof body[key] === "boolean") {
      updateData[key] = body[key];
      changedList.push(`${key}: ${body[key] ? "AKTIF ✅" : "NONAKTIF ⛔"}`);
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Tidak ada parameter fitur yang valid untuk diubah." }, { status: 400 });
  }

  try {
    const updatedConfig = await prisma.siteConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        ...updateData,
      },
      update: updateData,
      select: {
        featureGachaEnabled: true,
        featureArmoryEnabled: true,
        featureMarketplaceEnabled: true,
        featureDungeonEnabled: true,
        featureGuestTournamentEnabled: true,
        featurePartyEnabled: true,
        maintenanceMode: true,
        updatedAt: true,
      },
    });

    // Discord audit to #mod-logs
    const embed: DiscordEmbed = {
      title: `🎛️ [EMPEROR SWITCHBOARD] Live Feature Toggles Updated`,
      description: `**Kaisar Tertinggi @${owner.username}** memperbarui sakelar fitur sistem langsung:`,
      color: 0x7c3aed, // Vivid Purple
      fields: [
        {
          name: "Perubahan Status",
          value: changedList.join("\n") || "Tidak ada rincian",
          inline: false,
        },
        {
          name: "Waktu Update",
          value: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
          inline: true,
        },
      ],
      footer: {
        text: "LogHorizon Live Control Switchboard • Owner Odyssia Guard",
      },
      timestamp: new Date().toISOString(),
    };

    void sendDiscordChannelMessage("mod_logs", { embeds: [embed] }).catch(() => null);

    return NextResponse.json({
      success: true,
      message: "Sakelar fitur live berhasil diperbarui!",
      config: updatedConfig,
    });
  } catch (error: any) {
    console.error("Feature toggle update error:", error);
    return NextResponse.json({ error: error.message || "Gagal memperbarui sakelar fitur." }, { status: 500 });
  }
}
