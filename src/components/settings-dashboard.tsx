"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import {
  AlertTriangle,
  Award,
  BadgeCheck,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Crown,
  ExternalLink,
  Flame,
  Gamepad2,
  Globe,
  Link2,
  Lock,
  MessageSquare,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  SunMoon,
  Swords,
  Trophy,
  Type,
  Unlink,
  User,
  Users,
  Zap,
} from "lucide-react";
import { EmperorSovereignControl } from "@/components/emperor-sovereign-control";
import { RedeemCodeBox } from "@/components/redeem-code-box";
import { UserVoucherWallet } from "@/components/user-voucher-wallet";
import { UserCoinWallet } from "@/components/user-coin-wallet";
import { useSearchParams } from "next/navigation";
import { readApiResponse } from "@/lib/api-response";
import { DiscordAvatar } from "@/components/discord-avatar";
import { DailyCheckInWidget } from "@/components/daily-check-in-widget";
import { DailyQuestsWidget } from "@/components/daily-quests-widget";
import { RoyalChestWidget } from "@/components/royal-chest-widget";
import { ReferralInviteCard } from "@/components/referral-invite-card";
import { GuildArmoryShop } from "@/components/guild-armory-shop";
import { RoyalGachaSection } from "@/components/royal-gacha-section";
import { getCustomTitleBadge } from "@/lib/armory-catalog";
import { VerifiedSellerModal } from "@/components/verified-seller-modal";
import { isGuildOwner } from "@/lib/caste-hierarchy";
import { getEuropeanNobilityRank } from "@/lib/nobility-ranks";
import { calculateLevelFromXp, getLevelProgress } from "@/lib/level-system";
import { useLocale, SUPPORTED_LANGUAGES, SUPPORTED_CURRENCIES } from "@/context/locale-context";
import { FlagIcon } from "@/components/locale-switcher";
import { openLoginModal } from "@/components/login-modal";
import { useDiscordPresence } from "@/hooks/use-discord-presence";
import { DraggableScrollRow } from "@/components/draggable-scroll-row";
import { QuestBoard } from "@/components/quest-board";

type Achievement = {
  id: string;
  title: string;
  desc: string;
  unlocked: boolean;
};

type ActivityItem = {
  id: string;
  type: "POST" | "TOURNAMENT" | "ESCROW";
  title: string;
  detail: string;
  createdAt: string;
  href: string;
};

type Profile = {
  id: string;
  discordId: string | null;
  username: string | null;
  avatar: string | null;
  level: number;
  xp: number;
  horizonCoins?: number;
  role: string;
  badges?: string[];
  checkInStreak?: number;
  postsCount?: number;
  tournamentsCount?: number;
  isPremium: boolean;
  isVerifiedSeller?: boolean;
  sellerVerificationStatus?: string;
  equippedAvatarFrame?: string | null;
  equippedCustomTitle?: string | null;
  partyMembership?: {
    id: string;
    role: string;
    inGameNickname?: string | null;
    inGameId?: string | null;
    party: {
      id: string;
      name: string;
      tag: string;
      emblemColor: string;
      primaryGame: string;
      membersCount?: number;
    };
  } | null;
  favoriteGames?: string[];
  gender?: string | null;
  birthDate?: string | null;
  showBirthDate?: boolean;
  bio?: string | null;
  allowDirectMessages?: boolean;
  inGameName?: string;
  highestRank?: string;
  primaryRole?: string;
  achievements?: Achievement[];
  recentActivity?: ActivityItem[];
};

type Listing = {
  id: string;
  title: string;
  category: string;
  marketData: unknown;
  createdAt: string;
  reports: { pending: number; resolved: number };
};

type PreferenceState = { dark: boolean; largeFont: boolean; animations: boolean; notifications: boolean };
const initialPreferences: PreferenceState = { dark: true, largeFont: false, animations: true, notifications: false };

const COMMON_GAMES = [
  "Valorant",
  "Mobile Legends",
  "Genshin Impact",
  "Counter-Strike 2",
  "Roblox",
  "Dota 2",
  "Apex Legends",
  "PUBG Mobile",
  "Honkai: Star Rail",
  "Minecraft",
];

function listingStatus(value: unknown) {
  if (!value || typeof value !== "object" || !("status" in value)) return null;
  const status = value.status;
  return status === "AVAILABLE" || status === "SOLD" || status === "IN_ESCROW" ? status : null;
}

function getCasteBadge(role?: string, username?: string, discordId?: string, isPremium?: boolean) {
  if (username === ".odyssia" || username === "odyssia" || discordId === "706661230835925042") {
    return { title: "👑 Emperor (Owner)", color: "border-amber-500/40 bg-amber-500/10 text-amber-400" };
  }
  if (role === "ADMIN") {
    return { title: "✨ Prince / Princess (Admin)", color: "border-purple-500/40 bg-purple-500/10 text-purple-300" };
  }
  if (role === "MODERATOR") {
    return { title: "⚔️ Lord Commander (Mod)", color: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" };
  }
  if (isPremium) {
    return { title: "💎 Elite Adventurer (VIP)", color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" };
  }
  return { title: "🛡️ Adventurer", color: "border-zinc-700 bg-zinc-800/60 text-zinc-300" };
}

export function SettingsDashboard() {
  const { data: session, status, update } = useSession();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab") ?? null;
  const { locale, setLocale, currency, setCurrency, t } = useLocale();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingStatus, setSavingStatus] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Sub-tabs: "profile" | "badges" | "armory" | "gacha" | "quests" | "settings" | "emperor"
  const [activeTab, setActiveTab] = useState<"profile" | "badges" | "armory" | "gacha" | "quests" | "settings" | "emperor">("profile");

  // Linked Accounts State (Multi-Provider Login)
  const [linkedAccounts, setLinkedAccounts] = useState<{
    discord: { connected: boolean; id: string | null; username: string | null };
    google: { connected: boolean; emailMasked: string | null };
    totalConnected: number;
  }>({
    discord: { connected: false, id: null, username: null },
    google: { connected: false, emailMasked: null },
    totalConnected: 0,
  });

  const activeDiscordId =
    profile?.discordId ||
    linkedAccounts?.discord?.id ||
    (session?.user as { discordId?: string })?.discordId ||
    null;
  const { presence: discordPresence } = useDiscordPresence(activeDiscordId);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);

  const fetchLinkedAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/user/linked-accounts");
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (data?.success && data?.accounts) {
        setLinkedAccounts({
          discord: data.accounts.discord || { connected: false, id: null, username: null },
          google: data.accounts.google || { connected: false, emailMasked: null },
          totalConnected: Number(data.totalConnected) || 0,
        });
      }
    } catch {
      // Background silent fallback
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      void fetchLinkedAccounts();
    }
  }, [status, fetchLinkedAccounts]);

  async function handleUnlink(provider: "discord" | "google") {
    const label = provider === "discord" ? "Discord" : "Google";
    if (!confirm(`Apakah Anda yakin ingin memutuskan tautan akun ${label}?`)) return;

    setUnlinkingProvider(provider);
    try {
      const res = await fetch("/api/user/linked-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `Gagal memutuskan tautan ${label}.`);
      } else {
        setMessage(json.message || `Tautan akun ${label} berhasil diputuskan.`);
        await fetchLinkedAccounts();
        await fetchProfileData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Gagal memutuskan tautan ${label}.`);
    } finally {
      setUnlinkingProvider(null);
    }
  }

  useEffect(() => {
    if (tabParam === "armory") setActiveTab("armory");
    else if (tabParam === "gacha") setActiveTab("gacha");
    else if (tabParam === "quests") setActiveTab("quests");
    else if (tabParam === "badges") setActiveTab("badges");
    else if (tabParam === "settings") setActiveTab("settings");
    else if (tabParam === "emperor") setActiveTab("emperor");
    else if (tabParam === "profile") setActiveTab("profile");
  }, [tabParam]);

  // Gamer Profile Form
  const [favoriteGames, setFavoriteGames] = useState<string[]>([]);
  const [customGameInput, setCustomGameInput] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [showBirthDate, setShowBirthDate] = useState(false);
  const [bio, setBio] = useState("");
  const [allowDirectMessages, setAllowDirectMessages] = useState(true);
  const [savingGamer, setSavingGamer] = useState(false);
  const [showVerifiedSellerModal, setShowVerifiedSellerModal] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("loghorizon-preferences");
        const savedTheme = localStorage.getItem("loghorizon-theme");
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            const value = parsed as Record<string, unknown>;
            setPreferences({
              dark: savedTheme === "light" ? false : savedTheme === "dark" ? true : typeof value.dark === "boolean" ? value.dark : true,
              largeFont: typeof value.largeFont === "boolean" ? value.largeFont : false,
              animations: typeof value.animations === "boolean" ? value.animations : true,
              notifications: typeof value.notifications === "boolean" ? value.notifications : false,
            });
          }
        } else if (savedTheme === "light" || savedTheme === "dark") {
          setPreferences((current) => ({ ...current, dark: savedTheme === "dark" }));
        }
      } catch (reason) {
        console.error("[settings] Failed to read browser preferences", reason);
        setError("Preferensi tersimpan tidak dapat dibaca di browser ini.");
      } finally {
        setPreferencesReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    document.documentElement.classList.toggle("dark", preferences.dark);
    document.documentElement.style.colorScheme = preferences.dark ? "dark" : "light";
    document.documentElement.classList.toggle("large-font", preferences.largeFont);
    document.documentElement.classList.toggle("reduce-motion", !preferences.animations);
    try {
      localStorage.setItem("loghorizon-preferences", JSON.stringify(preferences));
      localStorage.setItem("loghorizon-theme", preferences.dark ? "dark" : "light");
      window.dispatchEvent(new CustomEvent("loghorizon-preferences", { detail: preferences }));
    } catch (reason) {
      console.error("[settings] Failed to save browser preferences", reason);
    }
  }, [preferences, preferencesReady]);

  const fetchProfileData = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/profile");
      const nextProfile = await readApiResponse<Profile>(res, "Profil gagal dimuat.");
      setProfile(nextProfile);
      setFavoriteGames(nextProfile.favoriteGames ?? []);
      setGender(nextProfile.gender ?? "");
      setBirthDate(nextProfile.birthDate ?? "");
      setShowBirthDate(Boolean(nextProfile.showBirthDate));
    } catch (err) {
      console.error("[settings] Error reloading profile:", err);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    Promise.all([
      fetch("/api/settings/profile").then((response) => readApiResponse<Profile>(response, "Profil gagal dimuat.")),
      fetch("/api/settings/listings").then((response) => readApiResponse<Listing[]>(response, "Riwayat lapak gagal dimuat.")),
    ])
      .then(([nextProfile, nextListings]) => {
        if (!active) return;
        setProfile(nextProfile);
        setFavoriteGames(nextProfile.favoriteGames ?? []);
        setGender(nextProfile.gender ?? "");
        setBirthDate(nextProfile.birthDate ?? "");
        setShowBirthDate(Boolean(nextProfile.showBirthDate));
        setBio(nextProfile.bio ?? "");
        setAllowDirectMessages(nextProfile.allowDirectMessages ?? true);
        setListings(nextListings);
        setError("");
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Pengaturan gagal dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status]);

  function updatePreference<K extends keyof PreferenceState>(key: K, value: PreferenceState[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  async function syncProfile() {
    setSyncing(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/settings/profile", { method: "POST" });
      const result = await readApiResponse<{ profile: Profile; notice: string }>(response, "Sinkronisasi Discord gagal.");
      setProfile((prev) => (prev ? { ...prev, ...result.profile } : result.profile));
      setMessage(result.notice);
      await update();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sinkronisasi Discord gagal.");
    } finally {
      setSyncing(false);
    }
  }

  async function saveGamerProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingGamer(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          favoriteGames,
          gender: gender ? gender : null,
          birthDate: birthDate ? birthDate : null,
          showBirthDate,
          bio: bio.trim(),
          allowDirectMessages,
        }),
      });
      const result = await readApiResponse<{ profile: Profile; message: string }>(response, "Gagal menyimpan profil gamer.");
      setProfile((current) => (current ? { ...current, ...result.profile } : result.profile));
      setMessage(result.message || "Profil gamer berhasil disimpan!");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menyimpan profil gamer.");
    } finally {
      setSavingGamer(false);
    }
  }

  function toggleGame(gameName: string) {
    setFavoriteGames((current) =>
      current.includes(gameName) ? current.filter((g) => g !== gameName) : [...current, gameName]
    );
  }

  function addCustomGame() {
    const trimmed = customGameInput.trim();
    if (!trimmed) return;
    if (favoriteGames.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
      setCustomGameInput("");
      return;
    }
    if (favoriteGames.length >= 20) return;
    setFavoriteGames((current) => [...current, trimmed]);
    setCustomGameInput("");
  }

  function removeGame(gameName: string) {
    setFavoriteGames((current) => current.filter((g) => g !== gameName));
  }

  async function changeListingStatus(listing: Listing, nextStatus: "AVAILABLE" | "SOLD") {
    setSavingStatus(listing.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/posts/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await readApiResponse<unknown>(response, "Status lapak gagal diperbarui.");
      setListings((current) =>
        current.map((entry) =>
          entry.id === listing.id && entry.marketData && typeof entry.marketData === "object"
            ? { ...entry, marketData: { ...entry.marketData, status: nextStatus } }
            : entry
        )
      );
      setMessage("Status lapak berhasil diperbarui.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Status lapak gagal diperbarui.");
    } finally {
      setSavingStatus("");
    }
  }

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <main className="w-full max-w-[1200px] mx-auto px-4 py-16 flex items-center justify-center">
        <div className="flex items-center gap-3 text-purple-400 text-sm">
          <RefreshCw size={18} className="animate-spin" />
          <span>Memuat data profil &amp; pengaturan…</span>
        </div>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="w-full max-w-[600px] mx-auto px-4 py-20 text-center">
        <div className="p-8 rounded-2xl border border-slate-200 dark:border-[#2A1B42] bg-white/80 dark:bg-[#120B1E]/80 backdrop-blur-md shadow-xl">
          <Shield size={48} className="mx-auto text-[#7C3AED] dark:text-[#9D4EDD] mb-4" />
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Profil &amp; Pengaturan Akun</h1>
          <p className="text-sm text-slate-600 dark:text-gray-400 mb-6 leading-relaxed">
            Masuk dengan akun Discord atau Google untuk mengelola profil, lencana, dan preferensi antarmuka LogHorizon.
          </p>
          <button
            onClick={() => openLoginModal("/profile")}
            className="w-full py-3.5 px-6 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-bold text-white text-sm transition-all shadow-lg shadow-[#7C3AED]/25 cursor-pointer"
          >
            Masuk ke LogHorizon
          </button>
        </div>
      </main>
    );
  }

  const caste = getCasteBadge(
    profile?.role ?? session.user.role,
    profile?.username ?? session.user.username ?? undefined,
    profile?.discordId ?? undefined,
    profile?.isPremium ?? session.user.isPremium
  );

  const currentLevel = profile?.level ?? 1;
  const currentXp = profile?.xp ?? 0;
  const xpProgress = getLevelProgress(currentLevel, currentXp);
  const xpInLevel = xpProgress.currentLevelXp;
  const xpPercent = xpProgress.progressPercent;
  const nobility = getEuropeanNobilityRank(xpProgress.level);
  const isOwner = isGuildOwner(session?.user || profile);

  return (
    <main className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 min-w-0 overflow-x-hidden">
      {/* Page Title & Sub-tabs Header */}
      <div className="mb-6">
        <p className="text-xs font-bold text-[#9D4EDD] uppercase tracking-wider mb-1">LOGHORIZON / CITADEL</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white break-words">
          Profil &amp; Pengaturan
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Pusat kendali akun, riwayat kontribusi, dan preferensi petualang.
        </p>
      </div>

      {/* 4 Sub-Tabs Navigation (Draggable & Wheel Horizontal Scroll) */}
      <DraggableScrollRow className="border-b border-[#2A1B42] pb-2 mb-6 w-full">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
              activeTab === "profile"
                ? "bg-[#7C3AED] text-white shadow-md shadow-[#7C3AED]/25"
                : "border border-[#2A1B42] bg-[#120B1E]/60 text-gray-400 hover:text-white hover:border-[#7C3AED]/50"
            }`}
          >
            <User size={16} />
            <span>Ringkasan Profil</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("badges")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
              activeTab === "badges"
                ? "bg-[#7C3AED] text-white shadow-md shadow-[#7C3AED]/25"
                : "border border-[#2A1B42] bg-[#120B1E]/60 text-gray-400 hover:text-white hover:border-[#7C3AED]/50"
            }`}
          >
            <Trophy size={16} />
            <span>Lencana &amp; Riwayat Aktivitas</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("armory")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
              activeTab === "armory"
                ? "bg-[#7C3AED] text-white shadow-md shadow-[#7C3AED]/25"
                : "border border-[#2A1B42] bg-[#120B1E]/60 text-gray-400 hover:text-white hover:border-[#7C3AED]/50"
            }`}
          >
            <ShoppingBag size={16} />
            <span>Guild Armory</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("gacha")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
              activeTab === "gacha"
                ? "bg-gradient-to-r from-amber-500 to-purple-600 text-white shadow-md shadow-amber-500/25"
                : "border border-[#2A1B42] bg-[#120B1E]/60 text-gray-400 hover:text-white hover:border-amber-500/50"
            }`}
          >
            <Crown size={16} className="text-amber-400" />
            <span>Royal Gacha</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("quests")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
              activeTab === "quests"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/25"
                : "border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:text-white hover:border-amber-500/70"
            }`}
          >
            <span>🪙</span>
            <span>Misi &amp; Kontrak (HC)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
              activeTab === "settings"
                ? "bg-[#7C3AED] text-white shadow-md shadow-[#7C3AED]/25"
                : "border border-[#2A1B42] bg-[#120B1E]/60 text-gray-400 hover:text-white hover:border-[#7C3AED]/50"
            }`}
          >
            <Shield size={16} />
            <span>Pengaturan Akun</span>
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => setActiveTab("emperor")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                activeTab === "emperor"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black border-amber-400 shadow-md shadow-amber-500/25"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:text-white hover:bg-amber-500/20"
              }`}
            >
              <Crown size={16} className="text-amber-400" />
              <span>👑 Emperor Control</span>
            </button>
          )}
        </div>
      </DraggableScrollRow>

      {/* Global Alerts */}
      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs sm:text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs sm:text-sm">
          {message}
        </div>
      )}

      {/* TAB 1: RINGKASAN PROFIL */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Hero Identitas Rapi */}
          <section className="p-5 sm:p-6 rounded-2xl border border-[#2A1B42] bg-[#120B1E]/80 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left min-w-0">
              <div className="relative shrink-0">
                <DiscordAvatar
                  src={profile?.avatar ?? session.user.avatar}
                  username={profile?.username ?? session.user.username}
                  size={84}
                  className="rounded-2xl border-2 border-[#7C3AED]/50 shadow-lg shadow-[#7C3AED]/20"
                  frameId={profile?.equippedAvatarFrame}
                />
                <span
                  className={`absolute -top-1 -right-1 size-4 rounded-full border-2 border-[#120B1E] ${
                    discordPresence?.status === "online"
                      ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                      : discordPresence?.status === "idle"
                      ? "bg-amber-400 shadow-sm shadow-amber-400/50"
                      : discordPresence?.status === "dnd"
                      ? "bg-rose-500 shadow-sm shadow-rose-500/50"
                      : "bg-emerald-500 shadow-sm"
                  }`}
                  title={discordPresence?.status ? `Discord: ${discordPresence.statusLabel}` : "Online di Web"}
                />
                <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-[#7C3AED] text-white text-[10px] font-black uppercase">
                  Lv.{currentLevel}
                </span>
              </div>

              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black text-white truncate">
                        {profile?.username ?? session.user.name ?? "Petualang"}
                      </h2>
                      {profile?.partyMembership?.party?.tag && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold">
                          [{profile.partyMembership.party.tag}]
                        </span>
                      )}
                      {profile?.equippedCustomTitle && getCustomTitleBadge(profile.equippedCustomTitle) && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-mono font-bold">
                          {getCustomTitleBadge(profile.equippedCustomTitle)}
                        </span>
                      )}
                      <span
                        className="px-2.5 py-0.5 rounded-md text-xs font-bold border shadow-xs"
                        style={{
                          borderColor: `${nobility.color}60`,
                          backgroundColor: `${nobility.color}15`,
                          color: nobility.color,
                        }}
                        title={`Gelar Kebangsawanan Level ${currentLevel}: ${nobility.description}`}
                      >
                        {nobility.icon} {nobility.name}
                      </span>
                    </div>

                    {/* Discord Activity Pill if playing/listening */}
                    {discordPresence?.activity && (
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5865F2]/15 border border-[#5865F2]/30 text-xs font-mono font-bold text-[#A78BFA] shadow-xs">
                        <span className="size-2 rounded-full bg-[#5865F2] animate-pulse" />
                        <span>{discordPresence.activity.display}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <p className="text-xs text-gray-400 font-mono">
                        Discord ID: {profile?.discordId ?? "Tidak terhubung"}
                      </p>
                      {discordPresence?.status && discordPresence.status !== "offline" && (
                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                            discordPresence.status === "online"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : discordPresence.status === "idle"
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                              : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {discordPresence.status === "online" && "🟢 Discord: Online"}
                          {discordPresence.status === "idle" && "🌙 Discord: Idle"}
                          {discordPresence.status === "dnd" && "⛔ Discord: DND"}
                        </span>
                      )}
                      {!profile?.discordId && (
                        <button
                          type="button"
                          onClick={() => void signIn("discord", { callbackUrl: "/profile" })}
                          className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#5865F2] hover:bg-[#4752C4] text-white transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                          title="Tautkan akun Discord untuk sinkronisasi kasta dan role"
                        >
                          <span className="text-xs">◉</span>
                          <span>{t("link_discord_account", "Tautkan Akun Discord")}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 shrink-0">
                    {profile?.isVerifiedSeller || isGuildOwner(profile) ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/15 text-amber-400 border border-amber-500/40 shadow-sm"
                        title="Penjual Terpercaya Resmi LogHorizon (Tervalidasi Staf)"
                      >
                        <ShieldCheck size={14} className="text-amber-500" />
                        <span>✅ VERIFIED SELLER</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowVerifiedSellerModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 transition-colors shadow-sm cursor-pointer"
                        title="Ajukan verifikasi penjual terpercaya melalui wawancara staf"
                      >
                        <ShieldCheck size={14} className="text-amber-500" />
                        <span>
                          {profile?.sellerVerificationStatus === "REQUESTED"
                            ? "⏳ Menunggu Wawancara"
                            : "🛡️ Ajukan Verified Seller"}
                        </span>
                      </button>
                    )}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${caste.color}`}
                    >
                      {caste.title}
                    </span>
                  </div>
                </div>

                {/* Progress Bar XP & Level Proposional */}
                <div className="mt-4 p-3.5 rounded-xl border border-[#2A1B42] bg-[#0A0612]/70">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-gray-300 flex items-center gap-1.5">
                      <Zap size={14} className="text-[#9D4EDD]" /> Progres Pengalaman (XP)
                    </span>
                    <span className="font-mono text-purple-300 font-bold">
                      {xpProgress.currentLevelXp.toLocaleString("id-ID")} / {xpProgress.nextLevelXp.toLocaleString("id-ID")} XP
                    </span>
                  </div>
                  <div className="w-full h-3 bg-[#1A102E] rounded-full overflow-hidden p-0.5 border border-purple-900/30">
                    <div
                      className="h-full bg-gradient-to-r from-[#7C3AED] via-[#9D4EDD] to-[#C77DFF] rounded-full transition-all duration-500 shadow-sm shadow-purple-500/50"
                      style={{ width: `${xpProgress.progressPercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Raih {Math.max(0, xpProgress.nextLevelXp - xpProgress.currentLevelXp).toLocaleString("id-ID")} XP lagi dari forum, turnamen, atau absen harian untuk mencapai Level{" "}
                    {xpProgress.level + 1}.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Grid Statistik 2x2 di HP (grid-cols-2 sm:grid-cols-4 gap-3) */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-[#2A1B42] bg-[#120B1E]/60 flex flex-col justify-between min-w-0">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block truncate">
                Level &amp; XP
              </span>
              <div className="mt-2">
                <span className="text-xl sm:text-2xl font-black text-white block">Lv. {currentLevel}</span>
                <span className="text-xs text-purple-400 font-mono font-medium truncate block">{currentXp} XP</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#2A1B42] bg-[#120B1E]/60 flex flex-col justify-between min-w-0">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block truncate">
                Streak Absen
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-amber-400 block">
                  {profile?.checkInStreak ?? 0}
                </span>
                <span className="text-xs text-gray-400">Hari</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#2A1B42] bg-[#120B1E]/60 flex flex-col justify-between min-w-0">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block truncate">
                Thread Forum
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-cyan-400 block">
                  {profile?.postsCount ?? 0}
                </span>
                <span className="text-xs text-gray-400">Dibuat</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#2A1B42] bg-[#120B1E]/60 flex flex-col justify-between min-w-0">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block truncate">
                Turnamen Diikuti
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-emerald-400 block">
                  {profile?.tournamentsCount ?? 0}
                </span>
                <span className="text-xs text-gray-400">Turnamen</span>
              </div>
            </div>
          </section>

          {/* Dompet Horizon Coin (🪙 HC) & Riwayat 10 Mutasi */}
          <UserCoinWallet
            initialBalance={profile?.horizonCoins ?? 0}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />

          {/* Tombol Klaim Absen Harian XP */}
          <section className="p-5 sm:p-6 rounded-2xl border border-[#2A1B42] bg-[#120B1E]/80 backdrop-blur-md space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Flame size={20} className="text-amber-400" />
                  Klaim Absen Harian XP
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Check-in setiap hari untuk mempertahankan streak dan meningkatkan Level petualang.
                </p>
              </div>
            </div>
            <DailyCheckInWidget />
            {/* Peti Harta Kerajaan Harian (Terbuka setelah absen) */}
            <RoyalChestWidget />
          </section>

          {/* Misi Petualang Harian */}
          <DailyQuestsWidget />

          {/* Kartu Undang Teman & Dapatkan +200 XP */}
          <ReferralInviteCard />

          {/* Kartu Status Party Resmi */}
          <section className="p-5 sm:p-6 rounded-2xl border border-purple-500/30 bg-[#120B1E]/80 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {profile?.partyMembership?.party ? (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md shrink-0"
                    style={{ backgroundColor: profile.partyMembership.party.emblemColor }}
                  >
                    {profile.partyMembership.party.tag}
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Users size={22} />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-white">
                      {profile?.partyMembership?.party
                        ? `[${profile.partyMembership.party.tag}] ${profile.partyMembership.party.name}`
                        : "Party Skuad Guild"}
                    </h3>
                    {profile?.partyMembership && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold border border-purple-500/30">
                        {profile.partyMembership.role}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {profile?.partyMembership?.party
                      ? `Game: ${profile.partyMembership.party.primaryGame} • ${profile.partyMembership.party.membersCount || 0} Anggota`
                      : "Kamu belum bergabung dengan party resmi guild. Bergabunglah untuk mabar, chat grup, dan turnamen tim!"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/events?view=party"
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/25"
                >
                  <Users size={14} />
                  <span>{profile?.partyMembership ? "Lihat Party Saya" : "Cari / Bentuk Party"}</span>
                </Link>
              </div>
            </div>
          </section>

          {/* Gamer Info Ringkas */}
          <section className="p-5 sm:p-6 rounded-2xl border border-[#2A1B42] bg-[#120B1E]/80 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Gamepad2 size={16} className="text-[#9D4EDD]" />
                Game yang Aktif Dimainkan
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className="text-xs text-purple-400 hover:text-purple-300 font-bold"
              >
                Ubah di Pengaturan &rarr;
              </button>
            </div>
            {favoriteGames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {favoriteGames.map((game) => (
                  <span
                    key={game}
                    className="px-3 py-1.5 rounded-lg border border-[#7C3AED]/40 bg-[#7C3AED]/10 text-purple-300 text-xs font-semibold"
                  >
                    {game}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">
                Belum ada game yang dipilih. Tambahkan game favoritmu di tab Pengaturan Akun.
              </p>
            )}
          </section>

          {/* Kotak Tukar Kode Redeem & Voucher Sponsor */}
          <RedeemCodeBox onSuccess={() => void fetchProfileData()} />

          {/* Dompet Voucher Sponsor Saya */}
          <UserVoucherWallet />
        </div>
      )}

      {/* TAB 2: LENCANA & RIWAYAT AKTIVITAS */}
      {activeTab === "badges" && (
        <div className="space-y-6">
          {/* Lencana & Gelar Milik Petualang */}
          <section className="p-5 sm:p-6 rounded-2xl border border-[#2A1B42] bg-[#120B1E]/80 backdrop-blur-md">
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <Trophy size={20} className="text-amber-400" />
                Pencapaian &amp; Lencana Petualang
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Lencana otomatis terbuka saat kamu mencapai tonggak prestasi di LogHorizon.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {profile?.achievements?.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-4 rounded-xl border flex items-start gap-3.5 transition-colors min-w-0 ${
                    ach.unlocked
                      ? "bg-purple-950/20 border-purple-500/30 text-white"
                      : "bg-[#0A0612]/60 border-[#2A1B42] opacity-60 text-gray-400"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      ach.unlocked ? "bg-[#7C3AED]/20 text-[#C77DFF]" : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {ach.unlocked ? <Award size={20} /> : <span className="text-sm">🔒</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-xs sm:text-sm font-bold block truncate">{ach.title}</strong>
                      {ach.unlocked ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-emerald-500/20 text-emerald-400 shrink-0">
                          TERBUKA
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-zinc-800 text-zinc-400 shrink-0">
                          TERKUNCI
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 break-words">{ach.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Riwayat Aktivitas Terkini (Forum, Turnamen, Rekber) */}
          <section className="p-5 sm:p-6 rounded-2xl border border-[#2A1B42] bg-[#120B1E]/80 backdrop-blur-md">
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <Calendar size={20} className="text-[#9D4EDD]" />
                Riwayat Aktivitas Terkini
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Catatan partisipasi terbarumu di forum diskusi, turnamen komunitas, dan transaksi lapak.
              </p>
            </div>

            {Array.isArray(profile?.recentActivity) && profile.recentActivity.length > 0 ? (
              <div className="divide-y divide-[#2A1B42] -mx-2 sm:mx-0">
                {profile.recentActivity.map((act) => {
                  const actDate = act?.createdAt ? new Date(act.createdAt) : null;
                  const dateDisplay = actDate && !isNaN(actDate.getTime()) ? actDate.toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }) : "-";

                  return (
                    <div key={act.id} className="py-3 px-2 sm:px-3 flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-black uppercase shrink-0 ${
                              act.type === "TOURNAMENT"
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : act.type === "ESCROW"
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                            }`}
                          >
                            {act.type}
                          </span>
                          <Link
                            href={act.href}
                            className="text-xs sm:text-sm font-bold text-white hover:text-purple-300 transition-colors break-words min-w-0"
                          >
                            {act.title}
                          </Link>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 break-words">{act.detail}</p>
                      </div>
                      <span className="text-[11px] text-gray-500 font-mono whitespace-nowrap shrink-0 mt-0.5">
                        {dateDisplay}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-gray-500">
                Belum ada catatan aktivitas. Ikuti turnamen, buka thread di forum, atau bertransaksi via Rekber!
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 3: GUILD ARMORY SHOP */}
      {activeTab === "armory" && (
        <GuildArmoryShop onEquipChange={() => void fetchProfileData()} />
      )}

      {/* TAB 4: ROYAL GACHA SUMMON */}
      {activeTab === "gacha" && (
        <RoyalGachaSection onUpdate={() => void fetchProfileData()} />
      )}

      {/* TAB 4.5: PAPAN MISI & KONTRAK PETUALANG (HORIZON COINS) */}
      {activeTab === "quests" && (
        <QuestBoard />
      )}

      {/* TAB 5: PENGATURAN AKUN */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* 1. KARTU TAUTAN AKUN & KEAMANAN LOGIN (DISCORD & GOOGLE MULTI-PROVIDER) */}
          <section className="p-5 sm:p-6 rounded-2xl border border-[#2A1B42] bg-[#120B1E]/80 backdrop-blur-md space-y-5">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Link2 size={18} className="text-[#9D4EDD]" />
                Tautan Akun &amp; Keamanan Login
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Hubungkan Discord dan Google ke satu akun yang sama untuk login fleksibel, aman, dan tanpa khawatir kehilangan akses.
              </p>
            </div>

            {/* Status Banners */}
            {searchParams?.get("bind") === "success" && (
              <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span className="font-semibold">Berhasil! Akun login baru telah tertaut ke profil LogHorizon Anda.</span>
                </div>
                <Link href="/profile?tab=settings" className="text-[11px] underline text-emerald-400 hover:text-emerald-200">
                  Tutup
                </Link>
              </div>
            )}

            {Boolean(searchParams?.get("error")) && (
              <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                  <span className="font-semibold">
                    {searchParams?.get("error") === "AccountAlreadyLinked"
                      ? "Akun Discord/Google ini sudah terhubung ke pengguna lain. Satu akun login hanya dapat dipakai oleh satu profil."
                      : searchParams?.get("error") === "UnauthorizedBinding"
                        ? "Tindakan tautan akun tidak diizinkan demi integritas dan keamanan server."
                        : "Terjadi kendala saat menautkan akun."}
                  </span>
                </div>
                <Link href="/profile?tab=settings" className="text-[11px] underline text-rose-400 hover:text-rose-200">
                  Tutup
                </Link>
              </div>
            )}

            {/* Provider Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* KARTU 1: DISCORD */}
              <div className="p-4 rounded-xl border border-[#2A1B42] bg-[#0A0612]/60 flex flex-col justify-between gap-3.5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2]">
                        <svg className="size-4 fill-current" viewBox="0 0 24 24">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Discord</span>
                        <span className="text-[11px] text-gray-400">Sinkronisasi role guild &amp; kasta</span>
                      </div>
                    </div>
                    {linkedAccounts?.discord?.connected ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        <span>Terhubung</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/15 text-gray-400 border border-gray-500/30">
                        Belum Tertaut
                      </span>
                    )}
                  </div>

                  {linkedAccounts?.discord?.connected ? (
                    <div className="text-[11px] font-mono text-gray-300 bg-[#120B1E] p-2.5 rounded-lg border border-[#2A1B42]">
                      <p className="text-gray-400 text-[10px]">ID DISCORD:</p>
                      <p className="truncate text-white font-bold">{linkedAccounts?.discord?.id || profile?.discordId || "Terkoneksi"}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Hubungkan akun Discord untuk mendapatkan sinkronisasi role server LogHorizon, lencana kasta, dan gelar kehormatan secara otomatis.
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#2A1B42]/60 flex items-center justify-between gap-2">
                  {linkedAccounts?.discord?.connected ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void syncProfile()}
                        disabled={syncing}
                        className="px-3 py-1.5 rounded-lg border border-[#2A1B42] bg-[#1A102E] hover:border-[#7C3AED] text-xs font-bold text-white inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
                        <span>{syncing ? "Sinkronisasi…" : "Sync Role"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnlink("discord")}
                        disabled={(linkedAccounts?.totalConnected ?? 0) <= 1 || unlinkingProvider === "discord"}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                          (linkedAccounts?.totalConnected ?? 0) <= 1
                            ? "opacity-40 border-gray-700 bg-gray-800/40 text-gray-400 cursor-not-allowed"
                            : "border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300"
                        }`}
                        title={(linkedAccounts?.totalConnected ?? 0) <= 1 ? "Tautkan Google terlebih dahulu sebelum melepas Discord" : "Putuskan tautan Discord"}
                      >
                        <Unlink size={12} />
                        <span>{unlinkingProvider === "discord" ? "Melepas…" : "Putuskan Tautan"}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void signIn("discord", { callbackUrl: "/profile?tab=settings&bind=success" })}
                      className="w-full py-2 px-3 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-xs font-bold text-white inline-flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                    >
                      <Link2 size={14} />
                      <span>Hubungkan Discord</span>
                    </button>
                  )}
                </div>
                {Boolean(linkedAccounts?.discord?.connected && (linkedAccounts?.totalConnected ?? 0) <= 1) && (
                  <p className="text-[10px] text-amber-400/90 -mt-1 flex items-center gap-1">
                    <Lock size={10} />
                    Tautkan Google dulu jika ingin melepas akun Discord.
                  </p>
                )}
              </div>

              {/* KARTU 2: GOOGLE */}
              <div className="p-4 rounded-xl border border-[#2A1B42] bg-[#0A0612]/60 flex flex-col justify-between gap-3.5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                        <svg className="size-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Google</span>
                        <span className="text-[11px] text-gray-400">Login cadangan 1-klik aman</span>
                      </div>
                    </div>
                    {linkedAccounts?.google?.connected ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        <span>Terhubung</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/15 text-gray-400 border border-gray-500/30">
                        Belum Tertaut
                      </span>
                    )}
                  </div>

                  {linkedAccounts?.google?.connected ? (
                    <div className="text-[11px] font-mono text-gray-300 bg-[#120B1E] p-2.5 rounded-lg border border-[#2A1B42]">
                      <p className="text-gray-400 text-[10px]">EMAIL TERSAMAR:</p>
                      <p className="truncate text-white font-bold">{linkedAccounts?.google?.emailMasked || "Terkoneksi"}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Tautkan akun Google sebagai metode login cadangan 1-klik agar Anda tetap bisa masuk meskipun Discord sedang gangguan atau maintenance.
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#2A1B42]/60 flex items-center justify-end gap-2">
                  {linkedAccounts?.google?.connected ? (
                    <button
                      type="button"
                      onClick={() => handleUnlink("google")}
                      disabled={(linkedAccounts?.totalConnected ?? 0) <= 1 || unlinkingProvider === "google"}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                        (linkedAccounts?.totalConnected ?? 0) <= 1
                          ? "opacity-40 border-gray-700 bg-gray-800/40 text-gray-400 cursor-not-allowed"
                          : "border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300"
                      }`}
                      title={(linkedAccounts?.totalConnected ?? 0) <= 1 ? "Tautkan Discord terlebih dahulu sebelum melepas Google" : "Putuskan tautan Google"}
                    >
                      <Unlink size={12} />
                      <span>{unlinkingProvider === "google" ? "Melepas…" : "Putuskan Tautan"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void signIn("google", { callbackUrl: "/profile?tab=settings&bind=success" })}
                      className="w-full py-2 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                    >
                      <Link2 size={14} />
                      <span>Hubungkan Google</span>
                    </button>
                  )}
                </div>
                {Boolean(linkedAccounts?.google?.connected && (linkedAccounts?.totalConnected ?? 0) <= 1) && (
                  <p className="text-[10px] text-amber-400/90 -mt-1 flex items-center gap-1">
                    <Lock size={10} />
                    Tautkan Discord dulu jika ingin melepas akun Google.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* 2. Form Identitas Gamer */}
          <section className="p-5 sm:p-6 rounded-2xl border border-[#2A1B42] bg-[#120B1E]/80 backdrop-blur-md">
            <div className="mb-4">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Gamepad2 size={18} className="text-[#9D4EDD]" />
                Identitas Gamer &amp; Game yang Dimainkan
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Sesuaikan game favorit dan informasi profil yang tampil bagi anggota komunitas.
              </p>
            </div>

            <form onSubmit={(e) => void saveGamerProfile(e)} className="space-y-4 w-full">
              {/* Game Tag Buttons */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-2">
                  Game yang Dimainkan (Pilih Cepat atau Tambah Kustom)
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {COMMON_GAMES.map((g) => {
                    const isSelected = favoriteGames.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleGame(g)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          isSelected
                            ? "bg-[#7C3AED] text-white border-[#7C3AED]"
                            : "border-[#2A1B42] bg-[#0A0612] text-gray-300 hover:border-[#7C3AED]"
                        }`}
                      >
                        {isSelected ? `✓ ${g}` : `+ ${g}`}
                      </button>
                    );
                  })}
                </div>

                {/* Input Game Kustom */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md">
                  <input
                    type="text"
                    maxLength={40}
                    value={customGameInput}
                    onChange={(e) => setCustomGameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomGame();
                      }
                    }}
                    placeholder="Tambah game lainnya…"
                    className="w-full max-w-full box-border h-11 px-3.5 rounded-lg border border-[#2A1B42] bg-[#0A0612] text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#7C3AED]"
                  />
                  <button
                    type="button"
                    onClick={addCustomGame}
                    className="h-11 px-4 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold transition-colors shrink-0 flex items-center justify-center"
                  >
                    Tambah
                  </button>
                </div>

                {/* Selected Games Pill List */}
                {favoriteGames.length > 0 && (
                  <div className="mt-3">
                    <span className="text-[11px] font-bold text-gray-400 block mb-1.5 uppercase">
                      Game Terpilih ({favoriteGames.length}/20):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {favoriteGames.map((g) => (
                        <span
                          key={g}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#7C3AED]/40 bg-[#7C3AED]/10 text-purple-300 text-xs font-medium"
                        >
                          {g}
                          <button
                            type="button"
                            onClick={() => removeGame(g)}
                            className="hover:text-red-400 font-bold ml-0.5 text-sm leading-none"
                            title="Hapus"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bio Singkat Petualang */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">
                  Bio Singkat Petualang (Maks. 300 Karakter)
                </label>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ceritakan tentang dirimu, gaya bermain, role favorit, atau jadwal aktif mabar…"
                  className="w-full max-w-full box-border px-3 py-2 rounded-lg border border-[#2A1B42] bg-[#0A0612] text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              {/* Gender & Tanggal Lahir */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#2A1B42]">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Gender (Opsional)
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full max-w-full box-border h-11 px-3 rounded-lg border border-[#2A1B42] bg-[#0A0612] text-xs text-white focus:outline-none focus:border-[#7C3AED]"
                  >
                    <option value="">Pilih gender (Opsional)</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                    <option value="Privasi / Tidak disebutkan">Privasi / Tidak disebutkan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Tanggal Lahir (Opsional)
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full max-w-full box-border h-11 px-3 rounded-lg border border-[#2A1B42] bg-[#0A0612] text-xs text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-gray-400">
                    <input
                      type="checkbox"
                      checked={showBirthDate}
                      onChange={(e) => setShowBirthDate(e.target.checked)}
                      className="rounded border-[#2A1B42] text-[#7C3AED] focus:ring-0"
                    />
                    <span>Tampilkan tanggal lahir / usia di profil publik</span>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingGamer}
                  className="w-full sm:w-auto px-6 h-11 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold transition-colors shadow-md shadow-[#7C3AED]/20 disabled:opacity-50"
                >
                  {savingGamer ? "Menyimpan…" : "Simpan Profil Gamer"}
                </button>
              </div>
            </form>
          </section>

          {/* 3. Preferensi Antarmuka & Notifikasi (Anti-Tabrakan & Anti-Keluar Layar) */}
          <section className="p-5 sm:p-6 rounded-2xl border border-[#2A1B42] bg-[#120B1E]/80 backdrop-blur-md">
            <div className="mb-4">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <SunMoon size={18} className="text-[#9D4EDD]" />
                Preferensi Antarmuka &amp; Notifikasi
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Konfigurasi tampilan visual dan pengaturan pemberitahuan akun.
              </p>
            </div>

            <div className="space-y-3">
              {/* Mode Gelap */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#2A1B42] bg-[#0A0612]/60">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <SunMoon size={16} className="text-[#9D4EDD] shrink-0" />
                    <h3 className="text-xs sm:text-sm font-bold text-white break-words">Mode Gelap</h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 break-words">
                    Gunakan tema taktis gelap sebagai tampilan antarmuka utama.
                  </p>
                </div>
                <input
                  type="checkbox"
                  aria-label="Mode Gelap"
                  checked={preferences.dark}
                  onChange={(e) => updatePreference("dark", e.target.checked)}
                  className="h-5 w-9 shrink-0 cursor-pointer accent-[#7C3AED]"
                />
              </div>

              {/* Ukuran Teks Besar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#2A1B42] bg-[#0A0612]/60">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Type size={16} className="text-[#9D4EDD] shrink-0" />
                    <h3 className="text-xs sm:text-sm font-bold text-white break-words">Ukuran Font Besar</h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 break-words">
                    Perbesar teks bacaan di thread forum dan ruang diskusi.
                  </p>
                </div>
                <input
                  type="checkbox"
                  aria-label="Ukuran Font Besar"
                  checked={preferences.largeFont}
                  onChange={(e) => updatePreference("largeFont", e.target.checked)}
                  className="h-5 w-9 shrink-0 cursor-pointer accent-[#7C3AED]"
                />
              </div>

              {/* Animasi */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#2A1B42] bg-[#0A0612]/60">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={16} className="text-[#9D4EDD] shrink-0" />
                    <h3 className="text-xs sm:text-sm font-bold text-white break-words">Efek Animasi Antarmuka</h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 break-words">
                    Nonaktifkan animasi untuk menghemat baterai dan mempercepat rendering.
                  </p>
                </div>
                <input
                  type="checkbox"
                  aria-label="Efek Animasi Antarmuka"
                  checked={preferences.animations}
                  onChange={(e) => updatePreference("animations", e.target.checked)}
                  className="h-5 w-9 shrink-0 cursor-pointer accent-[#7C3AED]"
                />
              </div>

              {/* Notifikasi */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#2A1B42] bg-[#0A0612]/60">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-[#9D4EDD] shrink-0" />
                    <h3 className="text-xs sm:text-sm font-bold text-white break-words">Notifikasi Balasan &amp; Transaksi</h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 break-words">
                    Terima peringatan saat pesan dibalas atau status lapak berubah.
                  </p>
                </div>
                <input
                  type="checkbox"
                  aria-label="Notifikasi Balasan & Transaksi"
                  checked={preferences.notifications}
                  onChange={(e) => updatePreference("notifications", e.target.checked)}
                  className="h-5 w-9 shrink-0 cursor-pointer accent-[#7C3AED]"
                />
              </div>

              {/* Izin Pesan Pribadi (PM) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#2A1B42] bg-[#0A0612]/60">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-[#9D4EDD] shrink-0" />
                    <h3 className="text-xs sm:text-sm font-bold text-white break-words">Izinkan Pesan Pribadi (PM) Langsung</h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 break-words">
                    Izinkan semua member komunitas mengirimi saya Pesan Pribadi (PM) secara langsung.
                  </p>
                </div>
                <input
                  type="checkbox"
                  aria-label="Izinkan Pesan Pribadi (PM)"
                  checked={allowDirectMessages}
                  onChange={(e) => {
                    const nextVal = e.target.checked;
                    setAllowDirectMessages(nextVal);
                    void fetch("/api/settings/profile", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ allowDirectMessages: nextVal }),
                    });
                  }}
                  className="h-5 w-9 shrink-0 cursor-pointer accent-[#7C3AED]"
                />
              </div>
            </div>
          </section>

          {/* Preferensi Bahasa & Mata Uang */}
          <section className="p-5 sm:p-6 rounded-2xl border border-[#2A1B42] bg-[#120B1E]/80 backdrop-blur-md">
            <div className="mb-4">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Globe size={18} className="text-[#9D4EDD]" />
                Bahasa Antarmuka &amp; Mata Uang (Regional Preferences)
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Pilihan bahasa dan konverter mata uang otomatis tersimpan di perangkat ini dan berlaku di seluruh halaman tanpa refresh.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-2">
                  Bahasa Antarmuka ({SUPPORTED_LANGUAGES.length} Bahasa Resmi)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setLocale(lang.code)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between border ${
                        locale === lang.code
                          ? "bg-[#7C3AED] border-[#9D4EDD] text-white shadow-md shadow-[#7C3AED]/20"
                          : "border-[#2A1B42] bg-[#0A0612]/60 text-gray-300 hover:border-[#7C3AED]/50 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <FlagIcon locale={lang.code} />
                        <span className="truncate">{lang.name}</span>
                      </span>
                      <span className="font-mono text-[10px] opacity-75 uppercase shrink-0">{lang.code}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-2">
                  Konversi Mata Uang ({SUPPORTED_CURRENCIES.length} Mata Uang)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <button
                      key={curr.code}
                      type="button"
                      onClick={() => setCurrency(curr.code)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between border ${
                        currency === curr.code
                          ? "bg-[#7C3AED] border-[#9D4EDD] text-white shadow-md shadow-[#7C3AED]/20"
                          : "border-[#2A1B42] bg-[#0A0612]/60 text-gray-300 hover:border-[#7C3AED]/50 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="font-mono font-black text-amber-400 shrink-0">{curr.symbol}</span>
                        <span className="truncate">{curr.name}</span>
                      </span>
                      <span className="font-mono text-[10px] opacity-75 shrink-0">{curr.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 4. Lapak & Transaksi */}
          <section className="p-5 sm:p-6 rounded-2xl border border-[#2A1B42] bg-[#120B1E]/80 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <BadgeCheck size={18} className="text-[#9D4EDD]" />
                  Status Lapak Marketplace Saya
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Kelola status barang yang kamu daftarkan di Marketplace Guild.
                </p>
              </div>
              <Link
                href="/marketplace"
                className="text-xs text-purple-400 hover:text-purple-300 font-bold inline-flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Buka Marketplace</span>
                <ExternalLink size={13} />
              </Link>
            </div>

            <div className="w-full overflow-x-auto no-scrollbar">
              <table className="min-w-[500px] w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2A1B42] text-gray-400">
                    <th className="py-2.5 px-3 font-bold">Postingan</th>
                    <th className="py-2.5 px-3 font-bold">Tanggal</th>
                    <th className="py-2.5 px-3 font-bold">Status Lapak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A1B42]">
                  {(Array.isArray(listings) ? listings : []).map((listing) => {
                    const statusVal = listingStatus(listing?.marketData);
                    const categoryLabel = typeof listing?.category === "string" ? listing.category.replaceAll("_", " ") : "Lapak";
                    const createdDate = listing?.createdAt ? new Date(listing.createdAt) : null;
                    const formattedDate = createdDate && !isNaN(createdDate.getTime()) ? createdDate.toLocaleDateString("id-ID") : "-";

                    return (
                      <tr key={listing?.id || Math.random()} className="hover:bg-purple-950/20">
                        <td className="py-3 px-3">
                          <Link
                            href={statusVal ? "/marketplace" : `/forum/${listing?.id || ""}`}
                            className="font-bold text-white hover:text-purple-300 block truncate max-w-xs"
                          >
                            {listing?.title || "Lapak Tanpa Judul"}
                          </Link>
                          <span className="text-[10px] text-gray-500 uppercase">
                            {categoryLabel}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-400 whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {statusVal ? (
                            <select
                              aria-label={`Status ${listing?.title || "Lapak"}`}
                              value={statusVal === "IN_ESCROW" ? "AVAILABLE" : statusVal}
                              disabled={statusVal === "IN_ESCROW" || savingStatus === listing?.id}
                              onChange={(e) =>
                                void changeListingStatus(listing, e.target.value as "AVAILABLE" | "SOLD")
                              }
                              className="px-2 py-1 rounded bg-[#0A0612] border border-[#2A1B42] text-xs text-white"
                            >
                              <option value="AVAILABLE">AVAILABLE</option>
                              <option value="SOLD">SOLD</option>
                            </select>
                          ) : (
                            <span className="text-gray-500">Thread Forum</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {(!listings || listings.length === 0) && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-gray-500">
                        Belum ada postingan lapak marketplace.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 6: EMPEROR SOVEREIGN CONTROL (MUTLAK KHUSUS .ODYSSIA) */}
      {activeTab === "emperor" && isOwner && (
        <div className="space-y-6">
          <EmperorSovereignControl currentUsername={profile?.username ?? session?.user?.username} />
        </div>
      )}

      <VerifiedSellerModal
        isOpen={showVerifiedSellerModal}
        onClose={() => setShowVerifiedSellerModal(false)}
        onSuccess={() => void fetchProfileData()}
      />
    </main>
  );
}
