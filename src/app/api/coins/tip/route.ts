import { NextResponse } from "next/server";
import { authenticatedUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { mutateHorizonCoinsInTransaction } from "@/lib/horizon-coin";
import { isGuildOwner } from "@/lib/caste";
import { checkRateLimit } from "@/lib/rate-limiter";
import { sanitizePlainText } from "@/lib/sanitize";

export const instant = false;

const ALLOWED_TIP_PRESETS = [10, 25, 50, 100];

export async function POST(req: Request) {
  const sender = await authenticatedUser();
  if (!sender) {
    return jsonError("Login diperlukan untuk mengirim tip apresiasi.", 401);
  }

  // Rate limiting: maks 10 kali tipping per menit per akun
  const rl = checkRateLimit(`coins:tip:${sender.id}`, 10, 60_000);
  if (!rl.allowed) {
    return jsonError(`Terlalu banyak permintaan tip. Harap tunggu ${rl.remainingSec} detik lagi.`, 429);
  }

  const body = await req.json().catch(() => ({}));
  const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";
  const rawAmount = body.amount;
  const postId = typeof body.postId === "string" && body.postId.trim() ? body.postId.trim() : null;
  const commentId = typeof body.commentId === "string" && body.commentId.trim() ? body.commentId.trim() : null;
  const rawMessage = typeof body.message === "string" ? body.message.trim() : "";

  // 1. Validasi Target
  if (!targetUserId) {
    return jsonError("ID petualang penerima tip wajib disertakan.", 400);
  }

  if (sender.id === targetUserId) {
    return jsonError("Tidak dapat mengirim tip apresiasi ke diri sendiri.", 400);
  }

  // 2. Validasi Nominal Koin (wajib integer positif)
  const amount = Number(rawAmount);
  if (!Number.isInteger(amount) || amount <= 0) {
    return jsonError("Nominal tip harus berupa angka bulat positif.", 400);
  }

  const isOwner = isGuildOwner(sender);
  if (!isOwner && !ALLOWED_TIP_PRESETS.includes(amount)) {
    return jsonError(`Nominal tip harus salah satu dari pilihan preset: ${ALLOWED_TIP_PRESETS.join(", ")} HC.`, 400);
  }

  // 3. Validasi Catatan Apresiasi (Maks 80 karakter)
  const cleanMessage = rawMessage ? sanitizePlainText(rawMessage).slice(0, 80) : "";

  // 4. Pastikan Akun Penerima Ada
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, username: true, name: true, isBanned: true },
  });

  if (!targetUser) {
    return jsonError("Petualang penerima tip tidak ditemukan.", 404);
  }

  if (targetUser.isBanned) {
    return jsonError("Tidak dapat mengirim tip ke akun yang sedang dijatuhi sanksi / penjara dungeon.", 400);
  }

  const targetName = targetUser.username || targetUser.name || "Petualang";
  const senderName = sender.username || sender.name || "Petualang";

  // 5. Eksekusi Atomic Transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Potong saldo pengirim (dilindungi cek saldo otomatis di mutateHorizonCoinsInTransaction)
      const senderCoinResult = await mutateHorizonCoinsInTransaction(
        tx,
        sender.id,
        -amount,
        "TIP_SENT",
        `Kirim tip 🪙 ${amount} HC ke @${targetName}${cleanMessage ? `: "${cleanMessage}"` : ""}`
      );

      // Tambah saldo penerima
      await mutateHorizonCoinsInTransaction(
        tx,
        targetUser.id,
        amount,
        "TIP_RECEIVED",
        `Terima tip 🪙 ${amount} HC dari @${senderName}${cleanMessage ? `: "${cleanMessage}"` : ""}`
      );

      // Update statistik total tip yang pernah dikirim / diterima
      const updatedSender = await tx.user.update({
        where: { id: sender.id },
        data: { tipsSentTotal: { increment: amount } },
        select: { tipsSentTotal: true, badges: true },
      });

      await tx.user.update({
        where: { id: targetUser.id },
        data: { tipsReceivedTotal: { increment: amount } },
      });

      // Otomatis berikan badge "💛 Dermawan Guild" jika total tip >= 250 HC
      if (
        (updatedSender.tipsSentTotal ?? 0) >= 250 &&
        !updatedSender.badges.includes("💛 Dermawan Guild")
      ) {
        await tx.user.update({
          where: { id: sender.id },
          data: { badges: [...updatedSender.badges, "💛 Dermawan Guild"] },
        });
      }

      // Jika tipping dikaitkan dengan thread Forum spesifik, update tipsTotal post
      if (postId) {
        await tx.post.update({
          where: { id: postId },
          data: { tipsTotal: { increment: amount } },
        }).catch(() => null);
      }

      // Jika tipping dikaitkan dengan komentar Forum spesifik, update tipsTotal comment
      if (commentId) {
        await tx.comment.update({
          where: { id: commentId },
          data: { tipsTotal: { increment: amount } },
        }).catch(() => null);
      }

      // Kirim notifikasi lonceng ke penerima
      await tx.notification.create({
        data: {
          userId: targetUser.id,
          type: "TIP",
          message: `@${senderName} mengirim apresiasi 🪙 ${amount} HC${cleanMessage ? ` ("${cleanMessage}")` : "!"}`,
          link: postId ? `/forum/${postId}` : `/u/${sender.username || ""}`,
        },
      });

      return {
        newSenderCoins: senderCoinResult.newBalance,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil mengirim tip 🪙 ${amount} HC kepada @${targetName}!`,
      amount,
      targetUsername: targetName,
      senderCoins: result.newSenderCoins,
      note: cleanMessage || null,
    });
  } catch (err: any) {
    if (err?.message === "INSUFFICIENT_COINS") {
      return jsonError("Saldo Horizon Coin (🪙 HC) Anda tidak mencukupi untuk mengirim tip ini.", 400);
    }
    return jsonError(err?.message || "Gagal memproses pengiriman tip.", 500);
  }
}
