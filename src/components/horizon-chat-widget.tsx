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
import { RoyalKnightMascot } from "@/components/royal-knight-mascot";
import { DraggableScrollRow } from "@/components/draggable-scroll-row";
import { useLocale } from "@/context/locale-context";
import { openLoginModal } from "@/components/login-modal";

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

function getContextualSuggestions(pathname: string): string[] {
  if (pathname === "/") {
    return [
      "🎁 Cara Dapat XP & Naik Level",
      "🏆 Cara Daftar Turnamen",
      "🛡️ Cara Aman Pakai Rekber",
      "🎮 Cari Teman Mabar",
    ];
  }
  if (pathname.startsWith("/events")) {
    return [
      "🎮 Carikan Party Mabar Aktif",
      "📝 Buatkan Party Mabar Baru",
      "📜 Aturan WO & DQ Turnamen",
      "🏆 Cek Status Bagan Turnamen",
    ];
  }
  if (pathname.startsWith("/marketplace")) {
    return [
      "🤝 Cara Transaksi Rekber 3-Pihak",
      "🛒 Cara Pasang Lapak Baru",
      "🛡️ Tips Keamanan Anti-Tipu",
    ];
  }
  if (pathname.startsWith("/forum")) {
    return [
      "📝 Cara Bikin Thread Forum",
      "🎁 Tips Farming XP di Komentar",
      "🛡️ Aturan Konten Guild",
    ];
  }
  return [
    "🎁 Cara Dapat XP & Naik Level",
    "🏆 Cara Daftar Turnamen",
    "🎮 Cari Teman Mabar",
    "🛡️ Cara Aman Rekber",
  ];
}

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
  const { locale, t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragAngle, setDragAngle] = useState(0);
  const [isBouncing, setIsBouncing] = useState(false);
  const bounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dragInfo = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    vx: number;
    moved: boolean;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const dismissed =
        typeof window !== "undefined"
          ? localStorage.getItem("satpam_bubble_dismissed") || localStorage.getItem("satpam_greeting_dismissed")
          : null;
      if (!dismissed) {
        const timer = setTimeout(() => {
          setShowBubble(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignored
    }
  }, []);

  const dismissBubble = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    setShowBubble(false);
    try {
      localStorage.setItem("satpam_bubble_dismissed", "true");
      localStorage.setItem("satpam_greeting_dismissed", "true");
    } catch {}
  };

  const currentSuggestions = getContextualSuggestions(pathname);

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
    if (bounceTimerRef.current) {
      clearTimeout(bounceTimerRef.current);
      bounceTimerRef.current = null;
    }
    setIsBouncing(false);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    dragInfo.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: rect.left,
      initialY: rect.top,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: now,
      vx: 0,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragInfo.current) return;
    const dx = e.clientX - dragInfo.current.startX;
    const dy = e.clientY - dragInfo.current.startY;
    const dist = Math.hypot(dx, dy);

    // Click-guard: hanya anggap diseret jika berpindah > 6px
    if (dist > 6) {
      dragInfo.current.moved = true;
      if (!isDragging) {
        setIsDragging(true);
      }
    }

    if (dragInfo.current.moved) {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const dt = Math.max(10, now - dragInfo.current.lastTime);
      const frameDx = e.clientX - dragInfo.current.lastX;
      const instantVx = (frameDx / dt) * 16; // Kecepatan horizontal piksel per frame ~16ms
      const smoothedVx = dragInfo.current.vx * 0.4 + instantVx * 0.6;

      dragInfo.current.vx = smoothedVx;
      dragInfo.current.lastX = e.clientX;
      dragInfo.current.lastY = e.clientY;
      dragInfo.current.lastTime = now;

      // Hanging Physics: Berayun miring berlawanan arah tarikan clamp(-28deg, -smoothedVx * 1.4, 28deg)
      const targetAngle = Math.max(-28, Math.min(28, -smoothedVx * 1.4));
      setDragAngle(targetAngle);

      const targetX = dragInfo.current.initialX + dx;
      const targetY = dragInfo.current.initialY + dy;
      const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
      // Batas aman layar (safe padding 12px dari tepi layar HP/PC)
      const maxX = Math.max(12, (typeof window !== "undefined" ? window.innerWidth : 800) - 80);
      const maxY = Math.max(64, (typeof window !== "undefined" ? window.innerHeight : 600) - (isMobile ? 120 : 88));
      const clampedX = Math.max(12, Math.min(maxX, targetX));
      const clampedY = Math.max(isMobile ? 64 : 12, Math.min(maxY, targetY));
      setPosition({ x: clampedX, y: clampedY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragInfo.current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    const didMove = dragInfo.current.moved;
    dragInfo.current = null;
    setIsDragging(false);
    setDragAngle(0);

    if (didMove) {
      // Efek mendarat membal lembut (Spring Bounce) saat dilepas
      setIsBouncing(true);
      bounceTimerRef.current = setTimeout(() => {
        setIsBouncing(false);
      }, 450);
    } else {
      // Klik biasa membuka/menutup chat tanpa terseret
      setIsOpen((prev) => !prev);
    }
  };

  const getPopupStyle = (): React.CSSProperties => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      return {}; // Handled by responsive Tailwind classes: inset-x-3 top-16 bottom-24 w-auto h-auto max-h-[75vh]
    }
    if (!position || typeof window === "undefined") return {};
    const popupWidth = 390;
    const popupHeight = 540;
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
          locale,
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
          locale,
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
        className={`fixed z-[45] pointer-events-none touch-none select-none scale-75 opacity-90 sm:scale-100 sm:opacity-100 ${
          !position ? "bottom-24 right-3 sm:bottom-6 sm:right-5" : ""
        }`}
      >
        <div className="relative flex flex-col items-center pointer-events-none">
          {/* 1. Interactive Greeting Speech Bubble (STABIL & TERPISAH: Bebas dari animasi lompat/drag ksatria) */}
          {showBubble && !isOpen && !isDragging && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
                setShowBubble(false);
              }}
              className="absolute -top-16 right-0 sm:right-auto sm:-left-36 w-52 sm:w-60 p-2.5 rounded-xl bg-white dark:bg-[#1A0F2E] border-2 border-[#7C3AED] shadow-2xl text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-start gap-1.5 cursor-pointer z-40 select-none transition-all pointer-events-auto"
            >
              <span className="flex-1 text-[11px] leading-tight">
                👋 Bingung mulai dari mana? <span className="text-[#7C3AED] dark:text-[#A78BFA] underline font-bold">Klik aku</span> untuk panduan cepat!
              </span>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={dismissBubble}
                className="w-7 h-7 -mr-1 -mt-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center shrink-0 cursor-pointer z-30 transition-colors pointer-events-auto"
                title="Tutup Balon Sapaan"
                aria-label="Tutup Balon Sapaan"
              >
                <X size={15} />
              </button>
              <div className="absolute -bottom-2 right-6 sm:left-40 size-3 rotate-45 bg-white dark:bg-[#1A0F2E] border-r-2 border-b-2 border-[#7C3AED]" />
            </div>
          )}

          {/* 2. Drag & Knight Element (HANYA BAGIAN INI YANG MEMILIKI DRAG PHYSICS & ANIMASI MELAYANG/MEMBAL) */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              transformOrigin: "50% 8%",
              transform: isDragging
                ? `scaleX(0.95) scaleY(1.06) rotate(${dragAngle}deg)`
                : isBouncing
                ? "translateY(0px) rotate(0deg) scale(1)"
                : undefined,
            }}
            className={`relative group cursor-grab active:cursor-grabbing flex flex-col items-center pointer-events-auto ${
              isDragging
                ? "cursor-grabbing drop-shadow-[0_0_25px_rgba(157,78,221,0.7)]"
                : isBouncing
                ? "animate-satpam-bounce"
                : !isOpen
                ? "animate-satpam-idle hover:scale-105 transition-transform duration-200"
                : ""
            }`}
            title={isOpen ? "Tutup Chat Satpam AI" : "Tarik untuk memindahkan, klik untuk ngobrol dengan Satpam AI"}
          >
            {/* Gelembung Lucu Saat Diseret (Hanya muncul saat dragging) */}
            {isDragging && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-full bg-[#11091D]/95 border border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.5)] text-amber-300 text-[10px] font-bold tracking-tight animate-pulse flex items-center gap-1 pointer-events-none z-50">
                <span>😵</span>
                <span>Woyy pelan-pelan diseretnya!</span>
              </div>
            )}

            {/* Halo / Status indicator */}
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
              {/* Glow ambient background */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#7C3AED] via-[#9D4EDD] to-[#4C1D95] opacity-80 blur-xs shadow-lg shadow-[#7C3AED]/40" />

              {/* Medieval Royal Knight Mascot Illustration */}
              <RoyalKnightMascot isDragging={isDragging} isOpen={isOpen} />

              {/* Online pulse badge */}
              <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#11091D] shadow-sm animate-pulse z-20" />

              {/* If open, show an X overlay indicator */}
              {isOpen && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center z-30">
                  <X className="size-6 text-white" />
                </div>
              )}
            </div>

            {/* SATPAM AI Compact Badge */}
            <div className="mt-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-[#11091D] border border-[#7C3AED] shadow-md flex items-center gap-1.5 z-20 pointer-events-none">
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
          className={`fixed z-[50] pointer-events-auto rounded-xl border-2 border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] shadow-2xl flex flex-col overflow-hidden transition-all duration-200 inset-x-3 top-16 bottom-24 w-auto h-auto max-h-[75vh] sm:inset-auto sm:bottom-24 sm:right-5 sm:w-[390px] sm:h-[540px] sm:max-h-[540px] ${
            !position ? "sm:bottom-24 sm:right-5" : ""
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-[#1A0F2E] border-b border-slate-200 dark:border-[#2A1B42] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 p-1 rounded-full bg-[#9D4EDD]/20 text-[#9D4EDD] dark:text-[#C77DFF] flex items-center justify-center border border-[#9D4EDD]/40 shrink-0">
                <RoyalKnightMascot className="w-full h-full" isDragging={false} isOpen={true} />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#130921] z-10" />
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
                              onClick={() => openLoginModal()}
                              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs shadow-md transition cursor-pointer"
                            >
                              <span>🔑 Masuk ke Akun Sekarang</span>
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

          {/* Contextual Quick Guide Chips with Mouse Click-and-Drag & Wheel Horizontal Scroll */}
          <DraggableScrollRow className="px-3.5 py-2 border-t border-slate-200 dark:border-[#2A1B42] bg-slate-100/90 dark:bg-[#150D24]/90 flex items-center gap-1.5">
            {currentSuggestions.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={loading}
                onClick={() => void sendMessage(chip)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap bg-white dark:bg-[#1F1433] border border-slate-300 dark:border-[#2A1B42] text-slate-700 dark:text-slate-300 hover:border-[#7C3AED] hover:text-[#7C3AED] dark:hover:text-[#A78BFA] transition shadow-xs cursor-pointer shrink-0 select-none"
              >
                {chip}
              </button>
            ))}
          </DraggableScrollRow>

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
              placeholder={t("ask_satpam", "Tanya Satpam Horizon...")}
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
