"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, X, ExternalLink, Check, Clock } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  expiresAt: string;
  showAsPopup?: boolean;
  author: {
    username: string | null;
    name?: string | null;
    role?: string | null;
  };
};

function formatWib(dateStr: string | Date): string {
  try {
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }) + " WIB"
    );
  } catch {
    return "WIB";
  }
}

function extractActionLinks(content: string): Array<{ label: string; url: string }> {
  const links: Array<{ label: string; url: string }> = [];
  const mdRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdRegex.exec(content)) !== null) {
    links.push({ label: match[1], url: match[2] });
  }

  if (links.length === 0) {
    const urlRegex = /(https?:\/\/[^\s]+|\/(?:events|marketplace|forum|donate|news)[a-zA-Z0-9_\-\/?=&%#]*)/g;
    while ((match = urlRegex.exec(content)) !== null) {
      const url = match[1];
      let label = "Kunjungi Halaman ↗";
      if (url.includes("turnamen")) label = "🏆 Buka Halaman Turnamen ↗";
      else if (url.includes("mabar")) label = "🎮 Cari Teman Mabar ↗";
      else if (url.includes("marketplace")) label = "🛒 Buka Marketplace ↗";
      else if (url.includes("donate")) label = "💎 Kunjungi Kas Donasi ↗";
      links.push({ label, url });
    }
  }

  return links;
}

function renderInlineClean(text: string): React.ReactNode[] {
  const pattern = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\*([^*]+)\*)/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }
    const key = `inline-${match.index}`;

    if (match[1]) {
      const label = match[2];
      const url = match[3];
      elements.push(
        <Link
          key={key}
          href={url}
          className="text-[#7C3AED] dark:text-[#A78BFA] hover:text-[#6D28D9] dark:hover:text-[#C4B5FD] underline font-semibold transition"
        >
          {label}
        </Link>
      );
    } else if (match[4]) {
      elements.push(
        <strong key={key} className="font-bold text-slate-900 dark:text-white">
          {match[5]}
        </strong>
      );
    } else if (match[6]) {
      elements.push(
        <code
          key={key}
          className="px-1.5 py-0.5 rounded bg-purple-500/15 dark:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#C4B5FD] font-mono text-xs border border-purple-500/20 font-semibold"
        >
          {match[7]}
        </code>
      );
    } else if (match[8]) {
      elements.push(
        <em key={key} className="italic text-[#7C3AED] dark:text-[#C4B5FD]">
          {match[9]}
        </em>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements;
}

function ModalAnnouncementRenderer({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      blocks.push(<div key={`sp-${i}`} className="h-1.5" />);
      continue;
    }

    if (trimmed.startsWith("### ")) {
      const headingText = trimmed.replace(/^###\s+/, "");
      blocks.push(
        <h4
          key={`h3-${i}`}
          className="text-xs sm:text-sm font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider mt-2.5 mb-1"
        >
          {renderInlineClean(headingText)}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      const headingText = trimmed.replace(/^#{1,2}\s+/, "");
      blocks.push(
        <h3
          key={`h2-${i}`}
          className="text-sm sm:text-base font-extrabold text-[#7C3AED] dark:text-[#C4B5FD] uppercase tracking-wider mt-3 mb-1"
        >
          {renderInlineClean(headingText)}
        </h3>
      );
      continue;
    }

    if (/^(\*|-|•)\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^(\*|-|•)\s+/, "");
      blocks.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2 my-1 pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] dark:bg-[#A78BFA] mt-1.5 shrink-0" />
          <div className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {renderInlineClean(itemText)}
          </div>
        </div>
      );
      continue;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const num = numMatch[1];
      const itemText = numMatch[2];
      blocks.push(
        <div key={`num-${i}`} className="flex items-start gap-2 my-1 pl-1">
          <span className="text-xs font-mono font-bold text-[#7C3AED] dark:text-[#A78BFA] shrink-0 mt-0.5">
            {num}.
          </span>
          <div className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {renderInlineClean(itemText)}
          </div>
        </div>
      );
      continue;
    }

    blocks.push(
      <p
        key={`p-${i}`}
        className="text-xs sm:text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200"
      >
        {renderInlineClean(rawLine)}
      </p>
    );
  }

  return <div className="space-y-1">{blocks}</div>;
}

export function AnnouncementPopupModal() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/announcements")
      .then((res) => (res.ok ? res.json() : { announcement: null }))
      .then((data: { announcement: Announcement | null }) => {
        if (!data?.announcement) return;

        const a = data.announcement;
        // Check if showAsPopup is enabled and not expired
        const isPopupEnabled = a.showAsPopup !== false;
        const isNotExpired = new Date(a.expiresAt).getTime() > Date.now();

        if (isPopupEnabled && isNotExpired) {
          const seenKey = `loghorizon_seen_announcement_${a.id}`;
          const alreadySeen = localStorage.getItem(seenKey);
          if (!alreadySeen) {
            setAnnouncement(a);
            setIsOpen(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  function handleDismiss() {
    if (announcement) {
      localStorage.setItem(`loghorizon_seen_announcement_${announcement.id}`, "true");
    }
    setIsOpen(false);
  }

  if (!isOpen || !announcement) return null;

  const actionLinks = extractActionLinks(announcement.content);
  const primaryCta = actionLinks[0];
  const authorName = announcement.author?.username || ".odyssia";
  const timeFormatted = formatWib(announcement.createdAt);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#11091D] border-2 border-[#7C3AED]/50 text-slate-900 dark:text-white shadow-2xl p-6 sm:p-7 relative z-50 text-left space-y-5 animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#2A1B42]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-[#7C3AED]/15 dark:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] shrink-0">
              <Megaphone size={18} className="animate-pulse" />
            </span>
            <div>
              <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-[#7C3AED] dark:text-[#A78BFA] block">
                📢 PENGUMUMAN RESMI DEWAN GUILD
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                👑 Disiarkan oleh @{authorName} • {timeFormatted}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A0E2E] transition cursor-pointer shrink-0"
            title="Tutup Pengumuman"
          >
            <X size={18} />
          </button>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h3 className="text-lg sm:text-xl font-black uppercase text-slate-900 dark:text-white tracking-tight leading-snug">
            {announcement.title}
          </h3>
        </div>

        {/* Content Box */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0A0512] border border-slate-200 dark:border-[#2A1B42] text-xs sm:text-sm leading-relaxed max-h-[45vh] overflow-y-auto">
          <ModalAnnouncementRenderer content={announcement.content} />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {primaryCta ? (
            <Link
              href={primaryCta.url}
              onClick={handleDismiss}
              className="px-5 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <span>{primaryCta.label.replace(/[➡️↗➔]/g, "").trim()}</span>
              <ExternalLink size={14} />
            </Link>
          ) : (
            <div className="text-[11px] font-mono text-slate-400">
              ● Berlaku hingga {formatWib(announcement.expiresAt)}
            </div>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check size={14} className="text-emerald-500" />
            <span>Mengerti &amp; Tutup</span>
          </button>
        </div>
      </div>
    </div>
  );
}
