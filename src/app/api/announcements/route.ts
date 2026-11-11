import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const activeAnnouncement = await prisma.announcement.findFirst({
      where: { expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { username: true } } },
    });
    return Response.json({ announcement: activeAnnouncement });
  } catch {
    return Response.json({ announcement: null });
  }
}
