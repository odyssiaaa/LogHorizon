import { activeUser, jsonError, isGuildOwner } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { notifySellerVerificationRequested } from "@/lib/verified-seller";
import { createNotification } from "@/lib/notifications";

/**
 * GET /api/user/seller-verification
 * Mendapatkan status verifikasi penjual saat ini dan daftar staf yang tersedia
 */
export async function GET() {
  const me = await activeUser();
  if (!me) return jsonError("Login diperlukan.", 401);

  const user = await prisma.user.findUnique({
    where: { id: me.id },
    select: {
      id: true,
      username: true,
      role: true,
      isVerifiedSeller: true,
      sellerVerificationStatus: true,
      sellerPactAcceptedAt: true,
      verifiedSellerAt: true,
      verifiedSellerBy: true,
      sellerVerificationNote: true,
    },
  });

  if (!user) return jsonError("Pengguna tidak ditemukan.", 404);

  // Ambil daftar Staf & Admin LogHorizon yang sedang aktif / tersedia
  const staffUsers = await prisma.user.findMany({
    where: {
      isBanned: false,
      OR: [
        { role: { in: ["ADMIN", "MODERATOR"] } },
        { username: { in: [".odyssia", "odyssia", "Abbasta", "Woozy's", "Allegrio", "Fikkk01"] } },
      ],
    },
    select: {
      id: true,
      username: true,
      name: true,
      avatar: true,
      role: true,
      lastActiveAt: true,
      discordId: true,
    },
    take: 10,
    orderBy: { lastActiveAt: "desc" },
  });

  const now = Date.now();
  const staffList = staffUsers.map((s) => {
    const isOnline = Boolean(s.lastActiveAt && now - new Date(s.lastActiveAt).getTime() < 5 * 60 * 1000);
    const isOwner = isGuildOwner(s);
    const roleTitle = isOwner
      ? "👑 Emperor (.odyssia)"
      : s.role === "ADMIN"
      ? "✨ High Council (Admin)"
      : "⚔️ Lord Commander (Staf)";

    return {
      id: s.id,
      username: s.username ?? s.name ?? "Staf",
      name: s.name,
      avatar: s.avatar,
      roleTitle,
      role: s.role,
      isOnline,
      discordId: s.discordId,
    };
  });

  const isOwner = isGuildOwner(user);

  return Response.json({
    success: true,
    isVerifiedSeller: isOwner || user.isVerifiedSeller,
    sellerVerificationStatus: isOwner ? "VERIFIED" : user.sellerVerificationStatus,
    sellerPactAcceptedAt: user.sellerPactAcceptedAt,
    verifiedSellerAt: user.verifiedSellerAt,
    verifiedSellerBy: user.verifiedSellerBy,
    sellerVerificationNote: user.sellerVerificationNote,
    availableStaff: staffList,
  });
}

/**
 * POST /api/user/seller-verification
 * Member mengajukan verifikasi penjual & menyetujui pakta integritas hukum
 */
export async function POST(request: Request) {
  const me = await activeUser();
  if (!me) return jsonError("Login diperlukan.", 401);

  if (me.isBanned) {
    return jsonError("Akun Anda sedang dibatasi atau diblokir.", 403);
  }

  const isOwner = isGuildOwner(me);
  if (isOwner || me.isVerifiedSeller) {
    return Response.json({
      success: true,
      message: "Akun Anda telah berstatus Verified Seller resmi.",
      isVerifiedSeller: true,
    });
  }

  const body = await request.json().catch(() => ({}));
  if (!body.pactAccepted) {
    return jsonError("Anda wajib membaca dan menyetujui Pakta Pertanggungjawaban Hukum & Sanksi Sosial sebelum melanjutkan.", 400);
  }

  const now = new Date();

  // Update status member ke REQUESTED
  const updatedUser = await prisma.user.update({
    where: { id: me.id },
    data: {
      sellerVerificationStatus: "REQUESTED",
      sellerPactAcceptedAt: now,
      sellerVerificationNote: body.note ? String(body.note).slice(0, 500) : "Menunggu wawancara staf via Private Chat / Discord",
    },
    select: {
      id: true,
      username: true,
      discordId: true,
      sellerVerificationStatus: true,
      sellerPactAcceptedAt: true,
    },
  });

  // Kirim notifikasi embed ke Discord #🛡️・mod-logs
  await notifySellerVerificationRequested({
    userId: updatedUser.id,
    username: updatedUser.username ?? "Petualang",
    discordId: updatedUser.discordId,
    pactAcceptedAt: now,
  });

  // Notifikasi in-app untuk member
  await createNotification({
    userId: me.id,
    type: "SYSTEM",
    message: "🛡️ Pengajuan Verified Seller Dicatat: Pakta integritas telah disetujui. Silakan hubungi salah satu Staf LogHorizon di Private Chat atau Tiket Discord untuk wawancara identitas.",
    link: "/messages",
  });

  // Ambil staf yang paling aktif / online untuk langsung dihubungi
  const staff = await prisma.user.findFirst({
    where: {
      isBanned: false,
      OR: [
        { role: { in: ["ADMIN", "MODERATOR"] } },
        { username: { in: [".odyssia", "odyssia"] } },
      ],
    },
    orderBy: { lastActiveAt: "desc" },
    select: { id: true, username: true, name: true, role: true },
  });

  return Response.json({
    success: true,
    message: "Pengajuan berhasil dicatat! Notifikasi telah dikirimkan ke High Council & Staf LogHorizon.",
    sellerVerificationStatus: updatedUser.sellerVerificationStatus,
    sellerPactAcceptedAt: updatedUser.sellerPactAcceptedAt,
    targetStaff: staff ? { id: staff.id, username: staff.username ?? staff.name ?? "Staf" } : null,
  });
}
