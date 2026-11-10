import { authenticatedUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type DiscordProfile = { id: string; username: string; avatar: string | null };
type DiscordTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

export async function GET() {
  const user = await authenticatedUser();
  if (!user) return jsonError("Login diperlukan.", 401);
  return Response.json({
    id: user.id,
    discordId: user.discordId,
    username: user.username,
    avatar: user.avatar,
    level: user.level,
    xp: user.xp,
    role: user.role,
    isPremium: user.isPremium,
  });
}

export async function POST() {
  const user = await authenticatedUser();
  if (!user) return jsonError("Login diperlukan.", 401);
  const account = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: "discord", providerAccountId: user.discordId ?? "" } },
    select: { access_token: true, refresh_token: true, expires_at: true },
  });
  if (!account?.access_token) return jsonError("Akun Discord perlu dihubungkan ulang.", 409);

  let accessToken = account.access_token;
  let refreshToken = account.refresh_token;
  if (account.expires_at && account.expires_at <= Math.floor(Date.now() / 1000) + 60) {
    if (!refreshToken) return jsonError("Sesi Discord kedaluwarsa. Hubungkan ulang akun Discord.", 409);
    const refreshResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_DISCORD_ID ?? "",
        client_secret: process.env.AUTH_DISCORD_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const refreshed: DiscordTokenResponse = await refreshResponse.json();
    if (!refreshResponse.ok || !refreshed.access_token) {
      console.error("[settings] Discord token refresh failed", refreshResponse.status);
      return jsonError("Sesi Discord gagal diperbarui. Hubungkan ulang akun Discord.", 502);
    }
    accessToken = refreshed.access_token;
    refreshToken = refreshed.refresh_token ?? refreshToken;
    await prisma.account.update({
      where: { provider_providerAccountId: { provider: "discord", providerAccountId: user.discordId ?? "" } },
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: refreshed.expires_in ? Math.floor(Date.now() / 1000) + refreshed.expires_in : account.expires_at,
      },
    });
  }

  const profileResponse = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile: DiscordProfile | { message?: string } = await profileResponse.json();
  if (!profileResponse.ok || !("id" in profile) || !("username" in profile)) {
    console.error("[settings] Discord profile refresh failed", profileResponse.status);
    return jsonError("Profil Discord tidak dapat disinkronkan. Hubungkan ulang akun Discord.", 502);
  }

  const avatar = profile.avatar
    ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${profile.avatar.startsWith("a_") ? "gif" : "png"}?size=128`
    : null;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { discordId: profile.id, username: profile.username, avatar },
    select: { id: true, discordId: true, username: true, avatar: true, level: true, xp: true, role: true, isPremium: true },
  });
  return Response.json({ profile: updated, notice: "Profil Discord berhasil disinkronkan." });
}
