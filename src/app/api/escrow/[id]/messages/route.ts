import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk mengirim pesan rekber.", 401);

  const { id } = await params;
  const payload: unknown = await request.json();
  if (!payload || typeof payload !== "object") return jsonError("Pesan tidak valid.", 400);

  const message = typeof (payload as Record<string, unknown>).message === "string"
    ? ((payload as Record<string, unknown>).message as string).trim()
    : "";

  if (!message || message.length > 1000) {
    return jsonError("Pesan wajib diisi (maksimal 1000 karakter).", 400);
  }

  const escrow = await prisma.escrowTransaction.findUnique({
    where: { id },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      claimedById: true,
      status: true,
      isLocked: true,
    },
  });

  if (!escrow) return jsonError("Tiket rekber tidak ditemukan.", 404);

  if (escrow.isLocked || escrow.status !== "IN_ESCROW") {
    return jsonError("Ruang chat rekber ini telah dikunci karena transaksi sudah selesai atau dibatalkan.", 400);
  }

  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";
  const isParticipant =
    user.id === escrow.buyerId ||
    user.id === escrow.sellerId ||
    user.id === escrow.claimedById ||
    isStaff;

  if (!isParticipant) {
    return jsonError("Akses ditolak. Anda bukan pihak yang terlibat dalam rekber ini.", 403);
  }

  const createdMessage = await prisma.escrowMessage.create({
    data: {
      escrowId: id,
      senderId: user.id,
      message,
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          avatar: true,
          role: true,
        },
      },
    },
  });

  return Response.json({
    id: createdMessage.id,
    senderId: createdMessage.senderId,
    senderName: createdMessage.sender.username,
    senderRole: createdMessage.sender.role,
    message: createdMessage.message,
    createdAt: createdMessage.createdAt,
  }, { status: 201 });
}
