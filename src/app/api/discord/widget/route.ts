import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface DiscordWidgetCache {
  data: {
    serverName: string;
    onlineCount: number | null;
    totalMembers: number | null;
    hasVerifiedStats: boolean;
    inviteUrl: string;
    activeMembers: Array<{
      id: string;
      username: string;
      avatarUrl: string | null;
      status: string;
      game?: string;
    }>;
    cachedAt: number;
  };
  expiresAt: number;
}

let widgetCache: DiscordWidgetCache | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds cache

export async function GET(request: Request) {
  const now = Date.now();

  // Return fresh cache if available
  if (widgetCache && widgetCache.expiresAt > now) {
    return NextResponse.json(widgetCache.data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  }

  try {
    // 1. Get SiteConfig for invite link and Discord channel configurations
    const config = await prisma.siteConfig.findUnique({
      where: { id: "default" },
      select: {
        discordInviteUrl: true,
        discordAnnouncementChannelId: true,
      },
    }).catch(() => null);

    const inviteUrl = config?.discordInviteUrl || "https://discord.gg/aJvbVyTxNb";
    const inviteCodeMatch = inviteUrl.match(/discord(?:\.gg|\.com\/invite)\/([a-zA-Z0-9-]+)/i);
    const inviteCode = inviteCodeMatch ? inviteCodeMatch[1] : "aJvbVyTxNb";

    let serverName = "LogHorizon Multi-Game Guild";
    let onlineCount: number | null = null;
    let totalMembers: number | null = null;
    let hasVerifiedStats = false;
    const activeMembers: Array<{
      id: string;
      username: string;
      avatarUrl: string | null;
      status: string;
      game?: string;
    }> = [];

    // 2. Fetch from Discord Invite API (Public & Guaranteed to have accurate counts)
    try {
      const inviteRes = await fetch(
        `https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`,
        {
          headers: { "User-Agent": "LogHorizonApp/1.0" },
          signal: AbortSignal.timeout(4000),
          cache: "no-store",
        }
      ).catch(() => null);

      if (inviteRes && inviteRes.ok) {
        const inviteJson = await inviteRes.json().catch(() => null);
        if (inviteJson) {
          if (typeof inviteJson.approximate_member_count === "number" && inviteJson.approximate_member_count > 0) {
            totalMembers = inviteJson.approximate_member_count;
            hasVerifiedStats = true;
          }
          if (typeof inviteJson.approximate_presence_count === "number" && inviteJson.approximate_presence_count >= 0) {
            onlineCount = inviteJson.approximate_presence_count;
          }
          if (inviteJson.guild?.name) {
            serverName = inviteJson.guild.name;
          }
        }

        const guildId = inviteJson?.guild?.id || process.env.DISCORD_GUILD_ID;
        if (guildId) {
          // Attempt to fetch public widget JSON for active member avatars
          try {
            const widgetRes = await fetch(
              `https://discord.com/api/guilds/${guildId}/widget.json`,
              {
                headers: { "User-Agent": "LogHorizonApp/1.0" },
                signal: AbortSignal.timeout(3000),
                cache: "no-store",
              }
            ).catch(() => null);
            if (widgetRes && widgetRes.ok) {
              const widgetJson = await widgetRes.json().catch(() => null);
              if (widgetJson && Array.isArray(widgetJson.members)) {
                widgetJson.members.slice(0, 8).forEach((m: any) => {
                  activeMembers.push({
                    id: String(m.id || Math.random()),
                    username: m.username || "Gamer",
                    avatarUrl: m.avatar_url || null,
                    status: m.status || "online",
                    game: m.game?.name,
                  });
                });
              }
            }
          } catch {
            // Widget json disabled on server or timed out
          }
        }
      }
    } catch (apiErr) {
      console.warn("[Discord Widget API] Fetch invite error:", apiErr);
    }

    // Fallback active members from registered website users if discord widget disabled
    if (activeMembers.length === 0) {
      const recentUsers = await prisma.user.findMany({
        where: { isBanned: false, avatar: { not: null } },
        orderBy: { lastActiveAt: "desc" },
        take: 6,
        select: { id: true, username: true, avatar: true },
      }).catch(() => []);

      recentUsers.forEach((u) => {
        activeMembers.push({
          id: u.id,
          username: u.username || "Petualang",
          avatarUrl: u.avatar,
          status: "online",
        });
      });
    }

    const responseData = {
      serverName,
      onlineCount,
      totalMembers,
      hasVerifiedStats,
      inviteUrl,
      activeMembers,
      cachedAt: now,
    };

    widgetCache = {
      data: responseData,
      expiresAt: now + CACHE_TTL_MS,
    };

    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        serverName: "LogHorizon Multi-Game Guild",
        onlineCount: null,
        totalMembers: null,
        hasVerifiedStats: false,
        inviteUrl: "https://discord.gg/aJvbVyTxNb",
        activeMembers: [],
        cachedAt: now,
        error: err?.message,
      },
      { status: 200 }
    );
  }
}
