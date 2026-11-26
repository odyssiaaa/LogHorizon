"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  BadgeCheck,
  Crown,
  Gem,
  HeartHandshake,
  QrCode,
  ShieldCheck,
  X,
  Coins,
  Sparkles,
  Zap,
  Flame,
  ArrowRight,
} from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { ImageUploader } from "@/components/ui/image-uploader";
import { openLoginModal } from "@/components/login-modal";
import { TOPUP_PACKAGES, type TopupPackage } from "@/lib/coin-economy";
import { PriceDisplay } from "@/context/locale-context";

const formatMoney = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const tiers = [
  {
    id: "ADVENTURER_SUPPORT",
    name: "Adventurer Support",
    icon: ShieldCheck,
    price: "Rp 10.000 - Rp 49.999",
    rangeText: "Rp 10.000 - Rp 49.999",
    badge: "Knight",
    min: 10000,
    max: 49999,
    benefits: [
      "Role & Lencana Knight di profil dan leaderboard",
      "Dukungan operasional server guild",
      "Diaktifkan setelah verifikasi Admin",
    ],
  },
  {
    id: "ELITE_PARTY_MEMBER",
    name: "Elite Party Member",
    icon: Crown,
    price: "Rp 50.000 - Rp 99.999",
    rangeText: "Rp 50.000 - Rp 99.999",
    badge: "High Merchant",
    min: 50000,
    max: 99999,
    benefits: [
      "Status Premium (Elite Party Member)",
      "Bebas fee marketplace dan sorotan khusus",
      "Role High Merchant setelah verifikasi Admin",
    ],
  },
  {
    id: "GUILD_BENEFACTOR",
    name: "Guild Benefactor",
    icon: Gem,
    price: "Mulai Rp 100.000+",
    rangeText: "Mulai Rp 100.000+",
    badge: "Noble Patron",
    min: 100000,
    max: Infinity,
    benefits: [
      "Lencana Noble Patron di profil & leaderboard",
      "Sorotan benefactor utama turnamen guild",
      "Role kehormatan Noble Patron setelah verifikasi Admin",
    ],
  },
] as const;

type TierId = (typeof tiers)[number]["id"];

type TreasurySummary = {
  total: number;
  goal: number | null;
  qrisImageUrl?: string;
  minDonation?: number;
};

function getTierByAmount(val: number): TierId {
  if (val >= 100000) return "GUILD_BENEFACTOR";
  if (val >= 50000) return "ELITE_PARTY_MEMBER";
  return "ADVENTURER_SUPPORT";
}

export function DonationForm({ simulationEnabled: _simulationEnabled }: { simulationEnabled: boolean }) {
  const { data: session } = useSession();
  const [formMode, setFormMode] = useState<"COIN_TOPUP" | "GUILD_DONATION">("COIN_TOPUP");
  const [selectedPackage, setSelectedPackage] = useState<TopupPackage | null>(null);
  const [tier, setTier] = useState<TierId | null>(null);
  const [amount, setAmount] = useState("50000");
  const [senderName, setSenderName] = useState("");
  const [notes, setNotes] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [treasury, setTreasury] = useState<TreasurySummary | null>(null);

  useEffect(() => {
    fetch("/api/donate")
      .then(async (response) => readApiResponse<TreasurySummary>(response, "Ringkasan kas gagal dimuat."))
      .then(setTreasury)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Ringkasan kas gagal dimuat."));
  }, []);

  function handleAmountChange(newVal: string) {
    setAmount(newVal);
    const num = Number(newVal);
    if (Number.isSafeInteger(num) && num > 0) {
      setTier(getTierByAmount(num));
    }
  }

  async function submitTransferConfirmation() {
    if (!session?.user) {
      openLoginModal();
      return;
    }
    const numericAmount = Number(amount);
    if (!Number.isSafeInteger(numericAmount) || numericAmount < 10000 || numericAmount > 10_000_000) {
      setError("Nominal donasi harus minimal Rp 10.000 (maksimal Rp 10.000.000).");
      return;
    }
    if (!senderName.trim()) {
      setError("Harap isi nama pengirim / pemilik rekening transfer.");
      return;
    }

    const currentTier = getTierByAmount(numericAmount);

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numericAmount,
          tier: currentTier,
          senderName: senderName.trim(),
          notes: notes.trim(),
          proofUrl: proofUrl.trim(),
          isCoinTopup: formMode === "COIN_TOPUP" || Boolean(selectedPackage),
          packageId: selectedPackage?.id,
          coinAmount: selectedPackage?.totalCoins,
        }),
      });

      const result = await readApiResponse<{ notice: string }>(response, "Konfirmasi pembayaran gagal dikirim.");
      setMessage(result.notice);
      setTier(null);
      setSelectedPackage(null);
      setSenderName("");
      setNotes("");
      setProofUrl("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Konfirmasi pembayaran gagal dikirim.");
    } finally {
      setLoading(false);
    }
  }

  const progress = treasury?.goal ? Math.min(100, (treasury.total / treasury.goal) * 100) : 0;
  const selectedTier = tiers.find((item) => item.id === tier) ?? tiers[0];
  const qrisUrl = treasury?.qrisImageUrl || process.env.NEXT_PUBLIC_QRIS_IMAGE_URL || "/qris-guild.png";

  return (
    <main className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-12 overflow-x-hidden text-left">
      <header className="treasury-hero mb-8 border-b border-slate-200 dark:border-[#2E1E45] pb-6">
        <p className="section-kicker text-xs font-mono font-bold text-slate-600 dark:text-[#A78BFA] uppercase tracking-widest mb-1.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#7C3AED]" />
          LOGHORIZON // COMMUNITY FUND &amp; TREASURY
        </p>
        <h1 className="page-title font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-[#F8FAFC] break-words">
          GUILD TREASURY <span className="text-purple-600 dark:text-[#A78BFA]">&amp; BENEFACTOR</span>
        </h1>
        <p className="muted-copy text-xs sm:text-sm md:text-base text-slate-600 dark:text-[#A78BFA] max-w-2xl mt-2 leading-relaxed font-sans">
          Dukung operasional server, kembangkan ekosistem, dan danai turnamen komunitas berhadiah massal. Setiap kontribusi kamu akan diverifikasi langsung oleh Admin untuk membuka kasta benefit eksklusif.
        </p>
      </header>

      {message && (
        <div className="p-4 rounded-none bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-xs font-mono font-semibold mb-6 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage("")} aria-label="Tutup"><X size={16} /></button>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-none bg-red-500/15 border border-red-500/30 text-red-500 dark:text-red-400 text-xs font-mono font-semibold mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Tutup"><X size={16} /></button>
        </div>
      )}

      {/* Tab Switcher: Top-Up Horizon Coin vs Donasi Kas Guild */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-[#2E1E45] pb-4 mb-6">
        <button
          type="button"
          onClick={() => {
            setFormMode("COIN_TOPUP");
            setTier(null);
            setSelectedPackage(null);
          }}
          className={`px-4 py-2.5 rounded-none font-mono text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            formMode === "COIN_TOPUP"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20 border-b-2 border-amber-600"
              : "text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/5"
          }`}
        >
          <Coins size={16} />
          <span>🪙 Top-Up Horizon Coin (HC)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setFormMode("GUILD_DONATION");
            setSelectedPackage(null);
          }}
          className={`px-4 py-2.5 rounded-none font-mono text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            formMode === "GUILD_DONATION"
              ? "bg-[#7C3AED] text-white shadow-lg shadow-purple-600/30 border-b-2 border-purple-400"
              : "text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/5"
          }`}
        >
          <Crown size={16} />
          <span>👑 Donasi Kas &amp; Kasta Guild</span>
        </button>
      </div>

      {formMode === "COIN_TOPUP" ? (
        <section className="space-y-6">
          {/* Kurs Resmi Banner */}
          <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#1A0E2E] to-purple-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                🪙
              </div>
              <div>
                <p className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={13} /> Kurs Referensi Resmi LogHorizon
                </p>
                <p className="text-base sm:text-lg font-black text-white font-mono mt-0.5">
                  1 HC = Rp 100 • 100 HC = Rp 10.000
                </p>
              </div>
            </div>
            <p className="text-xs font-mono text-gray-300 sm:text-right max-w-sm leading-relaxed">
              Dapat dipakai untuk beli Bingkai Discord Armory, Royal Gacha Summon, dan Kontrak Misi Antar-Pemain.
            </p>
          </div>

          {/* 5 Paket Top-Up Resmi */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {TOPUP_PACKAGES.map((pkg) => {
              const isPop = pkg.popular;
              const isBest = pkg.bestValue;
              const isSultan = pkg.sultan;

              return (
                <article
                  key={pkg.id}
                  className={`p-4 sm:p-5 rounded-xl border transition-all flex flex-col justify-between text-left relative overflow-hidden group ${
                    isSultan
                      ? "border-amber-400/60 bg-gradient-to-b from-[#280D38] via-[#180826] to-[#201107] shadow-[0_0_25px_rgba(245,158,11,0.25)]"
                      : isBest
                      ? "border-purple-500/50 bg-[#160B29]/95 shadow-[0_0_18px_rgba(168,85,247,0.2)]"
                      : isPop
                      ? "border-amber-500/40 bg-[#1B1205]/95 shadow-[0_0_16px_rgba(245,158,11,0.15)]"
                      : "border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-2xl">{pkg.icon}</span>
                      {pkg.badge && (
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black border ${pkg.badgeColor || "bg-amber-500/20 text-amber-300 border-amber-500/30"}`}>
                          {pkg.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      {pkg.name}
                    </h3>

                    <div className="my-2.5">
                      <PriceDisplay
                        amountIdr={pkg.priceIdr}
                        className="font-mono text-lg font-black text-emerald-500 dark:text-emerald-400"
                      />
                      <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                        Rp {pkg.priceIdr.toLocaleString("id-ID")}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 my-2.5">
                      <div className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                        <span>🪙</span>
                        <span>{pkg.totalCoins.toLocaleString("id-ID")} HC Total</span>
                      </div>
                      {pkg.bonusCoins > 0 ? (
                        <p className="text-[10px] font-mono text-emerald-400 mt-0.5">
                          {pkg.baseCoins} HC + Bonus {pkg.bonusCoins} HC
                        </p>
                      ) : (
                        <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                          100 HC Koin Dasar
                        </p>
                      )}
                    </div>

                    <p className="text-[11px] text-gray-400 leading-snug">
                      {pkg.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPackage(pkg);
                      setAmount(String(pkg.priceIdr));
                      setTier("ADVENTURER_SUPPORT");
                      setError("");
                    }}
                    className={`w-full mt-4 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSultan
                        ? "bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-md shadow-amber-500/30 hover:brightness-110"
                        : isBest
                        ? "bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30"
                        : isPop
                        ? "bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20"
                        : "bg-slate-900 dark:bg-white/10 hover:bg-slate-800 dark:hover:bg-white/20 text-white border border-white/10"
                    }`}
                  >
                    <span>Beli Paket Ini</span>
                    <ArrowRight size={13} />
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="treasury-tier-grid grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 my-6">
          {tiers.map(({ id, name, icon: Icon, price, badge, benefits }, index) => (
            <article className={`treasury-tier tier-${index + 1} p-5 sm:p-6 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] hover:border-[#7C3AED] transition-all flex flex-col justify-between text-left`} key={id}>
              <div>
                <div className="treasury-tier-icon w-10 h-10 rounded-none bg-slate-100 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45] text-purple-600 dark:text-[#A78BFA] flex items-center justify-center mb-3">
                  <Icon size={20} />
                </div>
                <p className="section-kicker text-[10px] font-mono font-bold text-slate-500 dark:text-[#A78BFA] uppercase tracking-wider">TIER 0{index + 1}</p>
                <h2 className="font-display text-lg md:text-xl font-bold uppercase tracking-tight break-words text-slate-900 dark:text-[#F8FAFC] mt-1">{name}</h2>
                <strong className="treasury-tier-price text-sm sm:text-base font-mono font-extrabold text-[#10B981] block my-1">{price}</strong>
                <span className="treasury-badge inline-block px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-none bg-purple-500/10 dark:bg-[#7C3AED]/15 text-purple-700 dark:text-[#A78BFA] border border-purple-500/20 dark:border-[#7C3AED]/30 my-2">
                  {badge}
                </span>
                <ul className="space-y-2 mt-3 font-sans">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2 text-xs sm:text-sm text-slate-600 dark:text-[#A78BFA] leading-snug">
                      <BadgeCheck size={15} className="text-[#7C3AED] shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                {(session?.user?.username === ".odyssia" || session?.user?.username === "odyssia") ? (
                  <p className="premium-state text-xs font-mono font-bold text-[#F59E0B] flex items-center gap-1.5 mt-3">
                    <ShieldCheck size={15} /> Benefit Guild Emperor &amp; Noble Patron Aktif
                  </p>
                ) : session?.user?.role === "ADMIN" ? (
                  <p className="premium-state text-xs font-mono font-bold text-purple-600 dark:text-[#A78BFA] flex items-center gap-1.5 mt-3">
                    <ShieldCheck size={15} /> Hak Istimewa Prince / Princess (High Council) Aktif
                  </p>
                ) : (id === "ELITE_PARTY_MEMBER" && session?.user?.isPremium) && (
                  <p className="premium-state text-xs font-mono font-bold text-[#10B981] flex items-center gap-1.5 mt-3">
                    <ShieldCheck size={15} /> Status Premium aktif
                  </p>
                )}
              </div>
              <button
                type="button"
                className="w-full mt-6 py-2.5 rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-white border border-[#7C3AED] justify-center flex items-center gap-2 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedPackage(null);
                  setTier(id);
                  setAmount(id === "ADVENTURER_SUPPORT" ? "25000" : id === "ELITE_PARTY_MEMBER" ? "50000" : "100000");
                  setError("");
                }}
              >
                <HeartHandshake size={16} /> <span>Pilih Tier Ini</span>
              </button>
            </article>
          ))}
        </div>
      )}

      <p className="donation-disclaimer treasury-disclaimer text-xs text-slate-500 dark:text-[#A78BFA] font-mono mt-4 leading-relaxed">
        Seluruh donasi disalurkan via QRIS resmi perbendaharaan guild LogHorizon. Demi keamanan dan akurasi kas, setiap transaksi wajib dikonfirmasi dan diverifikasi oleh jajaran Admin sebelum status kasta diaktifkan.
      </p>

      {/* QRIS PAYMENT & CONFIRMATION MODAL */}
      {tier && selectedTier && (
        <div className="modal-backdrop fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) setTier(null); }}>
          <section className="modal-card treasury-modal bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2A1B42] rounded-xl p-4 sm:p-8 w-[calc(100vw-1.5rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl relative my-auto text-left" role="dialog" aria-modal="true" aria-labelledby="treasury-modal-title">
            <button type="button" className="modal-close absolute top-4 right-4 text-slate-500 dark:text-[#A78BFA] hover:text-slate-900 dark:hover:text-[#F8FAFC]" onClick={() => setTier(null)} disabled={loading} aria-label="Tutup">
              <X size={20} />
            </button>

            <div className="text-center mb-4">
              <p className="section-kicker text-xs font-mono font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider">
                {selectedPackage ? "TOP-UP HORIZON COINS (🪙 HC)" : "KAS PERBENDAHARAAN GUILD"}
              </p>
              <h2 id="treasury-modal-title" className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-[#F8FAFC] mt-1">
                {selectedPackage ? selectedPackage.name : selectedTier.name}
              </h2>
              {selectedPackage && (
                <div className="mt-1 flex items-center justify-center gap-2">
                  <PriceDisplay amountIdr={selectedPackage.priceIdr} className="text-base font-black font-mono text-emerald-400" />
                  <span className="text-xs font-mono text-gray-400">• Total {selectedPackage.totalCoins.toLocaleString("id-ID")} HC</span>
                </div>
              )}
            </div>

            {/* QRIS OFFICIAL GUILD DISPLAY */}
            <div className="bg-slate-50 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45] rounded-none p-4 text-center my-4 flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-700 dark:text-[#A78BFA] mb-2 uppercase">
                <QrCode size={16} /> QRIS RESMI GUILD LOGHORIZON
              </div>
              <div className="relative w-48 h-64 sm:w-56 sm:h-72 rounded-none overflow-hidden shadow-lg bg-white border border-slate-200 dark:border-[#2E1E45]">
                <Image
                  src={qrisUrl}
                  alt="QRIS Resmi Guild LogHorizon"
                  fill
                  sizes="(max-width: 640px) 192px, 224px"
                  className="object-contain"
                  priority
                />
              </div>
              <p className="text-[11px] font-mono text-slate-700 dark:text-[#A78BFA] mt-2">
                NMID: <strong className="text-slate-900 dark:text-[#F8FAFC]">ID1025450776899</strong> (odyssiavault)
              </p>
              <p className="text-[10px] font-mono text-slate-500 dark:text-[#A78BFA]/70">
                Mendukung semua Bank &amp; E-Wallet (BCA, Mandiri, BRI, GoPay, OVO, Dana, ShopeePay)
              </p>
            </div>

            {/* TRANSFER CONFIRMATION FORM */}
            <div className="space-y-3 mt-4 text-left font-mono">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[#A78BFA] mb-1 uppercase">
                  Nominal Transfer (IDR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={10000}
                  max={10000000}
                  step={5000}
                  value={amount}
                  onChange={(event) => handleAmountChange(event.target.value)}
                  className="w-full px-3 py-2 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#1A0E2E] text-sm text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:border-[#7C3AED]"
                  placeholder="50000"
                />
              </div>

              {/* Dynamic Tier / Coin Explanation */}
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                {selectedPackage ? (
                  <div>
                    <p className="font-bold flex items-center gap-1.5 text-xs sm:text-sm text-amber-400">
                      <span>🪙</span>
                      <span>Total Koin: {selectedPackage.totalCoins.toLocaleString("id-ID")} HC</span>
                    </p>
                    <p className="text-[11px] text-gray-300 mt-1">
                      Rincian: {selectedPackage.baseCoins.toLocaleString("id-ID")} HC Dasar {selectedPackage.bonusCoins > 0 ? `+ Bonus ${selectedPackage.bonusCoins.toLocaleString("id-ID")} HC` : ""} (Harga: <PriceDisplay amountIdr={selectedPackage.priceIdr} />)
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-purple-700 dark:text-purple-300">
                      Nominal kamu masuk ke kategori <span className="font-bold underline">{selectedTier.name}</span> dengan benefit <span className="font-bold underline">{selectedTier.badge}</span>.
                    </p>
                    {Number(amount) < 10000 && (
                      <p className="text-red-400 font-bold mt-1">
                        Batas minimal donasi adalah Rp 10.000 untuk mendapatkan benefit guild.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Pengirim / Pemilik Rekening <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={senderName}
                  onChange={(event) => setSenderName(event.target.value)}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                  placeholder="Contoh: Budi Santoso / Akun Dana"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  ID Transaksi / Catatan Transfer (Opsional)
                </label>
                <input
                  type="text"
                  maxLength={150}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                  placeholder="No. Ref / Catatan transfer"
                />
              </div>

              <div>
                <ImageUploader
                  value={proofUrl}
                  onChange={setProofUrl}
                  label="Bukti Struk Transfer / Screenshot QRIS (Opsional)"
                  description="Pilih foto langsung dari galeri HP atau PC. Otomatis dikompresi ringan."
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-500 font-semibold mt-3" role="alert">{error}</p>}

            <button
              type="button"
              className="button button-primary w-full mt-6 justify-center flex items-center gap-2 py-3 text-sm font-bold"
              onClick={() => void submitTransferConfirmation()}
              disabled={loading}
            >
              {loading
                ? "Mengirim konfirmasi…"
                : session?.user
                  ? "Konfirmasi Sudah Transfer"
                  : "Login Discord untuk lanjut"}
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
