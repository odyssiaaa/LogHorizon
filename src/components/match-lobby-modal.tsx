"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  Gamepad2,
  KeyRound,
  MessageSquare,
  Send,
  ShieldAlert,
  Swords,
  Users,
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

  // Custom Room State (Pinned at Top)
  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [savingRoom, setSavingRoom] = useState(false);
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [callingReferee, setCallingReferee] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentUser = session?.user;

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
      if (data.customRoomId !== undefined) setRoomId(data.customRoomId || "");
      if (data.customRoomPassword !== undefined) setRoomPassword(data.customRoomPassword || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat ruang koordinasi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen || !match) return;
    setLoading(true);
    void fetchChatData();

    // Polling every 3.5 seconds
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
    if ((!inputText.trim() && !attachedImage) || sending || !match) return;

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

  async function handleUpdateRoomCredentials() {
    if (!match) return;
    setSavingRoom(true);
    setError("");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/match-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.matchId,
          action: "UPDATE_ROOM",
          customRoomId: roomId.trim(),
          customRoomPassword: roomPassword.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menyimpan info room.");
      }
      setNotice("ID & Password Custom Room berhasil di-pin di atas ruang chat!");
      setTimeout(() => setNotice(""), 3500);
      await fetchChatData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan info room.");
    } finally {
      setSavingRoom(false);
    }
  }

  async function handleCallReferee() {
    if (!match) return;
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

  function handleCopyRoomInfo() {
    const textToCopy = `ID Room: ${roomId || "(Belum diisi)"} | Password: ${roomPassword || "(Tanpa Password)"}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedRoom(true);
    setTimeout(() => setCopiedRoom(false), 2500);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODAL */}
        <div className="p-4 border-b border-gray-200 dark:border-[#211C2B] flex items-center justify-between bg-gray-50/70 dark:bg-[#0E0A16]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-purple-500/15 text-[#9D4EDD] border border-purple-500/30 shrink-0">
              <Swords size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                  Ruang Koordinasi Lobby / Match Room
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#9D4EDD]/15 text-purple-300 border border-[#9D4EDD]/30">
                  #{match.matchId} · {match.roundName}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                <strong className="text-purple-400">{match.teamA.name || "Tim A"}</strong> VS{" "}
                <strong className="text-purple-400">{match.teamB.name || "Tim B"}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCallReferee}
              disabled={callingReferee}
              className="px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-400 font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
              title="Panggil Panitia/Wasit ke ruang koordinasi ini"
            >
              <ShieldAlert size={14} className="text-red-400 animate-pulse" />
              <span className="hidden sm:inline">Panggil Panitia</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
              aria-label="Tutup"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PINNED CUSTOM ROOM BAR (ID & PASSWORD) */}
        <div className="p-3.5 bg-gradient-to-r from-purple-950/30 via-[#161124] to-purple-950/30 border-b border-gray-200 dark:border-[#211C2B] space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#9D4EDD] flex items-center gap-1.5">
              <Gamepad2 size={13} />
              <span>PIN INFO CUSTOM ROOM / LOBBY IN-GAME</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyRoomInfo}
                disabled={!roomId}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/10 hover:bg-white/20 text-gray-200 border border-white/10 flex items-center gap-1 transition"
                title="Salin ID & Password Room"
              >
                {copiedRoom ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copiedRoom ? "Tersalin!" : "Salin ID & Pass"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            <div className="sm:col-span-5 relative">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="ID Custom Room Game..."
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#120F17] text-xs font-mono text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-[#9D4EDD]"
              />
            </div>
            <div className="sm:col-span-4 relative">
              <input
                type="text"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                placeholder="Password Room (Opsional)..."
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#120F17] text-xs font-mono text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-[#9D4EDD]"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                type="button"
                onClick={handleUpdateRoomCredentials}
                disabled={savingRoom}
                className="w-full py-1.5 rounded-lg bg-[#9D4EDD] hover:bg-[#8338EC] disabled:opacity-50 text-white font-bold text-xs shadow-xs transition"
              >
                {savingRoom ? "Menyimpan..." : "Pin Info Room"}
              </button>
            </div>
          </div>
        </div>

        {/* FEEDBACK & NOTICE */}
        {notice && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
            <span>{notice}</span>
            <button onClick={() => setNotice("")}><X size={13} /></button>
          </div>
        )}
        {error && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between animate-in fade-in">
            <span>{error}</span>
            <button onClick={() => setError("")}><X size={13} /></button>
          </div>
        )}

        {/* MESSAGES BODY */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[260px] max-h-[380px] bg-white dark:bg-[#0B0812]">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-xs text-gray-400">
              Menghubungkan ke ruang koordinasi...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-400 space-y-2">
              <MessageSquare size={32} className="mx-auto opacity-30 text-[#9D4EDD]" />
              <p className="font-bold text-gray-300">Ruang Koordinasi Match Siap Digunakan</p>
              <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                Silakan koordinasikan ID Custom Room, pergantian pemain cadangan, atau unggah bukti screenshot match jika diperlukan.
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
                    className={`p-2.5 rounded-xl border text-xs text-center leading-relaxed ${
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
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-xs ${
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

        {/* INPUT BAR WITH CAMERA BUTTON */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-gray-50 dark:bg-[#120F17] border-t border-gray-200 dark:border-[#211C2B] flex flex-col gap-2"
        >
          {attachedImage && (
            <div className="flex items-center gap-2 p-1.5 px-3 bg-[#9D4EDD]/15 border border-[#9D4EDD]/30 rounded-xl w-fit max-w-full">
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
              placeholder="Tulis pesan ke kapten lawan / panitia (misal: 'Room sudah dibuat')..."
              className="flex-1 bg-white dark:bg-[#0A070F] border border-gray-200 dark:border-[#211C2B] rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-[#9D4EDD]"
              maxLength={2000}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={(!inputText.trim() && !attachedImage) || sending}
              className="px-4 py-2.5 rounded-xl bg-[#9D4EDD] hover:bg-[#8338EC] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 shadow-sm"
            >
              <Send size={14} />
              <span className="hidden sm:inline">Kirim</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
