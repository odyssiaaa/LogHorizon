import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const DISCORD_WEBHOOK_HOSTS = new Set(["discord.com", "discordapp.com", "canary.discord.com", "ptb.discord.com"]);

function getWebhookUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !DISCORD_WEBHOOK_HOSTS.has(url.hostname) || !/^\/api\/webhooks\/\d+\/[^/]+\/?$/.test(url.pathname)) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const access = await requireStaff(["ADMIN"]);
  if (access.response) return access.response;

  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const content = typeof data.content === "string" ? data.content.trim() : "";
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

  const webhook = process.env.DISCORD_ANNOUNCEMENT_WEBHOOK_URL;
  if (!webhook) {
    return Response.json({
      announcement,
      notificationSent: false,
      warning: "Pengumuman berhasil dipublikasikan di Landing Page (aktif 24 jam)! Discord Webhook belum dikonfigurasi.",
    }, { status: 201 });
  }

  const webhookUrl = getWebhookUrl(webhook);
  if (!webhookUrl) {
    return Response.json({
      announcement,
      notificationSent: false,
      warning: "Pengumuman berhasil dipublikasikan di Landing Page (aktif 24 jam)! Format webhook URL tidak valid.",
    }, { status: 201 });
  }

  try {
    const body = {
      content: `@everyone 📢 **PENGUMUMAN GUILD RESMI LOGHORIZON**\n\n**${title}**\n\n${content}\n\n*• Emperor & Council LogHorizon*`,
      allowed_mentions: { parse: ["everyone"] },
    };
    const res = await fetch(webhookUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(6000),
    });
    return Response.json({
      announcement,
      notificationSent: res.ok,
    }, { status: 201 });
  } catch {
    return Response.json({
      announcement,
      notificationSent: false,
      warning: "Pengumuman aktif di Landing Page, namun pengiriman Discord Webhook mengalami kendala.",
    }, { status: 201 });
  }
}
