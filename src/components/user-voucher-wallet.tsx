"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Award,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Ticket,
  Clock,
  Dices,
  RefreshCw,
  Gift,
} from "lucide-react";

interface UserVoucher {
  claimId: string;
  codeId: string;
  promoCode: string;
  uniqueClaimSerial: string;
  source: string;
  claimedAt: string;
  title: string;
  sponsorName: string;
  discountValue: number;
  sponsorActionUrl: string;
  expiresAt: string | null;
}

export function UserVoucherWallet() {
  const [vouchers, setVouchers] = useState<UserVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedSerialId, setCopiedSerialId] = useState<string | null>(null);

  const fetchVouchers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/vouchers");
      if (res.ok) {
        const json = await res.json();
        setVouchers(json.vouchers || []);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  const copySerial = (serial: string, id: string) => {
    navigator.clipboard.writeText(serial);
    setCopiedSerialId(id);
    setTimeout(() => setCopiedSerialId(null), 2500);
  };

  const handleClaimToSponsor = (url: string, code: string, id: string) => {
    copyCode(code, id);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
            🏷️ Dompet Voucher Sponsor Saya
            {vouchers.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {vouchers.length} Voucher
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-400">
            Daftar voucher diskon mitra resmi (<span className="text-cyan-400 font-bold">OdyssiaVault</span>) yang Anda peroleh dari Redeem Code maupun Jackpot Royal Gacha.
          </p>
        </div>

        <button
          onClick={fetchVouchers}
          disabled={loading}
          className="p-2 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-all active:scale-95 disabled:opacity-50"
          title="Segarkan Dompet"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="p-8 rounded-2xl border border-purple-500/20 bg-[#120824]/60 text-center text-xs text-gray-400 font-mono">
          <RefreshCw className="w-5 h-5 text-purple-400 animate-spin mx-auto mb-2" />
          Memuat voucher sponsor...
        </div>
      ) : vouchers.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-purple-500/30 bg-[#120824]/50 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            <Ticket className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Belum Ada Voucher Sponsor di Dompet</h4>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Tukarkan kode promo sponsor dari event komunitas, atau coba keberuntungan memanggil di <strong>Royal Gacha Summon</strong> untuk memenangkan Jackpot Voucher Diskon OdyssiaVault!
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/profile?tab=gacha"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-all"
            >
              <Dices className="w-3.5 h-3.5 text-amber-400" />
              Putar Royal Gacha
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vouchers.map((v) => {
            const isExpired = v.expiresAt ? new Date(v.expiresAt) < new Date() : false;
            const isGachaSource = v.source === "ROYAL_GACHA";

            return (
              <div
                key={v.claimId}
                className={`p-5 rounded-2xl border relative overflow-hidden transition-all space-y-4 ${
                  isExpired
                    ? "border-gray-800 bg-[#0E0617]/70 opacity-60"
                    : "border-cyan-500/40 bg-gradient-to-br from-[#120D26] via-[#100720] to-[#0A0414] shadow-lg shadow-cyan-950/30 hover:border-cyan-400/60"
                }`}
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-cyan-500/10 via-purple-600/10 to-transparent blur-xl pointer-events-none" />

                {/* HEADER / SPONSOR BRAND */}
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-cyan-500/40 bg-cyan-500/15 text-cyan-300">
                        {v.sponsorName}
                      </span>
                      {isGachaSource ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Dices className="w-2.5 h-2.5 text-amber-400" />
                          Jackpot Gacha
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <Gift className="w-2.5 h-2.5" />
                          Redeem Code
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-extrabold text-white leading-snug">{v.title}</h4>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-cyan-300">
                      {v.discountValue}%
                    </span>
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">OFF</span>
                  </div>
                </div>

                {/* PROMO CODE & SERIAL BOX */}
                <div className="space-y-2 relative z-10">
                  {/* PROMO CODE */}
                  <div className="p-3 rounded-xl bg-black/50 border border-cyan-500/30 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider">
                        Kode Promo Voucher:
                      </span>
                      <code className="text-sm font-black text-amber-300 font-mono tracking-widest">
                        {v.promoCode}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyCode(v.promoCode, v.claimId)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-all flex items-center gap-1"
                    >
                      {copiedCodeId === v.claimId ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Tersalin!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Salin
                        </>
                      )}
                    </button>
                  </div>

                  {/* SERIAL ID PROOF */}
                  <div className="p-2.5 rounded-xl bg-black/30 border border-purple-500/20 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase font-mono font-bold">
                        Seri Bukti Kepemilikan (Anti-Fraud):
                      </span>
                      <code className="text-xs font-mono font-bold text-cyan-400">
                        {v.uniqueClaimSerial}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => copySerial(v.uniqueClaimSerial, v.claimId)}
                      className="p-1.5 rounded-md text-[10px] text-gray-400 hover:text-cyan-300 hover:bg-white/5 transition-all"
                      title="Salin Nomor Seri"
                    >
                      {copiedSerialId === v.claimId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* FOOTER ACTIONS */}
                <div className="relative z-10 pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span>
                      {v.expiresAt
                        ? `Berlaku s/d: ${new Date(v.expiresAt).toLocaleDateString("id-ID")}`
                        : "Berlaku Permanen"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleClaimToSponsor(v.sponsorActionUrl, v.promoCode, v.claimId)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-md shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all"
                  >
                    <span>Salin &amp; Klaim ke Sponsor</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
