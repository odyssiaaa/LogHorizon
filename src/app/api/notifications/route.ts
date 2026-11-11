import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan.", 401);

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
  ]);

  return Response.json({
    notifications,
    unreadCount,
  });
}

export async function PATCH(request: Request) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan.", 401);

  const payload: unknown = await request.json().catch(() => ({}));
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  if (data.markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return Response.json({ success: true, message: "Semua notifikasi telah ditandai dibaca." });
  }

  if (typeof data.id === "string") {
    await prisma.notification.updateMany({
      where: { id: data.id, userId: user.id },
      data: { isRead: true },
    });
    return Response.json({ success: true });
  }

  return jsonError("Parameter tidak valid.", 400);
}
