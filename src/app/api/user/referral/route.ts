import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limiter";
import { addXpInTransaction } from "@/lib/xp";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ isLoggedIn: false });
  }

  const userId = session.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        badges: true,
        referredUsers: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            level: true,
            joinedAt: true,
          },
          orderBy: { joinedAt: "desc" },
          take: 20,
        },
        referrer: {
          select: {
            username: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return jsonError("User tidak ditemukan.", 404);
    }

    const referralCode = user.username || user.name || user.id;
    const referralLink = `https://loghorizon.vercel.app/?ref=${encodeURIComponent(referralCode)}`;
    const invitedCount = user.referredUsers.length;
    const totalXpEarned = invitedCount * 200;
    const hasGuildRecruiterBadge = user.badges.some((b) => b.includes("Guild Recruiter"));

    return NextResponse.json({
      isLoggedIn: true,
      referralCode,
      referralLink,
      invitedCount,
      totalXpEarned,
      hasGuildRecruiterBadge,
      referredBy: user.referrer?.username || user.referrer?.name || null,
      referredFriends: user.referredUsers.map((u) => ({
        id: u.id,
        username: u.username || u.name || "Petualang",
        avatar: u.avatar,
        level: u.level,
        joinedAt: u.joinedAt,
      })),
    });
  } catch (error) {
    console.error("[referral/GET] Error:", error);
    return jsonError("Gagal mengambil data referral.", 500);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Silakan login terlebih dahulu untuk menggunakan kode undangan.", 401);
  }

  const userId = session.user.id;
  const rateLimit = checkRateLimit(`referral_apply:${userId}`, 1, 3000);
  if (!rateLimit.allowed) {
    return jsonError("Harap tunggu sebentar.", 429);
  }

  const payload: unknown = await request.json().catch(() => ({}));
  const rawRef = typeof (payload as { ref?: unknown })?.ref === "string" ? (payload as { ref: string }).ref.trim() : "";

  if (!rawRef) {
    return jsonError("Kode referral wajib diisi.", 400);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ambil data user yang sedang login
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          name: true,
          referredById: true,
          badges: true,
        },
      });

      if (!currentUser) {
        throw new Error("USER_NOT_FOUND");
      }

      // Pastikan user belum pernah direferensikan
      if (currentUser.referredById) {
        throw new Error("ALREADY_REFERRED");
      }

      // 2. Cari akun pengundang berdasarkan username atau name
      const referrer = await tx.user.findFirst({
        where: {
          OR: [
            { username: { equals: rawRef, mode: "insensitive" } },
            { name: { equals: rawRef, mode: "insensitive" } },
            { id: rawRef },
          ],
        },
        select: {
          id: true,
          username: true,
          name: true,
          badges: true,
        },
      });

      if (!referrer) {
        throw new Error("REFERRER_NOT_FOUND");
      }

      // Tidak boleh mengundang diri sendiri
      if (referrer.id === currentUser.id) {
        throw new Error("SELF_REFERRAL");
      }

      // 3. Tautkan pengundang ke user baru
      await tx.user.update({
        where: { id: currentUser.id },
        data: {
          referredById: referrer.id,
          referredAt: new Date(),
        },
      });

      // 4. Berikan +100 XP selamat datang kepada pengguna baru
      const updatedCurrentUser = await addXpInTransaction(tx, currentUser.id, 100);

      // 5. Berikan +200 XP kepada pengundang
      await addXpInTransaction(tx, referrer.id, 200);

      // 6. Cek total referral yang telah dicapai pengundang
      const totalInvited = await tx.user.count({
        where: { referredById: referrer.id },
      });

      let recruiterBadgeUnlocked = false;
      if (totalInvited >= 3 && !referrer.badges.some((b) => b.includes("Guild Recruiter"))) {
        const badges = new Set(referrer.badges);
        badges.add("🎖️ Guild Recruiter");
        await tx.user.update({
          where: { id: referrer.id },
          data: { badges: [...badges] },
        });
        recruiterBadgeUnlocked = true;

        // Notifikasi lencana untuk pengundang
        await tx.notification.create({
          data: {
            userId: referrer.id,
            type: "SYSTEM",
            message: `🎖️ SELAMAT! Kamu berhasil mengundang ${totalInvited} petualang dan meraih lencana eksklusif '🎖️ Guild Recruiter'!`,
            link: "/profile",
          },
        });
      }

      const currentUserName = currentUser.username || currentUser.name || "Petualang Baru";
      const referrerName = referrer.username || referrer.name || "Petualang";

      // 7. Notifikasi ke pengguna baru
      await tx.notification.create({
        data: {
          userId: currentUser.id,
          type: "SYSTEM",
          message: `🎁 Bonus Sambutan: Kamu menerima +100 XP karena bergabung melalui undangan @${referrerName}!`,
          link: "/profile",
        },
      });

      // 8. Notifikasi ke pengundang
      await tx.notification.create({
        data: {
          userId: referrer.id,
          type: "SYSTEM",
          message: `🎉 @${currentUserName} baru saja bergabung menggunakan tautan undanganmu! Kamu mendapatkan +200 XP!`,
          link: "/profile",
        },
      });

      return {
        referrerName,
        welcomeXp: 100,
        level: updatedCurrentUser?.level ?? 1,
        xp: updatedCurrentUser?.xp ?? 0,
        recruiterBadgeUnlocked,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Kode undangan @${result.referrerName} berhasil digunakan! Kamu memperoleh bonus sambutan +${result.welcomeXp} XP!`,
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "ALREADY_REFERRED") {
      return jsonError("Akun kamu sudah pernah menggunakan tautan undangan.", 400);
    }
    if (message === "REFERRER_NOT_FOUND") {
      return jsonError("Kode undangan tidak ditemukan.", 404);
    }
    if (message === "SELF_REFERRAL") {
      return jsonError("Kamu tidak dapat menggunakan tautan undangan milik sendiri.", 400);
    }
    console.error("[referral/POST] Transaction error:", err);
    return jsonError("Gagal memproses kode undangan. Silakan coba lagi.", 500);
  }
}
