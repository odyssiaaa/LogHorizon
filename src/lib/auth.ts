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
    }),
  ],
  session: { strategy: "database" },
  events: {
    async signIn({ user, account }) {
      if (account?.provider !== "discord" || !account.providerAccountId) return;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          discordId: account.providerAccountId,
          username: user.name ?? "Adventurer",
          avatar: user.image,
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
