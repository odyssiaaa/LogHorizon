import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";
import { checkSatpamCooldown, processEscrowGuardian } from "@/lib/satpam-guardian";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk mengirim pesan rekber.", 401);

  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";
  if (!isStaff) {
    const limit = checkRateLimit(`escrow:chat:user:${user.id}`, 15, 60_000);
    if (!limit.allowed) {
      return jsonError(`Terlalu cepat mengirim pesan rekber (maksimal 15 pesan/menit). Harap tunggu ${limit.remainingSec} detik.`, 429);
    }
  }

  const { id } = await params;
  const payload: unknown = await request.json();
  if (!payload || typeof payload !== "object") return jsonError("Pesan tidak valid.", 400);

  const message = typeof (payload as Record<string, unknown>).message === "string"
    ? ((payload as Record<string, unknown>).message as string).trim()
    : "";

  if (!message || message.length > 2_000) {
    return jsonError("Pesan wajib diisi (maksimal 2.000 karakter).", 400);
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

  const isParticipant =
    user.id === escrow.buyerId ||
    user.id === escrow.sellerId ||
    user.id === escrow.claimedById ||
    isStaff;

  if (!isParticipant) {
    return jsonError("Akses ditolak. Anda bukan pihak yang terlibat dalam rekber ini.", 403);
  }

  // Cek Cooldown jika mention @satpam
  if (/@satpam\b/i.test(message)) {
    const isOwnerOrStaff = user.username?.toLowerCase() === ".odyssia" || user.role === "ADMIN" || user.role === "MODERATOR";
    const cooldown = checkSatpamCooldown(user.id, isOwnerOrStaff);
    if (!cooldown.allowed) {
      return jsonError(`Cooldown Satpam: Harap tunggu ${cooldown.remainingSec} detik sebelum memanggil @satpam kembali.`, 429);
    }
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

  // Jalankan asisten Satpam (deteksi indikasi scam / respon @satpam) di background
  void processEscrowGuardian({
    escrowId: id,
    userMessage: message,
    senderUser: user,
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
