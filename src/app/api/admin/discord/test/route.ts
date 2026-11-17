import { requireStaff } from "@/lib/http";
import {
  DISCORD_CHANNELS,
  DiscordChannelKey,
  getDiscordChannelId,
  sendDiscordChannelMessage,
} from "@/lib/discord-bot";

export async function POST(request: Request) {
  const access = await requireStaff(["ADMIN"]);
  if (access.response) return access.response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      channelKey?: DiscordChannelKey;
      channelId?: string;
    };

    const channelKey = (body.channelKey && body.channelKey in DISCORD_CHANNELS)
      ? body.channelKey
      : "announcements";
    const customChannelId = typeof body.channelId === "string" ? body.channelId.trim() : undefined;

    const meta = DISCORD_CHANNELS[channelKey];
    const user = access.user;
    const resolvedId = customChannelId || (await getDiscordChannelId(channelKey)) || meta.defaultId || "Unknown";

    const testTime = new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const result = await sendDiscordChannelMessage(channelKey, {
      content: `⚡ **TES BOT LOGHORIZON MULTI-CHANNEL ROUTER**\nKoneksi berhasil! Bot LogHorizon terhubung langsung ke channel **${meta.name}** via Discord REST API v10.\n👤 Penguji: Admin **${user.username || user.name || "Staf"}** • 🕒 ${testTime} WIB`,
      embeds: [
        {
          title: `✅ Status Koneksi Bot: Normal (${meta.name})`,
          description: `Pesan uji coba berhasil dikirim ke Channel ID: \`${resolvedId}\`.\n\n📌 **Fungsi Channel Ini:**\n${meta.description}`,
          color: 0x10B981, // Emerald Green
          fields: [
            { name: "🤖 Target Saluran", value: `${meta.name} (\`${resolvedId}\`)`, inline: true },
            { name: "🛡️ Server Environment", value: "LogHorizon Production", inline: true },
          ],
          footer: { text: "LogHorizon Bot Multi-Channel Router • Diagnostics" },
          timestamp: new Date().toISOString(),
        },
      ],
      customChannelId,
    });

    if (!result.success) {
      return Response.json(
        {
          success: false,
          error: result.error || "Gagal mengirim pesan tes ke Discord.",
          channelKey,
          channelName: meta.name,
        },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: `✅ Berhasil! Bot sukses mengirim pesan tes ke channel ${meta.name} (ID: ${result.channelId}).`,
      channelKey,
      channelId: result.channelId,
      channelName: meta.name,
      via: result.via,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal saat tes bot.";
    return Response.json({ success: false, error: msg }, { status: 500 });
  }
}
