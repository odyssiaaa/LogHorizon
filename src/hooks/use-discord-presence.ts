"use client";

import { useState, useEffect } from "react";

export interface DiscordPresence {
  discordId: string;
  status: "online" | "idle" | "dnd" | "offline";
  statusLabel: string;
  statusColor: "emerald" | "amber" | "rose" | "slate";
  activity: {
    type: "PLAYING" | "LISTENING" | "STREAMING" | "CUSTOM" | "OTHER";
    name: string;
    details?: string;
    state?: string;
    display: string;
  } | null;
}

export function useDiscordPresence(discordId?: string | null) {
  const [presence, setPresence] = useState<DiscordPresence | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(discordId));

  useEffect(() => {
    if (!discordId) {
      setPresence(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchPresence() {
      try {
        const res = await fetch(`/api/discord/presence/${discordId}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as DiscordPresence;
          if (isMounted) {
            setPresence(data);
          }
        }
      } catch {
        // Silently catch errors
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void fetchPresence();
    const interval = setInterval(fetchPresence, 30_000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [discordId]);

  return { presence, loading };
}
