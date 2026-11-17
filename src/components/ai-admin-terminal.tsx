"use client";

import React, { useState, useRef, useEffect } from "react";
import { DISCORD_CHANNELS, DiscordChannelKey } from "@/lib/discord-bot";
import {
  Terminal,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Megaphone,
  ShieldAlert,
  ArrowRight,
  Loader2,
  Check,
  X,
  Plus,
  Dices,
  MessageSquare,
  Gamepad2,
  Coins,
  Bot,
  User,
  Globe,
  FileText,
  Edit3,
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

type HistoryItem = {
  id: string;
  sender: "user" | "ai";
  text?: string;
  response?: CommandResponse;
  timestamp: string;
};

const QUICK_PROMPTS = [
  {
    label: "Buat Turnamen",
    icon: Plus,
    prompt: "Buat turnamen baru Mobile Legends Championship S2 hadiah Rp 3.000.000 + E-Certificate dengan 8 tim dan biaya registrasi gratis",
  },
  {
    label: "Buat Thread",
    icon: MessageSquare,
    prompt: "Buat thread forum pengumuman resmi tentang panduan dan tata tertib kompetisi guild LogHorizon Season 1",
  },
  {
    label: "Buat LFG Mabar",
    icon: Gamepad2,
    prompt: "Buat ajakan mabar Valorant butuh 2 pemain rank Diamond untuk push rank malam ini",
  },
  {
    label: "Gacha Bagan",
    icon: Dices,
    prompt: "Gacha dan acak ulang bagan turnamen S1 secara adil",
  },
  {
    label: "ACC Antrean",
    icon: Coins,
    prompt: "Cek dan ACC antrean donasi kas QRIS atau pendaftaran turnamen yang masih pending",
  },
  {
    label: "Broadcast Info",
    icon: Megaphone,
    prompt: "Kirim broadcast pengumuman: Jadwal Mabar dan Turnamen Akhir Pekan LogHorizon dimulai hari Sabtu pukul 19:00 WIB!",
  },
  {
    label: "Update Hadiah",
    icon: Sparkles,
    prompt: "Ubah total hadiah turnamen S1 menjadi Rp 2.500.000 + E-Certificate",
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
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<CommandResponse | null>(null);
  const [error, setError] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Draft state for interactive Broadcast Previews
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftTarget, setDraftTarget] = useState<"WEB_ONLY" | "DISCORD_ONLY" | "BOTH">("WEB_ONLY");
  const [draftChannel, setDraftChannel] = useState<DiscordChannelKey>("announcements");

  // Sync draft state whenever a new pending confirmation arrives
  useEffect(() => {
    if (pendingConfirmation && pendingConfirmation.actionType === "BROADCAST_PREVIEW") {
      const args = pendingConfirmation.payload?.args || {};
      setDraftTitle(String(args.title || ""));
      setDraftContent(String(args.content || ""));
      const rawTarget = String(args.targetPlatform || "WEB_ONLY").toUpperCase();
      setDraftTarget(rawTarget === "DISCORD_ONLY" || rawTarget === "BOTH" ? rawTarget : "WEB_ONLY");
      const rawChannel = String(args.targetChannel || "announcements").toLowerCase();
      setDraftChannel((rawChannel in DISCORD_CHANNELS ? rawChannel : "announcements") as DiscordChannelKey);
    }
  }, [pendingConfirmation]);

  // Auto-scroll to bottom of chat history when items are added
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading, pendingConfirmation]);

  async function handleSendCommand(cmdText?: string) {
    const textToSend = cmdText ?? prompt;
    if (!textToSend.trim() || loading) return;

    const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const userItem: HistoryItem = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend.trim(),
      timestamp: timeStr,
    };

    setHistory((prev) => [...prev, userItem]);
    setPrompt("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/ai-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: textToSend.trim() }),
      });

      const data: CommandResponse = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses perintah AI.");
      }

      if (data.requiresConfirmation) {
        setPendingConfirmation(data);
      } else {
        const aiItem: HistoryItem = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          response: data,
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        };
        setHistory((prev) => [...prev, aiItem]);
        setPendingConfirmation(null);
      }

      if (data.toolResult) {
        onActionExecuted?.();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem.";
      setError(msg);
      const errorItem: HistoryItem = {
        id: `err-${Date.now()}`,
        sender: "ai",
        response: {
          success: false,
          reply: `❌ Terjadi Kesalahan: ${msg}`,
        },
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };
      setHistory((prev) => [...prev, errorItem]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmExecution(customArgs?: Record<string, unknown>) {
    if (!pendingConfirmation?.payload || confirming) return;

    setConfirming(true);
    setError("");

    try {
      const finalArgs = customArgs || pendingConfirmation.payload.args;
      const res = await fetch("/api/admin/ai-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmedPayload: {
            ...pendingConfirmation.payload,
            args: finalArgs,
            confirmed: true,
          },
        }),
      });

      const data: CommandResponse = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengeksekusi perintah.");
      }

      const confirmedItem: HistoryItem = {
        id: `ai-conf-${Date.now()}`,
        sender: "ai",
        response: data,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };
      setHistory((prev) => [...prev, confirmedItem]);
      setPendingConfirmation(null);
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
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setHistory([]);
                setPendingConfirmation(null);
                setPrompt("");
                setError("");
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A0F2E] transition border border-transparent hover:border-slate-200 dark:hover:border-[#2A1B42]"
              title="Bersihkan Riwayat Terminal"
            >
              <RotateCcw size={13} />
              <span>Bersihkan Layar</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Suggestion Chips (Clean single plus / icons) */}
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
                  void handleSendCommand(item.prompt);
                }}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#1A0F2E] hover:border-[#7C3AED] hover:text-[#7C3AED] dark:hover:text-[#A78BFA] text-xs font-medium text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Icon size={13} className="text-[#7C3AED] dark:text-[#A78BFA]" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dedicated Chat & Execution History Area */}
      <div className="min-h-[360px] max-h-[55vh] overflow-y-auto space-y-3 p-4 bg-slate-50 dark:bg-[#08040E] border border-slate-200 dark:border-[#2A1B42] rounded-lg">
        {history.length === 0 && !loading && !pendingConfirmation ? (
          <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED] dark:text-[#A78BFA]">
              <Bot size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Pusat Kendali Satpam Horizon AI Siap
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 leading-relaxed">
                Ketik instruksi atau klik pintasan perintah di atas untuk mengelola turnamen, bagan knockout, forum, lobi mabar LFG, antrean donasi kas QRIS, tiket rekber, maupun kasta staf guild.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] text-slate-400 font-mono">
              <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-[#130921] border border-slate-300 dark:border-[#2A1B42]">
                ⚡ Eksekusi Real-time
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-[#130921] border border-slate-300 dark:border-[#2A1B42]">
                🛡️ 1-Click Safety Gate
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-[#130921] border border-slate-300 dark:border-[#2A1B42]">
                📊 Visual Diff (Sebelum ➡️ Sesudah)
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <div key={item.id} className="space-y-2">
                {/* User Prompt Message */}
                {item.sender === "user" ? (
                  <div className="flex items-start justify-end gap-2.5 pl-8">
                    <div className="space-y-1 text-right">
                      <div className="inline-block px-4 py-2.5 rounded-2xl rounded-tr-none bg-[#7C3AED] text-white text-xs font-medium shadow-sm leading-relaxed text-left">
                        {item.text}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">
                        Admin • {item.timestamp}
                      </span>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center text-[#7C3AED] dark:text-[#A78BFA] shrink-0 mt-0.5">
                      <User size={13} />
                    </div>
                  </div>
                ) : (
                  /* AI Response / Execution Report */
                  <div className="flex items-start gap-2.5 pr-8">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                      <Bot size={14} />
                    </div>
                    <div className="space-y-2 max-w-[90%] text-left">
                      <div className="p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] shadow-sm space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              {item.response?.toolResult ? "LAPORAN EKSEKUSI DATABASE" : "RESPON SATPAM AI"}
                            </span>
                          </div>
                          {item.response?.toolResult && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/30">
                              {item.response.toolResult.action}
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                          {item.response?.reply}
                        </p>

                        {/* Visual Table: Sebelum ➡️ Sesudah */}
                        {item.response?.toolResult?.before && item.response?.toolResult?.after && (
                          <div className="pt-2">
                            <div className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-bold mb-1.5">
                              DETAIL PERUBAHAN NILAI (SEBELUM ➡️ SESUDAH):
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {/* Sebelum */}
                              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#0A0512] space-y-1">
                                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                                  SEBELUM
                                </span>
                                {Object.entries(item.response.toolResult.before).map(([k, v]) => (
                                  <div key={k} className="text-xs flex items-center justify-between gap-2">
                                    <span className="text-slate-500 dark:text-slate-400 capitalize">{k}:</span>
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                                      {String(v ?? "-")}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* Sesudah */}
                              <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10 space-y-1">
                                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase font-bold flex items-center gap-1">
                                  <ArrowRight size={11} /> SESUDAH
                                </span>
                                {Object.entries(item.response.toolResult.after).map(([k, v]) => (
                                  <div key={k} className="text-xs flex items-center justify-between gap-2">
                                    <span className="text-emerald-700 dark:text-emerald-300 capitalize">{k}:</span>
                                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 truncate max-w-[140px]">
                                      {String(v ?? "-")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {item.response?.toolResult?.details && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1">
                            ℹ️ {item.response.toolResult.details}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block pl-2">
                        Satpam Horizon AI • {item.timestamp}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Pending Confirmation Card: Broadcast Draft Preview vs Standard */}
            {pendingConfirmation && pendingConfirmation.actionType === "BROADCAST_PREVIEW" ? (
              <div className="p-4 sm:p-5 rounded-xl bg-purple-500/10 border-2 border-[#7C3AED]/40 text-slate-900 dark:text-purple-100 space-y-4 animate-in fade-in duration-200 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-500/20">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-lg bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] shrink-0">
                      <Megaphone size={18} />
                    </span>
                    <div>
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7C3AED] dark:text-[#A78BFA] flex items-center gap-1.5">
                        <span>PRATINJAU DRAF BROADCAST</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          PERLU PERSETUJUAN ADMIN
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Pesan belum dikirim. Periksa &amp; edit teks di bawah sebelum dipublikasikan.
                      </p>
                    </div>
                  </div>

                  {/* Target Platform Selector Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase mr-1">
                      Target:
                    </span>
                    <button
                      type="button"
                      onClick={() => setDraftTarget("WEB_ONLY")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        draftTarget === "WEB_ONLY"
                          ? "bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/50"
                          : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20"
                      }`}
                      title="Hanya tayang di Beranda / Web LogHorizon"
                    >
                      <Globe size={12} />
                      <span>🌐 WEBSITE ONLY</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraftTarget("DISCORD_ONLY")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        draftTarget === "DISCORD_ONLY"
                          ? "bg-[#5865F2] text-white shadow-xs ring-2 ring-[#5865F2]/50"
                          : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20"
                      }`}
                      title="Hanya dikirim ke Webhook Channel Discord"
                    >
                      <MessageSquare size={12} />
                      <span>💬 DISCORD ONLY</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraftTarget("BOTH")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        draftTarget === "BOTH"
                          ? "bg-purple-600 text-white shadow-xs ring-2 ring-purple-400/50"
                          : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20"
                      }`}
                      title="Tayang di Website dan dikirim ke Discord sekaligus"
                    >
                      <Sparkles size={12} />
                      <span>🌐 + 💬 WEB &amp; DISCORD</span>
                    </button>
                  </div>
                </div>

                {/* Editable Draft Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                      <FileText size={13} className="text-[#7C3AED] dark:text-[#A78BFA]" />
                      <span>Judul Pengumuman:</span>
                    </label>
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder="Masukkan judul pengumuman..."
                      className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-[#0A0512] border border-slate-300 dark:border-[#2A1B42] text-slate-900 dark:text-white font-semibold focus:outline-hidden focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                      <Edit3 size={13} className="text-[#7C3AED] dark:text-[#A78BFA]" />
                      <span>Isi Lengkap Pengumuman:</span>
                    </label>
                    <textarea
                      rows={4}
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      placeholder="Tuliskan isi pengumuman lengkap..."
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-white dark:bg-[#0A0512] border border-slate-300 dark:border-[#2A1B42] text-slate-900 dark:text-white focus:outline-hidden focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition leading-relaxed resize-y"
                    />
                  </div>

                  {/* Channel Discord Selector if target includes Discord */}
                  {draftTarget !== "WEB_ONLY" && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg bg-[#5865F2]/10 border border-[#5865F2]/30 animate-in fade-in duration-150">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{DISCORD_CHANNELS[draftChannel]?.icon || "💬"}</span>
                        <div>
                          <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block">
                            Saluran Discord Tujuan:
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {DISCORD_CHANNELS[draftChannel]?.description}
                          </span>
                        </div>
                      </div>
                      <select
                        value={draftChannel}
                        onChange={(e) => setDraftChannel(e.target.value as DiscordChannelKey)}
                        className="px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-white dark:bg-[#11091D] border border-slate-300 dark:border-[#2A1B42] text-slate-900 dark:text-white focus:outline-none focus:border-[#5865F2] shrink-0 cursor-pointer"
                      >
                        {Object.values(DISCORD_CHANNELS).map((ch) => (
                          <option key={ch.key} value={ch.key}>
                            {ch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Actions & Target Summary */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Target Publikasi:{" "}
                    <strong className="text-[#7C3AED] dark:text-[#A78BFA]">
                      {draftTarget === "WEB_ONLY"
                        ? "🌐 Website LogHorizon Saja"
                        : draftTarget === "DISCORD_ONLY"
                          ? `💬 Discord (${DISCORD_CHANNELS[draftChannel]?.name || "#announcements"}) Saja`
                          : `🌐 Website & 💬 Discord (${DISCORD_CHANNELS[draftChannel]?.name || "#announcements"})`}
                    </strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={confirming || !draftTitle.trim() || !draftContent.trim()}
                      onClick={() =>
                        handleConfirmExecution({
                          title: draftTitle.trim(),
                          content: draftContent.trim(),
                          targetPlatform: draftTarget,
                          targetChannel: draftChannel,
                        })
                      }
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {confirming ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Mempublikasikan…</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          <span>✅ ACC &amp; Kirim Sekarang</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={confirming}
                      onClick={() => {
                        setPendingConfirmation(null);
                        const cancelItem: HistoryItem = {
                          id: `cancel-${Date.now()}`,
                          sender: "ai",
                          response: {
                            success: false,
                            reply: `✏️ Draf pengumuman "${draftTitle || "Broadcast"}" dibatalkan oleh Admin. Tidak ada pesan yang dipublikasikan ke Website maupun Discord.`,
                          },
                          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
                        };
                        setHistory((prev) => [...prev, cancelItem]);
                      }}
                      className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer"
                    >
                      <X size={14} />
                      <span>✏️ Minta Revisi / Batal</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : pendingConfirmation ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert size={20} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      ⚠️ KONFIRMASI 1-KLIK DIPERLUKAN UNTUK AKSI KRUSIAL
                    </h4>
                    <p className="text-sm font-semibold mt-1">
                      {pendingConfirmation.summary || "Perubahan hak akses staf atau penghapusan data terdeteksi."}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {pendingConfirmation.reply}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={confirming}
                    onClick={() => handleConfirmExecution()}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 cursor-pointer"
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
                      setPendingConfirmation(null);
                    }}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    <X size={14} />
                    <span>Batal</span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-center gap-2 p-3 text-xs text-[#7C3AED] dark:text-[#A78BFA] font-mono">
                <Loader2 size={15} className="animate-spin" />
                <span>Satpam Horizon sedang menganalisis perintah &amp; menyiapkan eksekusi…</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
    </div>
  );
}
