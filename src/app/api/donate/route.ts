import { DonationStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [total, goalValue] = await Promise.all([
    prisma.donation.aggregate({
      where: { status: DonationStatus.SUCCEEDED },
      _sum: { amount: true },
    }),
    Promise.resolve(Number(process.env.GUILD_TREASURY_GOAL_IDR)),
  ]);
  const goal = Number.isSafeInteger(goalValue) && goalValue > 0 ? goalValue : null;
  return Response.json({ total: total._sum.amount ?? 0, goal });
}

export async function POST(request: Request) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk berdonasi.", 401);
  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const amount = data.amount;
  const tier = data.tier;
  if (tier !== "ADVENTURER_SUPPORT" && tier !== "ELITE_PARTY_MEMBER" && tier !== "GUILD_BENEFACTOR") {
    return jsonError("Paket dukungan tidak valid.", 400);
  }
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 5000 || amount > 1_000_000) {
    return jsonError("Nominal donasi harus antara Rp5.000 dan Rp1.000.000.", 400);
  }

  const donation = await prisma.$transaction(async (tx) => {
    const completed = await tx.donation.create({
      data: {
        userId: user.id,
        amount,
        status: DonationStatus.SUCCEEDED,
        gatewayRef: `qris-${randomUUID()}`,
        completedAt: new Date(),
      },
    });
    const badge = tier === "ADVENTURER_SUPPORT"
      ? "Knight"
      : tier === "ELITE_PARTY_MEMBER"
        ? "High Merchant"
        : "Noble Patron";
    const currentUser = await tx.user.findUnique({ where: { id: user.id }, select: { badges: true } });
    if (!currentUser) throw new Error("Donor account not found.");
    await tx.user.update({
      where: { id: user.id },
      data: {
        badges: currentUser.badges.includes(badge) ? currentUser.badges : [...currentUser.badges, badge],
        ...(tier === "ELITE_PARTY_MEMBER" ? { isPremium: true } : {}),
      },
    });
    return completed;
  });
  return Response.json({
    donation,
    isPremium: tier === "ELITE_PARTY_MEMBER" || user.isPremium,
    notice: "Dukungan donasi berhasil dicatat ke perbendaharaan guild LogHorizon. Terima kasih petualang!",
  }, { status: 201 });
}
