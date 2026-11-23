import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const isVercel = process.env["VERCEL"] === "1";

if (isVercel) {
  for (const key of ["AUTH_URL", "NEXTAUTH_URL"] as const) {
    const configuredUrl = process.env[key];
    if (!configuredUrl) continue;

    const hostname = new URL(configuredUrl).hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
      delete process.env[key];
    }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: process.env.AUTH_TRUST_HOST === "true" || isVercel,
  adapter: PrismaAdapter(prisma),
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
      issuer: "https://discord.com",
      authorization: {
        params: {
          scope: "identify email guilds guilds.members.read",
        },
      },
      allowDangerousEmailAccountLinking: true,
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  session: { strategy: "database" },
  events: {
    async signIn({ user, account }) {
      if (!account?.providerAccountId) return;

      const isOwner =
        account.providerAccountId === "706661230835925042" ||
        user.name?.toLowerCase() === ".odyssia" ||
        user.name?.toLowerCase() === "odyssia" ||
        user.email === "farrel.andhikapratama0905@gmail.com";

      if (account.provider === "discord") {
        const guildId = process.env.DISCORD_GUILD_ID;
        const adminRoleIds = [
          process.env.DISCORD_ROLE_EMPEROR_ID,
          process.env.DISCORD_ROLE_PRINCE_ID,
          process.env.DISCORD_ROLE_GRAND_CHANCELLOR_ID,
        ].filter((roleId): roleId is string => Boolean(roleId));
        const moderatorRoleId = process.env.DISCORD_ROLE_LORD_COMMANDER_ID;
        let role: "ADMIN" | "MODERATOR" | "MEMBER" | undefined;

        if (isOwner) {
          role = "ADMIN";
        } else if (guildId && account.access_token && (adminRoleIds.length || moderatorRoleId)) {
          const memberResponse = await fetch(
            `https://discord.com/api/users/@me/guilds/${guildId}/member`,
            { headers: { Authorization: `Bearer ${account.access_token}` } },
          );
          if (memberResponse.ok) {
            const member: unknown = await memberResponse.json();
            const roles =
              typeof member === "object" &&
              member !== null &&
              "roles" in member &&
              Array.isArray(member.roles) &&
              member.roles.every((entry): entry is string => typeof entry === "string")
                ? member.roles
                : null;
            if (!roles) {
              console.error("[auth] Discord guild member response had an invalid role shape");
              role = "MEMBER";
            } else {
              role = roles.some((roleId) => adminRoleIds.includes(roleId))
                ? "ADMIN"
                : moderatorRoleId && roles.includes(moderatorRoleId)
                  ? "MODERATOR"
                  : "MEMBER";
            }
          } else {
            console.error("[auth] Discord guild member role lookup failed", memberResponse.status);
            role = "MEMBER";
          }
        } else {
          console.warn("[auth] Discord role sync is not configured; retaining the stored website role");
        }

        // Fetch existing user to preserve custom username if already set
        const existing = await prisma.user.findUnique({
          where: { id: user.id },
          select: { username: true },
        });

        await prisma.user.update({
          where: { id: user.id },
          data: {
            discordId: account.providerAccountId,
            username: existing?.username ?? user.name ?? "Adventurer",
            avatar: user.image,
            ...(role ? { role } : {}),
            ...(isOwner ? { isPremium: true, badges: ["👑 Emperor", "💎 Noble Patron", "Guild Benefactor"] } : {}),
          },
        });
      } else if (account.provider === "google") {
        // Fetch current user from DB to check existing username and role
        const existing = await prisma.user.findUnique({
          where: { id: user.id },
          select: { username: true, role: true, avatar: true },
        });

        // Generate clean unique username if not already set or default
        let finalUsername = existing?.username;
        if (!finalUsername || finalUsername === "Adventurer" || finalUsername.startsWith("User_")) {
          const rawBase = (user.name || user.email?.split("@")[0] || "adventurer")
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "")
            .slice(0, 16);
          const baseName = rawBase.length >= 3 ? rawBase : "adventurer";

          // Strict protection: do not allow non-owners to claim .odyssia or odyssia
          const safeBase = (baseName === "odyssia" || baseName === ".odyssia") && !isOwner
            ? "adventurer"
            : baseName;

          // Check if taken by another user
          const taken = await prisma.user.findFirst({
            where: {
              username: safeBase,
              id: { not: user.id },
            },
          });

          if (taken) {
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            finalUsername = `${safeBase}_${randomSuffix}`;
          } else {
            finalUsername = safeBase;
          }
        }

        const role = isOwner ? "ADMIN" : (existing?.role ?? "MEMBER");

        await prisma.user.update({
          where: { id: user.id },
          data: {
            username: finalUsername,
            avatar: existing?.avatar || user.image,
            role,
            ...(isOwner ? { isPremium: true, badges: ["👑 Emperor", "💎 Noble Patron", "Guild Benefactor"] } : {}),
          },
        });
      }
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        const isOwner =
          user.username === ".odyssia" ||
          user.username === "odyssia" ||
          user.name === ".odyssia" ||
          user.name === "odyssia" ||
          user.discordId === "706661230835925042" ||
          user.email === "farrel.andhikapratama0905@gmail.com";
        session.user.id = user.id;
        session.user.role = isOwner ? "ADMIN" : user.role;
        session.user.isBanned = user.isBanned;
        session.user.isPremium = isOwner || user.isPremium;
        session.user.discordId = user.discordId;
        session.user.username = user.username;
        session.user.avatar = user.avatar;
        session.user.level = user.level ?? 1;
        session.user.xp = user.xp ?? 0;
      }
      return session;
    },
  },
});
