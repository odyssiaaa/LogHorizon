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

  // Preview properties
  const previewFrame =
    activeTab === "AVATAR_FRAME" && selectedItem
      ? selectedItem.id
      : userData?.equippedAvatarFrame;

  const previewTitle =
    activeTab === "CUSTOM_TITLE" && selectedItem
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
          </div>

          {/* Items Grid */}
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

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 ${
                    isSelected
                      ? "border-purple-500 bg-[#1D0F33] ring-1 ring-purple-500"
                      : isEquipped
                      ? "border-emerald-500/50 bg-[#140C24]"
                      : "border-[#2A1B42] bg-[#120822] hover:border-purple-500/50 hover:bg-[#180C2C]"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.previewColor }}
                        />
                        <h4 className="font-bold text-white text-sm sm:text-base leading-snug">
                          {item.name}
                        </h4>
                      </div>

                      {isEquipped ? (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                          <Check size={10} /> Terpasang
                        </span>
                      ) : isOwned ? (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">
                          {isOwner ? "👑 Milik Owner" : "Dimiliki"}
                        </span>
                      ) : (
                        <span className="shrink-0 font-mono font-bold text-xs text-purple-300">
                          {item.priceXp} XP
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-[#2A1B42]/80 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-gray-500">
                      {isSelected ? "Pratinjau Aktif" : "Klik untuk pratinjau"}
                    </span>

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
                            : "bg-emerald-600 hover:bg-emerald-500 text-white"
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
                            ? "bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        }`}
                      >
                        <Zap size={13} />
                        <span>{isProcessing ? "Menukar..." : `Tukar (${item.priceXp} XP)`}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Live Interactive Avatar Preview */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-[#2A1B42] bg-[#120822] shadow-xl space-y-5 sticky top-20">
            <div>
              <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-400">
                PRATINJAU LANGSUNG
              </p>
              <h3 className="text-base font-bold text-white">Tampilan Profilmu</h3>
            </div>

            {/* Avatar & Badges Showcase */}
            <div className="p-6 rounded-xl border border-purple-500/20 bg-gradient-to-b from-[#1E0F36] to-[#120822] text-center space-y-3">
              <div className="relative inline-block mx-auto">
                <DiscordAvatar
                  src={userData?.avatar ?? null}
                  username={userData?.username ?? "Gamer"}
                  size={84}
                  className="rounded-full mx-auto"
                  frameId={previewFrame}
                />
              </div>

              <div>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <h4 className="font-extrabold text-white text-base">
                    {userData?.username ?? "Petualang LogHorizon"}
                  </h4>
                  {previewTitle && getCustomTitleBadge(previewTitle) && (
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      {getCustomTitleBadge(previewTitle)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-purple-300 font-mono mt-1">
                  Level {userData?.level ?? 1} • {userData?.xp ?? 0} XP
                </p>
              </div>

              {/* Sample Forum Post Card Simulation */}
              <div className="mt-4 p-3 rounded-lg border border-[#2A1B42] bg-[#0E061A] text-left text-xs space-y-1.5">
                <span className="text-[10px] font-mono text-gray-500 uppercase block">
                  Simulasi Kartu Forum / Leaderboard:
                </span>
                <div className="flex items-center gap-2">
                  <DiscordAvatar
                    src={userData?.avatar ?? null}
                    username={userData?.username ?? "Gamer"}
                    size={24}
                    frameId={previewFrame}
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-gray-200">
                      {userData?.username ?? "Gamer"}
                    </span>
                    {previewTitle && getCustomTitleBadge(previewTitle) && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {getCustomTitleBadge(previewTitle)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {selectedItem && (
              <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-2 text-xs">
                <p className="font-bold text-white flex items-center justify-between">
                  <span>{selectedItem.name}</span>
                  <span className="font-mono text-purple-300">
                    {ownedItemIds.includes(selectedItem.id) ? "Sudah Dimiliki" : `${selectedItem.priceXp} XP`}
                  </span>
                </p>
                <p className="text-gray-400 text-[11px]">{selectedItem.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
