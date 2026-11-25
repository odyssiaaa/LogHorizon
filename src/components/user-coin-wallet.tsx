"use client";

import { useState, useEffect, useCallback } from "react";
import { Coins, Plus, Target, Sparkles, RefreshCw, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";

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
              onClick={() => onNavigateTab?.("quests")}
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
    </div>
  );
}
