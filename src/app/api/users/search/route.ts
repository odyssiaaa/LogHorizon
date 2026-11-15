import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const me = await activeUser();
  if (!me) return jsonError("Login diperlukan.", 401);

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";

  if (!query || query.length < 2) {
    return Response.json({ success: true, users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      isBanned: false,
      id: { not: me.id },
      username: {
        contains: query,
        mode: "insensitive",
      },
    },
    take: 10,
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      isPremium: true,
      role: true,
    },
  });

  return Response.json({ success: true, users });
}
