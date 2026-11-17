import { prisma } from "@/lib/prisma";

export type DiscordEmbedField = {
  name: string;
  value: string;
  inline?: boolean;
};

export type DiscordEmbed = {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  footer?: {
    text: string;
    icon_url?: string;
  };
  thumbnail?: {
    url: string;
  };
  image?: {
    url: string;
  };
  timestamp?: string;
};

export type DiscordWebhookPayload = {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
};

function getBaseAppUrl(): string {
  const envUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.startsWith("http")) {
    return envUrl.replace(/\/+$/, "");
  }
  return "https://loghorizon.id";
}

/**
 * Retrieve the active Discord webhook URL either from SiteConfig database or environment variable.
 */
export async function getDiscordWebhookUrl(): Promise<string | null> {
  try {
    const config = await prisma.siteConfig.findUnique({
      where: { id: "default" },
      select: { discordWebhookUrl: true },
    });
    if (config?.discordWebhookUrl && config.discordWebhookUrl.trim().startsWith("http")) {
      return config.discordWebhookUrl.trim();
    }
  } catch {
    // database fallback
  }

  const envWebhook = process.env.DISCORD_WEBHOOK_URL;
  if (envWebhook && envWebhook.trim().startsWith("http")) {
    return envWebhook.trim();
  }

  return null;
}

/**
 * Send an arbitrary webhook payload to Discord without blocking or throwing errors.
 */
export async function sendDiscordWebhook(payload: DiscordWebhookPayload): Promise<boolean> {
  try {
    const webhookUrl = await getDiscordWebhookUrl();
    if (!webhookUrl) {
      return false;
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: payload.username ?? "Satpam Horizon Guardian",
        avatar_url: payload.avatar_url ?? "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png",
        ...payload,
      }),
    });

    return res.ok;
  } catch (err) {
    console.warn("[Discord Webhook] Failed to dispatch webhook:", err);
    return false;
  }
}

/**
 * 1. Event: Turnamen Selesai / Juara Baru (Hall of Winners)
 */
export async function notifyTournamentChampion(data: {
  tournamentTitle: string;
  game: string;
  championName: string;
  runnerUpName?: string | null;
  thirdPlaceName?: string | null;
  prizePool?: string | null;
  certificateUrl?: string | null;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const hallUrl = `${baseUrl}/hall-of-winners`;

  const fields: DiscordEmbedField[] = [
    { name: "🎮 Game", value: data.game || "Kompetisi Guild", inline: true },
    { name: "👑 JUARA 1 (CHAMPION)", value: `**${data.championName}**`, inline: true },
  ];

  if (data.runnerUpName) {
    fields.push({ name: "🥈 JUARA 2 (RUNNER-UP)", value: data.runnerUpName, inline: true });
  }

  if (data.thirdPlaceName) {
    fields.push({ name: "🥉 JUARA 3", value: data.thirdPlaceName, inline: true });
  }

  if (data.prizePool) {
    fields.push({ name: "💰 Total Hadiah", value: data.prizePool, inline: true });
  }

  fields.push({
    name: "📜 Hall of Winners & Sertifikat",
    value: `[Lihat Arsip Juara Resmi di Website](${hallUrl})`,
    inline: false,
  });

  const embed: DiscordEmbed = {
    title: `🏆 PENGUMUMAN JUARA RESMI: ${data.tournamentTitle}`,
    description: `Selamat kepada para pemenang turnamen guild **LogHorizon**! Peringkat dan sertifikat digital telah diarsipkan di Hall of Winners.`,
    url: hallUrl,
    color: 0xF59E0B, // Gold / Amber
    fields,
    footer: {
      text: "LogHorizon Esports League • Hall of Winners",
    },
    timestamp: new Date().toISOString(),
  };

  if (data.certificateUrl) {
    embed.image = { url: data.certificateUrl };
  }

  await sendDiscordWebhook({
    content: "📢 **PENGUMUMAN KEJUARAAN TURNAMEN GUILD LOGHORIZON!** @everyone",
    embeds: [embed],
  });
}

/**
 * 2. Event: Party Mabar (LFG) Baru Dibuat
 */
export async function notifyNewLfgParty(data: {
  partyTitle: string;
  game: string;
  hostName?: string | null;
  requiredSlots: number;
  modeOrRank?: string | null;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const mabarUrl = `${baseUrl}/events?view=mabar`;
  const host = data.hostName || "Petualang Guild";

  const fields: DiscordEmbedField[] = [
    { name: "🎮 Game", value: data.game, inline: true },
    { name: "👑 Host Party", value: host, inline: true },
    { name: "👥 Slot Kosong", value: `${data.requiredSlots} Pemain`, inline: true },
  ];

  if (data.modeOrRank) {
    fields.push({ name: "🎯 Mode / Target Rank", value: data.modeOrRank, inline: true });
  }

  fields.push({
    name: "🚀 Gabung Party",
    value: `[Klik di sini untuk join lobby mabar di website](${mabarUrl})`,
    inline: false,
  });

  const embed: DiscordEmbed = {
    title: `⚔️ PARTY MABAR BARU: ${data.partyTitle}`,
    description: `Petualang **${host}** sedang mencari kawan mabar untuk **${data.game}**! Slot terbatas, segera gabung ke lobby.`,
    url: mabarUrl,
    color: 0x7C3AED, // Cyber Purple
    fields,
    footer: {
      text: "LogHorizon Arena & LFG Matchmaking",
    },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordWebhook({
    embeds: [embed],
  });
}

/**
 * 3. Event: Tiket Rekber Baru / Laporan Konten (Alert Staff: .odyssia & Fikkk01)
 */
export async function notifyStaffAlert(data: {
  type: "ESCROW" | "REPORT";
  title: string;
  actorName?: string | null;
  details: string;
  amountOrTarget?: string | null;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const adminUrl = `${baseUrl}/admin`;
  const actor = data.actorName || "Member";

  const isEscrow = data.type === "ESCROW";
  const fields: DiscordEmbedField[] = [
    { name: "👤 Pembuat / Pelapor", value: actor, inline: true },
    { name: "📌 Kategori", value: isEscrow ? "🛡️ Rekber Marketplace" : "⚠️ Laporan Konten / Member", inline: true },
  ];

  if (data.amountOrTarget) {
    fields.push({
      name: isEscrow ? "💵 Nilai Transaksi" : "🎯 Objek Terlapor",
      value: data.amountOrTarget,
      inline: true,
    });
  }

  fields.push(
    { name: "📝 Detail Insiden / Transaksi", value: data.details.slice(0, 500), inline: false },
    { name: "🛡️ Tindakan Cepat Pengurus", value: `[Buka Admin Command Center (${adminUrl})](${adminUrl})`, inline: false }
  );

  const embed: DiscordEmbed = {
    title: isEscrow ? `🛡️ TIKET REKBER BARU: ${data.title}` : `🚨 LAPORAN KONTEN MASUK: ${data.title}`,
    description: isEscrow
      ? `Transaksi rekber resmi guild baru saja dibuat dan menunggu penanganan pengurus kas.`
      : `Member melaporkan konten atau pelanggaran aturan komunitas yang memerlukan review moderator.`,
    url: adminUrl,
    color: isEscrow ? 0x10B981 : 0xEF4444, // Emerald or Rose
    fields,
    footer: {
      text: "LogHorizon Security Guard • Staff Alert",
    },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordWebhook({
    content: "🚨 **PANGGILAN KEAMANAN STAFF GUILD** (Attention: **.odyssia** & **Fikkk01**)",
    embeds: [embed],
  });
}

/**
 * Legacy compatibility helper for simple channel/title notices.
 */
export async function sendDiscordNotice(
  channel: string,
  title: string,
  detail: string,
  url?: string | null,
  imageUrl?: string | null
): Promise<boolean> {
  const embed: DiscordEmbed = {
    title: `[${channel.toUpperCase()}] ${title}`,
    description: detail,
    color: 0x7C3AED,
    timestamp: new Date().toISOString(),
  };
  if (url) embed.url = url;
  if (imageUrl) embed.image = { url: imageUrl };
  return sendDiscordWebhook({
    embeds: [embed],
  });
}
