import { authenticatedUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sanitizePlainText } from "@/lib/sanitize";

type DiscordProfile = { id: string; username: string; avatar: string | null };
type DiscordTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

export async function GET() {
  const user = await authenticatedUser();
  if (!user) return jsonError("Login diperlukan.", 401);

  const [
    postsCount,
    tournamentsCount,
    successfulTrades,
    donationsCount,
    lfgCount,
    recentPosts,
    recentTournaments,
    recentTrades,
  ] = await Promise.all([
    prisma.post.count({ where: { authorId: user.id, category: { not: "MARKETPLACE" } } }),
    prisma.participant.count({ where: { leaderId: user.id } }),
    prisma.escrowTransaction.count({
      where: {
        OR: [{ buyerId: user.id }, { sellerId: user.id }],
        status: "COMPLETED",
      },
    }),
    prisma.donation.count({
      where: { userId: user.id, status: { in: ["APPROVED", "SUCCEEDED"] } },
    }),
    prisma.lfgPost.count({ where: { authorId: user.id } }),
    prisma.post.findMany({
      where: { authorId: user.id },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, category: true, createdAt: true },
    }),
    prisma.participant.findMany({
      where: { leaderId: user.id },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        teamName: true,
        createdAt: true,
        tournament: { select: { id: true, title: true, game: true, status: true } },
      },
    }),
    prisma.escrowTransaction.findMany({
      where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        post: { select: { id: true, title: true } },
      },
    }),
  ]);

  const isOwner = user.username === ".odyssia" || user.role === "ADMIN" || user.discordId === "706661230835925042";

  const achievements = [
    {
      id: "discussion-starter",
      title: "🗣️ Pembuka Diskusi",
      desc: "Menerbitkan minimal 1 thread diskusi di forum guild.",
      unlocked: postsCount >= 1,
    },
    {
      id: "trusted-trader",
      title: "🛡️ Pedagang Terpercaya",
      desc: "Menyelesaikan minimal 1 transaksi aman via Rekber Guild.",
      unlocked: successfulTrades >= 1,
    },
    {
      id: "guild-supporter",
      title: "💎 Penyokong Guild",
      desc: "Berdonasi mendukung operasional server perbendaharaan.",
      unlocked:
        isOwner ||
        donationsCount >= 1 ||
        user.badges.includes("Knight") ||
        user.badges.includes("High Merchant") ||
        user.badges.includes("Noble Patron"),
    },
    {
      id: "party-veteran",
      title: "⚔️ Veteran Party",
      desc: "Membuka pencarian tim di Find Teammate / LFG.",
      unlocked: lfgCount >= 1,
    },
    {
      id: "verified-gamer",
      title: "🎮 Gamer Terverifikasi",
      desc: "Melengkapi daftar game yang dimainkan dan identitas profil.",
      unlocked: Boolean((user.favoriteGames && user.favoriteGames.length > 0) || (user.inGameName && user.primaryRole) || user.gender),
    },
  ];

  type ActivityItem = {
    id: string;
    type: "POST" | "TOURNAMENT" | "ESCROW";
    title: string;
    detail: string;
    createdAt: string;
    href: string;
  };

  const activityList: ActivityItem[] = [
    ...recentPosts.map((p) => ({
      id: `post-${p.id}`,
      type: "POST" as const,
      title: p.title,
      detail: `Thread Forum (${p.category.replaceAll("_", " ")})`,
      createdAt: p.createdAt.toISOString(),
      href: p.category === "MARKETPLACE" ? "/marketplace" : `/forum/${p.id}`,
    })),
    ...recentTournaments.map((t) => ({
      id: `tour-${t.id}`,
      type: "TOURNAMENT" as const,
      title: t.tournament?.title || "Turnamen Komunitas",
      detail: `Tim: ${t.teamName} · Game: ${t.tournament?.game || "-"}`,
      createdAt: t.createdAt.toISOString(),
      href: `/events/turnamen/${t.tournament?.id || ""}`,
    })),
    ...recentTrades.map((e) => ({
      id: `escrow-${e.id}`,
      type: "ESCROW" as const,
      title: e.post?.title || `Transaksi Rekber #${e.id.slice(0, 8)}`,
      detail: `Nominal Rp ${e.amount.toLocaleString("id-ID")} · Status: ${e.status}`,
      createdAt: e.createdAt.toISOString(),
      href: `/marketplace/${e.post?.id || ""}`,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return Response.json({
    id: user.id,
    discordId: user.discordId,
    username: user.username,
    avatar: user.avatar,
    level: user.level,
    xp: user.xp,
    role: user.role,
    badges: user.badges ?? [],
    checkInStreak: user.checkInStreak ?? 0,
    lastCheckInAt: user.lastCheckInAt?.toISOString() ?? null,
    postsCount,
    tournamentsCount,
    isPremium: isOwner || user.isPremium,
    favoriteGames: user.favoriteGames ?? [],
    inGameName: user.inGameName ?? "",
    highestRank: user.highestRank ?? "",
    primaryRole: user.primaryRole ?? "",
    gender: user.gender ?? null,
    birthDate: user.birthDate ?? null,
    showBirthDate: user.showBirthDate ?? false,
    achievements,
    recentActivity: activityList.slice(0, 10),
  });
}

export async function PATCH(request: Request) {
  const user = await authenticatedUser();
  if (!user) return jsonError("Login diperlukan.", 401);

  const payload: unknown = await request.json();
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  const favoriteGames = Array.isArray(body.favoriteGames)
    ? body.favoriteGames
        .filter((g): g is string => typeof g === "string")
        .map((g) => sanitizePlainText(g.trim()))
        .filter(Boolean)
        .slice(0, 20)
    : undefined;
  const inGameName = typeof body.inGameName === "string" ? sanitizePlainText(body.inGameName.trim().slice(0, 80)) : undefined;
  const highestRank = typeof body.highestRank === "string" ? sanitizePlainText(body.highestRank.trim().slice(0, 50)) : undefined;
  const primaryRole = typeof body.primaryRole === "string" ? sanitizePlainText(body.primaryRole.trim().slice(0, 50)) : undefined;
  const gender = typeof body.gender === "string" ? sanitizePlainText(body.gender.trim().slice(0, 40)) : body.gender === null ? null : undefined;
  const birthDate = typeof body.birthDate === "string" ? sanitizePlainText(body.birthDate.trim().slice(0, 25)) : body.birthDate === null ? null : undefined;
  const showBirthDate = typeof body.showBirthDate === "boolean" ? body.showBirthDate : undefined;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(favoriteGames !== undefined ? { favoriteGames } : {}),
      ...(inGameName !== undefined ? { inGameName } : {}),
      ...(highestRank !== undefined ? { highestRank } : {}),
      ...(primaryRole !== undefined ? { primaryRole } : {}),
      ...(gender !== undefined ? { gender } : {}),
      ...(birthDate !== undefined ? { birthDate } : {}),
      ...(showBirthDate !== undefined ? { showBirthDate } : {}),
    },
    select: {
      id: true,
      discordId: true,
      username: true,
      avatar: true,
      level: true,
      xp: true,
      role: true,
      isPremium: true,
      favoriteGames: true,
      inGameName: true,
      highestRank: true,
      primaryRole: true,
      gender: true,
      birthDate: true,
      showBirthDate: true,
    },
  });

  const isOwner = user.username === ".odyssia" || user.role === "ADMIN" || user.discordId === "706661230835925042";

  return Response.json({
    success: true,
    profile: { ...updated, isPremium: isOwner || updated.isPremium },
    message: "Profil gamer berhasil disimpan!",
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
