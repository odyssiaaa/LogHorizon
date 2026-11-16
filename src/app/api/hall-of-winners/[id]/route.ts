import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return jsonError("Hanya Admin yang dapat menghapus arsip Hall of Winners.", 403);
  }

  const { id } = await params;
  if (!id) return jsonError("ID arsip diperlukan.", 400);

  try {
    await prisma.hallOfWinner.delete({
      where: { id },
    });
    return NextResponse.json({ success: true, message: "Arsip berhasil dihapus." });
  } catch (err) {
    console.error("Gagal menghapus arsip Hall of Winner:", err);
    return jsonError("Gagal menghapus arsip.", 500);
  }
}
