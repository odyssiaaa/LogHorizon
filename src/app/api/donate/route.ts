import { DonationStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sendDiscordNotice } from "@/lib/discord-webhook";

export async function GET() {
  const [total, config, envGoal] = await Promise.all([
    prisma.donation.aggregate({
      where: {
        status: { in: [DonationStatus.APPROVED, DonationStatus.SUCCEEDED] },
      },
      _sum: { amount: true },
    }),
    prisma.siteConfig.findUnique({
      where: { id: "default" },
    }),
    Promise.resolve(Number(process.env.GUILD_TREASURY_GOAL_IDR)),
  ]);

  const goal = config?.monthlyGoal ?? (Number.isSafeInteger(envGoal) && envGoal > 0 ? envGoal : 5_000_000);
  const qrisImageUrl = config?.qrisImageUrl || "/qris-guild.png";
  const minDonation = config?.minDonation || 10_000;

  return Response.json({
    total: total._sum.amount ?? 0,
    goal,
    qrisImageUrl,
    minDonation,
  });
}

export async function POST(request: Request) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk berdonasi.", 401);

  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const amount = Number(data.amount);
  const senderName = typeof data.senderName === "string" ? data.senderName.trim() : "";
  const notes = typeof data.notes === "string" ? data.notes.trim() : "";
  const proofUrl = typeof data.proofUrl === "string" ? data.proofUrl.trim() : "";

  if (!Number.isSafeInteger(amount) || amount < 10_000 || amount > 10_000_000) {
    return jsonError("Nominal donasi harus antara Rp 10.000 dan Rp 10.000.000.", 400);
  }

  // Tentukan tier secara otomatis berdasarkan nominal
  let tier = "ADVENTURER_SUPPORT";
  let tierLabel = "Tier 01 - Adventurer Support (Knight)";
  if (amount >= 100_000) {
    tier = "GUILD_BENEFACTOR";
    tierLabel = "Tier 03 - Guild Benefactor (Noble Patron)";
  } else if (amount >= 50_000) {
    tier = "ELITE_PARTY_MEMBER";
    tierLabel = "Tier 02 - Elite Party Member (High Merchant)";
  }

  if (!senderName || senderName.length > 100) {
    return jsonError("Nama pengirim transfer / pemilik rekening wajib diisi (maksimal 100 karakter).", 400);
  }

  const donation = await prisma.donation.create({
    data: {
      userId: user.id,
      amount,
      status: DonationStatus.PENDING,
      senderName,
      notes: notes || `Donasi ${tierLabel}`,
      proofUrl: proofUrl || null,
      gatewayRef: `qris-${randomUUID()}`,
    },
    include: {
      user: { select: { username: true, discordId: true } },
    },
  });

  const formattedAmount = `Rp ${amount.toLocaleString("id-ID")}`;
  void sendDiscordNotice(
    "treasury",
    `Permintaan Verifikasi Donasi Baru: ${formattedAmount}`,
    `Pengirim: ${senderName} (Akun: ${user.username ?? "Gamer"})\nTier: ${tierLabel}\nCatatan: ${notes || "-"}\nStatus: PENDING (Menunggu approval Admin di /admin)`
  );

  return Response.json(
    {
      donation,
      notice: "Bukti donasi terkirim! Menunggu verifikasi Admin sebelum benefit & role Discord diaktifkan.",
    },
    { status: 201 }
  );
}
