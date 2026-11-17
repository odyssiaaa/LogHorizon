"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, Heart, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
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
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
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
        className="relative w-10 h-10 rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] hover:border-[#7C3AED] transition-colors text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white flex items-center justify-center shrink-0 shadow-sm dark:shadow-none"
        aria-label="Notifikasi Guild"
        aria-expanded={open}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7C3AED] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#7C3AED]" />
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] p-3 shadow-2xl z-50 text-left"
            role="menu"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2A1B42]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
                  <Bell size={14} className="text-[#A78BFA]" /> Notifikasi Guild
                </span>
                {unreadCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#7C3AED]/20 text-[#A78BFA] font-bold border border-[#7C3AED]/40">
                    {unreadCount} baru
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  <CheckCheck size={12} /> Tandai semua dibaca
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5 scrollbar-thin">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  <Sparkles size={18} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  Belum ada notifikasi baru.
                </div>
              ) : (
                notifications.map((item) => {
                  const Icon =
                    item.type === "LIKE"
                      ? Heart
                      : item.type === "REPLY"
                        ? MessageCircle
                        : item.type === "ESCROW"
                          ? ShieldCheck
                          : Bell;

                  const iconColor =
                    item.type === "LIKE"
                      ? "text-red-500 bg-red-500/10"
                      : item.type === "REPLY"
                        ? "text-blue-500 bg-blue-500/10"
                        : item.type === "ESCROW"
                          ? "text-emerald-500 bg-emerald-500/10"
                          : "text-purple-500 bg-purple-500/10";

                  const content = (
                    <div
                      className={`p-2.5 rounded-md text-xs transition-colors flex items-start gap-2.5 ${
                        item.isRead
                          ? "hover:bg-gray-50 dark:hover:bg-[#1A1526]/50 opacity-75"
                          : "bg-purple-50/60 dark:bg-purple-950/25 border-l-2 border-[#9D4EDD] hover:bg-purple-50 dark:hover:bg-purple-950/40"
                      }`}
                    >
                      <div className={`p-1.5 rounded-full shrink-0 mt-0.5 ${iconColor}`}>
                        <Icon size={12} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-800 dark:text-gray-200 leading-snug break-words">
                          {item.message}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-1 block">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
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
                      className="block"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      key={item.id}
                      onClick={() => void markSingleAsRead(item.id)}
                      className="cursor-pointer"
                    >
                      {content}
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
