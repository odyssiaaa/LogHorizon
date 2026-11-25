import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limiter";
import { mutateHorizonCoinsInTransaction } from "@/lib/horizon-coin";
import { isGuildOwner } from "@/lib/caste";

// GET: Fetch player quest contracts with filters (all, open, my_created, my_taken)
export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "all"; // "all" | "open" | "my_created" | "my_taken"

  try {
    const whereClause: any = {};
    if (filter === "open") {
      whereClause.status = "OPEN";
    } else if (filter === "my_created" && userId) {
      whereClause.creatorId = userId;
    } else if (filter === "my_taken" && userId) {
      whereClause.workerId = userId;
    }

    const quests = await prisma.playerQuest.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            image: true,
            level: true,
            role: true,
            equippedAvatarFrame: true,
          },
        },
        worker: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            image: true,
            level: true,
            role: true,
            equippedAvatarFrame: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    let userCoins = 0;
    if (userId) {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { horizonCoins: true },
      });
      userCoins = u?.horizonCoins ?? 0;
    }

    return NextResponse.json({
      success: true,
      quests,
      userCoins,
      currentUserId: userId,
    });
  } catch (error) {
    console.error("[player-quests/GET] Error:", error);
    return jsonError("Gagal mengambil daftar kontrak misi petualang.", 500);
  }
}

// POST: Create a new player quest contract (escrows rewardCoins from creator)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Silakan login terlebih dahulu untuk menerbitkan kontrak misi.", 401);
  }

  const userId = session.user.id;
  const rateLimit = checkRateLimit(`create_quest:${userId}`, 1, 3000);
  if (!rateLimit.allowed) {
    return jsonError("Harap tunggu sebentar sebelum menerbitkan misi baru.", 429);
  }

  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const rewardCoins = Math.floor(Number(body.rewardCoins) || 0);

  if (!title || title.length < 5) {
    return jsonError("Judul misi minimal 5 karakter.", 400);
  }
  if (!description || description.length < 10) {
    return jsonError("Deskripsi syarat penyelesaian misi minimal 10 karakter.", 400);
  }
  if (rewardCoins < 50) {
    return jsonError("Gaji imbalan minimal untuk menerbitkan misi adalah 50 Horizon Coins (🪙 HC).", 400);
  }

  try {
    const createdQuest = await prisma.$transaction(async (tx) => {
      // 1. Escrow coins from creator
      const escrowResult = await mutateHorizonCoinsInTransaction(
        tx,
        userId,
        -rewardCoins,
        "PLAYER_QUEST_ESCROW",
        `Escrow Kontrak Misi: "${title}" (-${rewardCoins} HC)`
      );

      if (!escrowResult.success) {
        throw new Error(escrowResult.error || "INSUFFICIENT_COINS");
      }

      // 2. Create quest contract
      const quest = await tx.playerQuest.create({
        data: {
          creatorId: userId,
          title,
          description,
          rewardCoins,
          status: "OPEN",
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
              image: true,
              level: true,
              role: true,
            },
          },
        },
      });

      return { quest, newBalance: escrowResult.newBalance };
    });

    return NextResponse.json({
      success: true,
      message: `Kontrak misi berhasil diterbitkan! Saldo ${rewardCoins} HC telah di-escrow dengan aman.`,
      ...createdQuest,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("INSUFFICIENT_COINS")) {
      const parts = msg.split(":");
      return jsonError(`Saldo Horizon Coins Anda tidak mencukupi (Butuh ${parts[1]} HC, saldo saat ini ${parts[2]} HC). Silakan Top-Up terlebih dahulu!`, 400);
    }
    console.error("[player-quests/POST] Error:", err);
    return jsonError("Gagal menerbitkan kontrak misi. Silakan coba kembali.", 500);
  }
}
