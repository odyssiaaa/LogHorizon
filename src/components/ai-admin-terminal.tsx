"use client";

import React, { useState } from "react";
import {
  Terminal,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trophy,
  Megaphone,
  Clock,
  ShieldAlert,
  ArrowRight,
  Loader2,
  Check,
  X,
} from "lucide-react";

type ToolResult = {
  action: string;
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  details?: string;
};

type CommandResponse = {
  success: boolean;
  reply: string;
  toolResult?: ToolResult | null;
  requiresConfirmation?: boolean;
  actionType?: string;
  summary?: string;
  payload?: {
    tool: string;
    args: Record<string, unknown>;
    confirmed?: boolean;
  };
  error?: string;
};

const QUICK_PROMPTS = [
  {
    label: "Ubah Biaya Turnamen",
    icon: Trophy,
    prompt: "Ubah biaya pendaftaran turnamen S1 menjadi 100.000",
  },
  {
    label: "Update Hadiah",
    icon: Sparkles,
    prompt: "Ubah total hadiah turnamen S1 menjadi Rp 2.500.000 + E-Certificate",
  },
  {
    label: "Kirim Broadcast",
    icon: Megaphone,
    prompt: "Kirim broadcast pengumuman: Jadwal Mabar dan Turnamen Akhir Pekan LogHorizon dimulai hari Sabtu pukul 19:00 WIB!",
  },
  {
    label: "Cek Antrean Pending",
    icon: Clock,
    prompt: "Cek seluruh antrean pending donasi QRIS dan pendaftaran turnamen yang belum di-ACC",
  },
];

export function AiAdminTerminal({
  onActionExecuted,
}: {
  onActionExecuted?: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [response, setResponse] = useState<CommandResponse | null>(null);
  const [error, setError] = useState("");

  async function handleSendCommand(cmdText?: string) {
    const textToSend = cmdText ?? prompt;
    if (!textToSend.trim() || loading) return;

    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await fetch("/api/admin/ai-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: textToSend.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses perintah AI.");
      }

      setResponse(data);
      if (data.toolResult) {
        onActionExecuted?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmExecution() {
    if (!response?.payload || confirming) return;

    setConfirming(true);
    setError("");

    try {
      const res = await fetch("/api/admin/ai-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmedPayload: {
            ...response.payload,
            confirmed: true,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengeksekusi perintah.");
      }

      setResponse(data);
      onActionExecuted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal konfirmasi eksekusi.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="w-full bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2A1B42] rounded-xl shadow-2xl p-5 sm:p-6 text-slate-900 dark:text-white space-y-5 text-left">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-[#2A1B42]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center text-[#7C3AED] dark:text-[#A78BFA] shrink-0">
            <Terminal size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                AI Admin Command Assistant
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase">
                👑 KHUSUS ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kendali otomatis database LogHorizon via Google Gemini Function Calling
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ONLINE • 24/7</span>
          </span>
          {response && (
            <button
              type="button"
              onClick={() => {
                setResponse(null);
                setPrompt("");
                setError("");
              }}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-[#1A0F2E] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title="Bersihkan Terminal"
            >
              <RotateCcw size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Quick Suggestion Chips */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block">
          PINTASAN PERINTAH CEPAT:
        </span>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setPrompt(item.prompt);
                  void handleSendCommand(item.prompt);
                }}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#1A0F2E] hover:border-[#7C3AED] hover:text-[#7C3AED] dark:hover:text-[#A78BFA] text-xs font-medium text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 shadow-xs"
              >
                <Icon size={13} className="text-[#7C3AED] dark:text-[#A78BFA]" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Command Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSendCommand();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            placeholder="Perintahkan AI... (cth: 'Ubah biaya pendaftaran turnamen S1 jadi 100.000')"
            className="w-full h-11 px-3.5 pr-10 rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#0A0512] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="h-11 px-5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition shadow-md shrink-0"
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>Memproses…</span>
            </>
          ) : (
            <>
              <Send size={15} />
              <span>Jalankan Perintah</span>
            </>
          )}
        </button>
      </form>

      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Confirmation Required Alert & 1-Click Action */}
      {response?.requiresConfirmation && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                ⚠️ KONFIRMASI 1-KLIK DIPERLUKAN UNTUK AKSI KRUSIAL
              </h4>
              <p className="text-sm font-semibold mt-1">
                {response.summary || "Perubahan hak akses staf atau penghapusan data terdeteksi."}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {response.reply}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={confirming}
              onClick={handleConfirmExecution}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              {confirming ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Mengeksekusi…</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>✅ Konfirmasi &amp; Jalankan</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={confirming}
              onClick={() => {
                setResponse(null);
                setPrompt("");
              }}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-semibold transition flex items-center gap-1"
            >
              <X size={14} />
              <span>Batal</span>
            </button>
          </div>
        </div>
      )}

      {/* Execution Report Card */}
      {response && !response.requiresConfirmation && (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#0A0512] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {response.toolResult ? "LAPORAN EKSEKUSI DATABASE" : "RESPON SATPAM AI COMMAND"}
              </span>
            </div>
            {response.toolResult && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/30">
                {response.toolResult.action}
              </span>
            )}
          </div>

          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200">
            {response.reply}
          </p>

          {/* Before ➡️ After Visual Table */}
          {response.toolResult?.before && response.toolResult?.after && (
            <div className="pt-2">
              <div className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-bold mb-2">
                DETAIL PERUBAHAN NILAI (SEBELUM ➡️ SESUDAH):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Sebelum */}
                <div className="p-3 rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                    SEBELUM
                  </span>
                  {Object.entries(response.toolResult.before).map(([k, v]) => (
                    <div key={k} className="text-xs flex items-center justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400 capitalize">{k}:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                        {String(v ?? "-")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Sesudah */}
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10 space-y-1">
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase font-bold flex items-center gap-1">
                    <ArrowRight size={12} /> SESUDAH
                  </span>
                  {Object.entries(response.toolResult.after).map(([k, v]) => (
                    <div key={k} className="text-xs flex items-center justify-between gap-2">
                      <span className="text-emerald-700 dark:text-emerald-300 capitalize">{k}:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 truncate max-w-[150px]">
                        {String(v ?? "-")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {response.toolResult?.details && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono pt-1">
              ℹ️ {response.toolResult.details}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
