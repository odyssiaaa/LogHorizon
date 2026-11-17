import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sendDiscordChannelMessage, getBaseAppUrl } from "@/lib/discord-bot";

export async function POST(request: Request) {
  const access = await requireStaff(["ADMIN"]);
  if (access.response) return access.response;

  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const content = typeof data.content === "string" ? data.content.trim() : "";
  const imageUrl = typeof data.imageUrl === "string" && /^https?:\/\//i.test(data.imageUrl) ? data.imageUrl.trim() : null;
  if (!title || title.length > 180 || !content || content.length > 10000) {
    return Response.json({ error: "Judul dan isi pengumuman wajib diisi (maksimal 180 dan 10.000 karakter)." }, { status: 400 });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 jam tayang di Landing Page

  const announcement = await prisma.announcement.create({
    data: {
      authorId: access.user.id,
      title,
      content,
      createdAt: now,
      expiresAt,
    },
    include: {
      author: { select: { username: true } },
    },
  });

  // Kirim notifikasi sistem ke seluruh member aktif
  try {
    const allUsers = await prisma.user.findMany({
      where: { isBanned: false },
      select: { id: true },
      take: 500,
    });
    if (allUsers.length) {
      await prisma.notification.createMany({
        data: allUsers.map((u) => ({
          userId: u.id,
          type: "SYSTEM",
          message: `📢 PENGUMUMAN RESMI: ${title}`,
          link: "/",
        })),
        skipDuplicates: true,
      });
    }
  } catch (err) {
    console.error("[broadcast] Failed to broadcast notification:", err);
  }

  // Kirim ke Discord Bot Router (Channel #announcements)
  const baseUrl = getBaseAppUrl();
  const embed = {
    title: title.slice(0, 256),
    description: content.slice(0, 4000),
    color: 0x9d4edd,
    url: `${baseUrl}/news`,
    ...(imageUrl ? { image: { url: imageUrl } } : {}),
    footer: { text: "LogHorizon Guild Dispatch" },
    timestamp: new Date().toISOString(),
  };

  const botResult = await sendDiscordChannelMessage("announcements", {
    content: `@everyone 📢 **WARTA RESMI GUILD LOGHORIZON**\n\n**${title}**\n\n${content}\n\n*• Emperor & Council LogHorizon*`,
    embeds: [embed],
    allowed_mentions: { parse: ["everyone"] },
  });

  return Response.json(
    {
      announcement,
      notificationSent: botResult.success,
      channel: botResult.channelName,
      warning: botResult.success
        ? undefined
        : `Warta aktif di Beranda & News Hub, namun bot Discord melaporkan: ${botResult.error || "Gagal kirim"}`,
    },
    { status: 201 }
  );
}
