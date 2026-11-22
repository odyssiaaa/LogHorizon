import { requireStaff, jsonError, isGuildOwner } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { notifyVerifiedSellerAudit } from "@/lib/verified-seller";
import { createNotification } from "@/lib/notifications";

/**
 * GET /api/admin/seller-verification
 * Mengambil daftar pengajuan verifikasi penjual (REQUESTED) dan penjual terverifikasi aktif.
 * Hanya dapat diakses oleh ADMIN & Emperor (Ditolak 403 untuk MODERATOR & MEMBER).
 */
export async function GET() {
  const access = await requireStaff(["ADMIN"]);
  if (access.response) return access.response;

  const [pendingRequests, verifiedSellers] = await Promise.all([
    prisma.user.findMany({
      where: {
        isBanned: false,
        isVerifiedSeller: false,
        sellerVerificationStatus: "REQUESTED",
      },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
        discordId: true,
        role: true,
        isPremium: true,
        xp: true,
        level: true,
        joinedAt: true,
        lastActiveAt: true,
        sellerVerificationStatus: true,
        sellerPactAcceptedAt: true,
        sellerVerificationNote: true,
        _count: {
          select: {
            posts: { where: { category: "MARKETPLACE" } },
            escrowAsSeller: true,
          },
        },
      },
      orderBy: { sellerPactAcceptedAt: "desc" },
    }),
    prisma.user.findMany({
      where: {
        isVerifiedSeller: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
        discordId: true,
        role: true,
        isPremium: true,
        isBanned: true,
        joinedAt: true,
        isVerifiedSeller: true,
        verifiedSellerAt: true,
        verifiedSellerBy: true,
        sellerVerificationNote: true,
        _count: {
          select: {
            posts: { where: { category: "MARKETPLACE" } },
            escrowAsSeller: true,
          },
        },
      },
      orderBy: { verifiedSellerAt: "desc" },
    }),
  ]);

  return Response.json({
    success: true,
    pendingRequests,
    verifiedSellers,
  });
}

/**
 * POST /api/admin/seller-verification
 * Sakelar Validasi / Pencabutan Lencana Verified Seller oleh ADMIN.
 * Wewenang Khusus: ADMIN (👑 Emperor .odyssia, ✨ Prince/Princess, 📘 Grand Chancellor).
 * Ditolak 403 untuk MODERATOR & MEMBER.
 */
export async function POST(request: Request) {
  const access = await requireStaff(["ADMIN"]);
  if (access.response) return access.response;

  // Strict check: Hanya pangkat ADMIN / Emperor
  const admin = access.user;
  const isHighAdmin = admin.role === "ADMIN" || isGuildOwner(admin);
  if (!isHighAdmin) {
    return jsonError(
      "Akses Ditolak: Hanya jajaran Admin (👑 Emperor .odyssia, ✨ Prince/Princess, 📘 Grand Chancellor) yang berwenang memvalidasi penjual terpercaya.",
      403
    );
  }

  const body = await request.json().catch(() => ({}));
  const { targetUserId, action, note } = body;

  if (!targetUserId || typeof targetUserId !== "string") {
    return jsonError("ID target pengguna diperlukan.", 400);
  }

  if (!["APPROVE", "REVOKE", "REJECT"].includes(action)) {
    return jsonError("Aksi tidak valid. Pilihan: APPROVE, REVOKE, atau REJECT.", 400);
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      username: true,
      name: true,
      discordId: true,
      role: true,
      isVerifiedSeller: true,
    },
  });

  if (!targetUser) {
    return jsonError("Pengguna target tidak ditemukan.", 404);
  }

  const adminName = admin.username ?? admin.name ?? "Admin";
  const targetUsername = targetUser.username ?? targetUser.name ?? "Petualang";

  let updatedUser;
  if (action === "APPROVE") {
    updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isVerifiedSeller: true,
        sellerVerificationStatus: "VERIFIED",
        verifiedSellerAt: new Date(),
        verifiedSellerBy: adminName,
        sellerVerificationNote: note?.trim() || "Tervalidasi wawancara & rekam jejak oleh Staf",
      },
    });

    // Kirim notifikasi audit ke #🛡️・mod-logs
    await notifyVerifiedSellerAudit({
      adminName,
      targetUsername,
      action: "VERIFIED",
      note: note || "Tervalidasi wawancara langsung & verifikasi rekam jejak transaksi.",
    });

    // Notifikasi in-app ke target user
    await createNotification({
      userId: targetUserId,
      type: "SYSTEM",
      message: `🛡️ Selamat! Lencana Verified Seller resmi diterbitkan oleh @${adminName}. Lencana ✅ VERIFIED SELLER kini aktif di seluruh lapak dan profil Anda.`,
      link: "/profile",
    });

    return Response.json({
      success: true,
      message: `Berhasil memvalidasi status Verified Seller untuk @${targetUsername}.`,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        isVerifiedSeller: updatedUser.isVerifiedSeller,
        sellerVerificationStatus: updatedUser.sellerVerificationStatus,
      },
    });
  } else if (action === "REVOKE") {
    updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isVerifiedSeller: false,
        sellerVerificationStatus: "NONE",
        sellerVerificationNote: note?.trim() || `Status dicabut oleh @${adminName}`,
      },
    });

    // Kirim notifikasi audit ke #🛡️・mod-logs
    await notifyVerifiedSellerAudit({
      adminName,
      targetUsername,
      action: "REVOKED",
      note: note || "Status Verified Seller dicabut oleh Admin.",
    });

    // Notifikasi in-app ke target user
    await createNotification({
      userId: targetUserId,
      type: "SYSTEM",
      message: `⚠️ Status Verified Seller Anda telah dicabut oleh jajaran Admin. Alasan: ${note || "Pencabutan administratif / pelanggaran aturan marketplace."}`,
      link: "/marketplace",
    });

    return Response.json({
      success: true,
      message: `Berhasil mencabut status Verified Seller dari @${targetUsername}.`,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        isVerifiedSeller: updatedUser.isVerifiedSeller,
        sellerVerificationStatus: updatedUser.sellerVerificationStatus,
      },
    });
  } else {
    // REJECT
    updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isVerifiedSeller: false,
        sellerVerificationStatus: "REJECTED",
        sellerVerificationNote: note?.trim() || `Pengajuan ditolak oleh @${adminName}`,
      },
    });

    // Kirim notifikasi audit ke #🛡️・mod-logs
    await notifyVerifiedSellerAudit({
      adminName,
      targetUsername,
      action: "REJECTED",
      note: note || "Pengajuan verifikasi tidak memenuhi syarat.",
    });

    // Notifikasi in-app ke target user
    await createNotification({
      userId: targetUserId,
      type: "SYSTEM",
      message: `🚫 Pengajuan Verified Seller Anda belum dapat disetujui saat ini. Alasan: ${note || "Belum memenuhi kualifikasi wawancara staf."}`,
      link: "/marketplace",
    });

    return Response.json({
      success: true,
      message: `Pengajuan verifikasi @${targetUsername} telah ditolak.`,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        isVerifiedSeller: updatedUser.isVerifiedSeller,
        sellerVerificationStatus: updatedUser.sellerVerificationStatus,
      },
    });
  }
}
