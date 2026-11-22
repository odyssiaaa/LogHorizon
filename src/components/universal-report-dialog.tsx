"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { AlertTriangle, Flag, Loader2, ShieldAlert, X } from "lucide-react";
import { ImageUploader } from "@/components/ui/image-uploader";

export type ReportTargetType = "POST" | "MARKETPLACE" | "USER" | "TOURNAMENT_MATCH";
export type ReportCategory = "SCAM" | "CHEAT" | "TOXIC" | "SPAM";

interface ReportDialogProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  targetType?: ReportTargetType;
  targetId?: string | null;
  targetName?: string;
  onSuccess?: (message: string) => void;
  // Backward compatibility prop:
  postId?: string | null;
}

const CATEGORIES: { value: ReportCategory; label: string; desc: string; icon: string }[] = [
  {
    value: "SCAM",
    label: "Penipuan / Scam",
    desc: "Transaksi tidak sesuai, kecurangan rekber, atau manipulasi akun",
    icon: "🚨",
  },
  {
    value: "CHEAT",
    label: "Cheat / Exploit",
    desc: "Penggunaan aplikasi terlarang, maphack, script, atau bug abuse turnamen",
    icon: "⚔️",
  },
  {
    value: "TOXIC",
    label: "Perilaku Toxic / SARA",
    desc: "Pelecehan, ujaran kebencian, provokasi ekstrem, atau penghinaan SARA",
    icon: "🤬",
  },
  {
    value: "SPAM",
    label: "Spamming / Iklan Ilegal",
    desc: "Pesan beruntun tak relevan, promosi judi/phishing, atau perusakan forum",
    icon: "📢",
  },
];

export function UniversalReportDialog({
  open,
  isOpen,
  onClose,
  targetType = "POST",
  targetId,
  targetName,
  onSuccess,
  postId,
}: ReportDialogProps) {
  const isDialogVisible = Boolean(open ?? isOpen);
  const { data: session } = useSession();
  const effectiveId = targetId || postId || null;
  const effectiveType = postId && !targetId ? "POST" : targetType;

  const [category, setCategory] = useState<ReportCategory>("TOXIC");
  const [reason, setReason] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isDialogVisible || !effectiveId) return null;

  const handleClose = () => {
    setReason("");
    setProofUrl("");
    setError("");
    onClose();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Silakan tuliskan kronologi atau alasan laporan.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: effectiveType,
          targetId: effectiveId,
          targetName: targetName || undefined,
          category,
          reason: reason.trim(),
          proofUrl: proofUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirimkan laporan.");
      }

      handleClose();
      onSuccess?.(data.message || "Laporan pelanggaran berhasil dikirim ke moderator.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan sistem saat mengirim laporan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="w-full max-w-lg p-6 sm:p-7 rounded-2xl border border-rose-500/40 bg-white dark:bg-[#11091D] shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#2E1E45]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
              <ShieldAlert size={14} /> LAPORAN PELANGGARAN &amp; SENGKETA RESMI
            </span>
            <h2 id="report-dialog-title" className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Bantu Jaga Integritas Komunitas
            </h2>
            {targetName && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-sm">
                Target: <strong className="text-slate-800 dark:text-slate-200">{targetName}</strong>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
            aria-label="Tutup modal laporan"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Kategori Pelanggaran <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`p-3 rounded-xl text-left border transition ${
                      isSelected
                        ? "border-rose-500 bg-rose-500/10 text-slate-900 dark:text-white ring-1 ring-rose-500"
                        : "border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#0A0512] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{cat.icon}</span>
                      <strong className="text-xs font-bold block">{cat.label}</strong>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block">
                      {cat.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chronology Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Kronologi &amp; Rincian Masalah <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ceritakan apa yang terjadi secara jelas dan objektif (misal: penjual tidak mengirim akun setelah dana dikunci, pemain menggunakan cheat aimbot di ronde 4, dsb)…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#0A0512] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition"
            />
          </div>

          {/* Screenshot Proof */}
          <div>
            <ImageUploader
              value={proofUrl}
              onChange={setProofUrl}
              label="Lampirkan Bukti Screenshot (Opsional tapi Sangat Disarankan)"
              description="Screenshot chat in-game, mutasi transfer, atau papan skor bukti kecurangan."
            />
          </div>

          {/* Notice & Submit Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-[#2E1E45]">
            <span className="text-[11px] text-slate-400 font-mono">
              Laporan otomatis terdisposisi ke moderasi &amp; #mod-logs
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2A1B42] text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || !reason.trim()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-rose-600/20"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Mengirim…</span>
                  </>
                ) : (
                  <>
                    <Flag size={14} />
                    <span>Kirim Laporan Resmi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export { UniversalReportDialog as ReportDialog };
