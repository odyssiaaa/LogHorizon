"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, Lock, MessageSquare, Send, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { ImageUploader } from "@/components/ui/image-uploader";
import { useLiveSync } from "@/hooks/use-live-sync";

type EscrowMessage = {
  id: string;
  senderId: string;
  senderName: string | null;
  senderRole: string;
  message: string;
  createdAt: string;
};

type EscrowDetail = {
  id: string;
  postId: string;
  postTitle: string;
  amount: number;
  status: "IN_ESCROW" | "COMPLETED" | "CANCELLED";
  isLocked: boolean;
  createdAt: string;
  completedAt?: string | null;
  buyer: { id: string; username: string | null; avatar: string | null; discordId: string | null };
  seller: { id: string; username: string | null; avatar: string | null; discordId: string | null };
  claimedBy?: { id: string; username: string | null; avatar: string | null; discordId: string | null } | null;
  canClaim: boolean;
  isClaimer: boolean;
  messages: EscrowMessage[];
};

function FormattedChatMessage({ text }: { text: string }) {
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
    const alt = match[1] || "Foto Bukti";
    const src = match[2];
    parts.push(
      <span key={match.index} className="block my-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="max-h-60 max-w-full rounded-none border border-[#2E1E45] bg-[#09040F] object-contain shadow-md"
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

export function EscrowChatModal({
  escrowId,
  onClose,
  onStatusChange,
}: {
  escrowId: string;
  onClose: () => void;
  onStatusChange?: () => void;
}) {
  const { data: session } = useSession();
  const [detail, setDetail] = useState<EscrowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inputText, setInputText] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const prevMsgCountRef = useRef<number>(0);
  const detailRef = useRef<EscrowDetail | null>(detail);
  useEffect(() => {
    detailRef.current = detail;
  }, [detail]);

  const currentUser = session?.user;
  const isStaff = currentUser?.role === "ADMIN" || currentUser?.role === "MODERATOR";

  async function fetchDetail(isBackground = false) {
    try {
      const res = await fetch(`/api/escrow/${escrowId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal memuat ruang rekber.");
      }
      const data = await res.json();
      const current = detailRef.current;
      if (!isBackground || JSON.stringify(current) !== JSON.stringify(data)) {
        setDetail(data);
      }
    } catch (err) {
      if (!isBackground) {
        setError(err instanceof Error ? err.message : "Gagal memuat data rekber.");
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void fetchDetail(false);
  }, [escrowId]);

  useLiveSync(() => {
    void fetchDetail(true);
  }, { intervalMs: 3500, revalidateOnFocus: true });

  useEffect(() => {
    const currentCount = detail?.messages?.length || 0;
    if (currentCount > prevMsgCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      prevMsgCountRef.current = currentCount;
    }
  }, [detail?.messages]);

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if ((!inputText.trim() && !attachedImage) || sending || !detail || detail.isLocked) return;

    setSending(true);
    try {
      let finalMsg = inputText.trim();
      if (attachedImage) {
        finalMsg = finalMsg ? `${finalMsg}\n\n![Bukti Rekber](${attachedImage})` : `![Bukti Rekber](${attachedImage})`;
      }
      const res = await fetch(`/api/escrow/${escrowId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: finalMsg }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal mengirim pesan.");
      }
      setInputText("");
      setAttachedImage(null);
      await fetchDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim pesan.");
    } finally {
      setSending(false);
    }
  }

  async function handleAction(action: "claim" | "complete" | "cancel") {
    if (action === "complete" && !confirm("Konfirmasi bahwa transaksi sudah berhasil dan serah terima tuntas?")) return;
    if (action === "cancel" && !confirm("Batalkan transaksi Rekber ini dan kembalikan lapak menjadi tersedia?")) return;

    setActionBusy(true);
    try {
      const res = await fetch(`/api/escrow/${escrowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Aksi gagal dijalankan.");
      }
      await fetchDetail();
      onStatusChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aksi gagal dijalankan.");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2A1B42] rounded-none w-[calc(100vw-2rem)] sm:max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden my-auto">
        {/* HEADER */}
        <div className="p-4 border-b border-slate-200 dark:border-[#2A1B42] flex items-center justify-between bg-slate-50 dark:bg-[#0E061A]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-none bg-purple-500/10 dark:bg-[#7C3AED]/20 text-purple-700 dark:text-[#A78BFA] border border-purple-500/20 dark:border-[#7C3AED]/40">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white font-display tracking-tight">
                  Ruang Rekber 3-Pihak
                </h3>
                {detail && (
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-none border ${
                      detail.status === "COMPLETED"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : detail.status === "CANCELLED"
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse"
                    }`}
                  >
                    {detail.status === "COMPLETED" ? "SELESAI (SOLD)" : detail.status === "CANCELLED" ? "DIBATALKAN" : "PROSES REKBER"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 truncate max-w-md font-sans">
                Lapak: {detail?.postTitle ?? "Memuat..."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white p-1 rounded-none transition"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        {/* PARTICIPANTS & CLAIM BAR */}
        {detail && (
          <div className="px-4 py-2.5 bg-slate-100 dark:bg-[#1A0E2E] border-b border-slate-200 dark:border-[#2E1E45] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span>
                🛒 Buyer: <strong className="text-slate-900 dark:text-white">{detail.buyer.username}</strong>
              </span>
              <span className="text-slate-300 dark:text-[#2E1E45]">&bull;</span>
              <span>
                🏷️ Seller: <strong className="text-slate-900 dark:text-white">{detail.seller.username}</strong>
              </span>
              <span className="text-slate-300 dark:text-[#2E1E45]">&bull;</span>
              <span>
                🛡️ Admin:{" "}
                <strong className={detail.claimedBy ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                  {detail.claimedBy?.username ?? "Menunggu Claim"}
                </strong>
              </span>
            </div>

            {/* STAFF CLAIM BUTTON */}
            {detail.canClaim && detail.status === "IN_ESCROW" && (
              <button
                type="button"
                onClick={() => void handleAction("claim")}
                disabled={actionBusy}
                className="px-3 py-1 rounded-none bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-mono font-bold text-xs flex items-center gap-1 shadow-sm transition"
              >
                <ShieldAlert size={13} /> KLAIM TIKET REKBER
              </button>
            )}
          </div>
        )}

        {/* ERROR NOTICE */}
        {error && (
          <div className="mx-4 mt-3 p-2.5 rounded-none bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
            {error}
          </div>
        )}

        {/* CHAT MESSAGES BODY */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[280px] max-h-[420px] bg-slate-50 dark:bg-[#09040F]">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-xs font-mono text-slate-500 dark:text-gray-500">
              Menghubungkan ke ruang rekber...
            </div>
          ) : detail?.messages.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500 dark:text-gray-400">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-30 text-[#A78BFA]" />
              <p className="font-bold text-slate-900 dark:text-white font-display">Ruang Rekber 3-Pihak Telah Terbuka</p>
              <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1 max-w-sm mx-auto font-sans">
                Buyer dan Seller dapat berkoordinasi langsung di sini. Admin Rekber akan mengawasi transaksi dan memfasilitasi transfer data akun/item yang aman.
              </p>
            </div>
          ) : (
            detail?.messages.map((msg) => {
              const isMe = msg.senderId === currentUser?.id;
              const isSys = msg.message.startsWith("🛡️") || msg.message.startsWith("✅") || msg.message.startsWith("❌");

              if (isSys) {
                return (
                  <div
                    key={msg.id}
                    className="p-2.5 rounded-none bg-purple-50 dark:bg-[#1A0E2E] border border-purple-200 dark:border-[#2E1E45] text-xs text-purple-900 dark:text-purple-200 text-center leading-relaxed font-mono"
                  >
                    {msg.message}
                    <div className="text-[9px] text-purple-600 dark:text-[#A78BFA]/70 mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-500 dark:text-gray-400 font-mono">
                    <span className="font-bold text-slate-900 dark:text-white">{msg.senderName ?? "Petualang"}</span>
                    {msg.senderRole === "ADMIN" && (
                      <span className="px-1.5 py-0.2 rounded-none bg-rose-500/20 text-rose-500 dark:text-rose-400 font-mono font-bold text-[9px] border border-rose-500/30">
                        ADMIN
                      </span>
                    )}
                    {msg.senderRole === "MODERATOR" && (
                      <span className="px-1.5 py-0.2 rounded-none bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold text-[9px] border border-amber-500/30">
                        MOD
                      </span>
                    )}
                    <span>&bull;</span>
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-none px-3.5 py-2 text-xs leading-relaxed border ${
                      isMe
                        ? "bg-[#7C3AED] text-white border-[#8B5CF6]"
                        : "bg-white dark:bg-[#130921] text-slate-800 dark:text-gray-200 border-slate-200 dark:border-[#2E1E45]"
                    }`}
                  >
                    <FormattedChatMessage text={msg.message} />
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* LOCKED BANNER OR INPUT BAR */}
        {detail?.isLocked ? (
          <div className="p-3 bg-white dark:bg-[#130921] border-t border-slate-200 dark:border-[#2E1E45] text-center text-xs font-mono text-slate-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <Lock size={14} className="text-[#A78BFA]" /> Ruang chat rekber dikunci (transaksi telah {detail.status === "COMPLETED" ? "selesai" : "dibatalkan"}).
          </div>
        ) : (
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white dark:bg-[#130921] border-t border-slate-200 dark:border-[#2E1E45] flex flex-col gap-2"
          >
            {attachedImage && (
              <div className="flex items-center gap-2 p-1.5 px-3 bg-purple-500/10 dark:bg-[#7C3AED]/15 border border-purple-500/20 dark:border-[#7C3AED]/40 rounded-none w-fit max-w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={attachedImage} alt="Lampiran" className="w-10 h-10 object-cover rounded-none border border-slate-200 dark:border-[#2E1E45]" />
                <span className="text-[11px] text-purple-700 dark:text-[#A78BFA] font-mono font-medium truncate max-w-[180px]">Foto siap dikirim</span>
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="p-1 hover:text-slate-900 dark:hover:text-white text-slate-400 dark:text-gray-400"
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
                placeholder="Tulis pesan rekber (misal: 'Saya sudah transfer')..."
                className="flex-1 bg-slate-50 dark:bg-[#09040F] border border-slate-200 dark:border-[#2E1E45] rounded-none px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#7C3AED]"
                maxLength={1000}
                disabled={sending || actionBusy}
              />
              <button
                type="submit"
                disabled={(!inputText.trim() && !attachedImage) || sending || actionBusy}
                className="px-4 py-2.5 rounded-none bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition shrink-0"
              >
                <Send size={14} />
                <span className="hidden sm:inline">KIRIM</span>
              </button>
            </div>
          </form>
        )}

        {/* ACTION CONTROLS FOOTER */}
        {detail && !detail.isLocked && (
          <div className="px-4 py-3 bg-slate-100 dark:bg-[#09040F] border-t border-slate-200 dark:border-[#2E1E45] flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-mono text-gray-400">
              NOMINAL: <strong className="text-emerald-400">Rp {detail.amount.toLocaleString("id-ID")}</strong>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {(currentUser?.id === detail.seller.id || isStaff) && (
                <button
                  type="button"
                  onClick={() => void handleAction("complete")}
                  disabled={actionBusy}
                  className="px-3 py-1.5 rounded-none bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                >
                  <CheckCircle2 size={14} /> SELESAIKAN TRANSAKSI (SOLD)
                </button>
              )}

              <button
                type="button"
                onClick={() => void handleAction("cancel")}
                disabled={actionBusy}
                className="px-3 py-1.5 rounded-none border border-rose-500/40 hover:border-rose-500 text-rose-400 hover:text-rose-300 font-mono font-bold text-xs transition"
              >
                BATALKAN REKBER
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
