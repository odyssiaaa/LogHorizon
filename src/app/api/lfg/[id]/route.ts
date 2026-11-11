import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk mengelola party.", 401);

  const { id } = await params;
  const post = await prisma.lfgPost.findUnique({
    where: { id },
    select: { id: true, authorId: true, game: true },
  });

  if (!post) {
    return jsonError("Postingan party tidak ditemukan atau sudah berakhir.", 404);
  }

  const isOwner = post.authorId === user.id;
  const isAdminOrMod = user.role === "ADMIN" || user.role === "MODERATOR";

  if (!isOwner && !isAdminOrMod) {
    return jsonError("Kamu tidak memiliki izin untuk menutup party ini.", 403);
  }

  await prisma.lfgPost.delete({
    where: { id },
  });

  return Response.json({
    message: `Party "${post.game}" berhasil ditutup dan dihapus dari daftar aktif.`,
  });
}
