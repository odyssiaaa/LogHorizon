import { DonationStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sendDiscordNotice } from "@/lib/discord-webhook";

export async function GET() {
  const [total, goalValue] = await Promise.all([
    prisma.donation.aggregate({
      where: {
        status: { in: [DonationStatus.APPROVED, DonationStatus.SUCCEEDED] },
      },
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
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const amount = Number(data.amount);
  const tier = typeof data.tier === "string" ? data.tier : "";
  const senderName = typeof data.senderName === "string" ? data.senderName.trim() : "";
  const notes = typeof data.notes === "string" ? data.notes.trim() : "";
  const proofUrl = typeof data.proofUrl === "string" ? data.proofUrl.trim() : "";

  if (tier !== "ADVENTURER_SUPPORT" && tier !== "ELITE_PARTY_MEMBER" && tier !== "GUILD_BENEFACTOR") {
    return jsonError("Paket dukungan tidak valid.", 400);
  }

  if (!Number.isSafeInteger(amount) || amount < 5000 || amount > 10_000_000) {
    return jsonError("Nominal donasi harus antara Rp 5.000 dan Rp 10.000.000.", 400);
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
      notes: notes || `Donasi paket ${tier}`,
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
    `Pengirim: ${senderName} (Akun: ${user.username ?? "Gamer"})\nTier: ${tier}\nCatatan: ${notes || "-"}\nStatus: PENDING (Menunggu approval Admin di /admin)`
  );

  return Response.json(
    {
      donation,
      notice: "Bukti donasi terkirim! Menunggu verifikasi Admin sebelum benefit & role Discord diaktifkan.",
    },
    { status: 201 }
  );
}
