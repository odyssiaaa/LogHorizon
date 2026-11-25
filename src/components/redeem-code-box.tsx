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
  const [sponsorNotice, setSponsorNotice] = useState<{
    code: string;
    sponsorName: string;
    storeUrl: string;
    message: string;
  } | null>(null);
  const [copiedSerial, setCopiedSerial] = useState(false);
  const [copiedSponsorCode, setCopiedSponsorCode] = useState(false);

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
      setSponsorNotice(null);

      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (json.isSponsorVoucher) {
          setSponsorNotice({
            code: json.code,
            sponsorName: json.sponsorName || "OdyssiaVault",
            storeUrl: json.storeUrl || "http://odyssiavault.kiospremium.site/",
            message: json.message,
          });
          return;
        }
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

        {sponsorNotice && (
          <div className="p-4 sm:p-5 rounded-2xl border border-cyan-500/50 bg-gradient-to-br from-cyan-950/70 via-[#120824] to-[#1A0E30] text-cyan-200 text-xs sm:text-sm space-y-3.5 shadow-xl shadow-cyan-950/40 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                <Ticket className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                  <span>🏷️ Voucher Belanja Toko Mitra</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                    {sponsorNotice.sponsorName}
                  </span>
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Kode ini adalah Voucher Belanja <strong>{sponsorNotice.sponsorName}</strong>! Salin kodenya dan gunakan langsung saat checkout di toko resmi:{" "}
                  <a
                    href={sponsorNotice.storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 font-bold underline hover:text-cyan-300 break-all"
                  >
                    {sponsorNotice.storeUrl}
                  </a>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 w-full sm:w-auto bg-black/60 px-3.5 py-2.5 rounded-xl border border-cyan-500/30">
                <span className="text-[10px] text-gray-400 uppercase font-mono font-bold tracking-wider">Kode Voucher:</span>
                <code className="text-sm font-mono font-black text-amber-300 tracking-wider">
                  {sponsorNotice.code}
                </code>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(sponsorNotice.code);
                    setCopiedSponsorCode(true);
                    setTimeout(() => setCopiedSponsorCode(false), 2500);
                  }}
                  className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedSponsorCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedSponsorCode ? "Tersalin!" : "Salin Kode"}
                </button>
                <a
                  href={sponsorNotice.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-black shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Buka {sponsorNotice.sponsorName}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
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
