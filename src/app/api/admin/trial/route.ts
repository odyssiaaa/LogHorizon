import { NextResponse } from "next/server";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { isAdmin, isGuildOwner } from "@/lib/caste-hierarchy";
import { notifyAdminCommandAudit } from "@/lib/discord-bot-sender";
import { createNotification } from "@/lib/notifications";
import { TrialType } from "@/lib/trial-helper";

const VALID_TRIAL_TYPES: TrialType[] = ["VIP_PREMIUM", "ALL_FRAMES", "VERIFIED_SELLER_TRIAL"];

export async function POST(req: Request) {
  const admin = await activeUser();
  if (!admin || !isAdmin(admin)) {
    return jsonError("Akses ditolak. Hanya Admin yang dapat memberikan trial.", 403);
  }

  const body = await req.json().catch(() => ({}));
  const rawUsername = String(body.username || "").trim();
  const cleanUsername = rawUsername.replace(/^@/, "");
  const trialType = String(body.trialType || "").toUpperCase() as TrialType;
  const durationDays = Number(body.durationDays) || 7;
  const reason = String(body.reason || "Pemberian akses trial resmi oleh staf Admin.").trim();

  if (!cleanUsername) {
    return jsonError("Username target wajib diisi.", 400);
  }

  if (!VALID_TRIAL_TYPES.includes(trialType)) {
    return jsonError("Tipe trial tidak valid. Pilihan: VIP_PREMIUM, ALL_FRAMES, VERIFIED_SELLER_TRIAL", 400);
  }

  if (durationDays < 1 || durationDays > 90) {
    return jsonError("Durasi trial harus antara 1 sampai 90 hari.", 400);
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: cleanUsername, mode: "insensitive" } },
        { discordId: cleanUsername },
        { id: cleanUsername },
      ],
    },
    select: {
      id: true,
      username: true,
      name: true,
      trialType: true,
      trialExpiresAt: true,
      trialGrantedBy: true,
      role: true,
    },
  });

  if (!targetUser) {
    return jsonError(`Pengguna dengan username @${cleanUsername} tidak ditemukan.`, 404);
  }

  if (isGuildOwner(targetUser)) {
    return jsonError("Akun Founder / Emperor .odyssia sudah memiliki akses permanen mutlak tanpa batas.", 400);
  }

  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  const adminName = admin.username ?? admin.name ?? "Admin";

  const updatedUser = await prisma.user.update({
    where: { id: targetUser.id },
    data: {
      trialType,
      trialExpiresAt: expiresAt,
      trialGrantedBy: adminName,
    },
    select: {
      id: true,
      username: true,
      trialType: true,
      trialExpiresAt: true,
      trialGrantedBy: true,
    },
  });

  const trialLabel =
    trialType === "VIP_PREMIUM"
      ? "💎 VIP Noble Patron"
      : trialType === "ALL_FRAMES"
        ? "🔮 Seluruh Bingkai Avatar Guild Armory"
        : "✅ Verified Seller Marketplace";

  // Notify target user
  await createNotification({
    userId: targetUser.id,
    type: "SYSTEM",
    message: `🎁 Selamat! Kamu menerima akses trial ${trialLabel} selama ${durationDays} hari dari Admin @${adminName} (berlaku hingga ${expiresAt.toLocaleDateString("id-ID")}).`,
  }).catch(() => null);

  // Send Audit Log to Discord #🛡️・mod-logs
  void notifyAdminCommandAudit({
    adminName,
    toolName: "grantMemberTrial",
    summary: `Pemberian Trial: ${trialLabel} (${durationDays} Hari) kepada @${targetUser.username}`,
    details: `Target: @${targetUser.username}\nTipe Trial: ${trialType}\nDurasi: ${durationDays} Hari\nKedaluwarsa: ${expiresAt.toISOString()}\nAlasan: ${reason}`,
    before: { trialType: targetUser.trialType, trialExpiresAt: targetUser.trialExpiresAt },
    after: { trialType, trialExpiresAt: expiresAt, trialGrantedBy: adminName },
  });

  return NextResponse.json({
    success: true,
    message: `Berhasil memberikan akses trial ${trialLabel} selama ${durationDays} hari kepada @${targetUser.username}.`,
    user: updatedUser,
  });
}

export async function DELETE(req: Request) {
  const admin = await activeUser();
  if (!admin || !isAdmin(admin)) {
    return jsonError("Akses ditolak. Hanya Admin yang dapat mencabut trial.", 403);
  }

  const { searchParams } = new URL(req.url);
  const rawUsername = searchParams.get("username") || "";
  const cleanUsername = rawUsername.replace(/^@/, "").trim();
  const reason = searchParams.get("reason") || "Pencabutan masa trial oleh staf Admin.";

  if (!cleanUsername) {
    return jsonError("Username target wajib diisi.", 400);
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: cleanUsername, mode: "insensitive" } },
        { discordId: cleanUsername },
        { id: cleanUsername },
      ],
    },
    select: {
      id: true,
      username: true,
      trialType: true,
      trialExpiresAt: true,
      trialGrantedBy: true,
    },
  });

  if (!targetUser) {
    return jsonError(`Pengguna dengan username @${cleanUsername} tidak ditemukan.`, 404);
  }

  const adminName = admin.username ?? admin.name ?? "Admin";

  const updatedUser = await prisma.user.update({
    where: { id: targetUser.id },
    data: {
      trialType: null,
      trialExpiresAt: null,
      trialGrantedBy: null,
    },
    select: {
      id: true,
      username: true,
      trialType: true,
      trialExpiresAt: true,
    },
  });

  // Notify target user
  await createNotification({
    userId: targetUser.id,
    type: "SYSTEM",
    message: `⏳ Masa trial akun kamu telah dinonaktifkan oleh Admin @${adminName}. Terima kasih telah mencoba fitur eksklusif LogHorizon!`,
  }).catch(() => null);

  // Send Audit Log to Discord #🛡️・mod-logs
  void notifyAdminCommandAudit({
    adminName,
    toolName: "revokeMemberTrial",
    summary: `Pencabutan Akses Trial dari @${targetUser.username}`,
    details: `Target: @${targetUser.username}\nAlasan: ${reason}`,
    before: { trialType: targetUser.trialType, trialExpiresAt: targetUser.trialExpiresAt },
    after: { trialType: null, trialExpiresAt: null },
  });

  return NextResponse.json({
    success: true,
    message: `Akses trial untuk @${targetUser.username} berhasil dicabut.`,
    user: updatedUser,
  });
}
