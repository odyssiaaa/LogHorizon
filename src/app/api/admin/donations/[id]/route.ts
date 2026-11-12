import { DonationStatus } from "@prisma/client";
import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sendDiscordNotice } from "@/lib/discord-webhook";

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

      await tx.notification.create({
        data: {
          userId: existing.user.id,
          type: "SYSTEM",
          message: `Selamat! Donasi kamu sebesar Rp ${existing.amount.toLocaleString("id-ID")} telah DISETUJUI oleh Admin. Role & benefit telah aktif!`,
          link: "/donate",
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

  const formattedAmount = `Rp ${existing.amount.toLocaleString("id-ID")}`;
  if (isApproved) {
    void sendDiscordNotice(
      "treasury",
      `Donasi Disetujui: ${formattedAmount}`,
      `Donasi dari ${existing.user?.username ?? "Gamer"} telah diverifikasi dan DISETUJUI oleh ${access.user.username ?? "Admin"}.`
    );
  } else {
    void sendDiscordNotice(
      "treasury",
      `Donasi Ditolak: ${formattedAmount}`,
      `Konfirmasi donasi dari ${existing.user?.username ?? "Gamer"} DITOLAK oleh ${access.user.username ?? "Admin"}.`
    );
  }

  return Response.json(updated);
}
