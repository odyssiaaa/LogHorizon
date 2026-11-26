"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Coins,
  Plus,
  Target,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  X,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";
import { TOPUP_PACKAGES, type TopupPackage } from "@/lib/coin-economy";
import { PriceDisplay } from "@/context/locale-context";
import { ImageUploader } from "@/components/ui/image-uploader";
import { readApiResponse } from "@/lib/api-response";

export interface CoinTransactionItem {
  id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
}

interface UserCoinWalletProps {
  initialBalance?: number;
  onNavigateTab?: (tab: "quests" | "gacha") => void;
}

const TYPE_CONFIG: Record<string, { label: string; icon: string; isIncome: boolean }> = {
  DAILY_QUEST: { label: "🎁 Misi Harian", icon: "🎁", isIncome: true },
  WEEKLY_QUEST: { label: "🌟 Misi Mingguan", icon: "🌟", isIncome: true },
  PLAYER_QUEST_REWARD: { label: "⭐ Hadiah Kontrak", icon: "⭐", isIncome: true },
  PLAYER_QUEST_ESCROW: { label: "🔒 Escrow Kontrak", icon: "🔒", isIncome: false },
  PLAYER_QUEST_REFUND: { label: "↩️ Refund Kontrak", icon: "↩️", isIncome: true },
  TOPUP_QRIS: { label: "💳 Top-Up QRIS", icon: "💳", isIncome: true },
  GACHA_SUMMON: { label: "🎰 Royal Gacha", icon: "🎰", isIncome: false },
  ARMORY_PURCHASE: { label: "🛒 Guild Armory", icon: "🛒", isIncome: false },
  EMPEROR_GIFT: { label: "👑 Hadiah Emperor", icon: "👑", isIncome: true },
  REDEEM_CODE: { label: "🎟️ Kode Redeem", icon: "🎟️", isIncome: true },
  TIP_SENT: { label: "🪙 Tip Terkirim", icon: "🪙", isIncome: false },
  TIP_RECEIVED: { label: "💖 Tip Diterima", icon: "💖", isIncome: true },
};

export function UserCoinWallet({ initialBalance = 0, onNavigateTab }: UserCoinWalletProps) {
  const [balance, setBalance] = useState<number>(initialBalance);
  const [transactions, setTransactions] = useState<CoinTransactionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Top-Up QRIS Modal State
  const [showTopupModal, setShowTopupModal] = useState<boolean>(false);
  const [selectedPackage, setSelectedPackage] = useState<TopupPackage>(TOPUP_PACKAGES[2]); // Guild Vault (575 HC)
  const [senderName, setSenderName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [proofUrl, setProofUrl] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [topupFeedback, setTopupFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scroll when modal is open and support ESC key
  useEffect(() => {
    if (!showTopupModal) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        setShowTopupModal(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showTopupModal, submitting]);

  useEffect(() => {
    setBalance(initialBalance);
  }, [initialBalance]);

  const loadTransactions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/user/transactions");
      if (res.ok) {
        const data = await res.json();
        if (typeof data.balance === "number") {
          setBalance(data.balance);
        }
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  async function handleTopupSubmit() {
    if (!senderName.trim()) {
      setTopupFeedback({ message: "Nama pengirim / pemilik rekening wajib diisi.", type: "error" });
      return;
    }

    setSubmitting(true);
    setTopupFeedback(null);

    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedPackage.priceIdr,
          packageId: selectedPackage.id,
          coinAmount: selectedPackage.totalCoins,
          isCoinTopup: true,
          senderName: senderName.trim(),
          notes: notes.trim(),
          proofUrl: proofUrl.trim(),
        }),
      });

      const data = await readApiResponse<{ notice: string }>(res, "Gagal mengirim konfirmasi Top-Up.");
      setTopupFeedback({
        message:
          data.notice ||
          `Konfirmasi Top-Up ${selectedPackage.name} (${selectedPackage.totalCoins} HC) berhasil dikirim! Admin akan segera memverifikasi mutasi.`,
        type: "success",
      });
      setSenderName("");
      setNotes("");
      setProofUrl("");
    } catch (err) {
      setTopupFeedback({
        message: err instanceof Error ? err.message : "Gagal mengirim konfirmasi Top-Up.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Kartu Utama Saldo & Aksi Cepat */}
      <section className="relative overflow-hidden p-5 sm:p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#180C2E]/90 to-purple-900/20 backdrop-blur-md shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Sisi Kiri: Ikon & Saldo */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/30 border border-amber-500/40 flex items-center justify-center text-3xl shadow-inner shrink-0">
              🪙
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                  Dompet Resmi // LogHorizon Citadel
                </span>
                <button
                  type="button"
                  onClick={() => void loadTransactions(true)}
                  disabled={refreshing}
                  className="text-gray-400 hover:text-white transition p-1 rounded-md"
                  title="Segarkan Saldo & Mutasi"
                >
                  <RefreshCw size={12} className={refreshing ? "animate-spin text-amber-400" : ""} />
                </button>
              </div>
              <div className="flex items-baseline gap-2.5 mt-1">
                <h3 className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                  {balance.toLocaleString("id-ID")}
                </h3>
                <span className="text-sm sm:text-base font-bold text-amber-400 font-mono">🪙 HC (Horizon Coins)</span>
              </div>
              <p className="text-xs text-gray-400 mt-1 max-w-xl">
                Gunakan koin untuk pasang kontrak misi, beli item Armory, gacha eksklusif, atau apresiasi sesama petualang guild.
              </p>
            </div>
          </div>

          {/* Sisi Kanan: Shortcut Aksi */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowTopupModal(true);
                setTopupFeedback(null);
              }}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>Top-Up Coin</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab?.("quests")}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Target size={14} />
              <span>Cari Misi</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab?.("gacha")}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Royal Gacha</span>
            </button>
          </div>
        </div>
      </section>

      {/* Kurs Resmi Strip */}
      <div className="p-3.5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#140A24] to-purple-950/20 text-xs font-mono text-gray-300 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <span className="text-sm">🪙</span>
          <span>Kurs Resmi: 1 HC = Rp 100 • 100 HC = Rp 10.000</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-300">
          <span>Nilai Saldomu:</span>
          <PriceDisplay amountIdr={balance * 100} className="font-bold text-emerald-400 font-mono" />
        </div>
      </div>

      {/* Bagian Riwayat 10 Mutasi Terakhir */}
      <section className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#120B1E]/80 backdrop-blur-md">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-[#2A1B42]">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">
              Riwayat 10 Mutasi Terakhir
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {transactions.length} mutasi tercatat
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs font-mono text-gray-400">
            Memuat riwayat transaksi...
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs font-mono text-gray-400">
              Belum ada riwayat mutasi Horizon Coin.
            </p>
            <p className="text-[11px] text-gray-500">
              Selesaikan misi harian atau klaim kode redeem untuk mendapatkan koin pertamamu!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-[#2A1B42]/50">
            {transactions.map((tx) => {
              const isPositive = tx.amount > 0;
              const config = TYPE_CONFIG[tx.type] ?? {
                label: tx.type,
                icon: isPositive ? "➕" : "➖",
                isIncome: isPositive,
              };

              const formattedDate = new Date(tx.createdAt).toLocaleString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={tx.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs sm:text-sm hover:bg-black/5 dark:hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                >
                  {/* Sisi Kiri: Ikon Tipe + Deskripsi & Tanggal */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`size-9 rounded-xl flex items-center justify-center shrink-0 text-base ${
                        isPositive
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                          : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                      }`}
                    >
                      {isPositive ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {tx.description}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 shrink-0">
                          {config.label}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {formattedDate} WIB
                      </p>
                    </div>
                  </div>

                  {/* Sisi Kanan: Nominal Mutasi */}
                  <div className="shrink-0 text-right">
                    <span
                      className={`font-mono font-black text-sm sm:text-base ${
                        isPositive ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
                      }`}
                    >
                      {isPositive ? `+${tx.amount.toLocaleString("id-ID")}` : tx.amount.toLocaleString("id-ID")}
                    </span>
                    <span className="text-[10px] font-mono text-amber-500 block">HC</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* TOP-UP QRIS HORIZON COIN MODAL */}
      {showTopupModal && mounted && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !submitting) setShowTopupModal(false);
          }}
        >
          <div
            className="bg-white dark:bg-[#11091D] border border-amber-500/30 rounded-2xl p-5 sm:p-7 w-[calc(100vw-1.5rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl relative my-auto text-left space-y-5"
            role="dialog"
            aria-modal="true"
          >
            {/* Close Button */}
            <button
              type="button"
              disabled={submitting}
              onClick={() => setShowTopupModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition p-1 rounded-lg"
              aria-label="Tutup"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div>
              <p className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} /> TOP-UP HORIZON COINS (🪙 HC)
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight mt-1">
                Pilih Paket Koin Guild
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Kurs Resmi: 1 HC = Rp 100 • 100 HC = Rp 10.000 (Otomatis terkonversi)
              </p>
            </div>

            {/* Top-up Feedback */}
            {topupFeedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  topupFeedback.type === "success"
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950/40 border-red-500/40 text-red-300"
                }`}
              >
                {topupFeedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{topupFeedback.message}</span>
              </div>
            )}

            {/* 5 Package Options */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-gray-300 uppercase">
                Pilih Salah Satu Dari 5 Paket Resmi:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TOPUP_PACKAGES.map((pkg) => {
                  const isSelected = selectedPackage.id === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPackage(pkg)}
                      className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? "border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/50 shadow-md shadow-amber-500/10"
                          : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] hover:border-amber-500/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-lg">{pkg.icon}</span>
                        {pkg.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black border ${
                              pkg.badgeColor || "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            }`}
                          >
                            {pkg.badge}
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                          {pkg.name}
                        </h4>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-sm font-black font-mono text-amber-400">
                            {pkg.totalCoins.toLocaleString("id-ID")} HC
                          </span>
                          {pkg.bonusCoins > 0 && (
                            <span className="text-[10px] font-mono text-emerald-400">
                              (+{pkg.bonusCoins} Bonus)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-[11px] font-mono">
                        <PriceDisplay amountIdr={pkg.priceIdr} className="font-bold text-emerald-500 dark:text-emerald-400" />
                        <span className="text-gray-400 text-[10px]">
                          Rp {pkg.priceIdr.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QRIS Oficial Section */}
            <div className="bg-slate-50 dark:bg-[#1A0E2E] border border-amber-500/30 rounded-xl p-4 text-center flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 mb-2 uppercase">
                <QrCode size={16} /> QRIS RESMI GUILD LOGHORIZON
              </div>
              <div className="relative w-44 h-56 sm:w-52 sm:h-64 rounded-xl overflow-hidden shadow-md bg-white border border-slate-200 dark:border-[#2E1E45]">
                <Image
                  src="/qris-guild.png"
                  alt="QRIS Resmi Guild LogHorizon"
                  fill
                  sizes="(max-width: 640px) 176px, 208px"
                  className="object-contain"
                  priority
                />
              </div>
              <p className="text-[11px] font-mono text-slate-700 dark:text-gray-300 mt-2">
                NMID: <strong className="text-amber-400">ID1025450776899</strong> (odyssiavault)
              </p>
              <p className="text-[10px] font-mono text-gray-400">
                Mendukung semua Bank (BCA, Mandiri, BRI) &amp; E-Wallet (GoPay, OVO, Dana, ShopeePay)
              </p>
            </div>

            {/* Form Confirmation */}
            <div className="space-y-3 font-mono text-xs text-left">
              <div>
                <label className="block font-bold text-gray-300 mb-1">
                  Nama Pengirim / Pemilik Rekening Transfer <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Contoh: Budi Santoso / Akun Dana"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A0E2E] text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-300 mb-1">
                  ID Transaksi / Catatan Transfer (Opsional)
                </label>
                <input
                  type="text"
                  maxLength={150}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="No. Ref / Catatan transfer"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A0E2E] text-white focus:outline-none focus:border-amber-400"
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

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowTopupModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-gray-400 hover:text-white hover:bg-white/5 transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleTopupSubmit()}
                className="px-5 py-2.5 rounded-xl font-mono text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/25 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <>
                    <Coins size={14} />
                    <span>Konfirmasi Transfer (Rp {selectedPackage.priceIdr.toLocaleString("id-ID")})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
