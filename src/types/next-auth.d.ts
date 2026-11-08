import "next-auth";

declare module "next-auth" {
  interface User {
    role: "MEMBER" | "MODERATOR" | "ADMIN";
    isBanned: boolean;
    isPremium: boolean;
    discordId: string | null;
    username: string | null;
    avatar: string | null;
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
    } & import("next-auth").DefaultSession["user"];
  }
}
