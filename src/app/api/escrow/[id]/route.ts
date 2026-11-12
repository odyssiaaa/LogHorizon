import { EscrowStatus, Prisma } from "@prisma/client";
import { activeUser, authenticatedUser, jsonError } from "@/lib/http";
import { isMarketData, marketJson } from "@/lib/market-data";
import { prisma } from "@/lib/prisma";
import { addXpInTransaction } from "@/lib/xp";
import { createNotification } from "@/lib/notifications";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await authenticatedUser();
  if (!user) return jsonError("Login diperlukan untuk membuka tiket rekber.", 401);
  const { id } = await params;

  const escrow = await prisma.escrowTransaction.findUnique({
    where: { id },
    include: {
      post: { select: { id: true, title: true, marketData: true } },
      buyer: { select: { id: true, username: true, avatar: true, discordId: true } },
      seller: { select: { id: true, username: true, avatar: true, discordId: true } },
      claimedBy: { select: { id: true, username: true, avatar: true, discordId: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, username: true, avatar: true, role: true } } },
      },
    },
  });

  if (!escrow) return jsonError("Tiket transaksi rekber tidak ditemukan.", 404);

  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";
  const isParticipant =
    user.id === escrow.buyerId ||
    user.id === escrow.sellerId ||
    user.id === escrow.claimedById ||
    isStaff;

  if (!isParticipant) {
    return jsonError("Akses ditolak. Ruang chat Rekber hanya untuk Buyer, Seller, dan Admin Rekber.", 403);
  }

  return Response.json({
    id: escrow.id,
    postId: escrow.postId,
    postTitle: escrow.post.title,
    amount: escrow.amount,
    status: escrow.status,
    isLocked: escrow.isLocked || escrow.status !== EscrowStatus.IN_ESCROW,
    createdAt: escrow.createdAt,
    completedAt: escrow.completedAt,
    buyer: escrow.buyer,
    seller: escrow.seller,
    claimedBy: escrow.claimedBy,
    canClaim: isStaff && !escrow.claimedById,
    isClaimer: escrow.claimedById === user.id,
    messages: escrow.messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.sender.username,
      senderRole: m.sender.role,
      message: m.message,
      createdAt: m.createdAt,
    })),
  });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk memproses transaksi.", 401);
  const payload: unknown = await request.json();
  if (!payload || typeof payload !== "object") return jsonError("Data aksi tidak valid.", 400);

  const action = (payload as Record<string, unknown>).action;
  const { id } = await params;
  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";

  if (action === "claim") {
    if (!isStaff) return jsonError("Hanya Admin / Moderator yang dapat mengklaim tiket Rekber.", 403);
    const existing = await prisma.escrowTransaction.findUnique({ where: { id } });
    if (!existing) return jsonError("Tiket rekber tidak ditemukan.", 404);
    if (existing.claimedById) return jsonError("Tiket rekber ini sudah diklaim oleh staff lain.", 409);

    const updated = await prisma.escrowTransaction.update({
      where: { id },
      data: { claimedById: user.id },
      include: { claimedBy: { select: { id: true, username: true } } },
    });

    // Otomatis kirim pesan sistem ke ruang rekber
    await prisma.escrowMessage.create({
      data: {
        escrowId: id,
        senderId: user.id,
        message: `🛡️ [SISTEM REKBER] Tiket rekber ini resmi diambil alih oleh Staff ${user.username ?? "Admin"}. Silakan lanjutkan konfirmasi pembayaran dan serah terima akun/item di sini.`,
      },
    });

    return Response.json({
      success: true,
      transaction: updated,
      notice: "Kamu berhasil mengklaim tiket Rekber ini sebagai penengah resmi.",
    });
  }

  if (action === "cancel") {
    const escrow = await prisma.escrowTransaction.findUnique({ where: { id }, include: { post: true } });
    if (!escrow || escrow.status !== EscrowStatus.IN_ESCROW) return jsonError("Transaksi tidak aktif.", 404);
    if (user.id !== escrow.sellerId && user.id !== escrow.buyerId && !isStaff) {
      return jsonError("Tidak memiliki wewenang membatalkan transaksi.", 403);
    }

    if (isMarketData(escrow.post.marketData)) {
      const data = { ...escrow.post.marketData, status: "AVAILABLE" as const };
      await prisma.post.update({ where: { id: escrow.postId }, data: { marketData: marketJson(data) } });
    }

    const updated = await prisma.escrowTransaction.update({
      where: { id },
      data: { status: EscrowStatus.CANCELLED, isLocked: true },
    });

    await prisma.escrowMessage.create({
      data: {
        escrowId: id,
        senderId: user.id,
        message: `❌ [SISTEM REKBER] Transaksi Rekber telah DIBATALKAN oleh ${user.username ?? "User/Staff"}. Ruang chat dikunci. Lapak kembali tersedia.`,
      },
    });

    return Response.json({ success: true, transaction: updated, notice: "Transaksi Rekber dibatalkan." });
  }

  if (action === "complete") {
    const escrow = await prisma.escrowTransaction.findUnique({ where: { id }, include: { post: true } });
    if (!escrow || escrow.status !== EscrowStatus.IN_ESCROW) return jsonError("Transaksi escrow tidak aktif.", 404);
    if (user.id !== escrow.sellerId && !isStaff) {
      return jsonError("Hanya penjual atau moderator/admin yang dapat mengonfirmasi transaksi selesai.", 403);
    }
    if (!isMarketData(escrow.post.marketData)) return jsonError("Data lapak tidak valid.", 422);

    const data = { ...escrow.post.marketData, status: "SOLD" as const };
    await prisma.post.update({ where: { id: escrow.postId }, data: { marketData: marketJson(data) } });
    const updated = await prisma.escrowTransaction.update({
      where: { id },
      data: { status: EscrowStatus.COMPLETED, isLocked: true, completedAt: new Date() },
    });

    await prisma.$transaction(async (tx) => {
      await addXpInTransaction(tx, escrow.sellerId, 50, "Top Trader");
      await addXpInTransaction(tx, escrow.buyerId, 25, "Verified Buyer");
    });

    await prisma.escrowMessage.create({
      data: {
        escrowId: id,
        senderId: user.id,
        message: `✅ [SISTEM REKBER] Transaksi SUKSES & SELESAI! Dana dan barang telah diterima. Lapak ditandai SOLD. Ruang chat dikunci.`,
      },
    });

    void createNotification({
      userId: escrow.buyerId,
      type: "ESCROW",
      message: `Transaksi lapak "${escrow.post.title.slice(0, 40)}" telah diselesaikan! Terima kasih telah bertransaksi aman via Rekber Guild.`,
      link: `/marketplace`,
    });

    return Response.json({
      success: true,
      transaction: updated,
      notice: "Transaksi berhasil diselesaikan! Lapak ditandai SOLD dan reputasi transaksi berhasil dicatat.",
    });
  }

  return jsonError("Aksi escrow tidak dikenali.", 400);
}

