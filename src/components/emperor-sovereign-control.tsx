"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  Crown,
  Sparkles,
  Zap,
  Gift,
  Shield,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Sliders,
  Layers,
  Award,
  RefreshCw,
  Search,
  UserCheck,
  Flame,
  Dices,
  Lock,
  Unlock,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  User,
  Wand2,
  Ticket,
  Edit2,
  Save,
} from "lucide-react";
import { ARMORY_ITEMS, ArmoryItem } from "@/lib/armory-catalog";
import { DiscordAvatar } from "@/components/discord-avatar";
import { getLevelProgressFromXp, getMinimumXpForLevel } from "@/lib/level-system";

interface EmperorControlProps {
  currentUsername?: string | null;
}

interface TargetUserProfile {
  id: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  discordId?: string | null;
  email?: string | null;
  role: string;
  xp: number;
  level: number;
  horizonCoins?: number;
  dailyGachaTickets: number;
  badges: string[];
  isVerifiedSeller: boolean;
  checkInStreak: number;
  equippedAvatarFrame?: string | null;
  equippedCustomTitle?: string | null;
  trialType?: string | null;
  trialExpiresAt?: string | null;
  cosmetics?: { id: string; itemId: string; itemName: string; itemType: string }[];
}

interface FeatureFlags {
  featureGachaEnabled: boolean;
  featureArmoryEnabled: boolean;
  featureMarketplaceEnabled: boolean;
  featureDungeonEnabled: boolean;
  featureGuestTournamentEnabled: boolean;
  featurePartyEnabled: boolean;
  maintenanceMode: boolean;
  hideStaffFromLeaderboard: boolean;
  updatedAt?: string;
}

export function EmperorSovereignControl({ currentUsername }: EmperorControlProps) {
  const [activeSubTab, setActiveSubTab] = useState<"injector" | "switchboard" | "vouchers">("injector");

  // Module A: Target User Selection & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TargetUserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<TargetUserProfile | null>(null);
  const [loadingUserSearch, setLoadingUserSearch] = useState(false);

  // Module A: Action Inputs
  const [customXp, setCustomXp] = useState<number>(5000);
  const [customLevel, setCustomLevel] = useState<number>(10);
  const [customTickets, setCustomTickets] = useState<number>(10);
  const [customCoins, setCustomCoins] = useState<number>(500);
  const [customStreak, setCustomStreak] = useState<number>(7);
  const [selectedArmoryItem, setSelectedArmoryItem] = useState<string>(ARMORY_ITEMS[0]?.id || "");
  const [customBadge, setCustomBadge] = useState<string>("Noble Patron");
  const [trialType, setTrialType] = useState<string>("VIP_PREMIUM");
  const [trialDays, setTrialDays] = useState<number>(30);

  // Module B: Feature Toggles
  const [features, setFeatures] = useState<FeatureFlags>({
    featureGachaEnabled: true,
    featureArmoryEnabled: true,
    featureMarketplaceEnabled: true,
    featureDungeonEnabled: true,
    featureGuestTournamentEnabled: true,
    featurePartyEnabled: true,
    maintenanceMode: false,
    hideStaffFromLeaderboard: false,
  });
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [savingFeatureKey, setSavingFeatureKey] = useState<string | null>(null);

  // Module C: Redeem Codes & Sponsor Vouchers
  const [redeemCodes, setRedeemCodes] = useState<any[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [codeCategory, setCodeCategory] = useState<"SPONSOR_VOUCHER" | "GUILD_REWARD">("SPONSOR_VOUCHER");
  const [newCode, setNewCode] = useState("");
  const [newTitle, setNewTitle] = useState("Diskon 20% Top-Up & Jasa OdyssiaVault");
  const [newSponsorName, setNewSponsorName] = useState("OdyssiaVault");
  const [newRewardType, setNewRewardType] = useState<"SPONSOR_DISCOUNT" | "GACHA_TICKETS" | "XP" | "VIP_TRIAL_DAYS" | "HORIZON_COINS">("SPONSOR_DISCOUNT");
  const [newRewardValue, setNewRewardValue] = useState<number>(20);
  const [newSponsorUrl, setNewSponsorUrl] = useState("http://odyssiavault.kiospremium.site/");
  const [newMaxUses, setNewMaxUses] = useState<number>(20);
  const [newIncludeGachaPool, setNewIncludeGachaPool] = useState<boolean>(true);
  const [newExpiresInDays, setNewExpiresInDays] = useState<number>(30);

  // Edit Voucher Modal State
  const [editingCode, setEditingCode] = useState<any | null>(null);
  const [editCodeValue, setEditCodeValue] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<"SPONSOR_VOUCHER" | "GUILD_REWARD">("SPONSOR_VOUCHER");
  const [editSponsorName, setEditSponsorName] = useState("");
  const [editRewardType, setEditRewardType] = useState<string>("SPONSOR_DISCOUNT");
  const [editRewardValue, setEditRewardValue] = useState<number>(20);
  const [editSponsorUrl, setEditSponsorUrl] = useState("");
  const [editMaxUses, setEditMaxUses] = useState<number>(20);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editIncludeGachaPool, setEditIncludeGachaPool] = useState<boolean>(true);
  const [editExpiresAt, setEditExpiresAt] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const openEditModal = (code: any) => {
    setEditingCode(code);
    setEditCodeValue(code.code);
    setEditTitle(code.title);
    setEditCategory(code.category || "SPONSOR_VOUCHER");
    setEditSponsorName(code.sponsorName || "OdyssiaVault");
    setEditRewardType(code.rewardType || "SPONSOR_DISCOUNT");
    setEditRewardValue(code.rewardValue || 20);
    setEditSponsorUrl(code.sponsorActionUrl || "");
    setEditMaxUses(code.maxUses || 50);
    setEditIsActive(Boolean(code.isActive));
    setEditIncludeGachaPool(Boolean(code.includeInGachaPool));
    setEditExpiresAt(
      code.expiresAt ? new Date(code.expiresAt).toISOString().split("T")[0] : ""
    );
  };

  const handleSaveEditCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCode) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/owner/redeem-codes/${editingCode.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: editCodeValue.trim().toUpperCase().replace(/\s+/g, ""),
          title: editTitle.trim(),
          category: editCategory,
          sponsorName: editCategory === "SPONSOR_VOUCHER" ? editSponsorName.trim() : null,
          rewardType: editRewardType,
          rewardValue: Number(editRewardValue),
          sponsorActionUrl: editCategory === "SPONSOR_VOUCHER" ? editSponsorUrl.trim() : null,
          maxUses: Number(editMaxUses),
          isActive: editIsActive,
          includeInGachaPool: editCategory === "SPONSOR_VOUCHER" ? editIncludeGachaPool : false,
          expiresAt: editExpiresAt ? new Date(`${editExpiresAt}T23:59:59.999Z`).toISOString() : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal memperbarui voucher.");
      }
      showStatus(`Kode ${json.code?.code || editCodeValue} berhasil diperbarui!`, "success");
      setEditingCode(null);
      fetchRedeemCodes();
    } catch (err: any) {
      showStatus(err.message, "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Status & Feedback
  const [loadingAction, setLoadingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showStatus = (text: string, type: "success" | "error" = "success") => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 6000);
  };

  // Search users
  const handleSearchUsers = useCallback(async (q: string) => {
    try {
      setLoadingUserSearch(true);
      const res = await fetch(`/api/owner/users?search=${encodeURIComponent(q)}`);
      if (res.ok) {
        const json = await res.json();
        setSearchResults(json.users || []);
      }
    } catch {
      // silently handle
    } finally {
      setLoadingUserSearch(false);
    }
  }, []);

  // Fetch initial features & default user
  const fetchFeatures = useCallback(async () => {
    try {
      setLoadingFeatures(true);
      const res = await fetch("/api/owner/features");
      if (res.ok) {
        const json = await res.json();
        if (json.config) setFeatures(json.config);
      }
    } catch {
      // ignore
    } finally {
      setLoadingFeatures(false);
    }
  }, []);

  // Fetch redeem codes
  const fetchRedeemCodes = useCallback(async () => {
    try {
      setLoadingCodes(true);
      const res = await fetch("/api/owner/redeem-codes");
      if (res.ok) {
        const json = await res.json();
        setRedeemCodes(json.codes || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingCodes(false);
    }
  }, []);

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCode.trim().toUpperCase().replace(/\s+/g, "");
    if (!clean) {
      showStatus("Kode voucher/redeem wajib diisi!", "error");
      return;
    }
    try {
      setLoadingAction(true);
      const expiresAt = newExpiresInDays > 0 ? new Date(Date.now() + newExpiresInDays * 86400000).toISOString() : null;
      const res = await fetch("/api/owner/redeem-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: clean,
          category: codeCategory,
          sponsorName: newSponsorName,
          title: newTitle,
          rewardType: newRewardType,
          rewardValue: newRewardValue,
          sponsorActionUrl: newSponsorUrl,
          includeInGachaPool: newIncludeGachaPool,
          maxUses: newMaxUses,
          expiresAt,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menerbitkan kode.");

      showStatus(`Kode ${clean} berhasil diterbitkan!`, "success");
      setNewCode("");
      fetchRedeemCodes();
    } catch (err: any) {
      showStatus(err.message, "error");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleToggleCodeActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/owner/redeem-codes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentActive }),
      });
      if (res.ok) {
        setRedeemCodes((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isActive: !currentActive } : c))
        );
        showStatus("Status kode diperbarui!", "success");
      }
    } catch (err: any) {
      showStatus(err.message, "error");
    }
  };

  const handleDeleteCode = async (id: string, codeName: string) => {
    if (!confirm(`Hapus kode ${codeName} secara permanen?`)) return;
    try {
      const res = await fetch(`/api/owner/redeem-codes?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setRedeemCodes((prev) => prev.filter((c) => c.id !== id));
        showStatus(`Kode ${codeName} berhasil dihapus.`, "success");
      }
    } catch (err: any) {
      showStatus(err.message, "error");
    }
  };

  const applyPreset = (preset: {
    code: string;
    category: "SPONSOR_VOUCHER" | "GUILD_REWARD";
    sponsorName: string;
    title: string;
    rewardType: "SPONSOR_DISCOUNT" | "GACHA_TICKETS" | "XP" | "VIP_TRIAL_DAYS" | "HORIZON_COINS";
    rewardValue: number;
    maxUses: number;
    includeInGachaPool: boolean;
  }) => {
    setNewCode(preset.code);
    setCodeCategory(preset.category);
    setNewSponsorName(preset.sponsorName);
    setNewTitle(preset.title);
    setNewRewardType(preset.rewardType);
    setNewRewardValue(preset.rewardValue);
    setNewMaxUses(preset.maxUses);
    setNewIncludeGachaPool(preset.includeInGachaPool);
    if (preset.category === "SPONSOR_VOUCHER") {
      setNewSponsorUrl("http://odyssiavault.kiospremium.site/");
    }
  };

  // Shortcut: select .odyssia
  const selectSelfAccount = useCallback(async () => {
    try {
      setLoadingUserSearch(true);
      const res = await fetch(`/api/owner/users?search=.odyssia`);
      if (res.ok) {
        const json = await res.json();
        const found = json.users?.[0];
        if (found) {
          setSelectedUser(found);
        }
      }
    } finally {
      setLoadingUserSearch(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
    selectSelfAccount();
    fetchRedeemCodes();
  }, [fetchFeatures, selectSelfAccount, fetchRedeemCodes]);

  // Execute Sovereign Gift / Action
  const executeGiftAction = async (payload: Record<string, any>) => {
    if (!selectedUser) {
      showStatus("Pilih akun target terlebih dahulu!", "error");
      return;
    }

    try {
      setLoadingAction(true);
      const res = await fetch("/api/owner/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          ...payload,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal mengeksekusi titah kaisar.");
      }

      showStatus(json.message || "Aksi berhasil diterapkan!", "success");
      if (json.user) {
        setSelectedUser(json.user);
      }
    } catch (err: any) {
      showStatus(err.message || "Terjadi kesalahan sistem.", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  // Toggle Feature Flag
  const handleToggleFeature = async (key: keyof FeatureFlags, nextVal: boolean) => {
    try {
      setSavingFeatureKey(key);
      const res = await fetch("/api/owner/features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: nextVal }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal mengubah sakelar fitur.");
      }

      setFeatures((prev) => ({ ...prev, [key]: nextVal }));
      showStatus(json.message || "Sakelar fitur diperbarui!", "success");
    } catch (err: any) {
      showStatus(err.message || "Gagal mengubah status fitur.", "error");
    } finally {
      setSavingFeatureKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-br from-[#1A0B2E] via-[#120824] to-[#0A0414] p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/50 bg-amber-500/10 text-amber-300 text-xs font-bold tracking-wide uppercase shadow-sm">
              <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Sovereign Prerogative • Exclusive Owner Access
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              👑 Emperor Sovereign Control
            </h1>
            <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
              Pusat kendali mutlak Guild Owner (<span className="text-amber-400 font-mono font-bold">.odyssia</span>).
              Suntikkan XP, tiket gacha harian, buka katalog armory, angkat kasta bangsawan, dan kendalikan sakelar fitur live seluruh website secara instan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={selectSelfAccount}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-amber-500/50 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 transition-all shadow-md active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              ⚡ Akun Saya (.odyssia)
            </button>
            <button
              onClick={fetchFeatures}
              disabled={loadingFeatures}
              className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-all active:scale-95 disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loadingFeatures ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* FEEDBACK ALERT */}
        {statusMessage && (
          <div
            className={`mt-4 p-4 rounded-xl border flex items-center justify-between text-sm font-medium transition-all ${
              statusMessage.type === "success"
                ? "border-emerald-500/50 bg-emerald-950/60 text-emerald-200"
                : "border-rose-500/50 bg-rose-950/60 text-rose-200"
            }`}
          >
            <div className="flex items-center gap-3">
              {statusMessage.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* MODULE TABS NAVIGATION */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-1.5 rounded-2xl border border-purple-500/30 bg-[#120824]/90 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setActiveSubTab("injector")}
          className={`w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs sm:text-sm font-bold text-center transition-all whitespace-nowrap ${
            activeSubTab === "injector"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20"
              : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
          }`}
        >
          <Gift className="w-4 h-4 shrink-0" />
          <span>🎁 Suntik XP, Tiket &amp; Item</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("switchboard")}
          className={`w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs sm:text-sm font-bold text-center transition-all whitespace-nowrap ${
            activeSubTab === "switchboard"
              ? "bg-gradient-to-r from-purple-600 to-[#9D4EDD] text-white shadow-lg shadow-purple-600/30"
              : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
          }`}
        >
          <Sliders className="w-4 h-4 shrink-0" />
          <span>🎛️ Sakelar Fitur &amp; Leaderboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("vouchers")}
          className={`w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs sm:text-sm font-bold text-center transition-all whitespace-nowrap ${
            activeSubTab === "vouchers"
              ? "bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 text-black shadow-lg shadow-cyan-500/20"
              : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
          }`}
        >
          <Award className="w-4 h-4 shrink-0" />
          <span>🎟️ Kode Redeem &amp; Voucher Sponsor</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MODUL A: SOVEREIGN GIFT & TOP-UP INJECTOR */}
      {/* ========================================================================= */}
      {activeSubTab === "injector" && (
        <div className="space-y-6">
          {/* USER SELECTOR & PREVIEW */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* SEARCH BOX (lg:col-span-5) */}
            <div className="lg:col-span-5 p-5 rounded-2xl border border-purple-500/30 bg-[#120824]/80 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-amber-400" />
                  CARI AKUN TARGET
                </label>

                {/* Tombol Lebar Penuh Pilih Akun Saya */}
                <button
                  type="button"
                  onClick={selectSelfAccount}
                  className="w-full h-11 px-4 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                >
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>⚡ Pilih Akun Saya (.odyssia)</span>
                </button>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ketik username / Discord ID / nama..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleSearchUsers(e.target.value);
                    }}
                    className="w-full h-11 px-4 rounded-xl border border-purple-500/30 bg-[#1A0E30] text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-all"
                  />
                  {loadingUserSearch && (
                    <div className="absolute right-3.5 top-3.5">
                      <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                    </div>
                  )}
                </div>

                {/* SEARCH RESULTS DROPDOWN / LIST */}
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                  {searchResults.map((usr) => {
                    const isSelected = selectedUser?.id === usr.id;
                    return (
                      <button
                        key={usr.id}
                        type="button"
                        onClick={() => setSelectedUser(usr)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                          isSelected
                            ? "bg-amber-500/20 border border-amber-500/50 text-white"
                            : "bg-white/5 hover:bg-white/10 text-gray-300 border border-transparent"
                        }`}
                      >
                        <DiscordAvatar
                          src={usr.avatar}
                          username={usr.username}
                          size={32}
                          frameId={usr.equippedAvatarFrame}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            @{usr.username || usr.name}
                            {usr.isVerifiedSeller && (
                              <span className="text-[10px] text-cyan-400 font-bold">✅</span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate">
                            Lv. {usr.level} • {usr.xp.toLocaleString()} XP • 🪙 {(usr.horizonCoins ?? 0).toLocaleString()} HC • {usr.dailyGachaTickets} Tiket
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SELECTED USER PREVIEW CARD (lg:col-span-7) */}
            <div className="lg:col-span-7 p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#190C2F] to-[#100620] space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5" />
                    Target Terpilih: Ringkasan Akun
                  </span>
                  {selectedUser && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono">
                      ID: {selectedUser.id}
                    </span>
                  )}
                </div>

                {selectedUser ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="relative shrink-0">
                      <DiscordAvatar
                        src={selectedUser.avatar}
                        username={selectedUser.username}
                        size={64}
                        frameId={selectedUser.equippedAvatarFrame}
                      />
                      <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-[10px] font-black text-black">
                        Lv.{selectedUser.level}
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-white truncate">
                          @{selectedUser.username || selectedUser.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/40 bg-amber-500/10 text-amber-300">
                          {selectedUser.role}
                        </span>
                        {selectedUser.isVerifiedSeller && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
                            ✅ VERIFIED SELLER
                          </span>
                        )}
                        {selectedUser.equippedCustomTitle && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-purple-500/40 bg-purple-500/10 text-purple-300">
                            ⚔️ {selectedUser.equippedCustomTitle}
                          </span>
                        )}
                      </div>

                      {/* 5 Kotak Statistik Simetris */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
                        <div className="p-2.5 rounded-xl bg-black/40 border border-purple-500/20 text-center">
                          <span className="text-[10px] text-gray-400 block font-medium">Total XP Guild</span>
                          <span className="text-xs sm:text-sm font-bold text-amber-300">{selectedUser.xp.toLocaleString()}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-black/40 border border-amber-500/30 text-center">
                          <span className="text-[10px] text-gray-400 block font-medium">Saldo Horizon Coins</span>
                          <span className="text-xs sm:text-sm font-bold text-amber-400">
                            🪙 {(selectedUser.horizonCoins ?? 0).toLocaleString()} HC
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-black/40 border border-purple-500/20 text-center">
                          <span className="text-[10px] text-gray-400 block font-medium">Tiket Gacha</span>
                          <span className="text-xs sm:text-sm font-bold text-cyan-300">{selectedUser.dailyGachaTickets} Tiket</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-black/40 border border-purple-500/20 text-center">
                          <span className="text-[10px] text-gray-400 block font-medium">Check-in Streak</span>
                          <span className="text-xs sm:text-sm font-bold text-orange-400">🔥 {selectedUser.checkInStreak} Hari</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-black/40 border border-purple-500/20 text-center">
                          <span className="text-[10px] text-gray-400 block font-medium">Koleksi Armory</span>
                          <span className="text-xs sm:text-sm font-bold text-purple-300">
                            {selectedUser.cosmetics?.length || 0} / {ARMORY_ITEMS.length}
                          </span>
                        </div>
                      </div>

                      {/* Baris Badge Kasta */}
                      {selectedUser.badges && selectedUser.badges.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-2">
                          <span className="text-[10px] text-gray-400">Lencana Kasta:</span>
                          {selectedUser.badges.map((b, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-200"
                            >
                              💎 {b}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Belum ada akun yang dipilih. Silakan cari atau klik tombol &quot;⚡ Pilih Akun Saya (.odyssia)&quot;.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ACTION TOOLKIT GRID (grid-cols-1 md:grid-cols-2 gap-5) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. SUNTIK XP & LEVEL */}
            <div className="p-5 sm:p-6 rounded-2xl border border-purple-500/30 bg-[#120824]/90 space-y-4 flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Suntik XP &amp; Tetapkan Level
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Tambahkan XP guild secara instan atau langsung set tingkat kehormatan Level member.
                </p>

                {/* XP Presets */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {[500, 5000, 50000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      disabled={loadingAction || !selectedUser}
                      onClick={() => executeGiftAction({ action: "ADD_XP", amount: val })}
                      className="h-10 px-3 rounded-xl text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/25 transition-all disabled:opacity-50"
                    >
                      +{val >= 1000 ? `${val / 1000}k` : val} XP
                    </button>
                  ))}
                </div>

                {/* Custom XP */}
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="number"
                    min="1"
                    value={customXp}
                    onChange={(e) => setCustomXp(Number(e.target.value))}
                    placeholder="Nominal custom XP..."
                    className="flex-1 h-11 px-3.5 rounded-xl border border-purple-500/30 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    disabled={loadingAction || !selectedUser}
                    onClick={() => executeGiftAction({ action: "ADD_XP", amount: customXp })}
                    className="h-11 px-4 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition-all disabled:opacity-50 whitespace-nowrap shrink-0 shadow-md shadow-amber-500/20"
                  >
                    Suntik XP
                  </button>
                </div>
                {customXp > 0 && selectedUser && (
                  <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-mono flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Suntik +{customXp.toLocaleString("id-ID")} XP ➔ Total {((selectedUser.xp || 0) + customXp).toLocaleString("id-ID")} XP (Otomatis Lv. {getLevelProgressFromXp((selectedUser.xp || 0) + customXp).level})
                    </span>
                  </div>
                )}

                {/* Direct Set Level */}
                <div className="pt-3 mt-3 border-t border-white/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={customLevel}
                      onChange={(e) => setCustomLevel(Number(e.target.value))}
                      placeholder="Tetapkan Level (1-999)..."
                      className="flex-1 h-11 px-3.5 rounded-xl border border-purple-500/30 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-purple-400"
                    />
                    <button
                      type="button"
                      disabled={loadingAction || !selectedUser}
                      onClick={() => executeGiftAction({ action: "SET_LEVEL", level: customLevel })}
                      className="h-11 px-4 rounded-xl text-xs font-bold border border-purple-500/50 bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 transition-all disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      Set Level
                    </button>
                  </div>
                  {customLevel > 0 && (
                    <div className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 font-mono flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        Set Level {customLevel} = otomatis set XP ke {getMinimumXpForLevel(customLevel).toLocaleString("id-ID")} XP
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. TIKET ROYAL GACHA */}
            <div className="p-5 sm:p-6 rounded-2xl border border-cyan-500/30 bg-[#120824]/90 space-y-4 flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-cyan-300">
                  <Dices className="w-4 h-4 text-cyan-400" />
                  Injeksi Tiket Royal Gacha
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Kirim tiket Royal Gacha langsung ke inventaris member untuk dipakai summon di gacha shrine.
                </p>

                {/* Ticket Presets */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {[1, 5, 10, 50].map((val) => (
                    <button
                      key={val}
                      type="button"
                      disabled={loadingAction || !selectedUser}
                      onClick={() => executeGiftAction({ action: "ADD_GACHA_TICKETS", amount: val })}
                      className="h-10 px-2 rounded-xl text-xs font-bold border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/25 transition-all disabled:opacity-50 text-center"
                    >
                      +{val} 🎟️
                    </button>
                  ))}
                </div>

                {/* Custom Tickets */}
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="number"
                    min="1"
                    value={customTickets}
                    onChange={(e) => setCustomTickets(Number(e.target.value))}
                    placeholder="Jumlah Tiket..."
                    className="flex-1 h-11 px-3.5 rounded-xl border border-cyan-500/30 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    disabled={loadingAction || !selectedUser}
                    onClick={() => executeGiftAction({ action: "ADD_GACHA_TICKETS", amount: customTickets })}
                    className="h-11 px-4 rounded-xl text-xs font-bold bg-cyan-500 text-black hover:bg-cyan-400 transition-all disabled:opacity-50 whitespace-nowrap shrink-0 shadow-md shadow-cyan-500/20"
                  >
                    Kirim Tiket
                  </button>
                </div>

                {/* Checkin Streak */}
                <div className="flex items-center gap-2 pt-3 mt-3 border-t border-white/5">
                  <input
                    type="number"
                    min="0"
                    value={customStreak}
                    onChange={(e) => setCustomStreak(Number(e.target.value))}
                    placeholder="Set Check-in Streak (hari)..."
                    className="flex-1 h-11 px-3.5 rounded-xl border border-orange-500/30 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-orange-400"
                  />
                  <button
                    type="button"
                    disabled={loadingAction || !selectedUser}
                    onClick={() => executeGiftAction({ action: "SET_CHECKIN_STREAK", streak: customStreak })}
                    className="h-11 px-4 rounded-xl text-xs font-bold border border-orange-500/40 bg-orange-500/20 text-orange-200 hover:bg-orange-500/30 transition-all disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    🔥 Set Streak
                  </button>
                </div>
              </div>
            </div>

            {/* 3. KOLEKSI GUILD ARMORY */}
            <div className="p-5 sm:p-6 rounded-2xl border border-purple-500/30 bg-[#120824]/90 space-y-4 flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-purple-300">
                    <Shield className="w-4 h-4 text-purple-400" />
                    Koleksi Guild Armory (Bingkai &amp; Gelar)
                  </div>
                  <span className="text-[10px] text-purple-400 font-mono">
                    {ARMORY_ITEMS.length} Katalog
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Berikan bingkai Discord-style animasi atau gelar ksatria Eropa secara individual atau buka total 1-klik.
                </p>

                {/* 1-Click UNLOCK ALL */}
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={loadingAction || !selectedUser}
                    onClick={() => executeGiftAction({ action: "GIVE_ARMORY_ITEM", itemId: "UNLOCK_ALL" })}
                    className="w-full h-11 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-lg shadow-purple-600/30 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    ✨ Buka Seluruh Koleksi Armory (Semua)
                  </button>
                </div>

                {/* Individual Item Grant - Vertical Layout */}
                <div className="space-y-2.5 mt-3 pt-3 border-t border-white/5">
                  <label className="text-[11px] font-bold text-gray-300 block">Pilih Item Armory Spesifik:</label>
                  <select
                    value={selectedArmoryItem}
                    onChange={(e) => setSelectedArmoryItem(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-purple-500/30 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-purple-400"
                  >
                    {ARMORY_ITEMS.map((item) => (
                      <option key={item.id} value={item.id}>
                        [{item.type === "AVATAR_FRAME" ? "Bingkai" : "Gelar"}] {item.name}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={loadingAction || !selectedUser}
                      onClick={() => executeGiftAction({ action: "GIVE_ARMORY_ITEM", itemId: selectedArmoryItem, equipImmediately: true })}
                      className="w-full h-11 rounded-xl text-xs font-bold border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Pasang / Berikan Item
                    </button>
                    <button
                      type="button"
                      disabled={loadingAction || !selectedUser}
                      onClick={() => executeGiftAction({ action: "REVOKE_ARMORY_ITEM", itemId: selectedArmoryItem })}
                      className="w-full h-11 rounded-xl text-xs font-bold border border-rose-500/40 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cabut Item Ini
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. STATUS VIP, TRIAL & VERIFIED SELLER */}
            <div className="p-5 sm:p-6 rounded-2xl border border-amber-500/30 bg-[#120824]/90 space-y-4 flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
                  <Award className="w-4 h-4 text-amber-400" />
                  Status VIP, Trial &amp; Verified Seller
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Kelola pangkat donatur, masa uji coba khusus (VIP/Armory), serta lencana penjual resmi.
                </p>

                {/* Donator Caste Presets */}
                <div className="space-y-1.5 mt-4">
                  <label className="text-[11px] font-bold text-gray-300 block">Anugerahkan Gelar Kasta:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Noble Patron", "High Merchant", "Knight"].map((b) => (
                      <button
                        key={b}
                        type="button"
                        disabled={loadingAction || !selectedUser}
                        onClick={() => executeGiftAction({ action: "SET_CASTE_BADGE", badge: b, badgeMode: "ADD" })}
                        className="h-10 px-2 rounded-xl text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/25 transition-all disabled:opacity-50 text-center"
                      >
                        💎 {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trial VIP & Armory */}
                <div className="space-y-2 pt-3 mt-3 border-t border-white/5">
                  <label className="text-[11px] font-bold text-gray-300 block">Akses Trial Durasi Terbatas:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={trialType}
                      onChange={(e) => setTrialType(e.target.value)}
                      className="h-11 px-3 rounded-xl border border-purple-500/30 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-purple-400"
                    >
                      <option value="VIP_PREMIUM">VIP Premium</option>
                      <option value="ALL_FRAMES">Semua Frame</option>
                      <option value="VERIFIED_SELLER_TRIAL">Trial Seller</option>
                    </select>

                    <select
                      value={trialDays}
                      onChange={(e) => setTrialDays(Number(e.target.value))}
                      className="h-11 px-3 rounded-xl border border-purple-500/30 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-purple-400"
                    >
                      <option value={7}>7 Hari</option>
                      <option value={14}>14 Hari</option>
                      <option value={30}>30 Hari</option>
                      <option value={90}>90 Hari</option>
                      <option value={365}>1 Tahun</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={loadingAction || !selectedUser}
                    onClick={() =>
                      executeGiftAction({
                        action: "SET_TRIAL",
                        trialType,
                        trialDays,
                      })
                    }
                    className="w-full h-11 rounded-xl text-xs font-bold border border-purple-500/50 bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    Aktivasi Trial Sekarang
                  </button>
                </div>

                {/* Verified Seller Switch */}
                <div className="space-y-2 pt-3 mt-3 border-t border-white/5">
                  <label className="text-[11px] font-bold text-gray-300 block">Lencana Verified Seller Lapak:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={loadingAction || !selectedUser}
                      onClick={() => executeGiftAction({ action: "SET_VERIFIED_SELLER", isVerified: true })}
                      className="w-full h-11 rounded-xl text-xs font-bold border border-cyan-500/50 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4 text-cyan-400" />
                      Aktifkan Verified Seller
                    </button>
                    <button
                      type="button"
                      disabled={loadingAction || !selectedUser}
                      onClick={() => executeGiftAction({ action: "SET_VERIFIED_SELLER", isVerified: false })}
                      className="w-full h-11 rounded-xl text-xs font-bold border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cabut Lencana
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. SUNTIK & TETAPKAN SALDO HORIZON COINS (🪙 HC) */}
            <div className="p-5 sm:p-6 rounded-2xl border border-amber-500/40 bg-[#120824]/90 space-y-4 flex flex-col justify-between shadow-lg md:col-span-2">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
                  <span className="text-base">🪙</span>
                  Suntik &amp; Tetapkan Saldo Horizon Coins (HC)
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Tambahkan atau sesuaikan saldo Horizon Coins (🪙 HC) petualang untuk misi, gacha, maupun belanja armory.
                </p>

                {/* Coin Presets */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                  {[100, 500, 1200, 5000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      disabled={loadingAction || !selectedUser}
                      onClick={() => executeGiftAction({ action: "ADD_COINS", amount: val })}
                      className="h-10 px-3 rounded-xl text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>🪙</span>
                      <span>+{val.toLocaleString("id-ID")} HC</span>
                    </button>
                  ))}
                </div>

                {/* Custom Coins */}
                <div className="flex flex-col sm:flex-row items-center gap-2 mt-3">
                  <div className="relative flex-1 w-full">
                    <span className="absolute left-3.5 top-3 text-sm pointer-events-none">🪙</span>
                    <input
                      type="number"
                      min="0"
                      value={customCoins}
                      onChange={(e) => setCustomCoins(Number(e.target.value))}
                      placeholder="Nominal custom Horizon Coins..."
                      className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-amber-500/30 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      disabled={loadingAction || !selectedUser}
                      onClick={() => executeGiftAction({ action: "ADD_COINS", amount: customCoins })}
                      className="flex-1 sm:flex-none h-11 px-4 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition-all disabled:opacity-50 whitespace-nowrap shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      Suntik Koin (+)
                    </button>
                    <button
                      type="button"
                      disabled={loadingAction || !selectedUser}
                      onClick={() => executeGiftAction({ action: "SET_COINS", coins: customCoins })}
                      className="flex-1 sm:flex-none h-11 px-4 rounded-xl text-xs font-bold border border-amber-500/40 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
                    >
                      Tetapkan Saldo (=)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODUL B: LIVE FEATURE TOGGLE SWITCHER */}
      {/* ========================================================================= */}
      {activeSubTab === "switchboard" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl border border-purple-500/30 bg-[#120824]/90 space-y-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-purple-400" />
              Papan Sakelar Fitur Live (Universal Switchboard)
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              Kendalikan status operasional seluruh modul LogHorizon secara langsung tanpa perlu melakukan redeploy aplikasi.
              Perubahan status disimpan di database sistem (<code className="text-purple-300 font-mono">SiteConfig</code>) dan diaudit otomatis ke channel Discord <span className="text-amber-400 font-mono font-bold">#🛡️・mod-logs</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: "featureGachaEnabled" as keyof FeatureFlags,
                title: "Royal Gacha System",
                desc: "Shrine gacha harian untuk summon avatar frames Discord & gelar job ksatria.",
                route: "/profile?tab=gacha",
                color: "cyan",
              },
              {
                key: "featureArmoryEnabled" as keyof FeatureFlags,
                title: "Guild Armory Shop",
                desc: "Katalog toko kosmetik bingkai avatar animasi & gelar bangsawan berbasis XP guild.",
                route: "/profile?tab=armory",
                color: "purple",
              },
              {
                key: "featureMarketplaceEnabled" as keyof FeatureFlags,
                title: "Marketplace & Rekber",
                desc: "Pusat jual beli akun game & jasa rekber (escrow) aman terjamin komunitas.",
                route: "/marketplace",
                color: "amber",
              },
              {
                key: "featureDungeonEnabled" as keyof FeatureFlags,
                title: "Royal Dungeon & Wanted Bounty",
                desc: "Papan buronan penipu, daftar tahanan blacklist permanen, dan pelaporan sanksi.",
                route: "/dungeon",
                color: "rose",
              },
              {
                key: "featureGuestTournamentEnabled" as keyof FeatureFlags,
                title: "Pendaftaran Turnamen Tamu",
                desc: "Izinkan pendaftaran tim turnamen langsung untuk pengunjung tanpa wajib login akun.",
                route: "/events?view=turnamen",
                color: "emerald",
              },
              {
                key: "featurePartyEnabled" as keyof FeatureFlags,
                title: "Party Mabar (LFG Lobby)",
                desc: "Fitur rekrutmen rekan mabar real-time dengan sinkronisasi channel gaming Discord.",
                route: "/events?view=mabar",
                color: "indigo",
              },
              {
                key: "hideStaffFromLeaderboard" as keyof FeatureFlags,
                title: "Sembunyikan Bot & Staf dari Leaderboard",
                desc: "Saring akun bot Satpam AI dan jajaran Staf/Admin (.odyssia, Prince, Lord Commander) agar podium murni diperebutkan member reguler.",
                route: "/leaderboard",
                color: "amber",
              },
              {
                key: "maintenanceMode" as keyof FeatureFlags,
                title: "Mode Maintenance Darurat",
                desc: "Aktifkan spanduk darurat dan batasi sementara transaksi berisiko tinggi saat pembaruan besar.",
                route: "/",
                color: "red",
                isDanger: true,
              },
            ].map((sw) => {
              const isEnabled = Boolean(features[sw.key]);
              const isSaving = savingFeatureKey === sw.key;

              return (
                <div
                  key={sw.key}
                  className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                    sw.isDanger && isEnabled
                      ? "border-rose-500/70 bg-rose-950/40 shadow-lg shadow-rose-950/30"
                      : isEnabled
                      ? "border-purple-500/40 bg-[#160B2A]/90"
                      : "border-gray-800 bg-[#0E0617]/80 opacity-75"
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{sw.title}</h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isEnabled
                            ? sw.isDanger
                              ? "bg-rose-500 text-white animate-pulse"
                              : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                            : "bg-gray-800 border border-gray-700 text-gray-400"
                        }`}
                      >
                        {isEnabled ? "AKTIF ✅" : "NONAKTIF / SEMBUNYI ⛔"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{sw.desc}</p>
                    <span className="text-[10px] text-gray-500 font-mono block">Rute modul: {sw.route}</span>
                  </div>

                  <button
                    disabled={isSaving}
                    onClick={() => handleToggleFeature(sw.key, !isEnabled)}
                    className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                      isEnabled ? (sw.isDanger ? "bg-rose-600" : "bg-purple-600") : "bg-gray-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? "translate-x-7" : "translate-x-0"
                      } ${isSaving ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODUL C: REDEEM CODES & SPONSOR VOUCHERS (ODYSSIAVAULT) */}
      {/* ========================================================================= */}
      {activeSubTab === "vouchers" && (
        <div className="space-y-6">
          {/* HEADER BANNER */}
          <div className="p-5 sm:p-6 rounded-2xl border border-cyan-500/30 bg-[#120824]/90 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-cyan-400" />
                  Pusat Penerbitan Kode Redeem &amp; Voucher Sponsor
                </h2>
                <p className="text-xs text-gray-300 max-w-2xl leading-relaxed mt-1">
                  Terbitkan kode hadiah internal guild (Tiket Gacha, XP, VIP) serta <strong>Voucher Diskon Promo Mitra Sponsor (<span className="text-cyan-400 font-bold">OdyssiaVault</span>)</strong>.
                  Voucher sponsor dapat diatur agar otomatis masuk ke slot <strong>Legendary Drop Royal Gacha</strong> selama stok tersedia.
                </p>
              </div>

              <button
                onClick={fetchRedeemCodes}
                disabled={loadingCodes}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-all self-start sm:self-center"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingCodes ? "animate-spin" : ""}`} />
                Segarkan Kode ({redeemCodes.length})
              </button>
            </div>

            {/* PRESET CHIPS */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                ⚡ Preset Cepat Sekali-Klik:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      code: "ODYSSIA15",
                      category: "SPONSOR_VOUCHER",
                      sponsorName: "OdyssiaVault",
                      title: "Diskon 15% Top-Up & Jasa OdyssiaVault",
                      rewardType: "SPONSOR_DISCOUNT",
                      rewardValue: 15,
                      maxUses: 20,
                      includeInGachaPool: true,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 transition-all"
                >
                  🏷️ OdyssiaVault Diskon 15% (ODYSSIA15)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      code: "ODYSSIA25",
                      category: "SPONSOR_VOUCHER",
                      sponsorName: "OdyssiaVault",
                      title: "Diskon 25% Jasa/Top-Up OdyssiaVault",
                      rewardType: "SPONSOR_DISCOUNT",
                      rewardValue: 25,
                      maxUses: 10,
                      includeInGachaPool: true,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 transition-all"
                >
                  🏷️ OdyssiaVault Diskon 25% (ODYSSIA25)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      code: "MABAR3X",
                      category: "GUILD_REWARD",
                      sponsorName: "LogHorizon",
                      title: "3x Tiket Royal Gacha Summon",
                      rewardType: "GACHA_TICKETS",
                      rewardValue: 3,
                      maxUses: 50,
                      includeInGachaPool: false,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 transition-all"
                >
                  🎁 Hadiah Mabar 3x Gacha (MABAR3X)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      code: "BONUSXP",
                      category: "GUILD_REWARD",
                      sponsorName: "LogHorizon",
                      title: "Bonus +2.000 XP Guild",
                      rewardType: "XP",
                      rewardValue: 2000,
                      maxUses: 100,
                      includeInGachaPool: false,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-purple-500/40 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20 transition-all"
                >
                  ✨ Bonus XP 2.000 (BONUSXP)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      code: "HC100FREE",
                      category: "GUILD_REWARD",
                      sponsorName: "LogHorizon",
                      title: "Bonus +100 Horizon Coins (HC)",
                      rewardType: "HORIZON_COINS",
                      rewardValue: 100,
                      maxUses: 100,
                      includeInGachaPool: false,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 transition-all"
                >
                  🪙 100 Horizon Coins (HC100FREE)
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* FORM CREATOR (1 Col) */}
            <form
              onSubmit={handleCreateCode}
              className="lg:col-span-1 p-5 rounded-2xl border border-cyan-500/30 bg-[#160B2A]/90 space-y-4 shadow-xl"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-cyan-300">
                <Ticket className="w-4 h-4 text-cyan-400" />
                Terbitkan Kode Baru
              </div>

              {/* CATEGORY SWITCH */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase">Kategori Kode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCodeCategory("SPONSOR_VOUCHER");
                      setNewRewardType("SPONSOR_DISCOUNT");
                      setNewTitle("Diskon 20% Top-Up & Jasa OdyssiaVault");
                      setNewIncludeGachaPool(true);
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                      codeCategory === "SPONSOR_VOUCHER"
                        ? "border-cyan-500 bg-cyan-500/20 text-cyan-200 shadow-sm"
                        : "border-purple-500/20 bg-black/20 text-gray-400 hover:text-white"
                    }`}
                  >
                    🏷️ Voucher Sponsor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCodeCategory("GUILD_REWARD");
                      setNewRewardType("GACHA_TICKETS");
                      setNewTitle("Hadiah 2x Tiket Royal Gacha");
                      setNewIncludeGachaPool(false);
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                      codeCategory === "GUILD_REWARD"
                        ? "border-amber-500 bg-amber-500/20 text-amber-200 shadow-sm"
                        : "border-purple-500/20 bg-black/20 text-gray-400 hover:text-white"
                    }`}
                  >
                    🎁 Hadiah Guild
                  </button>
                </div>
              </div>

              {/* CODE INPUT */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase">
                  Kode Promo / Redeem (Kapital, Tanpa Spasi)
                </label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                  placeholder="Contoh: ODYSSIA20, GACHAFREE"
                  className="w-full px-3 py-2 rounded-xl border border-cyan-500/30 bg-[#1A0E30] text-sm text-white font-mono uppercase tracking-wider"
                />
              </div>

              {/* TITLE */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase">Judul Hadiah / Promo</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Diskon 20% Top-Up OdyssiaVault"
                  className="w-full px-3 py-2 rounded-xl border border-cyan-500/30 bg-[#1A0E30] text-xs text-white"
                />
              </div>

              {codeCategory === "SPONSOR_VOUCHER" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase">Nama Sponsor</label>
                      <input
                        type="text"
                        value={newSponsorName}
                        onChange={(e) => setNewSponsorName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-cyan-500/30 bg-[#1A0E30] text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase">Diskon (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={newRewardValue}
                        onChange={(e) => setNewRewardValue(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-cyan-500/30 bg-[#1A0E30] text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-gray-400 uppercase">Tautan Aksi Sponsor</label>
                      <span className="text-[10px] text-cyan-400 font-mono">odyssiavault.kiospremium.site</span>
                    </div>
                    <input
                      type="url"
                      value={newSponsorUrl}
                      onChange={(e) => setNewSponsorUrl(e.target.value)}
                      placeholder="http://odyssiavault.kiospremium.site/"
                      className="w-full px-3 py-2 rounded-xl border border-cyan-500/30 bg-[#1A0E30] text-xs text-white"
                    />
                    <p className="text-[10px] text-cyan-300/80">
                      Kode Voucher Toko OdyssiaVault (Dipakai user saat checkout di odyssiavault.kiospremium.site)
                    </p>
                  </div>
                </>
              )}

              {codeCategory === "GUILD_REWARD" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase">Tipe Hadiah</label>
                    <select
                      value={newRewardType}
                      onChange={(e) => setNewRewardType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-amber-500/30 bg-[#1A0E30] text-xs text-white"
                    >
                      <option value="HORIZON_COINS">🪙 Horizon Coins (HC)</option>
                      <option value="GACHA_TICKETS">Tiket Gacha</option>
                      <option value="XP">Bonus XP</option>
                      <option value="VIP_TRIAL_DAYS">Hari Trial VIP</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase">Jumlah Hadiah</label>
                    <input
                      type="number"
                      min="1"
                      value={newRewardValue}
                      onChange={(e) => setNewRewardValue(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-amber-500/30 bg-[#1A0E30] text-xs text-white"
                    />
                  </div>
                </div>
              )}

              {/* QUOTA & EXPIRY */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase">Batas Kuota Stok</label>
                  <input
                    type="number"
                    min="1"
                    value={newMaxUses}
                    onChange={(e) => setNewMaxUses(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-cyan-500/30 bg-[#1A0E30] text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase">Berlaku (Hari)</label>
                  <input
                    type="number"
                    min="0"
                    value={newExpiresInDays}
                    onChange={(e) => setNewExpiresInDays(Number(e.target.value))}
                    placeholder="0 = Selamanya"
                    className="w-full px-3 py-2 rounded-xl border border-cyan-500/30 bg-[#1A0E30] text-xs text-white"
                  />
                </div>
              </div>

              {/* CHECKBOX GACHA POOL */}
              {codeCategory === "SPONSOR_VOUCHER" && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIncludeGachaPool}
                    onChange={(e) => setNewIncludeGachaPool(e.target.checked)}
                    className="mt-0.5 rounded text-cyan-500 focus:ring-cyan-400"
                  />
                  <div className="text-xs text-gray-300">
                    <span className="font-bold text-white block">
                      🎰 Masukkan ke Pool Hadiah Legendary Royal Gacha
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Voucher ini bisa keluar sebagai Jackpot Langka saat petualang summon di gacha shrine selama stok masih ada.
                    </span>
                  </div>
                </label>
              )}

              <button
                type="submit"
                disabled={loadingAction || !newCode.trim()}
                className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {loadingAction ? "Menerbitkan..." : "⚡ Terbitkan Kode / Voucher"}
              </button>
            </form>

            {/* LIST ACTIVE CODES (2 Cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Daftar Kode &amp; Voucher Terbit ({redeemCodes.length})
                </span>
              </div>

              {loadingCodes ? (
                <div className="p-8 text-center text-xs text-gray-400 font-mono">
                  <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin mx-auto mb-2" />
                  Memuat daftar kode...
                </div>
              ) : redeemCodes.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-gray-800 bg-[#120824]/50 text-center text-xs text-gray-400">
                  Belum ada kode redeem atau voucher sponsor yang diterbitkan. Gunakan preset di atas untuk mulai membuat kode promo.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[680px] overflow-y-auto pr-1">
                  {redeemCodes.map((code) => {
                    const isSponsor = code.category === "SPONSOR_VOUCHER";
                    const isExhausted = code.usedCount >= code.maxUses;
                    const percent = Math.min(100, Math.round((code.usedCount / code.maxUses) * 100));

                    return (
                      <div
                        key={code.id}
                        className={`p-4 rounded-2xl border space-y-3 transition-all ${
                          !code.isActive
                            ? "border-gray-800 bg-[#0E0617]/70 opacity-60"
                            : isSponsor
                            ? "border-cyan-500/40 bg-gradient-to-br from-[#130E26] to-[#0D061C]"
                            : "border-amber-500/30 bg-[#160B2A]/90"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                  isSponsor
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                }`}
                              >
                                {code.code}
                              </span>
                              {code.includeInGachaPool && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                                  🎰 Gacha Pool
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-white mt-1 line-clamp-1">{code.title}</h4>
                            <span className="text-[10px] text-gray-400 block">
                              Hadiah: {code.rewardType === "HORIZON_COINS" ? `🪙 +${code.rewardValue.toLocaleString()} HC` : `${code.rewardType} (${code.rewardValue})`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(code)}
                              className="px-2 py-1 rounded-md text-[10px] font-bold border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/30 transition-all flex items-center gap-1 cursor-pointer"
                              title="Edit rincian voucher / kode"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleCodeActive(code.id, code.isActive)}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${
                                code.isActive
                                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                                  : "border-gray-700 bg-gray-800 text-gray-400"
                              }`}
                              title="Klik untuk nyalakan / matikan"
                            >
                              {code.isActive ? "AKTIF" : "OFF"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCode(code.id, code.code)}
                              className="p-1 text-gray-500 hover:text-rose-400 rounded transition-all cursor-pointer"
                              title="Hapus Kode"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* USAGE PROGRESS BAR */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-gray-400">
                            <span>Klaim: {code.usedCount} / {code.maxUses}</span>
                            <span className={isExhausted ? "text-rose-400 font-bold" : "text-cyan-400"}>
                              {isExhausted ? "KUOTA HABIS" : `${percent}%`}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-black/60 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isExhausted
                                  ? "bg-rose-500"
                                  : isSponsor
                                  ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                                  : "bg-gradient-to-r from-amber-500 to-orange-500"
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>

                        {code.expiresAt && (
                          <div className="text-[9px] text-gray-500">
                            Kadaluwarsa: {new Date(code.expiresAt).toLocaleDateString("id-ID")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL EDIT VOUCHER / KODE REDEEM */}
      {/* ========================================================================= */}
      {editingCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#7C3AED]/60 bg-[#11091D] dark:bg-[#11091D] p-5 sm:p-7 text-left shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Edit Voucher / Kode: <span className="font-mono text-cyan-300">{editingCode.code}</span>
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Ubah rincian, batas kuota stok, masa berlaku, atau status aktif voucher.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCode(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCode} className="space-y-4">
              {/* Kode Promo & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-300 uppercase">
                    Kode Promo (Kapital) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editCodeValue}
                    onChange={(e) => setEditCodeValue(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                    className="w-full h-11 px-3.5 rounded-xl border border-cyan-500/30 bg-[#1A0E30] text-sm font-mono text-white tracking-wider focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-300 uppercase">Kategori Voucher</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full h-11 px-3.5 rounded-xl border border-purple-500/30 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="SPONSOR_VOUCHER">🏷️ Sponsor Voucher (Mitra)</option>
                    <option value="GUILD_REWARD">🎁 Hadiah Guild Internal</option>
                  </select>
                </div>
              </div>

              {/* Judul Hadiah */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-300 uppercase">
                  Judul Hadiah / Promo <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-purple-500/30 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* Sponsor Name & Action URL (Jika Sponsor Voucher) */}
              {editCategory === "SPONSOR_VOUCHER" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-300 uppercase">Nama Mitra Sponsor</label>
                    <input
                      type="text"
                      value={editSponsorName}
                      onChange={(e) => setEditSponsorName(e.target.value)}
                      placeholder="Contoh: OdyssiaVault"
                      className="w-full h-11 px-3.5 rounded-xl border border-cyan-500/30 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-gray-300 uppercase">Link Website Mitra Sponsor</label>
                      <span className="text-[10px] text-cyan-400 font-mono">odyssiavault.kiospremium.site</span>
                    </div>
                    <input
                      type="url"
                      value={editSponsorUrl}
                      onChange={(e) => setEditSponsorUrl(e.target.value)}
                      placeholder="http://odyssiavault.kiospremium.site/"
                      className="w-full h-11 px-3.5 rounded-xl border border-cyan-500/30 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                    <p className="text-[10px] text-cyan-300/80">
                      Kode Voucher Toko OdyssiaVault (Dipakai user saat checkout di odyssiavault.kiospremium.site)
                    </p>
                  </div>
                </div>
              )}

              {/* Reward Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-300 uppercase">Tipe Hadiah</label>
                  <select
                    value={editRewardType}
                    onChange={(e) => setEditRewardType(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-purple-500/30 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-purple-400"
                  >
                    {editCategory === "SPONSOR_VOUCHER" ? (
                      <>
                        <option value="SPONSOR_DISCOUNT">Diskon Persen / Nominal (%)</option>
                        <option value="GACHA_TICKETS">Tiket Gacha</option>
                        <option value="XP">Bonus XP</option>
                        <option value="VIP_TRIAL_DAYS">Hari Trial VIP</option>
                      </>
                    ) : (
                      <>
                        <option value="HORIZON_COINS">🪙 Horizon Coins (HC)</option>
                        <option value="GACHA_TICKETS">Tiket Gacha</option>
                        <option value="XP">Bonus XP</option>
                        <option value="VIP_TRIAL_DAYS">Hari Trial VIP</option>
                        <option value="SPONSOR_DISCOUNT">Diskon Mitra</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-300 uppercase">Nilai / Nominal Hadiah</label>
                  <input
                    type="number"
                    min="1"
                    value={editRewardValue}
                    onChange={(e) => setEditRewardValue(Number(e.target.value))}
                    className="w-full h-11 px-3.5 rounded-xl border border-purple-500/30 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Max Uses & Expire Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-gray-300 uppercase">Total Kuota Stok</label>
                    <span className="text-[10px] text-cyan-400 font-mono">Terklaim: {editingCode.usedCount}</span>
                  </div>
                  <input
                    type="number"
                    min={editingCode.usedCount || 1}
                    value={editMaxUses}
                    onChange={(e) => setEditMaxUses(Number(e.target.value))}
                    className="w-full h-11 px-3.5 rounded-xl border border-purple-500/30 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-gray-300 uppercase">Masa Berlaku</label>
                    {editExpiresAt && (
                      <button
                        type="button"
                        onClick={() => setEditExpiresAt("")}
                        className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                      >
                        Set Permanen
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    value={editExpiresAt}
                    onChange={(e) => setEditExpiresAt(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-purple-500/30 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Switches: Active & Gacha Pool */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="flex items-center justify-between p-3 rounded-xl border border-purple-500/30 bg-purple-950/20 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-white block">Status Aktif Voucher</span>
                    <span className="text-[11px] text-gray-400">
                      Nonaktifkan jika voucher sedang ditahan atau tidak boleh diklaim sementara waktu.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#7C3AED] focus:ring-[#7C3AED]"
                  />
                </label>

                {editCategory === "SPONSOR_VOUCHER" && (
                  <label className="flex items-center justify-between p-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20 cursor-pointer">
                    <div>
                      <span className="text-xs font-bold text-white block">🎰 Masukkan ke Pool Royal Gacha</span>
                      <span className="text-[11px] text-gray-400">
                        Dapat keluar sebagai Legendary Jackpot saat petualang summon di gacha shrine.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editIncludeGachaPool}
                      onChange={(e) => setEditIncludeGachaPool(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400"
                    />
                  </label>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingCode(null)}
                  className="px-4 h-11 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 h-11 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-black hover:brightness-110 shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingEdit ? "Menyimpan..." : "💾 Simpan Perubahan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
