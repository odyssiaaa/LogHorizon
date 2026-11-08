import { ReportStatus } from "@prisma/client";
import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await requireStaff();
  if (access.response) return access.response;

  const { id } = await params;
  const payload: unknown = await request.json();
  const action = payload && typeof payload === "object"
    ? (payload as Record<string, unknown>).action
    : null;
  const report = await prisma.report.findUnique({ where: { id }, select: { id: true, postId: true, status: true } });
  if (!report) return Response.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
  if (report.status !== ReportStatus.PENDING) return Response.json({ error: "Laporan ini sudah ditangani." }, { status: 409 });

  if (action === "delete-post") {
    await prisma.post.delete({ where: { id: report.postId } });
    return Response.json({ success: true, action });
  }
  if (action === "dismiss") {
    await prisma.report.update({ where: { id }, data: { status: ReportStatus.RESOLVED } });
    return Response.json({ success: true, action });
  }
  return Response.json({ error: "Aksi moderasi tidak valid." }, { status: 400 });
}
