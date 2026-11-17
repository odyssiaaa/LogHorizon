import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const activeAnnouncement = await prisma.announcement.findFirst({
      where: { expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        expiresAt: true,
        showAsPopup: true,
        author: {
          select: {
            username: true,
            name: true,
            role: true,
          },
        },
      },
    });
    return Response.json({ announcement: activeAnnouncement });
  } catch {
    return Response.json({ announcement: null });
  }
}
