"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import {
  Bot,
  ChevronDown,
  Loader2,
  Maximize2,
  MessageSquare,
  Minimize2,
  RotateCcw,
  Send,
  Shield,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import { DiscordAvatar } from "@/components/discord-avatar";
import { UniversalTextRenderer } from "@/lib/text-parser";

export type MessageAction = {
  type: "navigate" | "party_created" | "thread_created" | "require_login" | "broadcast_preview" | "tournament_created" | string;
  url?: string;
  label?: string;
  details?: string;
  requiresConfirmation?: boolean;
  payload?: {
    tool: string;
    args: Record<string, unknown>;
    confirmed?: boolean;
  };
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  action?: MessageAction;
};

const SUGGESTIONS = [
  "🎮 Cari Teman Mabar",
  "➕ Buatkan Party Mabar ML",
  "🏆 Jadwal Turnamen",
  "👑 Siapa Top XP Guild?",
];

const INITIAL_MESSAGE: Message = {
  id: "init-1",
  role: "assistant",
  content:
    "Halo Petualang! Satpam Horizon siap menjaga keamanan & memandu kamu di LogHorizon. Ada yang ingin ditanyakan seputar party mabar, turnamen, kas guild, atau lapak marketplace?",
  timestamp: "Baru saja",
};

export function HorizonChatWidget() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef<{ startX: number; startY: number; initialX: number; initialY: number; moved: boolean } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const maxX = Math.max(10, window.innerWidth - 96);
        const maxY = Math.max(10, window.innerHeight - 96);
        return {
          x: Math.min(prev.x, maxX),
          y: Math.min(prev.y, maxY),
        };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    dragInfo.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: rect.left,
      initialY: rect.top,
      moved: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragInfo.current) return;
    const dx = e.clientX - dragInfo.current.startX;
    const dy = e.clientY - dragInfo.current.startY;
    if (Math.hypot(dx, dy) > 5) {
      dragInfo.current.moved = true;
    }
    const targetX = dragInfo.current.initialX + dx;
    const targetY = dragInfo.current.initialY + dy;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const maxX = Math.max(12, (typeof window !== "undefined" ? window.innerWidth : 800) - 76);
    const maxY = Math.max(64, (typeof window !== "undefined" ? window.innerHeight : 600) - (isMobile ? 120 : 80));
    const clampedX = Math.max(12, Math.min(maxX, targetX));
    const clampedY = Math.max(isMobile ? 64 : 12, Math.min(maxY, targetY));
    setPosition({ x: clampedX, y: clampedY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragInfo.current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    const didMove = dragInfo.current.moved;
    dragInfo.current = null;
    setIsDragging(false);
    if (!didMove) {
      setIsOpen((prev) => !prev);
    }
  };

  const getPopupStyle = (): React.CSSProperties => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      return {}; // Handled by responsive Tailwind classes: inset-x-3 top-16 bottom-24 w-auto h-auto max-h-[75vh]
    }
    if (!position || typeof window === "undefined") return {};
    const popupWidth = 384;
    const popupHeight = 520;
    let left = position.x - popupWidth + 70;
    if (left < 16) left = 16;
    if (left + popupWidth > window.innerWidth - 16) left = window.innerWidth - popupWidth - 16;

    let top = position.y - popupHeight - 12;
    if (top < 16) {
      top = position.y + 90;
      if (top + popupHeight > window.innerHeight - 16) {
        top = window.innerHeight - popupHeight - 16;
      }
    }
    return { left: `${left}px`, top: `${top}px` };
  };

  // Jangan tampilkan di halaman Admin agar tidak menutupi tabel operasional
  const isAdminPage = pathname?.startsWith("/admin");

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  if (isAdminPage) {
    return null;
  }

  async function sendMessage(textToSend?: string) {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setErrorMsg("");

    try {
      // Siapkan history untuk Gemini multi-turn di API (10 riwayat terakhir)
      const historyPayload = messages
        .filter((m) => m.id !== "init-1")
        .slice(-10)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
        }),
      });

      if (res.status === 429) {
        throw new Error("Satpam Horizon sedang patroli kilat. Mohon tunggu 2 detik sebelum mengirim pertanyaan lagi.");
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Koneksi ke Satpam Horizon terputus.");
      }

      const data = await res.json();
      const replyText = typeof data.reply === "string" ? data.reply : "Laporan diterima, petualang!";

      // If AI created a new LFG party, instantly trigger page sync
      if (data.action?.type === "party_created" && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("lh:lfg-refresh"));
      }

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: replyText,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        action: data.action,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghubungi Satpam Horizon.";
      setErrorMsg(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ ${msg}`,
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmAction(payload: { tool: string; args: Record<string, unknown>; confirmed?: boolean }) {
    if (confirmingAction) return;
    setConfirmingAction(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmedPayload: {
            ...payload,
            confirmed: true,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Gagal mengonfirmasi aksi.");
      }

      const data = await res.json();
      const replyText = typeof data.reply === "string" ? data.reply : "Aksi berhasil dikonfirmasi dan dijalankan!";

      const confirmedMessage: Message = {
        id: `conf-${Date.now()}`,
        role: "assistant",
        content: replyText,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        action: data.action,
      };

      setMessages((prev) => [...prev, confirmedMessage]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengonfirmasi aksi.";
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `❌ ${msg}`,
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setConfirmingAction(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage();
  }

  function resetChat() {
    setMessages([INITIAL_MESSAGE]);
    setErrorMsg("");
  }

  return (
    <>
      {/* Draggable Tactical Chibi Guardian Mascot */}
      <div
        style={
          position
            ? {
                left: `${typeof window !== "undefined" ? Math.min(position.x, window.innerWidth - 76) : position.x}px`,
                top: `${position.y}px`,
              }
            : undefined
        }
        className={`fixed z-[45] touch-none select-none scale-85 sm:scale-100 ${
          !position ? "bottom-24 right-3 sm:bottom-6 sm:right-6" : ""
        }`}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative group cursor-grab active:cursor-grabbing transition-transform duration-200 ease-out ${
            isDragging ? "scale-110 rotate-3 shadow-[0_0_25px_rgba(157,78,221,0.6)]" : "hover:scale-105"
          }`}
          title={isOpen ? "Tutup Chat Satpam AI" : "Tarik untuk memindahkan, klik untuk ngobrol dengan Satpam AI"}
        >
          {/* Chibi Tactical Guardian Mascot */}
          <div className="relative flex flex-col items-center">
            {/* Halo / Status indicator */}
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
              {/* Glow ambient background */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#7C3AED] via-[#9D4EDD] to-[#4C1D95] opacity-90 blur-xs shadow-lg shadow-[#7C3AED]/40" />

              {/* Mascot SVG */}
              <svg
                viewBox="0 0 64 64"
                className="w-12 h-12 sm:w-14 sm:h-14 relative z-10 drop-shadow-md"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Tactical Helmet Horns / Antennas */}
                <path d="M14 26L18 32H12L14 26Z" fill="#7C3AED" stroke="#C4B5FD" strokeWidth="1.5" />
                <path d="M50 26L46 32H52L50 26Z" fill="#7C3AED" stroke="#C4B5FD" strokeWidth="1.5" />

                {/* Commander Crest Top */}
                <path d="M26 8H38L34 16H30L26 8Z" fill="#F59E0B" stroke="#FDE68A" strokeWidth="1" />
                <path d="M32 16V22" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" />

                {/* Helmet Base Head */}
                <rect x="16" y="18" width="32" height="30" rx="10" fill="#180E29" stroke="#7C3AED" strokeWidth="2" />

                {/* Visor Background */}
                <rect x="20" y="27" width="24" height="12" rx="4" fill="#09040F" stroke="#2E1E45" strokeWidth="1.5" />

                {/* Glowing Cyber Visor / Eyes */}
                <rect x="22" y="29" width="20" height="8" rx="2" fill="#10B981" />
                <line x1="25" y1="33" x2="31" y2="33" stroke="#ECFDF5" strokeWidth="2" strokeLinecap="round" />
                <line x1="33" y1="33" x2="39" y2="33" stroke="#ECFDF5" strokeWidth="2" strokeLinecap="round" />

                {/* Tactical Cheek Guard */}
                <path d="M18 38L22 43H42L46 38" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" />

                {/* Chest Pauldrons / Mantle */}
                <path d="M12 50C12 48 18 46 32 46C46 46 52 48 52 50L54 58H10L12 50Z" fill="#2E1052" stroke="#7C3AED" strokeWidth="1.5" />
                <circle cx="32" cy="52" r="3" fill="#10B981" />
              </svg>

              {/* Online pulse badge */}
              <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#11091D] shadow-sm animate-pulse z-20" />

              {/* If open, show an X overlay indicator */}
              {isOpen && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center z-30">
                  <X className="size-6 text-white" />
                </div>
              )}
            </div>

            {/* SATPAM AI Badge */}
            <div className="mt-1 px-2 py-0.5 rounded-none bg-white dark:bg-[#11091D] border border-[#7C3AED] shadow-md flex items-center gap-1 z-20 pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[9px] font-mono font-bold tracking-wider text-[#7C3AED] dark:text-[#A78BFA] uppercase whitespace-nowrap">
                SATPAM AI
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Popup Window */}
      {isOpen && (
        <aside
          role="dialog"
          aria-label="Jendela Chat Satpam Horizon"
          style={getPopupStyle()}
          className={`fixed z-[50] rounded-xl border-2 border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] shadow-2xl flex flex-col overflow-hidden transition-all duration-200 inset-x-3 top-16 bottom-24 w-auto h-auto max-h-[75vh] sm:inset-auto sm:w-96 sm:h-[520px] sm:max-h-[82vh] ${
            !position ? "sm:bottom-6 sm:right-6" : ""
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-[#1A0F2E] border-b border-slate-200 dark:border-[#2A1B42] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 rounded-full bg-[#9D4EDD]/20 text-[#9D4EDD] dark:text-[#C77DFF] flex items-center justify-center border border-[#9D4EDD]/40 shrink-0">
                <Bot size={17} />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#130921]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    Satpam Horizon
                  </h3>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#9D4EDD]/15 text-[#9D4EDD] dark:text-[#C77DFF] font-bold">
                    AI GUARD
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate">
                  Database Live • Aktif 24/7
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetChat}
                className="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/10 transition"
                title="Bersihkan Percakapan"
                aria-label="Bersihkan Percakapan"
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/10 transition"
                title="Tutup Chat"
                aria-label="Tutup Chat"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  {isUser ? (
                    <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden border border-[#9D4EDD]/40">
                      <DiscordAvatar
                        src={session?.user?.image ?? null}
                        username={session?.user?.name ?? "Petualang"}
                        size={28}
                      />
                    </div>
                  ) : (
                    <div className="shrink-0 w-7 h-7 rounded-full bg-[#9D4EDD]/20 text-[#9D4EDD] dark:text-[#C77DFF] flex items-center justify-center border border-[#9D4EDD]/30">
                      <Shield size={14} />
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`max-w-[85%] space-y-1 ${isUser ? "items-end" : "items-start"}`}>
                    <div
                      className={`px-3.5 py-2.5 rounded-none leading-relaxed whitespace-pre-wrap break-words ${
                        isUser
                          ? "bg-[#9D4EDD] text-white rounded-tr-none shadow-sm shadow-[#9D4EDD]/20"
                          : "bg-gray-100 dark:bg-[#1A1524] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#262033] rounded-tl-none"
                      }`}
                    >
                      {isUser ? m.content : <UniversalTextRenderer content={m.content} routeButtonVariant="button" />}

                      {/* Interactive Action Card / Buttons */}
                      {!isUser && m.action && (
                        <div className="pt-2.5 mt-2 border-t border-slate-200 dark:border-white/10 space-y-2">
                          {/* 1. Login Prompt Button */}
                          {m.action.type === "require_login" && (
                            <button
                              type="button"
                              onClick={() => void signIn("discord")}
                              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs shadow-md transition cursor-pointer"
                            >
                              <span>🔑 Login Discord Sekarang</span>
                            </button>
                          )}

                          {/* 2. Direct Navigation / Created Object Button */}
                          {(m.action.type === "party_created" ||
                            m.action.type === "thread_created" ||
                            m.action.type === "tournament_created" ||
                            m.action.type === "navigate") &&
                            m.action.url && (
                              <Link
                                href={m.action.url}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#9D4EDD] hover:opacity-95 text-white font-bold text-xs shadow-md transition cursor-pointer"
                              >
                                <Sparkles size={13} />
                                <span>{m.action.label || "Buka Halaman ↗"}</span>
                              </Link>
                            )}

                          {/* 3. Broadcast Draft Confirmation (Admin Only) */}
                          {m.action.type === "broadcast_preview" && m.action.payload && (
                            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2 text-xs">
                              <div className="font-bold text-[11px] text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                                ⚠️ Pratinjau Draf Broadcast
                              </div>
                              <p className="text-[11px] text-slate-700 dark:text-slate-300">
                                {m.action.details || "Broadcast siap dikirim setelah persetujuan Admin."}
                              </p>
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  disabled={confirmingAction}
                                  onClick={() => void handleConfirmAction(m.action!.payload!)}
                                  className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                                >
                                  {confirmingAction ? (
                                    <>
                                      <Loader2 size={11} className="animate-spin" />
                                      <span>Mengirim…</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check size={12} />
                                      <span>✅ ACC &amp; Kirim</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={confirmingAction}
                                  onClick={() => {
                                    setMessages((prev) =>
                                      prev.map((msg) => (msg.id === m.id ? { ...msg, action: undefined } : msg))
                                    );
                                  }}
                                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 text-[11px] text-slate-600 dark:text-slate-300 transition cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Action Details Badge */}
                          {m.action.details && m.action.type !== "broadcast_preview" && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              ℹ️ {m.action.details}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono px-1 block">
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Typing Loader */}
            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="shrink-0 w-7 h-7 rounded-full bg-[#9D4EDD]/20 text-[#9D4EDD] dark:text-[#C77DFF] flex items-center justify-center border border-[#9D4EDD]/30">
                  <Shield size={14} className="animate-spin" />
                </div>
                <div className="px-3.5 py-2.5 rounded-none bg-gray-100 dark:bg-[#1A1524] border border-gray-200 dark:border-[#262033] rounded-tl-none flex items-center gap-1.5 text-gray-400 text-xs font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9D4EDD] animate-ping" />
                  <span>Satpam Horizon sedang mengetik...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          {messages.length <= 2 && (
            <div className="px-3.5 py-2.5 border-t border-slate-200 dark:border-[#2A1B42] bg-slate-100 dark:bg-[#150D24] flex flex-wrap items-center gap-1.5">
              {SUGGESTIONS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={loading}
                  onClick={() => void sendMessage(chip)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white dark:bg-[#1F1433] border border-slate-200 dark:border-[#2A1B42] text-slate-700 dark:text-slate-300 hover:border-[#7C3AED] hover:text-[#7C3AED] dark:hover:text-[#A78BFA] transition shadow-xs"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-slate-50 dark:bg-[#1A0F2E] border-t border-slate-200 dark:border-[#2A1B42] flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              maxLength={300}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya Satpam Horizon..."
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-[#0E0B13] border border-gray-200 dark:border-[#262033] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#9D4EDD]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-8 h-8 rounded-lg bg-[#9D4EDD] hover:bg-[#8338EC] text-white flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label="Kirim pesan"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
