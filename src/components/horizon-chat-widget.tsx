"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
  X,
} from "lucide-react";
import { DiscordAvatar } from "@/components/discord-avatar";

function getRouteLabel(route: string): string {
  const clean = route.trim();
  if (clean.startsWith("/events?view=turnamen")) return "Buka Halaman Turnamen ↗";
  if (clean.startsWith("/events?view=mabar")) return "Cari Party Mabar ↗";
  if (clean === "/events" || clean.startsWith("/events/")) return "Buka Jadwal Events ↗";
  if (clean === "/forum" || clean.startsWith("/forum/")) return "Buka Forum ↗";
  if (clean === "/marketplace" || clean.startsWith("/marketplace/")) return "Cek Marketplace ↗";
  if (clean === "/donate") return "Kunjungi Kas Donasi ↗";
  if (clean === "/leaderboard") return "Lihat Papan Peringkat ↗";
  if (clean === "/hall-of-winners") return "Buka Hall of Winners ↗";
  if (clean === "/news" || clean.startsWith("/news/")) return "Baca Warta Berita ↗";
  if (clean === "/profile") return "Buka Profil ↗";
  if (clean === "/rules") return "Lihat Aturan Guild ↗";
  return `Kunjungi ${clean} ↗`;
}

function renderFormattedAssistantMessage(content: string) {
  // Regex pattern matching in order of specificity:
  // 1: Markdown link: [Label](/url...)
  // 2: Backticked route: `(/url...)`
  // 3: Standalone route: /(events|forum|marketplace|donate|leaderboard|hall-of-winners|news|profile|rules|settings|messages|u)...
  // 4: Bold: **text**
  // 5: Backtick code (not route): `text`
  // 6: Italic: *text*
  const pattern = /(\[([^\]]+)\]\((\/[^\s)]+)\))|(`(\/[a-zA-Z0-9_\-\/?=&%#.]+)`)|((?:^|(?<=\s))(\/(?:events|forum|marketplace|donate|leaderboard|hall-of-winners|news|profile|rules|settings|messages|u)(?:[a-zA-Z0-9_\-\/?=&%#]*)))|(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\*([^*]+)\*)/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      elements.push(content.substring(lastIndex, match.index));
    }

    const key = `frag-${match.index}`;

    if (match[1]) {
      // 1. Markdown link [Label](/route)
      const rawLabel = match[2];
      const url = match[3];
      const label = rawLabel.includes("↗") || rawLabel.includes("➔") ? rawLabel : `${rawLabel} ↗`;
      elements.push(
        <Link
          key={key}
          href={url}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 my-0.5 rounded bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap"
        >
          <span>{label}</span>
        </Link>
      );
    } else if (match[4]) {
      // 2. Backticked route `(/route)`
      const url = match[5];
      const label = getRouteLabel(url);
      elements.push(
        <Link
          key={key}
          href={url}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 my-0.5 rounded bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap"
        >
          <span>{label}</span>
        </Link>
      );
    } else if (match[6]) {
      // 3. Standalone route /route
      const url = match[7];
      const label = getRouteLabel(url);
      elements.push(
        <Link
          key={key}
          href={url}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 my-0.5 rounded bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap"
        >
          <span>{label}</span>
        </Link>
      );
    } else if (match[8]) {
      // 4. Bold **text**
      elements.push(
        <strong key={key} className="font-bold text-white">
          {match[9]}
        </strong>
      );
    } else if (match[10]) {
      // 5. Backtick code `code` (not route)
      elements.push(
        <span key={key} className="font-mono text-[#A78BFA] font-semibold">
          {match[11]}
        </span>
      );
    } else if (match[12]) {
      // 6. Italic *text*
      elements.push(
        <em key={key} className="italic text-[#C4B5FD]">
          {match[13]}
        </em>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    elements.push(content.substring(lastIndex));
  }

  return elements;
}

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

const SUGGESTIONS = [
  "🎮 Info Party Mabar LFG",
  "🏆 Jadwal Turnamen",
  "💎 Cara Jadi Benefactor",
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
  const [errorMsg, setErrorMsg] = useState("");
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef<{ startX: number; startY: number; initialX: number; initialY: number; moved: boolean } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    const maxX = Math.max(0, (typeof window !== "undefined" ? window.innerWidth : 800) - 76);
    const maxY = Math.max(0, (typeof window !== "undefined" ? window.innerHeight : 600) - 96);
    const clampedX = Math.max(10, Math.min(maxX, targetX));
    const clampedY = Math.max(10, Math.min(maxY, targetY));
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
    if (!position || typeof window === "undefined") return {};
    const isMobile = window.innerWidth < 640;
    if (isMobile) {
      return {
        left: "1rem",
        right: "1rem",
        bottom: "5.5rem",
        width: "calc(100vw - 2rem)",
      };
    }
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
      // Siapkan history untuk OpenAI/Gemini router di API
      const historyPayload = messages
        .filter((m) => m.id !== "init-1")
        .slice(-6)
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

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: replyText,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
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
            ? { left: `${position.x}px`, top: `${position.y}px` }
            : undefined
        }
        className={`fixed z-50 touch-none select-none ${
          !position ? "bottom-4 right-4 sm:bottom-6 sm:right-6" : ""
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
          className={`fixed z-50 w-[calc(100vw-2rem)] sm:w-96 h-[520px] max-h-[82vh] rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
            !position ? "bottom-20 right-4 sm:bottom-20 sm:right-5" : ""
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-[#1A1524] border-b border-gray-200 dark:border-[#2E1E45] flex items-center justify-between gap-3">
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
                  <div className={`max-w-[80%] space-y-1 ${isUser ? "items-end" : "items-start"}`}>
                    <div
                      className={`px-3.5 py-2.5 rounded-none leading-relaxed whitespace-pre-wrap break-words ${
                        isUser
                          ? "bg-[#9D4EDD] text-white rounded-tr-none shadow-sm shadow-[#9D4EDD]/20"
                          : "bg-gray-100 dark:bg-[#1A1524] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#262033] rounded-tl-none"
                      }`}
                    >
                      {isUser ? m.content : renderFormattedAssistantMessage(m.content)}
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
            <div className="px-3.5 py-2.5 border-t border-gray-100 dark:border-[#1E1A29] bg-gray-50/70 dark:bg-[#15111D] flex flex-wrap items-center gap-1.5">
              {SUGGESTIONS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={loading}
                  onClick={() => void sendMessage(chip)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white dark:bg-[#1F192B] border border-gray-200 dark:border-[#2B233C] text-gray-700 dark:text-gray-300 hover:border-[#9D4EDD] hover:text-[#9D4EDD] dark:hover:text-[#C77DFF] transition shadow-xs"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-gray-50 dark:bg-[#181320] border-t border-gray-200 dark:border-[#2E1E45] flex items-center gap-2"
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
