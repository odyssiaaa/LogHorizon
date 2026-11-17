import { Prisma } from "@prisma/client";
import { authenticatedUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sanitizePlainText } from "@/lib/sanitize";
import { notifyStaffAlert } from "@/lib/discord-webhook";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await authenticatedUser();
  if (!user) return jsonError("Login diperlukan untuk melaporkan postingan.", 401);
  const { id } = await params;
  const payload: unknown = await request.json();
  const rawReason = payload && typeof payload === "object" ? (payload as Record<string, unknown>).reason : null;
  const reason = sanitizePlainText(typeof rawReason === "string" ? rawReason.trim() : "");
  if (!reason || reason.length > 2000) return jsonError("Alasan laporan wajib diisi (maksimal 2.000 karakter).", 400);
  try {
    const report = await prisma.report.create({ data: { postId: id, reporterId: user.id, reason: reason.trim() } });

    void notifyStaffAlert({
      type: "REPORT",
      title: `Laporan Konten Post #${id.slice(0, 8)}`,
      actorName: user.username,
      amountOrTarget: `Post ID: ${id}`,
      details: `Alasan pelaporan: "${reason.trim()}"`,
    });

    return Response.json(report, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return jsonError("Kamu sudah pernah melaporkan postingan ini.", 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return jsonError("Postingan tidak ditemukan.", 404);
    throw error;
  }
}
