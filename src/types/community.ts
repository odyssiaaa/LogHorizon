export type RoleType = "MEMBER" | "MODERATOR" | "ADMIN";

export type PostCategoryType = "GENERAL_CHAT" | "PROMOTION" | "FEEDBACK" | "MARKETPLACE";

export type ReactionType = "LIKE" | "DISLIKE" | null;

export type AuthorSummary = {
  id: string;
  username: string | null;
  avatar: string | null;
  role: RoleType;
  isPremium: boolean;
  isVerifiedSeller?: boolean;
  successfulSales?: number;
  equippedAvatarFrame?: string | null;
  equippedCustomTitle?: string | null;
  partyMembership?: {
    role: string;
    party: {
      name: string;
      tag: string;
      emblemColor: string;
    };
  } | null;
};

export type PublicMarketData = {
  game: string;
  type: "WTS" | "WTB";
  price: number;
  status: "AVAILABLE" | "SOLD" | "IN_ESCROW" | "FROZEN";
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
  tipsTotal?: number;
  createdAt: string;
  author: AuthorSummary;
  votes: { value: Exclude<ReactionType, null> }[];
  poll?: { id: string; question: string } | null;
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
  avatar?: string | null;
  level: number;
  xp: number;
  role: RoleType;
  badges: string[];
  isPremium: boolean;
  equippedAvatarFrame?: string | null;
  equippedCustomTitle?: string | null;
  partyTag?: string | null;
};

export type LeaderboardBenefactor = {
  id: string;
  username: string | null;
  badges: string[];
  total: number;
};

export type TopSellerRecord = {
  id: string;
  username: string | null;
  avatar: string | null;
  role: RoleType;
  isPremium: boolean;
  isVerifiedSeller: boolean;
  equippedAvatarFrame?: string | null;
  equippedCustomTitle?: string | null;
  partyMembership?: {
    role: string;
    party: {
      name: string;
      tag: string;
      emblemColor: string;
    };
  } | null;
  completedSalesCount: number;
  activeListingsCount: number;
};
