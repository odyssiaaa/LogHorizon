const hosts = new Set(["discord.com", "discordapp.com", "canary.discord.com", "ptb.discord.com"]);

type Channel = "announcements" | "marketplace" | "events" | "treasury";

export async function sendDiscordNotice(channel: Channel, title: string, description: string, url?: string) {
  const envName =
    channel === "announcements"
      ? "DISCORD_ANNOUNCEMENT_WEBHOOK_URL"
      : `DISCORD_${channel.toUpperCase()}_WEBHOOK_URL`;
  const value = process.env[envName] || process.env.DISCORD_ANNOUNCEMENT_WEBHOOK_URL;
  if (!value) return false;

  let webhook: URL;
  try {
    webhook = new URL(value);
  } catch {
    console.error(`${envName} is not a valid URL.`);
    return false;
  }
  if (webhook.protocol !== "https:" || !hosts.has(webhook.hostname) || !/^\/api\/webhooks\/\d+\/[^/]+\/?$/.test(webhook.pathname)) {
    console.error(`${envName} must be a Discord webhook URL.`);
    return false;
  }

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allowed_mentions: { parse: [] },
        embeds: [{
          title: title.slice(0, 256),
          description: description.slice(0, 4000),
          color: 0x9d4edd,
          ...(url ? { url } : {}),
          footer: { text: "LogHorizon" },
        }],
      }),
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error(`Discord ${channel} webhook returned status ${response.status}.`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Failed to send Discord ${channel} webhook:`, error);
    return false;
  }
}
