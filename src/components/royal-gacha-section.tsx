"use client";

import { useEffect, useState } from "react";
import { Sparkles, Zap, Ticket, Crown, ShieldAlert, Award, Gift, RefreshCw, ChevronRight, ExternalLink } from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { RedeemCodeBox } from "@/components/redeem-code-box";

interface GachaDrop {
  id: string;
  name: string;
  description: string;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  type: string;
  amountXp?: number;
  cosmeticId?: string;
  trialDurationDays?: number;
  sponsorCode?: string;
  claimSerial?: string;
  sponsorName?: string;
  sponsorActionUrl?: string;
  icon: string;
  glowColor: string;
}

interface SponsorDropInfo {
  id: string;
  sponsorName: string;
  title: string;
  rewardValue: number;
  maxUses: number;
  usedCount: number;
}

interface GachaUserData {
  id: string;
  username: string | null;
  xp: number;
  dailyGachaTickets: number;
  gachaPityCounter: number;
  tempTitle: string | null;
  tempTitleExpiresAt: string | null;
}

export function RoyalGachaSection({ onUpdate }: { onUpdate?: () => void }) {
  const [userData, setUserData] = useState<GachaUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [summoning, setSummoning] = useState(false);
  const [hasActiveSponsorDrop, setHasActiveSponsorDrop] = useState(false);
  const [activeSponsorDrops, setActiveSponsorDrops] = useState<SponsorDropInfo[]>([]);
  const [recentDrops, setRecentDrops] = useState<GachaDrop[] | null>(null);
  const [summonFeedback, setSummonFeedback] = useState<{
    message: string;
    totalXp: number;
    wonLegendary: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchGachaData() {
    try {
      const res = await fetch("/api/armory/gacha");
      const data = await readApiResponse<{
        isLoggedIn: boolean;
        user: GachaUserData | null;
        hasActiveSponsorDrop?: boolean;
        activeSponsorDrops?: SponsorDropInfo[];
      }>(
        res,
        "Gagal memuat Royal Gacha"
      );
      if (data.user) {
        setUserData(data.user);
      }
      setHasActiveSponsorDrop(Boolean(data.hasActiveSponsorDrop));
      setActiveSponsorDrops(data.activeSponsorDrops || []);
    } catch (err: any) {
      console.warn("Gacha fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchGachaData();
  }, []);

  async function handleSummon(type: "SINGLE" | "MULTI_5") {
    setSummoning(true);
    setError(null);
    setRecentDrops(null);
    setSummonFeedback(null);

    try {
      const res = await fetch("/api/armory/gacha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await readApiResponse<{
        success: boolean;
        message: string;
        drops: GachaDrop[];
        user: GachaUserData;
        totalXpGained: number;
        wonLegendary: boolean;
      }>(res, "Gagal memanggil Royal Gacha");

      setUserData(data.user);
      setRecentDrops(data.drops);
      setSummonFeedback({
        message: data.message,
        totalXp: data.totalXpGained,
        wonLegendary: data.wonLegendary,
      });
      onUpdate?.();
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat memanggil Royal Gacha.");
    } finally {
      setSummoning(false);
    }
  }

  const tickets = userData?.dailyGachaTickets ?? 0;
  const xp = userData?.xp ?? 0;
  const pity = userData?.gachaPityCounter ?? 0;
  const pityProgress = Math.min(100, (pity / 10) * 100);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#1E1100] via-[#160B21] to-[#0D0518] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Crown size={12} className="text-amber-400" /> ROYAL GACHA SUMMON
              </span>
              <span className="text-xs text-gray-400 font-mono">Gerbang Keberuntungan Takdir</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Panggil Hadiah &amp; Berkah Kerajaan</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
              Gunakan <strong>Tiket Absen Harian</strong> atau tukarkan XP untuk memanggil Bingkai Discord Eksklusif, Gelar Permanen, Akses Trial VIP Noble Patron, dan Jackpot hingga 1.000 XP!
            </p>
          </div>

          {/* User Resource Balance */}
          <div className="shrink-0 grid grid-cols-2 gap-2.5 p-3 sm:p-4 rounded-xl border border-amber-500/20 bg-[#140824]/90 backdrop-blur-md">
            <div className="flex items-center gap-2.5 pr-2 border-r border-[#2A1B42]">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
                <Ticket size={18} />
              </div>
              <div>
                <p className="text-[10px] font-mono text-gray-400 uppercase">Tiket Gratis</p>
                <p className="text-base sm:text-lg font-black text-amber-400 font-mono">
                  {tickets} <span className="text-[10px] text-gray-400 font-normal">Tiket</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pl-1">
              <div className="w-9 h-9 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold">
                <Zap size={18} />
              </div>
              <div>
                <p className="text-[10px] font-mono text-gray-400 uppercase">Saldo XP</p>
                <p className="text-base sm:text-lg font-black text-purple-300 font-mono">
                  {xp.toLocaleString("id-ID")} <span className="text-[10px] text-gray-400 font-normal">XP</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pity Counter Gauge Bar */}
        <div className="mt-6 pt-5 border-t border-amber-500/20">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-gray-300 flex items-center gap-1.5 font-bold">
              <Sparkles size={14} className="text-amber-400" />
              Sistem Pity Kerajaan: <span className="text-amber-400">{pity} / 10</span>
            </span>
            <span className="text-[11px] text-gray-400">
              {pity >= 9 ? (
                <span className="text-amber-300 font-bold animate-pulse">🔥 Tarikan Berikutnya Dijamin EPIC / LEGENDARY!</span>
              ) : (
                `Jaminan Hadiah Epic / Legendary dalam ${10 - pity} tarikan`
              )}
            </span>
          </div>
          <div className="w-full h-3 bg-black/40 rounded-full border border-amber-500/30 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-amber-500 to-amber-300 transition-all duration-500 rounded-full"
              style={{ width: `${pityProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Dynamic Sponsor Drop Banner */}
      {hasActiveSponsorDrop && (
        <div className="p-4 rounded-xl border border-amber-400/50 bg-gradient-to-r from-[#2A1600] via-[#1F0E30] to-[#140824] shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/40">
              <Gift size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/50 uppercase tracking-wider">
                  🔥 SPECIAL SPONSOR DROP AKTIF
                </span>
                <span className="text-[11px] font-mono text-gray-300">
                  {activeSponsorDrops.map((d) => d.sponsorName).join(", ") || "OdyssiaVault"}
                </span>
              </div>
              <p className="text-xs text-white font-medium mt-1">
                Menangkan Voucher Diskon Sponsor langsung di slot <strong>LEGENDARY</strong> Royal Gacha!
              </p>
            </div>
          </div>
          <a
            href="https://odyssiavault.com"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 text-xs font-mono font-bold transition-colors"
          >
            <span>Kunjungi Sponsor</span>
            <ExternalLink size={12} />
          </a>
        </div>
      )}

      {/* Error / Alert Display */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/30 text-xs text-red-300 flex items-center gap-2.5">
          <ShieldAlert size={16} className="text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Single Summon */}
        <button
          type="button"
          disabled={summoning || (tickets < 1 && xp < 150)}
          onClick={() => void handleSummon("SINGLE")}
          className="p-5 rounded-2xl border border-purple-500/40 bg-gradient-to-r from-[#200D3B] to-[#120724] hover:border-purple-400 hover:from-[#2B124F] hover:to-[#1A0A33] transition-all duration-200 text-left relative overflow-hidden group shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-mono font-bold">
              1x PANGGIL
            </span>
            <span className="text-xs font-mono text-purple-300 font-bold">
              {tickets >= 1 ? "Gratis (1 Tiket)" : "Biaya: 150 XP"}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white group-hover:text-purple-300 transition-colors">
            Panggil 1 Hadiah
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Uji takdirmu untuk satu berkah keberuntungan kerajaan.
          </p>
        </button>

        {/* 5x Multi Summon */}
        <button
          type="button"
          disabled={summoning || (tickets < 5 && xp < 700)}
          onClick={() => void handleSummon("MULTI_5")}
          className="p-5 rounded-2xl border border-amber-500/50 bg-gradient-to-r from-[#2F1B00] via-[#200D3B] to-[#120724] hover:border-amber-400 hover:from-[#3D2300] hover:to-[#220E40] transition-all duration-200 text-left relative overflow-hidden group shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <div className="absolute -top-3 -right-3 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-bold flex items-center gap-1">
              <Sparkles size={11} /> 5x MULTI-SUMMON (HEMAT 50 XP!)
            </span>
            <span className="text-xs font-mono text-amber-300 font-bold">
              {tickets >= 5 ? "Gratis (5 Tiket)" : "Biaya: 700 XP"}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white group-hover:text-amber-300 transition-colors">
            Panggil 5 Hadiah Sekaligus
          </h3>
          <p className="text-xs text-gray-300 mt-1">
            Peluang tertinggi menaikkan pity meter dan memicu Legendary drop!
          </p>
        </button>
      </div>

      {/* Summoning Animation Banner */}
      {summoning && (
        <div className="p-8 rounded-2xl border border-amber-500/40 bg-[#120721] text-center space-y-3 animate-pulse">
          <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-r from-purple-500 to-amber-500 flex items-center justify-center animate-spin">
            <Sparkles size={28} className="text-white" />
          </div>
          <h4 className="text-base font-black text-amber-300 tracking-wide uppercase font-mono">
            Membuka Gerbang Takdir Kerajaan...
          </h4>
          <p className="text-xs text-gray-400">
            Energi spiritual LogHorizon sedang memanggil berkah teragung untukmu...
          </p>
        </div>
      )}

      {/* Recent Summon Result Cards */}
      {recentDrops && recentDrops.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl border border-purple-500/30 bg-[#120721]/90 backdrop-blur-md space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-amber-400" />
              <h3 className="text-sm sm:text-base font-black text-white uppercase font-mono tracking-wider">
                Hasil Panggilan Royal Gacha
              </h3>
            </div>
            {summonFeedback && (
              <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full">
                Total Perolehan: +{summonFeedback.totalXp} XP
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
            {recentDrops.map((drop, idx) => {
              const isLegendary = drop.rarity === "LEGENDARY";
              const isEpic = drop.rarity === "EPIC";
              const isRare = drop.rarity === "RARE";

              return (
                <div
                  key={`${drop.id}-${idx}`}
                  className={`p-4 rounded-xl border flex flex-col items-center text-center justify-between gap-3 transition-transform duration-200 hover:scale-105 ${
                    isLegendary
                      ? "border-amber-400 bg-gradient-to-b from-amber-950/40 via-[#1E1100] to-[#140824] shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                      : isEpic
                        ? "border-purple-400 bg-gradient-to-b from-purple-950/40 via-[#1A0B2E] to-[#120721] shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                        : isRare
                          ? "border-sky-400/70 bg-[#0C1B2A] shadow-sm"
                          : "border-slate-700 bg-[#0E061A]"
                  }`}
                >
                  <div className="text-3xl my-1">{drop.icon}</div>
                  <div className="space-y-1">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                        isLegendary
                          ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                          : isEpic
                            ? "bg-purple-500/20 text-purple-300 border border-purple-400/40"
                            : isRare
                              ? "bg-sky-500/20 text-sky-300 border border-sky-400/40"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {drop.rarity}
                    </span>
                    <h5 className="text-xs font-bold text-white leading-tight line-clamp-2">
                      {drop.name}
                    </h5>
                    <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                      {drop.description}
                    </p>
                    {drop.type === "SPONSOR_VOUCHER" && drop.claimSerial && (
                      <div className="mt-2 w-full p-2 rounded-lg bg-amber-500/15 border border-amber-400/30 text-center space-y-1">
                        <p className="text-[10px] font-mono text-amber-300 font-bold">
                          Serial: {drop.claimSerial}
                        </p>
                        <a
                          href="/profile?tab=profile"
                          className="inline-flex items-center gap-1 text-[10px] text-amber-200 hover:text-white underline font-medium"
                        >
                          Buka Dompet Voucher <ChevronRight size={10} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rarity Rates & Rewards Legend */}
      <div className="p-4 sm:p-5 rounded-xl border border-[#2A1B42] bg-[#120B1E]/60 text-xs space-y-3">
        <h4 className="font-bold text-gray-300 uppercase tracking-wider font-mono text-[11px] flex items-center gap-2">
          <span>Peluang &amp; Daftar Hadiah (Drop Table)</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
            <div className="font-bold text-amber-400">🌟 LEGENDARY (7%)</div>
            <div className="text-gray-300 text-[10px] mt-1 space-y-0.5">
              {hasActiveSponsorDrop && (
                <p className="text-amber-300 font-bold">🔥 Voucher Mitra (OdyssiaVault)</p>
              )}
              <p>• 7-Hari VIP Noble Patron Trial</p>
              <p>• Bingkai Avatar Permanen</p>
              <p>• JACKPOT +1,000 XP</p>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/10">
            <div className="font-bold text-purple-400">🔮 EPIC (18%)</div>
            <div className="text-gray-300 text-[10px] mt-1 space-y-0.5">
              <p>• Gelar Tetap: Arcane Striker</p>
              <p>• 3-Hari Trial Semua Bingkai</p>
              <p>• Kantong +500 XP</p>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-sky-500/30 bg-sky-500/10">
            <div className="font-bold text-sky-400">🔷 RARE (25%)</div>
            <div className="text-gray-300 text-[10px] mt-1 space-y-0.5">
              <p>• Gelar 24 Jam: Fortune Seeker</p>
              <p>• Kotak Harta +250 XP</p>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/40">
            <div className="font-bold text-slate-300">⚪ COMMON (50%)</div>
            <div className="text-gray-400 text-[10px] mt-1 space-y-0.5">
              <p>• Pundi XP (+120 XP)</p>
              <p>• Kantong XP (+75 XP)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Redeem Code Box Integration */}
      <div className="pt-2">
        <RedeemCodeBox
          variant="compact"
          onSuccess={() => {
            void fetchGachaData();
            onUpdate?.();
          }}
        />
      </div>
    </div>
  );
}
