import { DonationStatus } from "@prisma/client";
import { requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await requireStaff(["ADMIN"]);
  if (access.response) return access.response;

  const { id } = await params;
  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const status = data.status;

  if (status !== DonationStatus.SUCCEEDED && status !== DonationStatus.FAILED && status !== DonationStatus.PENDING) {
    return Response.json({ error: "Status donasi tidak valid." }, { status: 400 });
  }

  const existing = await prisma.donation.findUnique({
    where: { id },
    include: { user: { select: { id: true, badges: true } } },
  });
  if (!existing) return Response.json({ error: "Catatan donasi tidak ditemukan." }, { status: 404 });

  const updated = await prisma.$transaction(async (tx) => {
    const donation = await tx.donation.update({
      where: { id },
      data: {
        status: status as DonationStatus,
        completedAt: status === DonationStatus.SUCCEEDED ? new Date() : null,
      },
    });

    if (status === DonationStatus.SUCCEEDED && existing.user) {
      // Determine appropriate donor badge based on amount
      const badge =
        existing.amount >= 100_000
          ? "Noble Patron"
          : existing.amount >= 50_000
            ? "High Merchant"
            : "Knight";

      const currentBadges = existing.user.badges;
      if (!currentBadges.includes(badge)) {
        await tx.user.update({
          where: { id: existing.user.id },
          data: {
            badges: [...currentBadges, badge],
            isPremium: existing.amount >= 50_000 ? true : undefined,
          },
        });
      }
    }

    return donation;
  });

  return Response.json(updated);
}
