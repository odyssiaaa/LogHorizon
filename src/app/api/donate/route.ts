import { DonationStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { notifyDonationQueue, sendDiscordNotice } from "@/lib/discord-webhook";
import { sanitizePlainText, isValidSafeImage } from "@/lib/sanitize";
import { getTopupPackage, calculateCoinsForAmount } from "@/lib/coin-economy";

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
  const rawAmount = Number(data.amount);
  const senderName = sanitizePlainText(typeof data.senderName === "string" ? data.senderName.trim() : "");
  const notes = sanitizePlainText(typeof data.notes === "string" ? data.notes.trim() : "");
  const proofUrl = typeof data.proofUrl === "string" ? data.proofUrl.trim() : "";
  const packageId = typeof data.packageId === "string" ? data.packageId.trim() : undefined;
  const pkg = packageId ? getTopupPackage(packageId) : undefined;
  const isCoinTopup = Boolean(data.isCoinTopup || pkg);

  const amount = pkg ? pkg.priceIdr : rawAmount;
  let coinAmount: number | null = null;
  if (isCoinTopup) {
    if (pkg) {
      coinAmount = pkg.totalCoins;
    } else {
      const calc = calculateCoinsForAmount(amount);
      coinAmount = Number(data.coinAmount) || calc.totalCoins;
    }
  }

  if (proofUrl && !isValidSafeImage(proofUrl)) {
    return jsonError("Format bukti transfer tidak valid atau melebihi batas ukuran 2 MB.", 400);
  }

  const config = await prisma.siteConfig.findUnique({ where: { id: "default" } });
  const minDonation = config?.minDonation || 10_000;

  if (!Number.isSafeInteger(amount) || Number.isNaN(amount) || amount <= 0 || amount < minDonation || amount > 50_000_000) {
    return jsonError(`Nominal donasi minimal Rp ${minDonation.toLocaleString("id-ID")} dan maksimal Rp 50.000.000.`, 400);
  }

  // Tentukan tier secara otomatis berdasarkan nominal
  let tier = "ADVENTURER_SUPPORT";
  let tierLabel = isCoinTopup && pkg
    ? `Top-Up Paket ${pkg.name} (${pkg.totalCoins.toLocaleString("id-ID")} HC)`
    : "Tier 01 - Adventurer Support (Knight)";
  if (!isCoinTopup) {
    if (amount >= 100_000) {
      tier = "GUILD_BENEFACTOR";
      tierLabel = "Tier 03 - Guild Benefactor (Noble Patron)";
    } else if (amount >= 50_000) {
      tier = "ELITE_PARTY_MEMBER";
      tierLabel = "Tier 02 - Elite Party Member (High Merchant)";
    }
  }

  if (!senderName || senderName.length > 100) {
    return jsonError("Nama pengirim transfer / pemilik rekening wajib diisi (maksimal 100 karakter).", 400);
  }

  const defaultNote = isCoinTopup
    ? pkg
      ? `Top-Up Paket ${pkg.name}: ${pkg.baseCoins.toLocaleString("id-ID")} HC + Bonus ${pkg.bonusCoins.toLocaleString("id-ID")} HC = Total ${pkg.totalCoins.toLocaleString("id-ID")} HC`
      : `Top-Up ${coinAmount?.toLocaleString("id-ID")} Horizon Coins (🪙 HC)`
    : `Donasi ${tierLabel}`;

  const donation = await prisma.donation.create({
    data: {
      userId: user.id,
      amount,
      status: DonationStatus.PENDING,
      senderName,
      notes: notes || defaultNote,
      proofUrl: proofUrl || null,
      isCoinTopup,
      coinAmount,
      gatewayRef: `qris-${randomUUID()}`,
    },
    include: {
      user: { select: { username: true, discordId: true } },
    },
  });

  void notifyDonationQueue({
    donationId: donation.id,
    senderName,
    username: user.username ?? "Gamer",
    amount,
    tierLabel,
    notes: notes || undefined,
  });

  return Response.json(
    {
      donation,
      notice: "Bukti donasi terkirim! Menunggu verifikasi Admin sebelum benefit & role Discord diaktifkan.",
    },
    { status: 201 }
  );
}
