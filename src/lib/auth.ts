import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
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
    }),
  ],
  session: { strategy: "database" },
  events: {
    async signIn({ user, account }) {
      if (account?.provider !== "discord" || !account.providerAccountId) return;

      const guildId = process.env.DISCORD_GUILD_ID;
      const adminRoleIds = [
        process.env.DISCORD_ROLE_EMPEROR_ID,
        process.env.DISCORD_ROLE_PRINCE_ID,
        process.env.DISCORD_ROLE_GRAND_CHANCELLOR_ID,
      ].filter((roleId): roleId is string => Boolean(roleId));
      const moderatorRoleId = process.env.DISCORD_ROLE_LORD_COMMANDER_ID;
      let role: "ADMIN" | "MODERATOR" | "MEMBER" | undefined;

      if (guildId && account.access_token && (adminRoleIds.length || moderatorRoleId)) {
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

      await prisma.user.update({
        where: { id: user.id },
        data: {
          discordId: account.providerAccountId,
          username: user.name ?? "Adventurer",
          avatar: user.image,
          ...(role ? { role } : {}),
        },
      });
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
        session.user.isBanned = user.isBanned;
        session.user.isPremium = user.isPremium;
        session.user.discordId = user.discordId;
        session.user.username = user.username;
        session.user.avatar = user.avatar;
      }
      return session;
    },
  },
});
