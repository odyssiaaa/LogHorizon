"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Coins,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  AlertCircle,
  User,
  Send,
  Check,
  X,
  FileText,
  CreditCard,
  QrCode,
  Flame,
  Award,
  RefreshCw,
  Zap,
} from "lucide-react";
import { HORIZON_COIN_PACKAGES, CoinPackage } from "@/lib/horizon-coin";
import { ImageUploader } from "@/components/image-uploader";

interface QuestBoardProps {
  initialTab?: "daily" | "weekly" | "player" | "topup";
  onCoinsUpdated?: (newBalance: number) => void;
}

export function QuestBoard({ initialTab = "daily", onCoinsUpdated }: QuestBoardProps) {
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "player" | "topup">(initialTab);

  // Quests Data
  const [dailyQuests, setDailyQuests] = useState<any[]>([]);
  const [weeklyQuests, setWeeklyQuests] = useState<any[]>([]);
  const [userCoins, setUserCoins] = useState<number>(0);
  const [loadingQuests, setLoadingQuests] = useState(true);
  const [claimingQuestId, setClaimingQuestId] = useState<string | null>(null);

  // Time Resets
  const [secondsDaily, setSecondsDaily] = useState<number>(0);
  const [secondsWeekly, setSecondsWeekly] = useState<number>(0);

  // Player Quests Data
  const [playerQuests, setPlayerQuests] = useState<any[]>([]);
  const [loadingPlayerQuests, setLoadingPlayerQuests] = useState(false);
  const [p2pFilter, setP2pFilter] = useState<"all" | "open" | "my_created" | "my_taken">("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Create Quest Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newRewardCoins, setNewRewardCoins] = useState(100);
  const [creatingQuest, setCreatingQuest] = useState(false);

  // Proof Submit Modal
  const [submittingQuestId, setSubmittingQuestId] = useState<string | null>(null);
  const [proofNote, setProofNote] = useState("");
  const [submittingProof, setSubmittingProof] = useState(false);

  // Action Loading
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Top Up QRIS
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage>(HORIZON_COIN_PACKAGES[1]);
  const [senderName, setSenderName] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [topupNotes, setTopupNotes] = useState("");
  const [submittingTopup, setSubmittingTopup] = useState(false);
  const [topupSuccessMessage, setTopupSuccessMessage] = useState("");

  // Feedback Notification
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchQuests = useCallback(async () => {
    try {
      setLoadingQuests(true);
      const res = await fetch("/api/user/quests");
      if (!res.ok) return;
      const data = await res.json();
      if (data.isLoggedIn) {
        setDailyQuests(data.dailyQuests || []);
        setWeeklyQuests(data.weeklyQuests || []);
        setUserCoins(data.horizonCoins || 0);
        setSecondsDaily(data.secondsUntilDailyReset || 0);
        setSecondsWeekly(data.secondsUntilWeeklyReset || 0);
        if (onCoinsUpdated) onCoinsUpdated(data.horizonCoins || 0);
      }
    } catch (err) {
      console.error("[QuestBoard] Error loading quests:", err);
    } finally {
      setLoadingQuests(false);
    }
  }, [onCoinsUpdated]);

  const fetchPlayerQuests = useCallback(async () => {
    try {
      setLoadingPlayerQuests(true);
      const res = await fetch(`/api/quests/player?filter=${p2pFilter}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setPlayerQuests(data.quests || []);
        setCurrentUserId(data.currentUserId);
        if (typeof data.userCoins === "number") {
          setUserCoins(data.userCoins);
          if (onCoinsUpdated) onCoinsUpdated(data.userCoins);
        }
      }
    } catch (err) {
      console.error("[QuestBoard] Error loading player quests:", err);
    } finally {
      setLoadingPlayerQuests(false);
    }
  }, [p2pFilter, onCoinsUpdated]);

  useEffect(() => {
    void fetchQuests();
  }, [fetchQuests]);

  useEffect(() => {
    if (activeTab === "player") {
      void fetchPlayerQuests();
    }
  }, [activeTab, fetchPlayerQuests]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsDaily((prev) => Math.max(0, prev - 1));
      setSecondsWeekly((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function formatCountdown(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}j ${m}m ${s}d`;
  }

  // Claim System Quest
  async function handleClaimQuest(questId: string) {
    setClaimingQuestId(questId);
    setFeedback(null);
    try {
      const res = await fetch("/api/user/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ message: data.error || "Gagal mengklaim hadiah.", type: "error" });
        return;
      }
      setFeedback({ message: data.message, type: "success" });
      setUserCoins(data.horizonCoins);
      if (onCoinsUpdated) onCoinsUpdated(data.horizonCoins);
      void fetchQuests();
    } catch {
      setFeedback({ message: "Terjadi kesalahan jaringan saat mengklaim.", type: "error" });
    } finally {
      setClaimingQuestId(null);
    }
  }

  // Create P2P Quest
  async function handleCreateQuest(e: React.FormEvent) {
    e.preventDefault();
    setCreatingQuest(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/quests/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          rewardCoins: newRewardCoins,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ message: data.error || "Gagal menerbitkan kontrak misi.", type: "error" });
        return;
      }
      setFeedback({ message: data.message, type: "success" });
      setShowCreateModal(false);
      setNewTitle("");
      setNewDescription("");
      setNewRewardCoins(100);
      setUserCoins(data.newBalance);
      if (onCoinsUpdated) onCoinsUpdated(data.newBalance);
      void fetchPlayerQuests();
    } catch {
      setFeedback({ message: "Terjadi kesalahan jaringan.", type: "error" });
    } finally {
      setCreatingQuest(false);
    }
  }

  // P2P Quest Actions
  async function handlePlayerQuestAction(questId: string, action: string, proof?: string) {
    setActionLoadingId(questId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/quests/player/${questId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, proofNote: proof }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ message: data.error || "Gagal memproses aksi misi.", type: "error" });
        return;
      }
      setFeedback({ message: data.message, type: "success" });
      setSubmittingQuestId(null);
      setProofNote("");
      void fetchPlayerQuests();
      void fetchQuests();
    } catch {
      setFeedback({ message: "Terjadi kesalahan jaringan.", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  }

  // Submit QRIS Topup
  async function handleTopupSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!proofUrl) {
      setFeedback({ message: "Harap unggah bukti transfer QRIS terlebih dahulu.", type: "error" });
      return;
    }
    setSubmittingTopup(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedPackage.price,
          senderName,
          notes: topupNotes || `Top-Up ${selectedPackage.coins} Horizon Coins (🪙 HC)`,
          proofUrl,
          isCoinTopup: true,
          coinAmount: selectedPackage.coins,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ message: data.error || "Gagal mengirim konfirmasi Top-Up.", type: "error" });
        return;
      }
      setTopupSuccessMessage(`Konfirmasi Top-Up ${selectedPackage.coins} HC berhasil dikirim ke Admin! Saldo akan otomatis bertambah saat pembayaran terverifikasi.`);
      setProofUrl("");
      setSenderName("");
      setTopupNotes("");
    } catch {
      setFeedback({ message: "Terjadi kesalahan jaringan.", type: "error" });
    } finally {
      setSubmittingTopup(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Saldo & Navigasi Tab */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-[#120824] via-[#1A0E30] to-[#120824] border border-amber-500/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner shadow-amber-500/20">
            🪙
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase">
                Dompet Resmi Kerajaan
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 font-bold">
                HORIZON COIN
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono flex items-center gap-2 mt-0.5">
              <span>{userCoins.toLocaleString("id-ID")}</span>
              <span className="text-amber-400 text-lg sm:text-xl font-bold">HC</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("topup")}
            className="flex-1 md:flex-initial h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs font-mono shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Coins className="w-4 h-4" />
            Top-Up Koin QRIS
          </button>
          <button
            type="button"
            onClick={() => {
              void fetchQuests();
              if (activeTab === "player") void fetchPlayerQuests();
            }}
            className="h-10 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 flex items-center justify-center transition-all"
            title="Muat ulang data misi"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 animate-fade-in ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-red-950/40 border-red-500/40 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Tab Bar (3 Tab Interaktif + Top-Up) */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#11091D] border border-white/10 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("daily")}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "daily"
              ? "bg-[#7C3AED] text-white shadow-md shadow-purple-900/40"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Misi Harian
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("weekly")}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "weekly"
              ? "bg-[#7C3AED] text-white shadow-md shadow-purple-900/40"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          Misi Mingguan
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("player")}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "player"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Kontrak Antar-Pemain
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("topup")}
          className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "topup"
              ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Top-Up QRIS
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MISI HARIAN                                      */}
      {/* ======================================================== */}
      {activeTab === "daily" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                Misi Harian Guild
              </h3>
              <p className="text-xs text-gray-400">Selesaikan tugas harian untuk mengumpulkan koin & menaikkan level.</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-purple-300">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Reset: {formatCountdown(secondsDaily)}</span>
            </div>
          </div>

          {loadingQuests ? (
            <div className="py-12 text-center text-xs font-mono text-gray-400 animate-pulse">
              Memuat misi harian petualang...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {dailyQuests.map((q) => {
                const percent = Math.min(100, Math.round((q.currentProgress / q.target) * 100));
                return (
                  <div
                    key={q.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      q.isClaimed
                        ? "bg-[#0e071c]/60 border-white/5 opacity-75"
                        : q.canClaim
                        ? "bg-gradient-to-br from-[#1b0b33] to-[#120824] border-emerald-500/40 shadow-lg shadow-emerald-950/20"
                        : "bg-[#120824] border-white/10 hover:border-purple-500/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl p-2 rounded-xl bg-white/5 border border-white/10 shrink-0">
                          {q.icon}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-white tracking-wide">{q.title}</h4>
                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{q.description}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">
                          +{q.rewardHc} HC
                        </span>
                        <div className="text-[10px] font-mono text-purple-400 mt-1">+{q.rewardXp} XP</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-gray-400">Progres Misi</span>
                        <span className="font-bold text-white">
                          {q.currentProgress} / {q.target} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            q.isClaimed
                              ? "bg-gray-600"
                              : q.isCompleted
                              ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                              : "bg-gradient-to-r from-purple-600 to-indigo-500"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      {/* Action Button */}
                      <div className="pt-2">
                        {q.isClaimed ? (
                          <div className="w-full py-2 rounded-xl bg-white/5 text-gray-400 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            Selesai Diklaim
                          </div>
                        ) : q.canClaim ? (
                          <button
                            type="button"
                            disabled={claimingQuestId === q.id}
                            onClick={() => handleClaimQuest(q.id)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-mono text-xs font-black shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                          >
                            <Sparkles className="w-4 h-4" />
                            {claimingQuestId === q.id ? "Mengklaim..." : "Klaim Hadiah Koin & XP!"}
                          </button>
                        ) : (
                          <Link
                            href={q.actionUrl}
                            className="w-full py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                          >
                            <span>{q.actionLabel}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MISI MINGGUAN                                    */}
      {/* ======================================================== */}
      {activeTab === "weekly" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Misi Mingguan Berhadiah Besar
              </h3>
              <p className="text-xs text-gray-400">Tantangan mingguan dengan imbalan ratusan Horizon Coins & XP instan.</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset Senin: {formatCountdown(secondsWeekly)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {weeklyQuests.map((q) => {
              const percent = Math.min(100, Math.round((q.currentProgress / q.target) * 100));
              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                    q.isClaimed
                      ? "bg-[#0e071c]/60 border-white/5 opacity-75"
                      : q.canClaim
                      ? "bg-gradient-to-br from-[#241305] via-[#1A0E30] to-[#120824] border-amber-500/50 shadow-xl shadow-amber-950/20"
                      : "bg-[#120824] border-white/10 hover:border-amber-500/30"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-3xl p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
                        {q.icon}
                      </span>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-black">
                          +{q.rewardHc} HC
                        </span>
                        <div className="text-[11px] font-mono text-purple-400 mt-1">+{q.rewardXp} XP</div>
                      </div>
                    </div>

                    <h4 className="text-base font-bold text-white tracking-wide mt-3">{q.title}</h4>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">{q.description}</p>
                  </div>

                  {/* Progress Bar & Actions */}
                  <div className="mt-5 pt-3 border-t border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-gray-400">Progres Mingguan</span>
                      <span className="font-bold text-white">
                        {q.currentProgress} / {q.target} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          q.isClaimed
                            ? "bg-gray-600"
                            : q.isCompleted
                            ? "bg-gradient-to-r from-amber-400 to-yellow-500"
                            : "bg-gradient-to-r from-purple-500 to-indigo-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="pt-2">
                      {q.isClaimed ? (
                        <div className="w-full py-2.5 rounded-xl bg-white/5 text-gray-400 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Selesai Diklaim
                        </div>
                      ) : q.canClaim ? (
                        <button
                          type="button"
                          disabled={claimingQuestId === q.id}
                          onClick={() => handleClaimQuest(q.id)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-mono text-xs font-black shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                          <Sparkles className="w-4 h-4" />
                          {claimingQuestId === q.id ? "Mengklaim..." : "Klaim Hadiah Mingguan!"}
                        </button>
                      ) : (
                        <Link
                          href={q.actionUrl}
                          className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <span>{q.actionLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: KONTRAK MISI ANTAR-PEMAIN (P2P QUEST BOARD)       */}
      {/* ======================================================== */}
      {activeTab === "player" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Papan Kontrak Misi Antar-Pemain
              </h3>
              <p className="text-xs text-gray-400">Terbitkan misi, sewa rekan petualang, dan bayar dengan Horizon Coins yang aman di-escrow.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs font-mono flex items-center gap-2 shadow-md hover:from-amber-400 transition-all shrink-0 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              Terbitkan Kontrak Misi
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: "all", label: "Semua Kontrak" },
              { id: "open", label: "🟢 Tersedia (OPEN)" },
              { id: "my_created", label: "👑 Kontrak Saya" },
              { id: "my_taken", label: "⚔️ Saya Kerjakan" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setP2pFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all shrink-0 ${
                  p2pFilter === f.id
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-white/5 text-gray-400 hover:text-white border border-white/5"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List of Player Quests */}
          {loadingPlayerQuests ? (
            <div className="py-12 text-center text-xs font-mono text-gray-400 animate-pulse">
              Memuat papan kontrak petualang...
            </div>
          ) : playerQuests.length === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-white/[0.02] border border-white/5 p-6">
              <span className="text-3xl block mb-2">📜</span>
              <p className="text-sm font-bold text-white">Belum Ada Kontrak Misi</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Jadilah yang pertama menerbitkan misi atau mencari jasa GB/desain/sparring dengan imbalan Horizon Coins!
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold font-mono transition-all"
              >
                + Buat Kontrak Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {playerQuests.map((pq) => {
                const isCreator = currentUserId === pq.creatorId;
                const isWorker = currentUserId === pq.workerId;

                const statusBadge =
                  pq.status === "OPEN"
                    ? { text: "TERSEDIA (OPEN)", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" }
                    : pq.status === "IN_PROGRESS"
                    ? { text: "DALAM PROSES", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" }
                    : pq.status === "SUBMITTED"
                    ? { text: "MENUNGGU KONFIRMASI", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" }
                    : pq.status === "COMPLETED"
                    ? { text: "SELESAI ✅", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" }
                    : pq.status === "DISPUTED"
                    ? { text: "SENGKETA ⚖️", color: "bg-rose-500/10 text-rose-400 border-rose-500/30" }
                    : { text: "DIBATALKAN", color: "bg-gray-500/10 text-gray-400 border-gray-500/30" };

                return (
                  <div
                    key={pq.id}
                    className="p-5 rounded-2xl bg-[#120824] border border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-between shadow-lg"
                  >
                    <div>
                      {/* Top Bar: Creator Info & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-amber-400 overflow-hidden shrink-0">
                            {pq.creator.avatar ? (
                              <Image src={pq.creator.avatar} alt="Avatar" width={28} height={28} className="object-cover" />
                            ) : (
                              (pq.creator.username || "P")[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white">@{pq.creator.username || pq.creator.name}</span>
                            <span className="text-[10px] font-mono text-purple-400 ml-1.5">Lv. {pq.creator.level}</span>
                          </div>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${statusBadge.color}`}>
                          {statusBadge.text}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h4 className="text-base font-bold text-white mt-3">{pq.title}</h4>
                      <p className="text-xs text-gray-300 mt-1.5 whitespace-pre-line leading-relaxed">{pq.description}</p>

                      {/* Proof note if available */}
                      {pq.proofNote && (
                        <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-purple-200">
                          <span className="font-bold text-purple-300 block mb-0.5">Catatan Penyelesaian:</span>
                          {pq.proofNote}
                        </div>
                      )}

                      {/* Worker info if taken */}
                      {pq.worker && (
                        <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400">
                          <span>Pekerja:</span>
                          <span className="font-bold text-white">@{pq.worker.username || pq.worker.name}</span>
                          <span className="text-purple-400 font-mono">Lv. {pq.worker.level}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom: Reward & Action Buttons */}
                    <div className="mt-5 pt-3.5 border-t border-white/5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-mono text-gray-400">Gaji Kontrak</div>
                        <div className="text-base font-black font-mono text-amber-400 flex items-center gap-1">
                          <span>🪙</span>
                          <span>{pq.rewardCoins.toLocaleString("id-ID")} HC</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {pq.status === "OPEN" && !isCreator && (
                          <button
                            type="button"
                            disabled={actionLoadingId === pq.id}
                            onClick={() => handlePlayerQuestAction(pq.id, "TAKE")}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold transition-all shadow-md active:scale-95"
                          >
                            {actionLoadingId === pq.id ? "Memproses..." : "Ambil Kontrak"}
                          </button>
                        )}

                        {pq.status === "OPEN" && isCreator && (
                          <button
                            type="button"
                            disabled={actionLoadingId === pq.id}
                            onClick={() => handlePlayerQuestAction(pq.id, "CANCEL")}
                            className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 font-mono text-xs font-bold transition-all"
                          >
                            Batalkan
                          </button>
                        )}

                        {pq.status === "IN_PROGRESS" && isWorker && (
                          <button
                            type="button"
                            onClick={() => setSubmittingQuestId(pq.id)}
                            className="px-3.5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-mono text-xs font-bold transition-all shadow-md"
                          >
                            Ajukan Selesai
                          </button>
                        )}

                        {pq.status === "SUBMITTED" && isCreator && (
                          <button
                            type="button"
                            disabled={actionLoadingId === pq.id}
                            onClick={() => handlePlayerQuestAction(pq.id, "CONFIRM")}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 font-mono text-xs font-black transition-all shadow-lg shadow-emerald-500/25 active:scale-95"
                          >
                            ✅ Konfirmasi & Cairkan Gaji
                          </button>
                        )}

                        {(pq.status === "IN_PROGRESS" || pq.status === "SUBMITTED") && (isCreator || isWorker) && (
                          <button
                            type="button"
                            disabled={actionLoadingId === pq.id}
                            onClick={() => handlePlayerQuestAction(pq.id, "DISPUTE")}
                            className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-mono"
                            title="Ajukan Sengketa ke Admin"
                          >
                            ⚖️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: TOP-UP HORIZON COIN VIA QRIS                     */}
      {/* ======================================================== */}
      {activeTab === "topup" && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#120824] border border-amber-500/30 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-400" />
                Pilih Paket Top-Up Horizon Coins (🪙 HC)
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Koin resmi untuk memanggil Royal Gacha, belanja bingkai & gelar di Armory, serta membayar upah kontrak misi petualang.
              </p>
            </div>

            {/* Packages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {HORIZON_COIN_PACKAGES.map((pkg) => {
                const isSelected = selectedPackage.id === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all relative ${
                      isSelected
                        ? "bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/20"
                        : "bg-white/5 border-white/10 hover:border-amber-500/40"
                    }`}
                  >
                    {pkg.popular && (
                      <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-amber-500 text-slate-950 uppercase tracking-wider">
                        Paling Populer
                      </span>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{pkg.name}</span>
                      <span className="text-sm font-black text-amber-400 font-mono">
                        Rp {pkg.price.toLocaleString("id-ID")}
                      </span>
                    </div>
                    {pkg.bonusText && (
                      <p className="text-[11px] text-amber-300/80 font-mono mt-1.5">{pkg.bonusText}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* QRIS Display & Payment Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
              {/* QRIS Code */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-3">
                <span className="text-xs font-mono font-bold text-amber-400">SCAN QRIS RESMI GUILD</span>
                <div className="w-56 h-56 mx-auto relative rounded-xl overflow-hidden bg-white p-2">
                  <Image src="/qris-guild.png" alt="QRIS LogHorizon" fill className="object-contain" />
                </div>
                <div className="text-xs text-gray-300 font-mono">
                  Total Bayar: <span className="font-bold text-amber-400">Rp {selectedPackage.price.toLocaleString("id-ID")}</span>
                  <div className="text-[10px] text-gray-400 mt-0.5">Mendapatkan: {selectedPackage.coins} HC</div>
                </div>
              </div>

              {/* Upload Proof & Form */}
              <form onSubmit={handleTopupSubmit} className="space-y-4">
                {topupSuccessMessage ? (
                  <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs leading-relaxed space-y-2">
                    <div className="font-bold flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Pengajuan Top-Up Berhasil!
                    </div>
                    <p>{topupSuccessMessage}</p>
                    <button
                      type="button"
                      onClick={() => setTopupSuccessMessage("")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold font-mono text-xs"
                    >
                      Kirim Top-Up Lain
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-300 mb-1">Nama Pengirim / Pemilik Rekening</label>
                      <input
                        type="text"
                        required
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Contoh: Farrel / Alexa (Sesuai rekening bank/e-wallet)"
                        className="w-full h-10 px-3.5 rounded-xl border border-white/10 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-300 mb-1">Unggah Bukti Transfer QRIS</label>
                      <ImageUploader value={proofUrl} onChange={(url) => setProofUrl(url)} />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingTopup || !proofUrl}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black text-xs font-mono shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                      {submittingTopup ? "Mengirim Konfirmasi..." : `Konfirmasi Bayar Rp ${selectedPackage.price.toLocaleString("id-ID")}`}
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TERBITKAN KONTRAK MISI BARU                       */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full rounded-2xl bg-[#120824] border border-amber-500/30 p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-400" />
                Terbitkan Kontrak Misi Baru
              </h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuest} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Judul Misi Kontrak</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Bantu Joki GB Rank Mythic 3 Win"
                  className="w-full h-10 px-3.5 rounded-xl border border-white/10 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Deskripsi Syarat & Ketentuan Penyelesaian</label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Sebutkan detail tugas, syarat bukti screenshot hasil mabar, atau batas waktu penyelesaian..."
                  className="w-full p-3 rounded-xl border border-white/10 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Gaji Imbalan Koin (🪙 HC)</label>
                <input
                  type="number"
                  min="50"
                  step="10"
                  required
                  value={newRewardCoins}
                  onChange={(e) => setNewRewardCoins(Number(e.target.value))}
                  className="w-full h-10 px-3.5 rounded-xl border border-white/10 bg-[#1A0E30] text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Minimal 50 HC. Saldo Anda ({userCoins} HC) akan langsung di-escrow dengan aman saat diterbitkan.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-mono font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingQuest || userCoins < newRewardCoins}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs font-mono shadow-md hover:from-amber-400 transition-all disabled:opacity-50"
                >
                  {creatingQuest ? "Menerbitkan..." : `Terbitkan & Tahan ${newRewardCoins} HC`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: AJUKAN BUKTI SELESAI PEKERJA                     */}
      {/* ======================================================== */}
      {submittingQuestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full rounded-2xl bg-[#120824] border border-blue-500/30 p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Laporan Penyelesaian Misi
              </h3>
              <button type="button" onClick={() => setSubmittingQuestId(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Catatan & Bukti Penyelesaian</label>
                <textarea
                  rows={3}
                  required
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="Tuliskan ringkasan hasil pekerjaan atau tautan screenshot bukti penyelesaian..."
                  className="w-full p-3 rounded-xl border border-white/10 bg-[#1A0E30] text-xs text-white focus:outline-none focus:border-blue-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmittingQuestId(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-mono font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submittingProof || !proofNote.trim()}
                  onClick={() => handlePlayerQuestAction(submittingQuestId, "SUBMIT", proofNote)}
                  className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-black text-xs font-mono shadow-md transition-all disabled:opacity-50"
                >
                  {submittingProof ? "Mengirim..." : "Kirim Laporan Selesai"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
