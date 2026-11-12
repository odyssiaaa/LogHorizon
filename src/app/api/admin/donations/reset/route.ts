import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const access = await requireStaff(["ADMIN"]);
  if (access.response) return access.response;

  await prisma.donation.deleteMany({});

  return Response.json({
    success: true,
    message: "Seluruh data transaksi donasi simulasi telah dihapus. Saldo kas terverifikasi sekarang murni Rp 0.",
  });
}
