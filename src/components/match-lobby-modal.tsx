"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Clock,
  MessageSquare,
  Send,
  ShieldAlert,
  Swords,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { DiscordAvatar } from "@/components/discord-avatar";
import { ImageUploader } from "@/components/ui/image-uploader";
import { TournamentMatch } from "@/lib/tournament";

type MatchChatMessage = {
  id: string;
  senderId: string;
  content: string;
  roleLabel?: string | null;
  createdAt: string;
  sender: {
    id: string;
    username: string | null;
    avatar: string | null;
    role: string;
    isPremium: boolean;
  };
};

interface MatchLobbyModalProps {
  isOpen: boolean;
  tournamentId: string;
  match: TournamentMatch | null;
  onClose: () => void;
}

function FormattedLobbyMessage({ text }: { text: string }) {
  const imageRegex = /!\[(.*?)\]\(((?:data:image\/[^)]+|https?:\/\/[^)]+|\/[^)]+))\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imageRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={lastIndex} className="whitespace-pre-wrap">
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }
    const alt = match[1] || "Bukti";
    const src = match[2];
    parts.push(
      <span key={match.index} className="block my-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="max-h-60 max-w-full rounded-lg border border-white/20 bg-black/40 object-contain shadow-md"
        />
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={lastIndex} className="whitespace-pre-wrap">
        {text.slice(lastIndex)}
      </span>
    );
  }

  return <>{parts.length > 0 ? parts : <span className="whitespace-pre-wrap">{text}</span>}</>;
}

export function MatchLobbyModal({
  isOpen,
  tournamentId,
  match,
  onClose,
}: MatchLobbyModalProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<MatchChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inputText, setInputText] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [callingReferee, setCallingReferee] = useState(false);
  const [serverFinished, setServerFinished] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentUser = session?.user;

  const isMatchFinished =
    serverFinished ||
    match?.matchStatus === "FINISHED" ||
    Boolean(match?.winner) ||
    Boolean(match && (match.teamA.score > 0 || match.teamB.score > 0) && match.winner);

  async function fetchChatData() {
    if (!match) return;
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/match-chat?matchId=${match.matchId}&t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal memuat ruang koordinasi lobby.");
      }
      const data = await res.json();
      setMessages(data.messages || []);
      if (typeof data.isFinished === "boolean") {
        setServerFinished(data.isFinished);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat ruang koordinasi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen || !match) return;
    setLoading(true);
    setServerFinished(match.matchStatus === "FINISHED" || Boolean(match.winner));
    void fetchChatData();

    // Polling setiap 3.5 detik untuk sinkronisasi pesan baru
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void fetchChatData();
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isOpen, match, tournamentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!isOpen || !match) return null;

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if ((!inputText.trim() && !attachedImage) || sending || !match || isMatchFinished) return;

    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/match-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.matchId,
          content: inputText.trim(),
          imageUrl: attachedImage || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal mengirim pesan.");
      }
      setInputText("");
      setAttachedImage(null);
      await fetchChatData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim pesan.");
    } finally {
      setSending(false);
    }
  }

  async function handleCallReferee() {
    if (!match || isMatchFinished) return;
    const confirmCall = window.confirm(
      "Apakah Anda yakin ingin memanggil Wasit / Panitia Turnamen ke ruang koordinasi ini? Notifikasi lonceng & Discord Webhook akan dikirimkan serentak ke seluruh admin."
    );
    if (!confirmCall) return;

    setCallingReferee(true);
    setError("");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/match-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.matchId,
          action: "CALL_REFEREE",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal memanggil panitia.");
      }
      setNotice("🚨 Panitia & Wasit telah dipanggil melalui sistem notifikasi lonceng & webhook Discord!");
      setTimeout(() => setNotice(""), 5000);
      await fetchChatData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memanggil panitia.");
    } finally {
      setCallingReferee(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#09040F]/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto text-left"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45] rounded-none w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in zoom-in-95 duration-150 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODAL */}
        <div className="p-4 border-b border-slate-200 dark:border-[#2E1E45] flex items-center justify-between bg-slate-50 dark:bg-[#1A0E2E]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-none bg-white dark:bg-[#130921] text-purple-600 dark:text-[#A78BFA] border border-slate-200 dark:border-[#2E1E45] shrink-0">
              <Swords size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-extrabold uppercase tracking-tight text-sm sm:text-base text-slate-900 dark:text-[#F8FAFC] truncate">
                  Ruang Koordinasi Match
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-none bg-purple-500/10 dark:bg-[#7C3AED]/15 text-purple-700 dark:text-[#A78BFA] border border-purple-500/20 dark:border-[#7C3AED]/30 uppercase">
                  #{match.matchId} · {match.roundName}
                </span>
                {isMatchFinished && (
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-none bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 uppercase">
                    ARSIP PEMERIKSAAN (READ-ONLY)
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-600 dark:text-[#A78BFA] truncate mt-0.5">
                <strong className="text-slate-900 dark:text-[#F8FAFC]">{match.teamA.name || "Tim A"}</strong> VS{" "}
                <strong className="text-slate-900 dark:text-[#F8FAFC]">{match.teamB.name || "Tim B"}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 font-mono">
            {!isMatchFinished && (
              <button
                type="button"
                onClick={handleCallReferee}
                disabled={callingReferee}
                className="px-2.5 py-1.5 rounded-none bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-400 font-bold text-xs flex items-center gap-1.5 transition uppercase"
                title="Panggil Panitia/Wasit ke ruang koordinasi ini"
              >
                <ShieldAlert size={14} className="text-red-400 animate-pulse" />
                <span className="hidden sm:inline">Panggil Panitia</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-[#A78BFA] hover:text-[#F8FAFC] p-1.5 rounded-none transition"
              aria-label="Tutup"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 24-HOUR POST-MATCH AUDIT ARCHIVE BANNER */}
        {isMatchFinished && (
          <div className="p-3 bg-[#F59E0B]/10 border-b border-[#F59E0B]/20 flex items-center gap-2 text-xs text-[#F59E0B] font-mono">
            <AlertTriangle size={16} className="text-[#F59E0B] shrink-0" />
            <span className="leading-snug">
              Pertandingan ini telah selesai. Riwayat chat disimpan selama 24 jam untuk keperluan audit panitia sebelum terhapus otomatis.
            </span>
          </div>
        )}

        {/* FEEDBACK & NOTICE */}
        {notice && (
          <div className="mx-4 mt-3 p-2.5 rounded-none bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
            <span>{notice}</span>
            <button onClick={() => setNotice("")}><X size={13} /></button>
          </div>
        )}
        {error && (
          <div className="mx-4 mt-3 p-2.5 rounded-none bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between animate-in fade-in">
            <span>{error}</span>
            <button onClick={() => setError("")}><X size={13} /></button>
          </div>
        )}

        {/* MESSAGES BODY */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[280px] max-h-[420px] bg-white dark:bg-[#0B0812]">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-xs text-gray-400">
              Menghubungkan ke ruang koordinasi...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-400 space-y-2">
              <MessageSquare size={32} className="mx-auto opacity-30 text-[#9D4EDD]" />
              <p className="font-bold text-gray-300">Ruang Koordinasi Match Siap Digunakan</p>
              <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                Ruang obrolan ini terhubung otomatis antar kedua kapten tim di pertandingan ini. Gunakan untuk koordinasi lobby room, swap pemain, atau unggah bukti screenshot.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUser?.id;
              const isSys = msg.roleLabel === "[SISTEM LOBBY]" || msg.roleLabel === "[ALARM PANITIA]";

              if (isSys) {
                return (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-none border text-xs text-center leading-relaxed ${
                      msg.roleLabel === "[ALARM PANITIA]"
                        ? "bg-red-500/15 border-red-500/30 text-red-300 font-semibold"
                        : "bg-purple-950/25 border-purple-500/25 text-purple-200"
                    }`}
                  >
                    <span>{msg.content}</span>
                    <div className="text-[9px] opacity-60 mt-0.5">
                      {new Date(msg.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                );
              }

              const isStaffMsg = msg.roleLabel === "[PANITIA / WASIT]";

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-gray-400">
                    <DiscordAvatar
                      src={msg.sender.avatar}
                      username={msg.sender.username}
                      size={18}
                      className="size-4 rounded-full border border-purple-500/30 shrink-0"
                    />
                    <strong className="text-gray-300">{msg.sender.username ?? "Kapten"}</strong>
                    {msg.roleLabel && (
                      <span
                        className={`px-1.5 py-0.2 rounded font-mono font-black text-[9px] ${
                          isStaffMsg
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        }`}
                      >
                        {msg.roleLabel}
                      </span>
                    )}
                    <span>·</span>
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-none px-3.5 py-2 text-xs leading-relaxed shadow-xs ${
                      isMe
                        ? "bg-gradient-to-r from-[#8338EC] to-[#9D4EDD] text-white rounded-br-none"
                        : isStaffMsg
                        ? "bg-red-950/20 border border-red-500/30 text-red-200 rounded-bl-none"
                        : "bg-gray-100 dark:bg-[#1A1424] text-gray-900 dark:text-gray-100 rounded-bl-none border border-gray-200 dark:border-white/5"
                    }`}
                  >
                    <FormattedLobbyMessage text={msg.content} />
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT BAR OR READ-ONLY ARCHIVE NOTICE */}
        {isMatchFinished ? (
          <div className="p-3 bg-gray-50/80 dark:bg-[#130921] border-t border-gray-200 dark:border-[#2E1E45] text-center text-xs text-gray-500 font-mono">
            🔒 Mode Arsip Pemeriksaan (Read-Only) · Pertandingan telah berakhir
          </div>
        ) : (
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-gray-50 dark:bg-[#130921] border-t border-gray-200 dark:border-[#2E1E45] flex flex-col gap-2"
          >
            {attachedImage && (
              <div className="flex items-center gap-2 p-1.5 px-3 bg-[#9D4EDD]/15 border border-[#9D4EDD]/30 rounded-none w-fit max-w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={attachedImage} alt="Lampiran" className="w-10 h-10 object-cover rounded border border-purple-500/40" />
                <span className="text-[11px] text-purple-300 font-medium truncate max-w-[180px]">Bukti screenshot terlampir</span>
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="p-1 hover:text-white text-gray-400"
                  aria-label="Hapus Lampiran"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <ImageUploader compact onAttachment={(b64) => setAttachedImage(b64)} />
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Tulis pesan ke kapten lawan / panitia..."
                className="flex-1 bg-white dark:bg-[#0A070F] border border-gray-200 dark:border-[#2E1E45] rounded-none px-3.5 py-2.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-[#9D4EDD]"
                maxLength={2000}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={(!inputText.trim() && !attachedImage) || sending}
                className="px-4 py-2.5 rounded-none bg-[#9D4EDD] hover:bg-[#8338EC] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 shadow-sm"
              >
                <Send size={14} />
                <span className="hidden sm:inline">Kirim</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
