import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limiter";
import { mutateHorizonCoinsInTransaction } from "@/lib/horizon-coin";
import { createNotification } from "@/lib/notifications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Silakan login terlebih dahulu.", 401);
  }

  const userId = session.user.id;
  const { id: questId } = await params;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").toUpperCase(); // "TAKE" | "SUBMIT" | "CONFIRM" | "CANCEL" | "DISPUTE"
  const proofNote = typeof body.proofNote === "string" ? body.proofNote.trim() : "";

  try {
    const result = await prisma.$transaction(async (tx) => {
      const quest = await tx.playerQuest.findUnique({
        where: { id: questId },
        include: {
          creator: { select: { id: true, username: true, name: true } },
          worker: { select: { id: true, username: true, name: true } },
        },
      });

      if (!quest) {
        throw new Error("QUEST_NOT_FOUND");
      }

      // 1. ACTION: TAKE (Worker takes open quest)
      if (action === "TAKE") {
        if (quest.status !== "OPEN") {
          throw new Error("Misi ini sudah tidak berstatus OPEN atau telah diambil petualang lain.");
        }
        if (quest.creatorId === userId) {
          throw new Error("Anda tidak dapat mengambil kontrak misi yang Anda buat sendiri.");
        }

        const updated = await tx.playerQuest.update({
          where: { id: questId },
          data: {
            status: "IN_PROGRESS",
            workerId: userId,
          },
        });

        // Notify creator
        await tx.notification.create({
          data: {
            userId: quest.creatorId,
            type: "SYSTEM",
            message: `⚔️ Petualang @${session.user.name || "Member"} telah mengambil kontrak misimu: "${quest.title}".`,
            link: "/events",
          },
        });

        return { message: "Kontrak misi berhasil diambil! Segera selesaikan tugas dan ajukan bukti penyelesaian.", quest: updated };
      }

      // 2. ACTION: SUBMIT (Worker submits proof)
      if (action === "SUBMIT") {
        if (quest.workerId !== userId) {
          throw new Error("Hanya pekerja yang mengambil kontrak ini yang dapat mengajukan laporan selesai.");
        }
        if (quest.status !== "IN_PROGRESS") {
          throw new Error("Misi belum berstatus IN_PROGRESS.");
        }
        if (!proofNote || proofNote.length < 5) {
          throw new Error("Harap sertakan catatan bukti penyelesaian tugas (minimal 5 karakter).");
        }

        const updated = await tx.playerQuest.update({
          where: { id: questId },
          data: {
            status: "SUBMITTED",
            proofNote,
          },
        });

        // Notify creator
        await tx.notification.create({
          data: {
            userId: quest.creatorId,
            type: "SYSTEM",
            message: `📩 Pekerja telah mengajukan bukti selesai untuk misi "${quest.title}". Silakan periksa dan cairkan gaji!`,
            link: "/events",
          },
        });

        return { message: "Laporan penyelesaian berhasil dikirim! Menunggu konfirmasi dan pencairan dari pembuat misi.", quest: updated };
      }

      // 3. ACTION: CONFIRM (Creator confirms & releases salary to worker)
      if (action === "CONFIRM") {
        if (quest.creatorId !== userId) {
          throw new Error("Hanya pembuat misi yang dapat mengonfirmasi dan mencairkan gaji.");
        }
        if (quest.status !== "SUBMITTED" && quest.status !== "IN_PROGRESS") {
          throw new Error("Misi belum dalam status diajukan selesai.");
        }
        if (!quest.workerId) {
          throw new Error("Pekerja tidak valid.");
        }

        // Release escrowed coins to worker
        const payResult = await mutateHorizonCoinsInTransaction(
          tx,
          quest.workerId,
          quest.rewardCoins,
          "PLAYER_QUEST_REWARD",
          `Gaji Kontrak Selesai: "${quest.title}" (+${quest.rewardCoins} HC)`
        );

        const updated = await tx.playerQuest.update({
          where: { id: questId },
          data: {
            status: "COMPLETED",
            completedCount: 1,
          },
        });

        // Notify worker
        await tx.notification.create({
          data: {
            userId: quest.workerId,
            type: "SYSTEM",
            message: `🎉 Gaji misi "${quest.title}" sebesar ${quest.rewardCoins.toLocaleString("id-ID")} HC telah dicairkan ke saldomu!`,
            link: "/profile",
          },
        });

        return { message: `Gaji sebesar ${quest.rewardCoins.toLocaleString("id-ID")} HC berhasil dicairkan kepada pekerja!`, quest: updated };
      }

      // 4. ACTION: CANCEL (Creator cancels OPEN quest, refunds escrowed coins)
      if (action === "CANCEL") {
        if (quest.creatorId !== userId) {
          throw new Error("Hanya pembuat misi yang dapat membatalkan kontrak.");
        }
        if (quest.status !== "OPEN") {
          throw new Error("Misi yang sudah diambil atau sedang berjalan tidak dapat dibatalkan sepihak. Ajukan sengketa jika terjadi kendala.");
        }

        // Refund escrowed coins to creator
        await mutateHorizonCoinsInTransaction(
          tx,
          quest.creatorId,
          quest.rewardCoins,
          "PLAYER_QUEST_REFUND",
          `Pengembalian Dana Pembatalan Misi: "${quest.title}" (+${quest.rewardCoins} HC)`
        );

        const updated = await tx.playerQuest.update({
          where: { id: questId },
          data: {
            status: "CANCELLED",
          },
        });

        return { message: `Kontrak misi dibatalkan. Saldo ${quest.rewardCoins.toLocaleString("id-ID")} HC telah dikembalikan ke akun Anda.`, quest: updated };
      }

      // 5. ACTION: DISPUTE (Either party files dispute)
      if (action === "DISPUTE") {
        if (quest.creatorId !== userId && quest.workerId !== userId) {
          throw new Error("Anda bukan pihak yang terlibat dalam kontrak misi ini.");
        }

        const updated = await tx.playerQuest.update({
          where: { id: questId },
          data: {
            status: "DISPUTED",
          },
        });

        return { message: "Sengketa kontrak misi berhasil diajukan ke tim Moderasi. Dana tetap aman di escrow sampai ditengahi.", quest: updated };
      }

      throw new Error("Aksi tidak dikenal.");
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[player-quest-action/POST] Error:", err);
    return jsonError(msg || "Gagal memproses aksi kontrak misi.", 400);
  }
}
