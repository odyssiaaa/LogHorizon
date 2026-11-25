import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ActivityType = "PLAYING" | "LISTENING" | "STREAMING" | "CUSTOM" | "OTHER";

interface PresenceData {
  discordId: string;
  status: "online" | "idle" | "dnd" | "offline";
  statusLabel: string;
  statusColor: "emerald" | "amber" | "rose" | "slate";
  activity: {
    type: ActivityType;
    name: string;
    details?: string;
    state?: string;
    display: string;
  } | null;
}

// In-memory cache with 30s TTL
const presenceCache = new Map<string, { data: PresenceData; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 1000;

function formatStatus(status: string): {
  status: "online" | "idle" | "dnd" | "offline";
  statusLabel: string;
  statusColor: "emerald" | "amber" | "rose" | "slate";
} {
  switch (status.toLowerCase()) {
    case "online":
      return { status: "online", statusLabel: "Online", statusColor: "emerald" };
    case "idle":
      return { status: "idle", statusLabel: "Idle (Away)", statusColor: "amber" };
    case "dnd":
      return { status: "dnd", statusLabel: "Jangan Ganggu (DND)", statusColor: "rose" };
    default:
      return { status: "offline", statusLabel: "Offline", statusColor: "slate" };
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ discordId: string }> }
) {
  const { discordId } = await params;

  if (!discordId || !/^\d{16,21}$/.test(discordId)) {
    return NextResponse.json({ error: "Invalid Discord ID" }, { status: 400 });
  }

  const now = Date.now();
  const cached = presenceCache.get(discordId);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  }

  let finalStatus: "online" | "idle" | "dnd" | "offline" = "offline";
  let statusLabel = "Offline";
  let statusColor: "emerald" | "amber" | "rose" | "slate" = "slate";
  let activity: PresenceData["activity"] = null;

  // 1. Try Lanyard API (Real-time public presence API for Discord)
  try {
    const lanyardRes = await fetch(`https://api.lanyard.rest/v1/users/${discordId}`, {
      headers: { "User-Agent": "LogHorizonApp/1.0" },
      signal: AbortSignal.timeout(3500),
      cache: "no-store",
    }).catch(() => null);

    if (lanyardRes && lanyardRes.ok) {
      const lanyardJson = await lanyardRes.json().catch(() => null);
      if (lanyardJson?.success && lanyardJson?.data) {
        const d = lanyardJson.data;
        const formatted = formatStatus(d.discord_status || "offline");
        finalStatus = formatted.status;
        statusLabel = formatted.statusLabel;
        statusColor = formatted.statusColor;

        if (d.listening_to_spotify && d.spotify) {
          activity = {
            type: "LISTENING",
            name: "Spotify",
            details: d.spotify.song,
            state: d.spotify.artist,
            display: `🎵 Mendengarkan Spotify: ${d.spotify.song} — ${d.spotify.artist}`,
          };
        } else if (Array.isArray(d.activities) && d.activities.length > 0) {
          // Priority: Game (type 0) > Streaming (type 1) > Listening (type 2) > Custom (type 4)
          const gameAct = d.activities.find((a: { type: number }) => a.type === 0);
          const streamAct = d.activities.find((a: { type: number }) => a.type === 1);
          const listenAct = d.activities.find((a: { type: number }) => a.type === 2);
          const customAct = d.activities.find((a: { type: number }) => a.type === 4);

          const chosen = gameAct || streamAct || listenAct || customAct || d.activities[0];
          if (chosen) {
            let actType: ActivityType = "OTHER";
            let display = chosen.name || "Aktivitas";

            if (chosen.type === 0) {
              actType = "PLAYING";
              const extra = [chosen.details, chosen.state].filter(Boolean).join(" · ");
              display = `🎮 Sedang Bermain: ${chosen.name}${extra ? ` (${extra})` : ""}`;
            } else if (chosen.type === 1) {
              actType = "STREAMING";
              display = `🟣 Streaming: ${chosen.name}${chosen.details ? ` (${chosen.details})` : ""}`;
            } else if (chosen.type === 2) {
              actType = "LISTENING";
              display = `🎵 Mendengarkan: ${chosen.name}${chosen.details ? ` — ${chosen.details}` : ""}`;
            } else if (chosen.type === 4) {
              actType = "CUSTOM";
              display = `💬 ${chosen.state || chosen.name}`;
            }

            activity = {
              type: actType,
              name: chosen.name,
              details: chosen.details || undefined,
              state: chosen.state || undefined,
              display,
            };
          }
        }
      }
    }
  } catch {
    // Ignore Lanyard network failure and continue to Discord widget fallback
  }

  // 2. Fallback to Discord Server Widget if Lanyard returned offline or was unavailable
  if (finalStatus === "offline") {
    try {
      const config = await prisma.siteConfig.findUnique({
        where: { id: "default" },
        select: { discordInviteUrl: true },
      }).catch(() => null);

      const inviteUrl = config?.discordInviteUrl || "https://discord.gg/aJvbVyTxNb";
      const inviteCodeMatch = inviteUrl.match(/discord(?:\.gg|\.com\/invite)\/([a-zA-Z0-9-]+)/i);
      const inviteCode = inviteCodeMatch ? inviteCodeMatch[1] : "aJvbVyTxNb";

      const inviteRes = await fetch(
        `https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`,
        {
          headers: { "User-Agent": "LogHorizonApp/1.0" },
          signal: AbortSignal.timeout(3000),
          cache: "no-store",
        }
      ).catch(() => null);

      const inviteJson = inviteRes?.ok ? await inviteRes.json().catch(() => null) : null;
      const guildId = inviteJson?.guild?.id || process.env.DISCORD_GUILD_ID;

      if (guildId) {
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
          const members = widgetJson?.members;
          if (Array.isArray(members)) {
            const member = members.find((m: { id: string }) => m.id === discordId);
            if (member) {
              const formatted = formatStatus(member.status || "online");
              finalStatus = formatted.status;
              statusLabel = formatted.statusLabel;
              statusColor = formatted.statusColor;

              if (member.game?.name) {
                activity = {
                  type: "PLAYING",
                  name: member.game.name,
                  display: `🎮 Sedang Bermain: ${member.game.name}`,
                };
              }
            }
          }
        }
      }
    } catch {
      // Ignore widget failure
    }
  }

  const result: PresenceData = {
    discordId,
    status: finalStatus,
    statusLabel,
    statusColor,
    activity,
  };

  presenceCache.set(discordId, {
    data: result,
    expiresAt: now + CACHE_TTL_MS,
  });

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
