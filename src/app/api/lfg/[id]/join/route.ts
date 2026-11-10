import { LfgStatus, Prisma } from "@prisma/client";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk bergabung ke party.", 401);
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const post = await tx.lfgPost.findUnique({ where: { id } });
      if (!post || post.status !== LfgStatus.OPEN) throw new Error("PARTY_CLOSED");
      if (post.authorId === user.id) throw new Error("OWNER_CANNOT_JOIN");
      const count = await tx.lfgJoin.count({ where: { postId: id } });
      if (count + 1 >= post.maxSlots) throw new Error("PARTY_FULL");
      const join = await tx.lfgJoin.create({ data: { postId: id, userId: user.id } });
      const newCount = count + 2;
      if (newCount >= post.maxSlots) await tx.lfgPost.update({ where: { id }, data: { status: LfgStatus.FULL } });
      return { join, count: newCount, maxSlots: post.maxSlots };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PARTY_CLOSED") return jsonError("Party sudah penuh atau ditutup.", 409);
    if (error instanceof Error && error.message === "OWNER_CANNOT_JOIN") return jsonError("Pembuat party sudah dihitung sebagai satu slot.", 400);
    if (error instanceof Error && error.message === "PARTY_FULL") return jsonError("Slot party sudah penuh.", 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return jsonError("Kamu sudah bergabung ke party ini.", 409);
export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan.", 401);
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const join = await tx.lfgJoin.findUnique({
        where: { postId_userId: { postId: id, userId: user.id } },
      });
      if (!join) throw new Error("NOT_JOINED");
      await tx.lfgJoin.delete({ where: { id: join.id } });
      const post = await tx.lfgPost.findUnique({ where: { id } });
      if (post && post.status === LfgStatus.FULL) {
        await tx.lfgPost.update({ where: { id }, data: { status: LfgStatus.OPEN } });
      }
      return { success: true };
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_JOINED") {
      return jsonError("Kamu belum bergabung di party ini.", 404);
    }
    console.error("[api/lfg/[id]/join DELETE] Error:", error);
    return jsonError("Gagal keluar dari party.", 500);
  }
}
