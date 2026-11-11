"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      {/* Floating Circle Button */}
      <div className="fixed bottom-5 right-5 z-50">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative group w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl focus:outline-none ${
            isOpen
              ? "bg-[#211C2B] text-white border border-[#9D4EDD]/50 hover:bg-[#2A2338]"
              : "bg-[#9D4EDD] text-white hover:bg-[#8338EC] shadow-[#9D4EDD]/35 hover:scale-105 active:scale-95"
          }`}
          aria-label={isOpen ? "Tutup chat Satpam Horizon" : "Buka chat Satpam Horizon"}
          title={isOpen ? "Tutup Chat" : "Tanya Satpam Horizon (Aura AI Guard)"}
        >
          {isOpen ? (
            <X size={22} className="transition-transform group-hover:rotate-90 duration-200" />
          ) : (
            <>
              <Shield size={24} className="animate-pulse" />
              {/* Online indicator dot */}
              <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#120F17] shadow-sm animate-pulse" />
            </>
          )}
        </button>
      </div>

      {/* Chat Popup Window */}
      {isOpen && (
        <aside
          role="dialog"
          aria-label="Jendela Chat Satpam Horizon"
          className="fixed bottom-20 right-4 sm:bottom-20 sm:right-5 z-50 w-[calc(100vw-2rem)] sm:w-96 h-[520px] max-h-[82vh] rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] shadow-2xl flex flex-col overflow-hidden transition-all duration-200"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-[#1A1524] border-b border-gray-200 dark:border-[#211C2B] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 rounded-full bg-[#9D4EDD]/20 text-[#9D4EDD] dark:text-[#C77DFF] flex items-center justify-center border border-[#9D4EDD]/40 shrink-0">
                <Bot size={17} />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#120F17]" />
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
                      className={`px-3.5 py-2.5 rounded-xl leading-relaxed whitespace-pre-wrap break-words ${
                        isUser
                          ? "bg-[#9D4EDD] text-white rounded-tr-none shadow-sm shadow-[#9D4EDD]/20"
                          : "bg-gray-100 dark:bg-[#1A1524] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#262033] rounded-tl-none"
                      }`}
                    >
                      {m.content}
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
                <div className="px-3.5 py-2.5 rounded-xl bg-gray-100 dark:bg-[#1A1524] border border-gray-200 dark:border-[#262033] rounded-tl-none flex items-center gap-1.5 text-gray-400 text-xs font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9D4EDD] animate-ping" />
                  <span>Satpam Horizon sedang mengetik...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-gray-100 dark:border-[#1E1A29] bg-gray-50/50 dark:bg-[#15111D] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {SUGGESTIONS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={loading}
                  onClick={() => void sendMessage(chip)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white dark:bg-[#1F192B] border border-gray-200 dark:border-[#2B233C] text-gray-700 dark:text-gray-300 hover:border-[#9D4EDD] hover:text-[#9D4EDD] dark:hover:text-[#C77DFF] whitespace-nowrap transition"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-gray-50 dark:bg-[#181320] border-t border-gray-200 dark:border-[#211C2B] flex items-center gap-2"
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
