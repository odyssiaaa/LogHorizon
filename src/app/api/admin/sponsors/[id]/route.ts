import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await requireStaff(["ADMIN"]);
  if (access.response) return access.response;

  const { id } = await params;
  await prisma.sponsor.delete({
    where: { id },
  });

  return Response.json({ success: true, message: "Sponsor berhasil dihapus." });
}
