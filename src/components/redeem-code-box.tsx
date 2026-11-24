"use client";

import { useState } from "react";
import { Ticket, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, ExternalLink, Copy, Check } from "lucide-react";

interface RedeemCodeBoxProps {
  onSuccess?: (data: any) => void;
  className?: string;
  variant?: "compact" | "full";
}

export function RedeemCodeBox({ onSuccess, className = "", variant = "full" }: RedeemCodeBoxProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    message: string;
    rewardText: string;
    claimSerial: string;
    category: string;
    sponsorName?: string;
    sponsorActionUrl?: string;
  } | null>(null);
  const [copiedSerial, setCopiedSerial] = useState(false);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase().replace(/\s+/g, "");
    if (!clean) {
      setError("Silakan masukkan kode redeem.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal menukarkan kode.");
      }

      setResult({
        message: json.message,
        rewardText: json.rewardText,
        claimSerial: json.claimSerial,
        category: json.category,
        sponsorName: json.sponsorName,
        sponsorActionUrl: json.sponsorActionUrl,
      });
      setCode("");
      if (onSuccess) onSuccess(json);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memproses penukaran.");
    } finally {
      setLoading(false);
    }
  }

  const copySerial = () => {
    if (!result?.claimSerial) return;
    navigator.clipboard.writeText(result.claimSerial);
    setCopiedSerial(true);
    setTimeout(() => setCopiedSerial(false), 3000);
  };

  return (
    <div
      className={`rounded-2xl border border-purple-500/30 bg-[#120824]/90 backdrop-blur-md p-5 sm:p-6 shadow-xl relative overflow-hidden ${className}`}
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-amber-500/10 via-purple-600/10 to-transparent blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-600/20 border border-amber-500/40 text-amber-300">
              <Ticket className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                🎟️ Tukar Kode Redeem &amp; Voucher Sponsor
              </h3>
              <p className="text-xs text-gray-400">
                Klaim bonus XP, tiket Royal Gacha, atau Voucher Promo Mitra Sponsor resmi (<span className="text-cyan-400 font-bold">OdyssiaVault</span>).
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleRedeem} className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ketik kode promo (misal: ODYSSIA20, MABAR50)..."
            className="flex-1 px-4 py-3 rounded-xl border border-purple-500/40 bg-[#1A0E30] text-sm text-white font-mono placeholder:font-sans placeholder-gray-500 uppercase tracking-wider focus:outline-none focus:border-amber-500 transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="px-6 py-3 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-black shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Memproses...
              </span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Tukar Kode ⚡
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/50 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="p-4 rounded-xl border border-emerald-500/50 bg-gradient-to-br from-emerald-950/60 to-[#120824] text-emerald-200 text-xs sm:text-sm space-y-3 animate-fadeIn">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-extrabold text-white block">{result.message}</span>
                  <span className="text-amber-300 font-bold text-xs">{result.rewardText}</span>
                </div>
              </div>
            </div>

            {/* SERIAL ID CARD */}
            <div className="p-2.5 rounded-lg bg-black/40 border border-emerald-500/30 flex items-center justify-between gap-2">
              <div className="text-[11px] text-gray-300">
                <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">No. Seri Validasi Unik:</span>
                <code className="text-xs font-mono font-bold text-cyan-300">{result.claimSerial}</code>
              </div>
              <button
                type="button"
                onClick={copySerial}
                className="px-2.5 py-1 rounded-md text-[10px] font-bold border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-all flex items-center gap-1"
              >
                {copiedSerial ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Salin Seri
                  </>
                )}
              </button>
            </div>

            {result.category === "SPONSOR_VOUCHER" && (
              <div className="flex items-center justify-between pt-1 text-[11px] text-gray-300">
                <span>Voucher tersimpan aman di <strong>Dompet Voucher Sponsor</strong> Anda.</span>
                {result.sponsorActionUrl && (
                  <a
                    href={result.sponsorActionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-cyan-400 hover:underline"
                  >
                    Kunjungi {result.sponsorName || "OdyssiaVault"}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
