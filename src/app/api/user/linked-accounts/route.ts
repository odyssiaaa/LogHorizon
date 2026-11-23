import { authenticatedUser, jsonError, isGuildOwner } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

function maskEmail(email?: string | null): string | null {
  if (!email || !email.includes("@")) return null;
  const [local, domain] = email.split("@");
  if (!local || !domain) return null;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 2)}***@${domain}`;
}

export async function GET() {
  const user = await authenticatedUser();
  if (!user) {
    return jsonError("Silakan masuk terlebih dahulu.", 401);
  }

  // Fetch accounts connected in the database
  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    select: {
      provider: true,
      providerAccountId: true,
    },
  });

  const discordAccount = accounts.find((a) => a.provider === "discord");
  const googleAccount = accounts.find((a) => a.provider === "google");

  const isDiscordConnected = Boolean(discordAccount || user.discordId);
  const isGoogleConnected = Boolean(googleAccount);

  const totalConnected = (isDiscordConnected ? 1 : 0) + (isGoogleConnected ? 1 : 0);

  return Response.json({
    success: true,
    accounts: {
      discord: {
        connected: isDiscordConnected,
        id: discordAccount?.providerAccountId || user.discordId || null,
        username: user.username || null,
      },
      google: {
        connected: isGoogleConnected,
        emailMasked: isGoogleConnected ? maskEmail(user.email) : null,
      },
    },
    totalConnected,
  });
}

export async function DELETE(request: Request) {
  const user = await authenticatedUser();
  if (!user) {
    return jsonError("Silakan masuk terlebih dahulu.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Format permintaan tidak valid.", 400);
  }

  if (typeof body !== "object" || body === null || !("provider" in body)) {
    return jsonError("Field 'provider' diperlukan.", 400);
  }

  const provider = (body as { provider: string }).provider;
  if (provider !== "discord" && provider !== "google") {
    return jsonError("Provider harus berupa 'discord' atau 'google'.", 400);
  }

  // Fetch existing accounts to check connection and enforce Anti-Lockout
  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    select: { provider: true, providerAccountId: true },
  });

  const hasDiscord = accounts.some((a) => a.provider === "discord") || Boolean(user.discordId);
  const hasGoogle = accounts.some((a) => a.provider === "google");
  const totalConnected = (hasDiscord ? 1 : 0) + (hasGoogle ? 1 : 0);

  // Anti-Lockout Protection: User cannot unlink if only 1 provider is remaining
  if (totalConnected <= 1) {
    return jsonError(
      "Kamu harus menyisakan minimal 1 metode login aktif agar tidak terkunci dari akunmu.",
      400
    );
  }

  // Check if target provider is actually connected
  if (provider === "discord" && !hasDiscord) {
    return jsonError("Akun Discord tidak terhubung.", 400);
  }
  if (provider === "google" && !hasGoogle) {
    return jsonError("Akun Google tidak terhubung.", 400);
  }

  // Prevent Owner from unlinking their primary Discord identity
  if (provider === "discord" && isGuildOwner(user)) {
    return jsonError("Akun Discord Owner Emperor tidak dapat diputuskan demi keamanan server.", 403);
  }

  // Execute deletion atomically in transaction
  await prisma.$transaction(async (tx) => {
    // 1. Delete matching Account rows
    await tx.account.deleteMany({
      where: {
        userId: user.id,
        provider,
      },
    });

    // 2. Reset discordId if unlinking Discord
    if (provider === "discord" && !isGuildOwner(user)) {
      await tx.user.update({
        where: { id: user.id },
        data: { discordId: null },
      });
    }
  });

  return Response.json({
    success: true,
    message: `Tautan akun ${provider === "discord" ? "Discord" : "Google"} berhasil diputuskan.`,
  });
}
