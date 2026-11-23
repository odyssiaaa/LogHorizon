import { Prisma } from "@prisma/client";
import { authenticatedUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sanitizePlainText } from "@/lib/sanitize";
import { sendDiscordChannelMessage, getBaseAppUrl, DiscordEmbed } from "@/lib/discord-bot";
import { checkRateLimit } from "@/lib/rate-limiter";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await authenticatedUser();
  if (!user) return jsonError("Login diperlukan untuk melaporkan postingan.", 401);

  const limitCheck = checkRateLimit(`report:user:${user.id}`, 5, 10 * 60 * 1000);
  if (!limitCheck.allowed) {
    return jsonError(`Batas pelaporan tercapai. Mohon tunggu ${limitCheck.remainingSec} detik sebelum mengirim laporan baru.`, 429);
  }
  const { id } = await params;
  const payload: unknown = await request.json();
  const rawReason = payload && typeof payload === "object" ? (payload as Record<string, unknown>).reason : null;
  const reason = sanitizePlainText(typeof rawReason === "string" ? rawReason.trim() : "");
  if (!reason || reason.length > 2000) return jsonError("Alasan laporan wajib diisi (maksimal 2.000 karakter).", 400);
  try {
    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true, title: true, category: true },
    });

    const report = await prisma.report.create({
      data: {
        postId: id,
        targetType: post?.category === "MARKETPLACE" ? "MARKETPLACE" : "POST",
        targetId: id,
        targetName: post?.title || null,
        reporterId: user.id,
        reason: reason.trim(),
      },
    });

    const now = new Date();
    const wibDate =
      new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(now) + " WIB";
    const baseUrl = getBaseAppUrl();

    const embed: DiscordEmbed = {
      title: `🚨 LAPORAN KONTEN MASUK [MODERASI]`,
      description: `Laporan baru untuk postingan/lapak telah dikirim oleh member.`,
      color: 0xef4444,
      fields: [
        { name: "📌 Judul Target", value: `**${post?.title || id}**`, inline: false },
        { name: "👤 Dilaporkan Oleh", value: `@${user.username || "Member"} (ID: \`${user.id}\`)`, inline: true },
        { name: "⏰ Waktu (WIB)", value: wibDate, inline: true },
        { name: "📝 Kronologi", value: reason.slice(0, 1024), inline: false },
        { name: "⚖️ Panel Moderasi", value: `[Buka /admin](${baseUrl}/admin)`, inline: false },
      ],
      footer: { text: "LogHorizon Moderation Center • #mod-logs (1547552557868777552)" },
      timestamp: now.toISOString(),
    };

    void sendDiscordChannelMessage("mod_logs", {
      content: `🚨 **[ALERT MODERASI]** Laporan konten baru telah masuk:`,
      embeds: [embed],
    }).catch(() => null);

    return Response.json(report, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return jsonError("Postingan tidak ditemukan.", 404);
    throw error;
  }
}
