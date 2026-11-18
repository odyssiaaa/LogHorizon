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

export type DiscordChannelKey =
  | "announcements"
  | "giveaway"
  | "tournament_live"
  | "info_live"
  | "partnership"
  | "shop"
  | "lfg"
  | "mod_logs";

export interface DiscordChannelMeta {
  key: DiscordChannelKey;
  name: string;
  fieldName:
    | "discordAnnouncementChannelId"
    | "discordGiveawayChannelId"
    | "discordTournamentLiveChannelId"
    | "discordInfoLiveChannelId"
    | "discordPartnershipChannelId"
    | "discordShopChannelId"
    | "discordLfgChannelId"
    | "discordModLogChannelId";
  defaultId?: string;
  description: string;
  icon: string;
}

export const DISCORD_CHANNELS: Record<DiscordChannelKey, DiscordChannelMeta> = {
  announcements: {
    key: "announcements",
    name: "#📢・announcements",
    fieldName: "discordAnnouncementChannelId",
    defaultId: "1547552373629780038",
    description: "Pengumuman resmi guild, info turnamen, & juara Hall of Winners",
    icon: "📢",
  },
  giveaway: {
    key: "giveaway",
    name: "#🎁・events-giveaway",
    fieldName: "discordGiveawayChannelId",
    defaultId: "1547552377396011118",
    description: "Pengumuman Event Giveaway / Undian Berhadiah komunitas",
    icon: "🎁",
  },
  tournament_live: {
    key: "tournament_live",
    name: "#🏆・live-info-tournament",
    fieldName: "discordTournamentLiveChannelId",
    defaultId: "1572575614974693427",
    description: "Pembaruan pertandingan turnamen LIVE, hasil skor, WO/DQ, & acak bagan",
    icon: "🏆",
  },
  info_live: {
    key: "info_live",
    name: "#📡・info-live",
    fieldName: "discordInfoLiveChannelId",
    defaultId: "1547552381221339149",
    description: "Khusus pengumuman siaran langsung streaming live YouTube, Twitch, TikTok",
    icon: "📡",
  },
  partnership: {
    key: "partnership",
    name: "#🤝・partnership",
    fieldName: "discordPartnershipChannelId",
    defaultId: "1572235405770887269",
    description: "Promosi member Donatur/VIP & sponsor/partner resmi baru",
    icon: "🤝",
  },
  shop: {
    key: "shop",
    name: "#🛒・server-shop",
    fieldName: "discordShopChannelId",
    defaultId: "1547552452725973093",
    description: "Lapak jual-beli akun, item, jasa game & marketplace gamer",
    icon: "🛒",
  },
  lfg: {
    key: "lfg",
    name: "#🎮・gaming-lounge",
    fieldName: "discordLfgChannelId",
    defaultId: "1547552498833825874",
    description: "Siaran otomatis ajakan mabar (LFG) baru dari website",
    icon: "🎮",
  },
  mod_logs: {
    key: "mod_logs",
    name: "#🛡️・mod-logs",
    fieldName: "discordModLogChannelId",
    defaultId: "1547552557868777552",
    description: "Saluran rahasia staf: tiket Rekber, antrean donasi, & log Satpam AI",
    icon: "🛡️",
  },
};

export function getBaseAppUrl(): string {
  const envUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.startsWith("http")) {
    return envUrl.replace(/\/+$/, "");
  }
  return "https://loghorizon.id";
}

/**
 * Retrieve channel ID configured in SiteConfig or default
 */
export async function getDiscordChannelId(channelKey: DiscordChannelKey): Promise<string | null> {
  const meta = DISCORD_CHANNELS[channelKey];
  if (!meta) return null;

  try {
    const config = await prisma.siteConfig.findUnique({
      where: { id: "default" },
      select: {
        discordAnnouncementChannelId: true,
        discordGiveawayChannelId: true,
        discordTournamentLiveChannelId: true,
        discordInfoLiveChannelId: true,
        discordPartnershipChannelId: true,
        discordShopChannelId: true,
        discordLfgChannelId: true,
        discordModLogChannelId: true,
      },
    });

    if (config) {
      const val = config[meta.fieldName];
      if (typeof val === "string" && val.trim().length > 0) {
        return val.trim();
      }
    }
  } catch {
    // Database query fallback
  }

  // Fallback to meta defaultId if any
  return meta.defaultId ?? null;
}

/**
 * Retrieve active Discord webhook URL for legacy fallback
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
    // fallback
  }

  const envWebhook = process.env.DISCORD_WEBHOOK_URL;
  if (envWebhook && envWebhook.trim().startsWith("http")) {
    return envWebhook.trim();
  }

  return null;
}

export interface SendDiscordOptions {
  content?: string;
  embeds?: DiscordEmbed[];
  allowed_mentions?: { parse: string[] };
  customChannelId?: string;
}

export interface SendDiscordResult {
  success: boolean;
  channelKey: DiscordChannelKey;
  channelId?: string | null;
  channelName: string;
  error?: string;
  via: "BOT_REST_API" | "WEBHOOK_FALLBACK" | "NONE";
}

/**
 * Send message through 1 Bot Discord Multi-Channel Router via Discord REST API v10
 */
export async function sendDiscordChannelMessage(
  channelKey: DiscordChannelKey,
  options: SendDiscordOptions
): Promise<SendDiscordResult> {
  const meta = DISCORD_CHANNELS[channelKey] || DISCORD_CHANNELS.announcements;
  const token = process.env.DISCORD_BOT_TOKEN?.trim();

  let targetChannelId = options.customChannelId?.trim();
  if (!targetChannelId) {
    targetChannelId = (await getDiscordChannelId(channelKey)) || undefined;
  }

  // 1. Primary Route: Discord Bot REST API v10
  if (token && targetChannelId) {
    try {
      const res = await fetch(`https://discord.com/api/v10/channels/${targetChannelId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "LogHorizonBot/1.0",
        },
        body: JSON.stringify({
          content: options.content,
          embeds: options.embeds,
          allowed_mentions: options.allowed_mentions ?? { parse: ["users", "roles"] },
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        return {
          success: true,
          channelKey,
          channelId: targetChannelId,
          channelName: meta.name,
          via: "BOT_REST_API",
        };
      }

      const errText = await res.text();
      let errorReason = `Discord API mengembalikan HTTP ${res.status}: ${res.statusText}`;
      if (res.status === 401) {
        errorReason = "Token DISCORD_BOT_TOKEN tidak valid atau kedaluwarsa (HTTP 401 Unauthorized)";
      } else if (res.status === 403) {
        errorReason = `Bot Discord tidak memiliki izin kirim pesan di channel #${targetChannelId} (HTTP 403 Forbidden: Missing Permissions)`;
      } else if (res.status === 404) {
        errorReason = `Channel ID "${targetChannelId}" tidak ditemukan di server Discord (HTTP 404 Not Found)`;
      } else if (errText) {
        errorReason += ` - ${errText.slice(0, 180)}`;
      }

      console.warn(`[Discord Bot Router] Gagal kirim ke ${meta.name} (${targetChannelId}):`, errorReason);
      return {
        success: false,
        channelKey,
        channelId: targetChannelId,
        channelName: meta.name,
        error: errorReason,
        via: "BOT_REST_API",
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Discord Bot Router] Network error ke ${meta.name} (${targetChannelId}):`, errMsg);
      return {
        success: false,
        channelKey,
        channelId: targetChannelId,
        channelName: meta.name,
        error: errMsg,
        via: "BOT_REST_API",
      };
    }
  }

  // 2. Secondary Fallback: Discord Webhook
  const webhookUrl = await getDiscordWebhookUrl();
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "LogHorizon Bot Router",
          avatar_url: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png",
          content: options.content,
          embeds: options.embeds,
        }),
        signal: AbortSignal.timeout(6000),
      });
      return {
        success: res.ok,
        channelKey,
        channelId: targetChannelId,
        channelName: meta.name,
        error: res.ok ? undefined : `Webhook HTTP ${res.status}`,
        via: "WEBHOOK_FALLBACK",
      };
    } catch (err) {
      return {
        success: false,
        channelKey,
        channelId: targetChannelId,
        channelName: meta.name,
        error: String(err),
        via: "WEBHOOK_FALLBACK",
      };
    }
  }

  const missingReason = !token
    ? "Token DISCORD_BOT_TOKEN belum dikonfigurasi di environment server"
    : `Channel ID untuk "${meta.name}" belum disetel di Pengaturan Web & AI (/admin)`;

  return {
    success: false,
    channelKey,
    channelId: targetChannelId,
    channelName: meta.name,
    error: missingReason,
    via: "NONE",
  };
}

/**
 * Helper to match channel topic / keywords to the best Discord channel key
 */
export function resolveDiscordChannelKey(input?: string): DiscordChannelKey {
  if (!input) return "announcements";
  const s = input.toLowerCase().trim();

  if (
    s.includes("giveaway") ||
    s.includes("undian") ||
    s.includes("hadiah") ||
    s.includes("bagi-bagi") ||
    s.includes("event")
  ) {
    return "giveaway";
  }
  if (
    s.includes("tournament_live") ||
    s.includes("live-info-tournament") ||
    s.includes("info-tournament") ||
    s.includes("tanding") ||
    s.includes("match live") ||
    s.includes("skor") ||
    s.includes("score") ||
    s.includes("wo") ||
    s.includes("dq") ||
    s.includes("gacha") ||
    s.includes("bracket") ||
    s.includes("bagan")
  ) {
    return "tournament_live";
  }
  if (
    s.includes("stream") ||
    s.includes("youtube") ||
    s.includes("twitch") ||
    s.includes("tiktok") ||
    s.includes("live stream") ||
    s.includes("livestream") ||
    s.includes("info-live") ||
    s.includes("infolive")
  ) {
    return "info_live";
  }
  if (
    s.includes("partner") ||
    s.includes("sponsor") ||
    s.includes("donatur") ||
    s.includes("vip") ||
    s.includes("iklan") ||
    s.includes("kolaborasi") ||
    s.includes("treasury") ||
    s.includes("donate") ||
    s.includes("donasi")
  ) {
    return "partnership";
  }
  if (
    s.includes("shop") ||
    s.includes("market") ||
    s.includes("lapak") ||
    s.includes("jual") ||
    s.includes("beli") ||
    s.includes("store") ||
    s.includes("wts") ||
    s.includes("wtb") ||
    s.includes("jasa")
  ) {
    return "shop";
  }
  if (s.includes("lfg") || s.includes("mabar") || s.includes("party") || s.includes("lobby") || s.includes("gaming") || s.includes("lounge")) {
    return "lfg";
  }
  if (
    s.includes("mod") ||
    s.includes("staf") ||
    s.includes("staff") ||
    s.includes("rekber") ||
    s.includes("report") ||
    s.includes("laporan") ||
    s.includes("satpam") ||
    s.includes("audit") ||
    s.includes("keamanan") ||
    s.includes("escrow")
  ) {
    return "mod_logs";
  }

  return "announcements";
}
