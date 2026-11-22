import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const me = await activeUser().catch(() => null);
  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get("targetUserId")?.trim();

  if (!targetUserId) {
    return jsonError("ID target pengguna diperlukan.", 400);
  }

  const [followersCount, followingCount, followRecord] = await Promise.all([
    prisma.follow.count({ where: { followingId: targetUserId } }),
    prisma.follow.count({ where: { followerId: targetUserId } }),
    me?.id
      ? prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: me.id,
              followingId: targetUserId,
            },
          },
        })
      : null,
  ]);

  return Response.json({
    success: true,
    isFollowing: Boolean(followRecord),
    followersCount,
    followingCount,
  });
}

export async function POST(request: Request) {
  const me = await activeUser();
  if (!me) return jsonError("Silakan masuk terlebih dahulu untuk mengikuti petualang.", 401);

  const body = await request.json().catch(() => ({}));
  const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";

  if (!targetUserId) {
    return jsonError("ID target pengguna diperlukan.", 400);
  }

  if (targetUserId === me.id) {
    return jsonError("Anda tidak dapat mengikuti diri sendiri.", 400);
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, username: true, isBanned: true },
  });

  if (!targetUser || targetUser.isBanned) {
    return jsonError("Petualang tidak ditemukan atau akun sedang dibekukan.", 404);
  }

  const existingFollow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: me.id,
        followingId: targetUserId,
      },
    },
  });

  if (existingFollow) {
    // Unfollow
    await prisma.follow.delete({
      where: { id: existingFollow.id },
    });

    const followersCount = await prisma.follow.count({
      where: { followingId: targetUserId },
    });

    return Response.json({
      success: true,
      action: "UNFOLLOWED",
      isFollowing: false,
      followersCount,
      message: `Berhenti mengikuti @${targetUser.username || "Petualang"}.`,
    });
  } else {
    // Follow
    await prisma.follow.create({
      data: {
        followerId: me.id,
        followingId: targetUserId,
      },
    });

    // Create notification for target user
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: "SYSTEM",
        message: `⚔️ @${me.username || "Seseorang"} mulai mengikuti perjalanan petualanganmu!`,
        link: `/u/${me.username || ""}`,
      },
    }).catch(() => null);

    const followersCount = await prisma.follow.count({
      where: { followingId: targetUserId },
    });

    return Response.json({
      success: true,
      action: "FOLLOWED",
      isFollowing: true,
      followersCount,
      message: `Sekarang kamu mengikuti @${targetUser.username || "Petualang"}!`,
    });
  }
}
