"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, ExternalLink, Sparkles, Clock, Check } from "lucide-react";
import { UniversalTextRenderer } from "@/lib/text-parser";

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
      let label = "Buka Tautan ↗";
      if (url.includes("turnamen")) label = "🏆 Buka Halaman Turnamen ↗";
      else if (url.includes("mabar")) label = "🎮 Cari Teman Mabar ↗";
      else if (url.includes("marketplace")) label = "🛒 Buka Marketplace ↗";
      else if (url.includes("donate")) label = "💎 Kunjungi Kas Donasi ↗";
      links.push({ label, url });
    }
  }

  return links;
}

export function GuildAnnouncementCard() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    fetch("/api/announcements")
      .then((res) => (res.ok ? res.json() : { announcement: null }))
      .then((data: { announcement: Announcement | null }) => {
        if (data?.announcement) {
          setAnnouncement(data.announcement);
        }
      })
      .catch(() => {});
  }, []);

  if (!announcement) return null;

  const actionLinks = extractActionLinks(announcement.content);
  const primaryCta = actionLinks[0];
  const authorName = announcement.author?.username || ".odyssia";
  const timeFormatted = formatWib(announcement.createdAt);

  return (
    <section className="w-full border-b border-slate-200 dark:border-[#2E1E45] bg-gradient-to-b from-purple-500/5 via-slate-50 to-transparent dark:from-[#1A0E2E]/60 dark:via-[#09040F] dark:to-transparent py-8 sm:py-10">
      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="rounded-xl border-2 border-[#7C3AED]/40 dark:border-[#7C3AED]/40 bg-white dark:bg-[#11091D] p-5 sm:p-7 lg:p-8 shadow-xl dark:shadow-2xl relative overflow-hidden text-left space-y-5">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#7C3AED]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          {/* Top Bar: Official Badge + Attribution */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-[#2A1B42]">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-[#7C3AED]/15 dark:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] shrink-0">
                <Megaphone size={18} className="animate-pulse" />
              </span>
              <div>
                <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-[#7C3AED] dark:text-[#A78BFA] flex items-center gap-1.5">
                  <span>PAPAN PENGUMUMAN RESMI GUILD</span>
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                  Warta resmi dan regulasi tertinggi kerajaan LogHorizon
                </span>
              </div>
            </div>

            {/* Author Badge & Timestamp */}
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 self-start sm:self-auto bg-slate-100 dark:bg-[#1A0F2E] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2A1B42]">
              <span className="font-bold text-[#7C3AED] dark:text-[#C4B5FD]">
                👑 Disiarkan oleh @{authorName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                <span>{timeFormatted}</span>
              </span>
            </div>
          </div>

          {/* Big Prominent Title */}
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight leading-snug">
              {announcement.title}
            </h2>
          </div>

          {/* Full Un-truncated Content with Clean Markdown */}
          <div className="p-4 sm:p-5 rounded-lg bg-slate-50 dark:bg-[#0A0512] border border-slate-200 dark:border-[#2A1B42] leading-relaxed">
            <UniversalTextRenderer content={announcement.content} enableBlocks={true} />
          </div>

          {/* Direct CTA Action Button & Footer Links */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            {primaryCta ? (
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={primaryCta.url}
                  className="px-6 py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-sans font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer group"
                >
                  <span>{primaryCta.label.replace(/[➡️↗➔]/g, "").trim()}</span>
                  <ExternalLink size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>

                {actionLinks.slice(1).map((link, idx) => (
                  <Link
                    key={idx}
                    href={link.url}
                    className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-[#2A1B42] hover:bg-slate-100 dark:hover:bg-[#1A0F2E] text-slate-800 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition"
                  >
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/news"
                  className="px-5 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
                >
                  <span>Buka Arsip Warta Komunitas ↗</span>
                </Link>
              </div>
            )}

            <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
              ● Berlaku hingga {formatWib(announcement.expiresAt)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
