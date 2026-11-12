"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, Lock, MessageSquare, Send, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { useSession } from "next-auth/react";

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
  const [sending, setSending] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const currentUser = session?.user;
  const isStaff = currentUser?.role === "ADMIN" || currentUser?.role === "MODERATOR";

  async function fetchDetail() {
    try {
      const res = await fetch(`/api/escrow/${escrowId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal memuat ruang rekber.");
      }
      const data = await res.json();
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data rekber.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchDetail();
    const interval = setInterval(() => {
      void fetchDetail();
    }, 4000);
    return () => clearInterval(interval);
  }, [escrowId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages]);

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || sending || !detail || detail.isLocked) return;

    setSending(true);
    try {
      const res = await fetch(`/api/escrow/${escrowId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: inputText.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal mengirim pesan.");
      }
      setInputText("");
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
      className="modal-backdrop fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* HEADER */}
        <div className="p-4 border-b border-gray-200 dark:border-[#211C2B] flex items-center justify-between bg-gray-50/50 dark:bg-[#0E0A16]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                  Ruang Rekber 3-Pihak
                </h3>
                {detail && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      detail.status === "COMPLETED"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : detail.status === "CANCELLED"
                          ? "bg-red-500/15 text-red-400"
                          : "bg-amber-500/15 text-amber-400 animate-pulse"
                    }`}
                  >
                    {detail.status === "COMPLETED" ? "SELESAI (SOLD)" : detail.status === "CANCELLED" ? "DIBATALKAN" : "DALAM PROSES REKBER"}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate max-w-md">
                Lapak: {detail?.postTitle ?? "Memuat..."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        {/* PARTICIPANTS & CLAIM BAR */}
        {detail && (
          <div className="px-4 py-2.5 bg-purple-950/20 border-b border-gray-200 dark:border-[#211C2B] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <span>
                🛒 Buyer: <strong className="text-purple-300">{detail.buyer.username}</strong>
              </span>
              <span>·</span>
              <span>
                🏷️ Seller: <strong className="text-purple-300">{detail.seller.username}</strong>
              </span>
              <span>·</span>
              <span>
                🛡️ Admin:{" "}
                <strong className={detail.claimedBy ? "text-emerald-400" : "text-amber-400"}>
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
                className="px-3 py-1 rounded bg-[#9D4EDD] hover:bg-[#8338EC] text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
              >
                <ShieldAlert size={13} /> Ambil Tiket Rekber (Claim)
              </button>
            )}
          </div>
        )}

        {/* ERROR NOTICE */}
        {error && (
          <div className="mx-4 mt-3 p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* CHAT MESSAGES BODY */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[280px] max-h-[420px] bg-white dark:bg-[#0A070F]">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-xs text-gray-500">
              Menghubungkan ke ruang rekber...
            </div>
          ) : detail?.messages.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-400">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-30 text-purple-400" />
              <p className="font-semibold text-gray-300">Ruang Rekber 3-Pihak Telah Terbuka</p>
              <p className="text-[11px] text-gray-500 mt-1 max-w-sm mx-auto">
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
                    className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 text-center leading-relaxed"
                  >
                    {msg.message}
                    <div className="text-[9px] text-purple-400/60 mt-1">
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
                  <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-gray-400">
                    <span className="font-bold text-gray-300">{msg.senderName ?? "Petualang"}</span>
                    {msg.senderRole === "ADMIN" && (
                      <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 font-extrabold text-[9px]">
                        ADMIN
                      </span>
                    )}
                    {msg.senderRole === "MODERATOR" && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold text-[9px]">
                        MOD
                      </span>
                    )}
                    <span>·</span>
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      isMe
                        ? "bg-[#9D4EDD] text-white rounded-br-none"
                        : "bg-gray-100 dark:bg-[#1C1726] text-gray-900 dark:text-gray-100 rounded-bl-none border border-gray-200 dark:border-white/5"
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* LOCKED BANNER OR INPUT BAR */}
        {detail?.isLocked ? (
          <div className="p-3 bg-gray-100 dark:bg-[#120F17] border-t border-gray-200 dark:border-[#211C2B] text-center text-xs text-gray-500 flex items-center justify-center gap-2">
            <Lock size={14} /> Ruang chat rekber dikunci (transaksi telah {detail.status === "COMPLETED" ? "selesai" : "dibatalkan"}).
          </div>
        ) : (
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-gray-50 dark:bg-[#120F17] border-t border-gray-200 dark:border-[#211C2B] flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Tulis pesan rekber (misal: 'Saya sudah transfer ke rekening rekber')..."
              className="flex-1 bg-white dark:bg-[#0A070F] border border-gray-200 dark:border-[#211C2B] rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-[#9D4EDD]"
              maxLength={1000}
              disabled={sending || actionBusy}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending || actionBusy}
              className="px-4 py-2.5 rounded-xl bg-[#9D4EDD] hover:bg-[#8338EC] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
            >
              <Send size={14} />
              <span className="hidden sm:inline">Kirim</span>
            </button>
          </form>
        )}

        {/* ACTION CONTROLS FOOTER */}
        {detail && !detail.isLocked && (
          <div className="px-4 py-3 bg-gray-100 dark:bg-[#0E0A16] border-t border-gray-200 dark:border-[#211C2B] flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-gray-400">
              Nominal: <strong className="text-emerald-400">Rp {detail.amount.toLocaleString("id-ID")}</strong>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {(currentUser?.id === detail.seller.id || isStaff) && (
                <button
                  type="button"
                  onClick={() => void handleAction("complete")}
                  disabled={actionBusy}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <CheckCircle2 size={14} /> Selesaikan Transaksi (SOLD)
                </button>
              )}

              <button
                type="button"
                onClick={() => void handleAction("cancel")}
                disabled={actionBusy}
                className="px-3 py-1.5 rounded-lg border border-red-500/30 hover:border-red-500 text-red-400 hover:text-red-300 font-medium text-xs transition-all"
              >
                Batalkan Rekber
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
