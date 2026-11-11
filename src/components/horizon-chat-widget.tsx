"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageCircle, Send, Shield, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { readApiResponse } from "@/lib/api-response";
import { DiscordAvatar } from "@/components/discord-avatar";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function HorizonChatWidget() {
  const { data: session, status } = useSession();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Satpam Horizon berjaga. Ada yang bisa kubantu, petualang?" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, open]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("loghorizon-preferences");
        if (saved) {
          const preferences: unknown = JSON.parse(saved);
          if (preferences && typeof preferences === "object" && "animations" in preferences && typeof preferences.animations === "boolean") {
            setAnimationsEnabled(preferences.animations);
          }
        }
      } catch (reason) {
        console.error("[chat] Failed to read animation preference", reason);
      }
    }, 0);
    function syncPreferences(event: Event) {
      const detail = (event as CustomEvent<{ animations?: unknown }>).detail;
      if (typeof detail?.animations === "boolean") setAnimationsEnabled(detail.animations);
    }
    window.addEventListener("loghorizon-preferences", syncPreferences);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("loghorizon-preferences", syncPreferences);
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timeout = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1_000);
    return () => window.clearTimeout(timeout);
  }, [cooldown]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading || cooldown > 0) return;
    if (!session?.user) {
      setError("Login Discord diperlukan untuk berbicara dengan Satpam Horizon.");
      return;
    }
    if (session.user.isBanned) {
      setError("Akun yang sedang dibatasi tidak dapat menggunakan chat.");
      return;
    }

    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
    setMessages((current) => [...current, { role: "user", content }]);
    setInput("");
    setError("");
    setLoading(true);
    setCooldown(3);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history }),
      });
      const result = await readApiResponse<{ reply: string }>(response, "Satpam Horizon gagal merespons.");
      setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Satpam Horizon gagal merespons.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const shouldReduceMotion = reduceMotion || !animationsEnabled;
  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: "easeOut" as const };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.section
            key="horizon-chat"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            transition={transition}
            className="flex h-[min(34rem,calc(100dvh-7rem))] w-[calc(100vw-2rem)] sm:w-96 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-md border border-[#D1D5DB] bg-white text-[#111827] shadow-2xl dark:border-[#2A2438] dark:bg-[#120F17] dark:text-white"
            aria-label="Chat dengan Satpam Horizon"
          >
            <header className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3 dark:border-[#2A2438]">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-sm bg-[#F3F4F6] text-[#9D4EDD] dark:bg-[#1A1526]"><Shield size={18} /></span>
                <div>
                  <h2 className="text-sm font-bold">Satpam Horizon</h2>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Penjaga guild • AI</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-sm text-[#6B7280] transition-colors hover:bg-[#F3F4F6] dark:text-[#9CA3AF] dark:hover:bg-[#1A1526]" aria-label="Tutup chat">
                <X size={17} />
              </button>
            </header>

            {status === "loading" ? (
              <div className="grid flex-1 place-items-center text-sm text-[#6B7280] dark:text-[#9CA3AF]">Memeriksa sesi Discord…</div>
            ) : !session?.user ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <Shield className="text-[#9D4EDD]" size={28} />
                <p className="text-sm leading-relaxed text-[#4B5563] dark:text-[#9CA3AF]">Login Discord dulu untuk bicara dengan penjaga guild. Portal tanpa party pass? Ditolak penjaga gerbang.</p>
                <button type="button" onClick={() => void signIn("discord")} className="rounded-sm bg-[#5865F2] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#4752C4]">Continue with Discord</button>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
                  {messages.map((message, index) => (
                    <motion.div
                      key={`${index}-${message.role}`}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={transition}
                      className={`chat-message-row ${message.role === "user" ? "chat-message-user" : "chat-message-assistant"}`}
                    >
                      {message.role === "user"
                        ? <DiscordAvatar className="chat-message-avatar" src={session.user.avatar} username={session.user.username ?? session.user.name ?? "Gamer"} size={40} />
                        : <span className="chat-bot-avatar"><Image src="/loghorizon-logo.png" alt="Satpam Horizon" width={28} height={28} /></span>}
                      <p className={`chat-message-bubble break-words ${message.role === "user" ? "user-bubble" : "assistant-bubble"}`}>{message.content}</p>
                    </motion.div>
                  ))}
                  {loading && <div className="chat-message-row chat-message-assistant"><span className="chat-bot-avatar"><Image src="/loghorizon-logo.png" alt="Satpam Horizon" width={28} height={28} /></span><p className="chat-message-bubble assistant-bubble">Satpam sedang mengetik…</p></div>}
                  <div ref={messagesEndRef} />
                </div>
                {error && (
                  <div className="mx-3 mb-2 flex items-start justify-between gap-2 rounded-sm border border-red-300 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:text-red-300" role="alert">
                    <span>{error}</span>
                    {!session.user.isBanned && <button type="button" className="shrink-0 underline" onClick={() => void signIn("discord")}>Login</button>}
                  </div>
                )}
                {!session.user.isBanned ? (
                  <form onSubmit={(event) => void sendMessage(event)} className="border-t border-[#E5E7EB] p-3 dark:border-[#2A2438]">
                    <label className="sr-only" htmlFor="horizon-chat-input">Pesan untuk Satpam Horizon</label>
                    <div className="flex items-end gap-2">
                      <textarea
                        ref={inputRef}
                        id="horizon-chat-input"
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        maxLength={200}
                        rows={2}
                        placeholder="Tulis pesan (maks. 200 karakter)…"
                        className="min-h-12 flex-1 resize-none rounded-sm border border-[#D1D5DB] bg-[#F8F9FA] px-3 py-2 text-sm text-[#111827] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#9D4EDD] dark:border-[#2A2438] dark:bg-[#08060B] dark:text-white dark:placeholder:text-[#6B7280]"
                      />
                      <button
                        type="submit"
                        disabled={!input.trim() || loading || cooldown > 0}
                        className="grid size-11 shrink-0 place-items-center rounded-sm bg-[#9D4EDD] text-white transition-colors hover:bg-[#873DC2] disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={cooldown > 0 ? `Tunggu ${cooldown} detik` : "Kirim pesan"}
                        title={cooldown > 0 ? `Tunggu ${cooldown} detik` : "Kirim"}
                      >
                        {cooldown > 0 ? <span className="text-xs font-bold">{cooldown}</span> : <Send size={17} />}
                      </button>
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-[#6B7280] dark:text-[#6B7280]">
                      <span>{cooldown > 0 ? `Cooldown ${cooldown} detik` : "Jeda 3 detik antar pesan"}</span>
                      <span>{input.length}/200</span>
                    </div>
                  </form>
                ) : (
                  <p className="border-t border-[#E5E7EB] p-3 text-center text-xs text-red-700 dark:border-[#2A2438] dark:text-red-300">Akun dibatasi dan tidak dapat mengirim pesan.</p>
                )}
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
        onClick={() => setOpen((value) => !value)}
        className="grid size-14 place-items-center rounded-full border border-white/20 bg-[#9D4EDD] text-white shadow-xl transition-colors hover:bg-[#873DC2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9D4EDD]"
        aria-label={open ? "Tutup Satpam Horizon" : "Buka Satpam Horizon"}
        aria-expanded={open}
      >
        {open ? <X size={22} /> : <MessageCircle size={23} />}
      </motion.button>
    </div>
  );
}
