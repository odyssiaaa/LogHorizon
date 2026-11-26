"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Sparkles,
  Shield,
  Check,
  Zap,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { DiscordAvatar } from "@/components/discord-avatar";
import {
  ARMORY_ITEMS,
  type ArmoryItem,
  getAvatarFrameClasses,
  getCustomTitleBadge,
  getCustomTitleStyle,
} from "@/lib/armory-catalog";

type ArmoryUser = {
  id: string;
  username: string | null;
  avatar: string | null;
  xp: number;
  level: number;
  equippedAvatarFrame: string | null;
  equippedCustomTitle: string | null;
  isOwner?: boolean;
};

export function GuildArmoryShop({ onEquipChange }: { onEquipChange?: () => void }) {
  const { data: session } = useSession();
  const [userData, setUserData] = useState<ArmoryUser | null>(null);
  const [ownedItemIds, setOwnedItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"AVATAR_FRAME" | "CUSTOM_TITLE">("AVATAR_FRAME");
  const [selectedItem, setSelectedItem] = useState<ArmoryItem | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const isOwner = Boolean(
    userData?.isOwner ||
    userData?.username === ".odyssia" ||
    userData?.username === "odyssia" ||
    session?.user?.username === ".odyssia" ||
    session?.user?.username === "odyssia" ||
    session?.user?.discordId === "706661230835925042"
  );

  useEffect(() => {
    async function fetchArmory() {
      try {
        const res = await fetch("/api/armory");
        const data = await readApiResponse<{
          catalog: ArmoryItem[];
          user: ArmoryUser | null;
          ownedItemIds: string[];
        }>(res, "Gagal memuat Armory");

        if (data.user) {
          setUserData(data.user);
        }
        setOwnedItemIds(data.ownedItemIds || []);
      } catch (err) {
        console.error("Gagal memuat Armory:", err);
      } finally {
        setLoading(false);
      }
    }

    void fetchArmory();
  }, []);

  async function handleBuy(item: ArmoryItem) {
    if (!userData) return;
    if (userData.xp < item.priceXp) {
      setFeedback({
        message: `XP tidak mencukupi! Kamu butuh ${item.priceXp} XP (saat ini ${userData.xp} XP).`,
        type: "error",
      });
      return;
    }

    setProcessingId(item.id);
    setFeedback(null);

    try {
      const res = await fetch("/api/armory/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await readApiResponse<{
        success: boolean;
        message: string;
        user: { xp: number; equippedAvatarFrame: string | null; equippedCustomTitle: string | null };
      }>(res, "Gagal membeli item");

      setOwnedItemIds((prev) => [...prev, item.id]);
      setUserData((prev) =>
        prev
          ? {
              ...prev,
              xp: data.user.xp,
              equippedAvatarFrame: data.user.equippedAvatarFrame,
              equippedCustomTitle: data.user.equippedCustomTitle,
            }
          : null
      );
      setFeedback({ message: data.message, type: "success" });
      onEquipChange?.();
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : "Gagal membeli item.",
        type: "error",
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleToggleEquip(item: ArmoryItem, isCurrentlyEquipped: boolean) {
    if (!userData) return;
    setProcessingId(item.id);
    setFeedback(null);

    try {
      const res = await fetch("/api/armory/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: isCurrentlyEquipped ? null : item.id,
          type: item.type,
        }),
      });
      const data = await readApiResponse<{
        success: boolean;
        message: string;
        user: { equippedAvatarFrame: string | null; equippedCustomTitle: string | null };
      }>(res, "Gagal mengubah item");

      setUserData((prev) =>
        prev
          ? {
              ...prev,
              equippedAvatarFrame: data.user.equippedAvatarFrame,
              equippedCustomTitle: data.user.equippedCustomTitle,
            }
          : null
      );
      setFeedback({ message: data.message, type: "success" });
      onEquipChange?.();
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : "Gagal mengubah status pasang.",
        type: "error",
      });
    } finally {
      setProcessingId(null);
    }
  }

  const filteredItems = ARMORY_ITEMS.filter((item) => item.type === activeTab);

  // Live Interactive Preview Properties: selecting ANY item immediately previews it on user's avatar
  const previewFrame =
    selectedItem?.type === "AVATAR_FRAME"
      ? selectedItem.id
      : userData?.equippedAvatarFrame;

  const previewTitle =
    selectedItem?.type === "CUSTOM_TITLE"
      ? selectedItem.id
      : userData?.equippedCustomTitle;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#1A0B2E] via-[#120721] to-[#0D0518] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag size={12} /> GUILD ARMORY SHOP
              </span>
              <span className="text-xs text-gray-400 font-mono">Toko Kosmetik Profil</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Kustomisasi Identitas Petualang
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
              Tukarkan XP dan reputasi jerih payahmu dengan Bingkai Avatar bercahaya dan Gelar Kustom prestisius yang tampil di Forum, Papan Peringkat, dan Chat Guild!
            </p>
          </div>

          {/* User XP Badge */}
          <div className="shrink-0 p-4 rounded-xl border border-[#2A1B42] bg-[#1A0E2E]/80 backdrop-blur-md flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-[#A78BFA] flex items-center justify-center font-black">
              <Zap size={22} className="text-purple-400" />
            </div>
            <div>
              <p className="text-[11px] font-mono text-gray-400 uppercase">
                {isOwner ? "Hak Istimewa Owner" : "Saldo XP Kamu"}
              </p>
              {isOwner ? (
                <p className="text-sm sm:text-base font-black text-amber-400 font-mono flex items-center gap-1.5">
                  👑 Akses Penuh Emperor (Milik Owner • 0 XP)
                </p>
              ) : (
                <p className="text-xl sm:text-2xl font-black text-white font-mono">
                  {userData ? userData.xp.toLocaleString("id-ID") : 0}{" "}
                  <span className="text-xs text-purple-400 font-bold">XP</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-red-950/40 border-red-500/40 text-red-300"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Shop Grid: Left Catalog, Right Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Catalog */}
        <div className="lg:col-span-2 space-y-4">
          {/* Sub-Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-[#2A1B42] pb-2">
            <button
              onClick={() => {
                setActiveTab("AVATAR_FRAME");
                setSelectedItem(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "AVATAR_FRAME"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Sparkles size={15} />
              <span>Bingkai Avatar</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("CUSTOM_TITLE");
                setSelectedItem(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "CUSTOM_TITLE"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Shield size={15} />
              <span>Gelar Kustom</span>
            </button>
            <Link
              href="/profile?tab=gacha"
              className="ml-auto px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 shadow-sm"
            >
              <Zap size={13} className="text-amber-400" />
              <span>🔮 Royal Gacha Summon</span>
            </Link>
          </div>

          {/* Items Grid with Tiered Luxury Styling (Rare -> Mythic) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const isOwned = isOwner || ownedItemIds.includes(item.id);
              const isEquipped =
                item.type === "AVATAR_FRAME"
                  ? userData?.equippedAvatarFrame === item.id
                  : userData?.equippedCustomTitle === item.id;
              const isSelected = selectedItem?.id === item.id;
              const isProcessing = processingId === item.id;
              const canAfford = isOwner || (userData?.xp ?? 0) >= item.priceXp;
              const tier = item.tier ?? "RARE";

              // Tiered Card Container Styles
              const tierStyles =
                tier === "MYTHIC"
                  ? "border-amber-400/60 bg-gradient-to-br from-[#290B38] via-[#1B0826] to-[#2E1805] hover:border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.3),0_0_15px_rgba(168,85,247,0.2)]"
                  : tier === "LEGENDARY"
                  ? "border-amber-500/40 bg-[#1C1306]/90 hover:border-amber-400/70 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                  : tier === "EPIC"
                  ? "border-purple-500/35 bg-[#160B29]/90 hover:border-purple-400/60 shadow-[0_0_16px_rgba(168,85,247,0.2)]"
                  : "border-sky-500/30 bg-[#0B1528]/90 hover:border-sky-400/50 shadow-[0_0_12px_rgba(14,165,233,0.15)]";

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 group ${
                    isSelected
                      ? "ring-2 ring-amber-400 border-amber-300 scale-[1.01]"
                      : isEquipped
                      ? "border-emerald-500/60 bg-[#140C24] ring-1 ring-emerald-500/30"
                      : tierStyles
                  }`}
                >
                  {/* Cosmic Aurora Shimmer for Mythic Tier */}
                  {tier === "MYTHIC" && (
                    <div className="absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br from-amber-500/20 via-purple-500/25 to-pink-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
                  )}

                  <div className="space-y-2 relative z-10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: item.previewColor }}
                        />
                        <h4 className="font-bold text-white text-sm sm:text-base leading-snug">
                          {item.name}
                        </h4>
                      </div>

                      {/* Tier Badges */}
                      {tier === "MYTHIC" ? (
                        <span className="shrink-0 px-2 py-0.5 rounded text-[9px] font-mono font-extrabold bg-gradient-to-r from-amber-500/30 via-rose-500/30 to-purple-500/30 text-amber-300 border border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse">
                          🔥 MYTHIC PRESTIGE
                        </span>
                      ) : tier === "LEGENDARY" ? (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          🟨 LEGENDARY
                        </span>
                      ) : tier === "EPIC" ? (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          🟪 EPIC
                        </span>
                      ) : (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          🟦 RARE
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Status & Price Row */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 relative z-10">
                    <div className="flex items-center gap-2">
                      {isEquipped ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                          <Check size={10} /> Terpasang
                        </span>
                      ) : isOwned ? (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">
                          {isOwner ? "👑 Milik Owner" : "Dimiliki"}
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-xs text-amber-300 flex items-center gap-1">
                          <Zap size={11} className="text-amber-400" />
                          <span>{item.priceXp.toLocaleString("id-ID")} XP</span>
                        </span>
                      )}

                      <span className="text-[10px] font-mono text-gray-400 hidden sm:inline">
                        {isSelected ? "• Pratinjau Aktif" : ""}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div>
                      {isOwned ? (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleToggleEquip(item, isEquipped);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isEquipped
                              ? "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
                              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                          }`}
                        >
                          {isProcessing
                            ? "Memproses..."
                            : isEquipped
                            ? "Lepas"
                            : "Pasang"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isProcessing || !canAfford}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleBuy(item);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            canAfford
                              ? "bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white shadow-md shadow-purple-600/30"
                              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                          }`}
                        >
                          <Zap size={13} />
                          <span>{isProcessing ? "Menukar..." : `Tukar (${item.priceXp.toLocaleString("id-ID")} XP)`}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Live Interactive Avatar Preview */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-purple-500/30 bg-gradient-to-b from-[#180B2C] to-[#100720] shadow-2xl space-y-5 sticky top-20">
            <div>
              <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles size={12} /> PRATINJAU LANGSUNG
              </p>
              <h3 className="text-base font-bold text-white">Tampilan Profil Petualang</h3>
            </div>

            {/* Avatar & Badges Showcase */}
            <div className="p-6 rounded-xl border border-purple-500/30 bg-gradient-to-b from-[#220F3D] via-[#160B29] to-[#0E061A] text-center space-y-4 shadow-inner relative overflow-hidden">
              <div className="relative inline-block mx-auto py-2">
                <DiscordAvatar
                  src={userData?.avatar ?? null}
                  username={userData?.username ?? "Gamer"}
                  size={88}
                  className="rounded-full mx-auto"
                  frameId={previewFrame}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <h4 className="font-extrabold text-white text-base">
                    {userData?.username ?? "Petualang LogHorizon"}
                  </h4>
                  {previewTitle && getCustomTitleBadge(previewTitle) && (
                    <span
                      className={`text-[11px] font-mono px-2.5 py-0.5 rounded-md transition-all ${getCustomTitleStyle(
                        previewTitle
                      )}`}
                    >
                      {getCustomTitleBadge(previewTitle)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-purple-300 font-mono">
                  Level {userData?.level ?? 1} • {userData?.xp ?? 0} XP
                </p>
              </div>

              {/* Sample Forum Post Card Simulation */}
              <div className="mt-4 p-3 rounded-lg border border-purple-500/20 bg-[#0E061A]/90 text-left text-xs space-y-2">
                <span className="text-[10px] font-mono text-gray-400 uppercase block font-semibold">
                  Simulasi Kartu Forum / Leaderboard:
                </span>
                <div className="flex items-center gap-2.5">
                  <DiscordAvatar
                    src={userData?.avatar ?? null}
                    username={userData?.username ?? "Gamer"}
                    size={28}
                    frameId={previewFrame}
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-gray-200">
                      {userData?.username ?? "Gamer"}
                    </span>
                    {previewTitle && getCustomTitleBadge(previewTitle) && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-all ${getCustomTitleStyle(
                          previewTitle
                        )}`}
                      >
                        {getCustomTitleBadge(previewTitle)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {selectedItem && (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-2 text-xs">
                <p className="font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={12} className="text-amber-400" />
                    <span>{selectedItem.name}</span>
                  </span>
                  <span className="font-mono text-amber-300 font-bold">
                    {ownedItemIds.includes(selectedItem.id) || isOwner ? "Dimiliki" : `${selectedItem.priceXp.toLocaleString("id-ID")} XP`}
                  </span>
                </p>
                <p className="text-gray-300 text-[11px] leading-relaxed">{selectedItem.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
