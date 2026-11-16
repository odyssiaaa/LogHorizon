import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const access = await requireStaff(["ADMIN"]);
  if (access.response) return access.response;

  let cleanDummy = false;
  try {
    const body = await request.json();
    cleanDummy = Boolean(body?.cleanDummy);
  } catch {
    cleanDummy = true;
  }

  // 1. Reset all donations to pure Rp 0
  await prisma.donation.deleteMany({});

  // 2. Clean dummy/test tournaments and testing posts
  if (cleanDummy) {
    await prisma.tournament.deleteMany({
      where: {
        OR: [
          { title: { contains: "test", mode: "insensitive" } },
          { title: { contains: "percobaan", mode: "insensitive" } },
          { title: { contains: "dummy", mode: "insensitive" } },
        ],
      },
    });
  }

  return Response.json({
    success: true,
    message: "Seluruh kas donasi berhasil di-reset ke Rp 0 dan data percobaan telah dibersihkan secara tuntas.",
  });
}
