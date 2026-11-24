export type TrialType = "VIP_PREMIUM" | "ALL_FRAMES" | "VERIFIED_SELLER_TRIAL";

export interface TrialUserLike {
  trialType?: string | null;
  trialExpiresAt?: Date | string | null;
  trialGrantedBy?: string | null;
  isPremium?: boolean | null;
  isVerifiedSeller?: boolean | null;
}

export interface ActiveTrialInfo {
  isActive: boolean;
  type: TrialType | null;
  typeName: string;
  expiresAt: Date | null;
  remainingDays: number;
  badge: string | null;
  grantedBy: string | null;
}

export function isTrialActive(user?: TrialUserLike | null): boolean {
  if (!user?.trialType || !user.trialExpiresAt) return false;
  const expires = new Date(user.trialExpiresAt);
  return !isNaN(expires.getTime()) && expires.getTime() > Date.now();
}

export function getActiveTrialInfo(user?: TrialUserLike | null): ActiveTrialInfo {
  if (!user?.trialType || !user.trialExpiresAt) {
    return {
      isActive: false,
      type: null,
      typeName: "",
      expiresAt: null,
      remainingDays: 0,
      badge: null,
      grantedBy: null,
    };
  }

  const expires = new Date(user.trialExpiresAt);
  const now = Date.now();
  if (isNaN(expires.getTime()) || expires.getTime() <= now) {
    return {
      isActive: false,
      type: null,
      typeName: "",
      expiresAt: expires,
      remainingDays: 0,
      badge: null,
      grantedBy: user.trialGrantedBy ?? null,
    };
  }

  const remainingMs = expires.getTime() - now;
  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  const type = user.trialType as TrialType;

  let typeName = "Akses Trial";
  let badge = "⏳ TRIAL";
  if (type === "VIP_PREMIUM") {
    typeName = "VIP Noble Patron Trial";
    badge = "⏳ TRIAL VIP";
  } else if (type === "ALL_FRAMES") {
    typeName = "Royal Armory Frames Trial";
    badge = "⏳ TRIAL FRAMES";
  } else if (type === "VERIFIED_SELLER_TRIAL") {
    typeName = "Verified Seller Trial";
    badge = "⏳ TRIAL SELLER";
  }

  return {
    isActive: true,
    type,
    typeName,
    expiresAt: expires,
    remainingDays,
    badge,
    grantedBy: user.trialGrantedBy ?? null,
  };
}

/**
 * Checks whether user has VIP privileges (either purchased permanent VIP or active VIP_PREMIUM trial).
 */
export function hasVipPrivilege(user?: TrialUserLike | null): boolean {
  if (!user) return false;
  if (user.isPremium) return true;
  const trial = getActiveTrialInfo(user);
  return trial.isActive && trial.type === "VIP_PREMIUM";
}

/**
 * Checks whether user has Verified Seller privileges (either verified or active VERIFIED_SELLER_TRIAL).
 */
export function hasVerifiedSellerPrivilege(user?: TrialUserLike | null): boolean {
  if (!user) return false;
  if (user.isVerifiedSeller) return true;
  const trial = getActiveTrialInfo(user);
  return trial.isActive && trial.type === "VERIFIED_SELLER_TRIAL";
}

/**
 * Checks whether user has all armory frames access (active ALL_FRAMES trial).
 */
export function hasAllFramesTrial(user?: TrialUserLike | null): boolean {
  const trial = getActiveTrialInfo(user);
  return trial.isActive && (trial.type === "ALL_FRAMES" || trial.type === "VIP_PREMIUM");
}
