import { DonationStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return jsonError("Simulasi donasi hanya tersedia di lingkungan development.", 503);
  }
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk berdonasi.", 401);
  const payload: unknown = await request.json();
  const amount = payload && typeof payload === "object" ? (payload as Record<string, unknown>).amount : null;
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 5000 || amount > 1_000_000) {
    return jsonError("Nominal donasi harus antara Rp5.000 dan Rp1.000.000.", 400);
  }

  const donation = await prisma.$transaction(async (tx) => {
    const completed = await tx.donation.create({
      data: {
        userId: user.id,
        amount,
        status: DonationStatus.SUCCEEDED,
        gatewayRef: `mock-${randomUUID()}`,
        completedAt: new Date(),
      },
    });
    await tx.user.update({ where: { id: user.id }, data: { isPremium: true } });
    return completed;
  });
  return Response.json({
    donation,
    isPremium: true,
    notice: "Pembayaran mock lokal berhasil. Tidak ada pembayaran nyata yang diproses.",
  }, { status: 201 });
}
