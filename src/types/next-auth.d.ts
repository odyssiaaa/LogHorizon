import "next-auth";

declare module "next-auth" {
  interface User {
    role: "MEMBER" | "MODERATOR" | "ADMIN";
    isBanned: boolean;
    isPremium: boolean;
    discordId: string | null;
    username: string | null;
    avatar: string | null;
    level?: number;
    xp?: number;
  }

  interface Session {
    user: {
      id: string;
      role: "MEMBER" | "MODERATOR" | "ADMIN";
      isBanned: boolean;
      isPremium: boolean;
      discordId: string | null;
      username: string | null;
      avatar: string | null;
      level?: number;
      xp?: number;
    } & import("next-auth").DefaultSession["user"];
  }
}
