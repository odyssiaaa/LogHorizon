import { DonationStatus } from "@prisma/client";
import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { notifyDonationDecision, sendDiscordNotice } from "@/lib/discord-webhook";
import { mutateHorizonCoinsInTransaction } from "@/lib/horizon-coin";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await requireStaff(["ADMIN"]);
  if (access.response) return access.response;

  const { id } = await params;
  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const statusInput = String(data.status ?? "").toUpperCase();

  const isApproved = statusInput === "APPROVED" || statusInput === "SUCCEEDED";
  const isRejected = statusInput === "REJECTED" || statusInput === "FAILED";

  if (!isApproved && !isRejected) {
    return Response.json({ error: "Status donasi harus APPROVED atau REJECTED." }, { status: 400 });
  }

  const existing = await prisma.donation.findUnique({
    where: { id },
    include: { user: { select: { id: true, username: true, badges: true } } },
  });
  if (!existing) return Response.json({ error: "Catatan donasi tidak ditemukan." }, { status: 404 });

  const finalStatus: DonationStatus = isApproved ? DonationStatus.APPROVED : DonationStatus.REJECTED;

  const updated = await prisma.$transaction(async (tx) => {
    const donation = await tx.donation.update({
      where: { id },
      data: {
        status: finalStatus,
        completedAt: isApproved ? new Date() : null,
      },
    });

    if (isApproved && existing.user) {
      const badge =
        existing.amount >= 100_000
          ? "Noble Patron"
          : existing.amount >= 50_000
            ? "High Merchant"
            : "Knight";

      const currentBadges = existing.user.badges;
      const nextBadges = currentBadges.includes(badge) ? currentBadges : [...currentBadges, badge];

      await tx.user.update({
        where: { id: existing.user.id },
        data: {
          badges: nextBadges,
          ...(existing.amount >= 50_000 ? { isPremium: true } : {}),
        },
      });

      // Credit Horizon Coins if top-up or donation
      const coinsToCredit =
        existing.coinAmount ||
        (existing.isCoinTopup
          ? existing.amount >= 100_000
            ? 1200
            : existing.amount >= 50_000
            ? 550
            : Math.floor(existing.amount / 100)
          : existing.amount >= 100_000
          ? 1200
          : existing.amount >= 50_000
          ? 550
          : Math.floor(existing.amount / 100));

      if (coinsToCredit > 0) {
        await mutateHorizonCoinsInTransaction(
          tx,
          existing.user.id,
          coinsToCredit,
          "TOPUP_QRIS",
          `Top-Up QRIS (${coinsToCredit.toLocaleString("id-ID")} HC) disetujui Admin`
        );
      }

      await tx.notification.create({
        data: {
          userId: existing.user.id,
          type: "SYSTEM",
          message: `Selamat! Pembayaran QRIS kamu sebesar Rp ${existing.amount.toLocaleString("id-ID")} telah DISETUJUI oleh Admin. +${coinsToCredit.toLocaleString("id-ID")} Horizon Coins (🪙 HC) telah masuk ke saldomu!`,
          link: "/profile",
        },
      });
    } else if (isRejected && existing.user) {
      await tx.notification.create({
        data: {
          userId: existing.user.id,
          type: "SYSTEM",
          message: `Konfirmasi donasi sebesar Rp ${existing.amount.toLocaleString("id-ID")} tidak dapat diverifikasi (Ditolak). Silakan hubungi Admin jika ada kekeliruan bukti transfer.`,
          link: "/donate",
        },
      });
    }

    return donation;
  });

  void notifyDonationDecision({
    adminName: access.user.username ?? "Admin",
    senderName: existing.senderName ?? "Donatur",
    username: existing.user?.username ?? "Gamer",
    amount: existing.amount,
    isApproved,
    tierLabel: existing.amount >= 100_000 ? "Noble Patron (Tier 03)" : existing.amount >= 50_000 ? "High Merchant (Tier 02)" : "Knight (Tier 01)",
  });

  return Response.json(updated);
}
