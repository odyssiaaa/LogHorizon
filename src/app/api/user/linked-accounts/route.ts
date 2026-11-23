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

export function extractGoogleEmail(account?: {
  session_state?: string | null;
  id_token?: string | null;
} | null): string | null {
  if (!account) return null;

  // 1. If explicitly stored in session_state
  if (account.session_state && account.session_state.includes("@")) {
    return account.session_state.trim();
  }

  // 2. Decode from Google id_token JWT payload
  if (account.id_token && account.id_token.includes(".")) {
    try {
      const parts = account.id_token.split(".");
      if (parts.length >= 2) {
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = Buffer.from(base64, "base64").toString("utf-8");
        const payload = JSON.parse(jsonPayload);
        if (typeof payload.email === "string" && payload.email.includes("@")) {
          return payload.email.trim();
        }
      }
    } catch {
      // Ignore parse failure
    }
  }

  return null;
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
      id_token: true,
      session_state: true,
    },
  });

  const discordAccount = accounts.find((a) => a.provider === "discord");
  const googleAccount = accounts.find((a) => a.provider === "google");

  const isDiscordConnected = Boolean(discordAccount || user.discordId);
  const isGoogleConnected = Boolean(googleAccount);

  const totalConnected = (isDiscordConnected ? 1 : 0) + (isGoogleConnected ? 1 : 0);

  // Retrieve exact email belonging to the connected Google account
  const specificGoogleEmail = extractGoogleEmail(googleAccount);

  // Cache back to session_state if retrieved from id_token and session_state was empty
  if (specificGoogleEmail && googleAccount && !googleAccount.session_state) {
    void prisma.account.updateMany({
      where: {
        provider: "google",
        providerAccountId: googleAccount.providerAccountId,
      },
      data: { session_state: specificGoogleEmail },
    }).catch(() => {});
  }

  // If user only has Google (no Discord), user.email is also their Google email
  const googleEmailToMask = specificGoogleEmail || (!isDiscordConnected && isGoogleConnected ? user.email : null);
  const googleEmailMasked = isGoogleConnected ? maskEmail(googleEmailToMask) : null;

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
        emailMasked: googleEmailMasked,
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
