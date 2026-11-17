import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ commentId: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await activeUser();
    if (!user) return jsonError("Login diperlukan untuk menghapus komentar.", 401);

    const { commentId } = await params;
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        authorId: true,
        postId: true,
        author: { select: { username: true } },
      },
    });

    if (!comment) return jsonError("Komentar tidak ditemukan atau sudah dihapus.", 404);

    const isAuthor = comment.authorId === user.id;
    const isStaff = user.role === "ADMIN" || user.role === "MODERATOR" || user.username === ".odyssia";

    if (!isAuthor && !isStaff) {
      return jsonError("Hanya pembuat komentar atau staf yang berhak menghapus komentar ini.", 403);
    }

    // Prisma relation has onDelete: Cascade, so all child replies will be automatically deleted
    await prisma.comment.delete({
      where: { id: commentId },
    });

    return Response.json({
      success: true,
      message: "Komentar berhasil dihapus.",
    });
  } catch (error) {
    console.error("[DELETE /api/forum/comments/[commentId]] Error:", error);
    return jsonError("Gagal menghapus komentar dari database.", 500);
  }
}
