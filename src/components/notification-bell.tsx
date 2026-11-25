"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CheckCheck,
  Gift,
  Heart,
  MessageSquare,
  Scale,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react";
import { useLiveSync } from "@/hooks/use-live-sync";

type NotificationItem = {
  id: string;
  type: "REPLY" | "LIKE" | "ESCROW" | "SYSTEM";
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

function formatRelativeTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes}m lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  return `${days}h lalu`;
}

function getCategoryMeta(item: NotificationItem) {
  const msgLower = (item.message || "").toLowerCase();

  if (item.type === "REPLY" || msgLower.includes("membalas") || msgLower.includes("komentar")) {
    return {
      icon: MessageSquare,
      color: "text-sky-400 bg-sky-500/10 border-sky-500/30",
      label: "Forum",
    };
  }
  if (item.type === "ESCROW" || msgLower.includes("rekber") || msgLower.includes("pesanan")) {
    return {
      icon: ShieldCheck,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      label: "Rekber",
    };
  }
  if (
    msgLower.includes("turnamen") ||
    msgLower.includes("pertandingan") ||
    msgLower.includes("bagan") ||
    msgLower.includes("juara")
  ) {
    return {
      icon: Trophy,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      label: "Turnamen",
    };
  }
  if (
    msgLower.includes("voucher") ||
    msgLower.includes("hadiah") ||
    msgLower.includes("gacha") ||
    msgLower.includes("trial") ||
    msgLower.includes("xp") ||
    msgLower.includes("tiket")
  ) {
    return {
      icon: Gift,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
      label: "Hadiah",
    };
  }
  if (
    msgLower.includes("moderasi") ||
    msgLower.includes("dungeon") ||
    msgLower.includes("laporan") ||
    msgLower.includes("peringatan") ||
    msgLower.includes("banned") ||
    msgLower.includes("penjara")
  ) {
    return {
      icon: Scale,
      color: "text-rose-400 bg-rose-500/10 border-rose-500/30",
      label: "Moderasi",
    };
  }
  if (item.type === "LIKE") {
    return {
      icon: Heart,
      color: "text-pink-400 bg-pink-500/10 border-pink-500/30",
      label: "Suka",
    };
  }
  return {
    icon: Bell,
    color: "text-[#A78BFA] bg-[#7C3AED]/15 border-[#7C3AED]/30",
    label: "Sistem",
  };
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function loadNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        const freshList = data.notifications ?? [];
        const freshUnread = data.unreadCount ?? 0;
        setNotifications((prev) => (JSON.stringify(prev) === JSON.stringify(freshList) ? prev : freshList));
        setUnreadCount((prev) => (prev === freshUnread ? prev : freshUnread));
      }
    } catch {
      // ignore network errors
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  // Smart Live Sync: Polling 12 detik dan langsung refresh saat tab kembali aktif
  useLiveSync(loadNotifications, { intervalMs: 12000, revalidateOnFocus: true });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function markAllAsRead() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function clearAllNotifications() {
    if (!confirm("Bersihkan semua notifikasi guild kamu?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
      });
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function markSingleAsRead(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative size-10 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] hover:border-[#7C3AED] transition-all text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white flex items-center justify-center shrink-0 shadow-sm active:scale-95 cursor-pointer"
        aria-label="Notifikasi Guild"
        aria-expanded={open}
      >
        <Bell size={17} className={unreadCount > 0 ? "text-[#7C3AED] dark:text-[#A78BFA] animate-bounce" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full text-[10px] font-mono font-black flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 dark:border-[#7C3AED]/60 bg-[#11091D] dark:bg-[#11091D] bg-white p-4 shadow-2xl z-50 text-left overflow-hidden backdrop-blur-md"
            role="menu"
          >
            {/* Ambient Corner Glow */}
            <div className="absolute top-0 right-0 -mr-12 -mt-12 size-32 rounded-full bg-[#7C3AED]/20 blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-[#2A1B42] relative z-10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#7C3AED]/15 text-[#A78BFA]">
                  <Bell size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
                    <span>Notifikasi Guild</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#7C3AED] text-white font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </h4>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={loading || unreadCount === 0}
                  className="text-[11px] font-mono font-bold text-[#7C3AED] dark:text-[#A78BFA] hover:text-[#6D28D9] dark:hover:text-white flex items-center gap-1 disabled:opacity-40 disabled:hover:no-underline cursor-pointer transition-colors"
                  title="Tandai Semua Sudah Dibaca"
                >
                  <CheckCheck size={13} />
                  <span className="hidden sm:inline">Tandai Dibaca</span>
                </button>

                <button
                  type="button"
                  onClick={clearAllNotifications}
                  disabled={loading || notifications.length === 0}
                  className="text-[11px] font-mono font-bold text-slate-400 hover:text-rose-400 flex items-center gap-1 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Bersihkan Semua Notifikasi"
                >
                  <Trash2 size={13} />
                  <span className="hidden sm:inline">Bersihkan</span>
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 sm:max-h-96 overflow-y-auto space-y-2 pr-1 scrollbar-thin relative z-10">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 font-mono">
                  <div className="size-12 rounded-2xl bg-[#7C3AED]/10 border border-[#7C3AED]/20 mx-auto mb-3 flex items-center justify-center text-[#A78BFA]">
                    <Sparkles size={20} />
                  </div>
                  <p className="font-bold text-slate-300">Belum ada notifikasi baru</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Aktivitas forum, turnamen, dan rekber akan muncul di sini.</p>
                </div>
              ) : (
                notifications.map((item) => {
                  const meta = getCategoryMeta(item);
                  const Icon = meta.icon;

                  const cardContent = (
                    <div
                      className={`p-3 rounded-xl border transition-all flex items-start gap-3 relative group ${
                        item.isRead
                          ? "bg-slate-50/70 dark:bg-white/[0.02] border-slate-200/60 dark:border-[#2A1B42]/50 opacity-80 hover:opacity-100 hover:border-[#7C3AED]/40"
                          : "bg-purple-500/10 dark:bg-[#7C3AED]/15 border-[#7C3AED]/40 shadow-xs hover:border-[#7C3AED]/70"
                      }`}
                    >
                      {/* Category Badge Icon */}
                      <div className={`p-2 rounded-lg border shrink-0 mt-0.5 ${meta.color}`}>
                        <Icon size={14} />
                      </div>

                      {/* Message Body */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                            {meta.label}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug font-sans font-medium line-clamp-2">
                          {item.message}
                        </p>
                      </div>

                      {/* Unread Indicator Dot */}
                      {!item.isRead && (
                        <div className="size-2 rounded-full bg-[#7C3AED] shadow-sm shadow-[#7C3AED] shrink-0 mt-1.5 animate-pulse" />
                      )}
                    </div>
                  );

                  return item.link ? (
                    <Link
                      key={item.id}
                      href={item.link}
                      onClick={() => {
                        void markSingleAsRead(item.id);
                        setOpen(false);
                      }}
                      className="block active:scale-[0.99] transition-transform"
                    >
                      {cardContent}
                    </Link>
                  ) : (
                    <div
                      key={item.id}
                      onClick={() => void markSingleAsRead(item.id)}
                      className="cursor-pointer active:scale-[0.99] transition-transform"
                    >
                      {cardContent}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
