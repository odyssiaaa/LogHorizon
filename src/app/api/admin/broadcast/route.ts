import { PostCategory } from "@prisma/client";
import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { addXpInTransaction } from "@/lib/xp";

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

  const webhook = process.env.DISCORD_ANNOUNCEMENT_WEBHOOK_URL;
  if (!webhook) return Response.json({ error: "DISCORD_ANNOUNCEMENT_WEBHOOK_URL belum dikonfigurasi." }, { status: 503 });
  const webhookUrl = getWebhookUrl(webhook);
  if (!webhookUrl) return Response.json({ error: "URL Discord webhook tidak valid." }, { status: 500 });

  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const content = typeof data.content === "string" ? data.content.trim() : "";
  if (!title || title.length > 180 || !content || content.length > 10000) {
    return Response.json({ error: "Judul dan isi pengumuman wajib diisi (maksimal 180 dan 10.000 karakter)." }, { status: 400 });
  }

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        authorId: access.user.id,
        category: PostCategory.GENERAL_CHAT,
        title,
        content,
        isPinned: true,
      },
      select: { id: true, title: true },
    });
    await addXpInTransaction(tx, access.user.id, 10);
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allowed_mentions: { parse: [] },
        embeds: [{
          title,
          description: content.slice(0, 4000),
          color: 0x9d4edd,
          footer: { text: "LogHorizon · Pengumuman Guild" },
          url: new URL(`/forum/${post.id}`, process.env.AUTH_URL ?? request.url).toString(),
        }],
      }),
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error("Discord announcement webhook returned a non-success status:", response.status);
      return Response.json({
        post,
        notificationSent: false,
        warning: "Pengumuman berhasil dipin, tetapi Discord webhook gagal mengirim notifikasi.",
      }, { status: 207 });
    }
  } catch (error) {
    console.error("Failed to send Discord announcement webhook:", error);
    return Response.json({
      post,
      notificationSent: false,
      warning: "Pengumuman berhasil dipin, tetapi Discord webhook gagal mengirim notifikasi.",
    }, { status: 207 });
  }

  return Response.json({ post, notificationSent: true }, { status: 201 });
}
