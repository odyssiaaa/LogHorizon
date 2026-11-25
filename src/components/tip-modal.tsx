"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { X, Sparkles, Send, CheckCircle2, AlertCircle, Heart } from "lucide-react";
import { DiscordAvatar } from "@/components/discord-avatar";
import { openLoginModal } from "@/components/login-modal";
import Link from "next/link";

export interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    id: string;
    username: string | null;
    name?: string | null;
    avatar?: string | null;
  } | null;
  postId?: string;
  commentId?: string;
  contextTitle?: string;
  onSuccess?: (amount: number, newBalance: number) => void;
}

const PRESET_AMOUNTS = [10, 25, 50, 100];

export function TipModal({
  isOpen,
  onClose,
  targetUser,
  postId,
  commentId,
  contextTitle,
  onSuccess,
}: TipModalProps) {
  const { data: session } = useSession();
  const [selectedAmount, setSelectedAmount] = useState<number>(25);
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ amount: number; message: string } | null>(null);
  const [myCoins, setMyCoins] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccessData(null);
      setMessage("");
      return;
    }

    if (!session?.user) return;

    // Ambil saldo koin user
    let active = true;
    fetch("/api/user/quests")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data && typeof data.horizonCoins === "number") {
          setMyCoins(data.horizonCoins);
        }
      })
      .catch(() => null);

    return () => {
      active = false;
    };
  }, [isOpen, session]);

  if (!isOpen || !targetUser) return null;

  const targetName = targetUser.username || targetUser.name || "Petualang";
  const isSelf = session?.user?.id === targetUser.id;

  async function handleSendTip(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) {
      openLoginModal();
      return;
    }

    if (isSelf) {
      setError("Anda tidak dapat mengirim tip apresiasi ke akun Anda sendiri.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/coins/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: targetUser?.id,
          amount: selectedAmount,
          postId: postId || undefined,
          commentId: commentId || undefined,
          message: message.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal mengirim tip.");
      }

      setSuccessData({
        amount: selectedAmount,
        message: json.message || `Tip 🪙 ${selectedAmount} HC berhasil dikirim!`,
      });

      if (typeof json.senderCoins === "number") {
        setMyCoins(json.senderCoins);
      }

      if (onSuccess) {
        onSuccess(selectedAmount, json.senderCoins ?? 0);
      }
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat memproses tip.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md p-5 sm:p-6 rounded-2xl border border-amber-500/40 bg-[#120824] shadow-2xl shadow-amber-500/10 text-white overflow-hidden">
        {/* Glow Ambient Top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        {successData ? (
          <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20">
              🪙
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Apresiasi Terkirim!</h3>
              <p className="text-xs text-amber-300 font-mono mt-1">
                +{successData.amount} HC berhasil dikirimkan kepada @{targetName}
              </p>
            </div>
            <p className="text-xs text-gray-300 max-w-xs mx-auto">
              Terima kasih telah menyemangati dan mendukung konten rekan petualang di Citadel!
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendTip} className="space-y-4">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                <Heart size={14} className="fill-current text-rose-500" />
                <span>Apresiasi Kreator &amp; Rekan Guild</span>
              </div>
              <h3 className="text-lg font-black text-white mt-1 flex items-center gap-2">
                <span>Kirim Tip</span>
                <span className="text-amber-400 font-mono">Horizon Coin (🪙 HC)</span>
              </h3>
            </div>

            {/* Target Profile Card */}
            <div className="p-3 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <DiscordAvatar src={targetUser.avatar ?? null} username={targetName} size={36} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">@{targetName}</p>
                  {contextTitle ? (
                    <p className="text-[11px] text-gray-400 truncate mt-0.5" title={contextTitle}>
                      {contextTitle}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-400">Petualang LogHorizon</p>
                  )}
                </div>
              </div>

              {myCoins !== null && (
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-gray-400 font-mono">Saldo Anda</p>
                  <p className="text-xs font-bold text-amber-400 font-mono">🪙 {myCoins.toLocaleString("id-ID")} HC</p>
                </div>
              )}
            </div>

            {isSelf && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-400" />
                <span>Anda tidak dapat mengirim tip apresiasi ke postingan milik sendiri.</span>
              </div>
            )}

            {/* Nominal Presets */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-300 font-mono">Pilih Nominal Tip (🪙 HC):</label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map((val) => {
                  const isSelected = selectedAmount === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSelectedAmount(val)}
                      className={`h-11 rounded-xl text-xs font-bold font-mono transition-all flex flex-col items-center justify-center cursor-pointer border ${
                        isSelected
                          ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/25 scale-[1.02]"
                          : "bg-white/5 text-gray-300 border-white/10 hover:border-amber-500/40 hover:text-white"
                      }`}
                    >
                      <span className="text-xs font-black">+{val}</span>
                      <span className="text-[9px] opacity-80">HC</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Catatan Singkat (Maks 80 karakter) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-gray-300 font-mono">Catatan Apresiasi Singkat (Opsional):</label>
                <span className={`text-[10px] font-mono ${message.length > 70 ? "text-amber-400" : "text-gray-400"}`}>
                  {message.length}/80
                </span>
              </div>
              <input
                type="text"
                maxLength={80}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Contoh: Makasih guide-nya bang! / GG mabar tadi!"
                className="w-full h-10 px-3.5 rounded-xl border border-white/10 bg-[#1A0E30] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
                {error.includes("Saldo") && (
                  <Link
                    href="/profile?tab=quests"
                    onClick={onClose}
                    className="text-[11px] underline text-amber-400 font-bold shrink-0"
                  >
                    Top-Up HC
                  </Link>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || isSelf}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black text-xs font-mono shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-98 cursor-pointer"
              >
                <Send size={14} />
                <span>{submitting ? "Mengirim Apresiasi..." : `Kirim Tip 🪙 ${selectedAmount} HC`}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
