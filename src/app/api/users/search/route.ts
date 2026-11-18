import { activeUser } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const me = await activeUser().catch(() => null);

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";

  const whereClause: {
    isBanned: boolean;
    id?: { not: string };
    username?: { contains: string; mode: "insensitive" };
  } = {
    isBanned: false,
  };

  if (me?.id) {
    whereClause.id = { not: me.id };
  }

  if (query) {
    whereClause.username = {
      contains: query,
      mode: "insensitive",
    };
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    take: 10,
    orderBy: query ? undefined : { xp: "desc" },
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
