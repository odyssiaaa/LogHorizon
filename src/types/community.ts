export type RoleType = "MEMBER" | "MODERATOR" | "ADMIN";

export type PostCategoryType = "GENERAL_CHAT" | "PROMOTION" | "FEEDBACK" | "MARKETPLACE";

export type ReactionType = "LIKE" | "DISLIKE" | null;

export type AuthorSummary = {
  id: string;
  username: string | null;
  avatar: string | null;
  role: RoleType;
  isPremium: boolean;
};

export type PublicMarketData = {
  game: string;
  type: "WTS" | "WTB";
  price: number;
  status: "AVAILABLE" | "SOLD" | "IN_ESCROW";
  imageUrl?: string | null;
};

export type ForumPostRecord = {
  id: string;
  title: string;
  content: string;
  category: PostCategoryType;
  isPinned: boolean;
  likes: number;
  dislikes: number;
  createdAt: string;
  author: AuthorSummary;
  votes: { value: Exclude<ReactionType, null> }[];
};

export type MarketplacePostRecord = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
  isPinned: boolean;
  likes: number;
  dislikes: number;
  author: AuthorSummary;
  votes: { value: Exclude<ReactionType, null> }[];
  marketData: PublicMarketData;
  escrowTransactions: { id: string; buyerId: string; sellerId: string; status?: string }[];
};

export type LeaderboardAdventurer = {
  id: string;
  username: string | null;
  level: number;
  xp: number;
  role: RoleType;
  badges: string[];
  isPremium: boolean;
};

export type LeaderboardBenefactor = {
  id: string;
  username: string | null;
  badges: string[];
  total: number;
};
