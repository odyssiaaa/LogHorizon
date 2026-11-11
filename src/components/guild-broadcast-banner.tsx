"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  expiresAt: string;
  author: {
    username: string | null;
  };
};

export function GuildBroadcastBanner() {
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

  return (
    <aside className="w-full bg-[#140b24] border-b border-[#9D4EDD]/40 text-purple-200 px-4 py-3 relative z-20">
      <div className="page-shell max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
          <span className="p-1 rounded bg-[#9D4EDD]/20 text-[#C77DFF] shrink-0 mt-0.5 sm:mt-0">
            <Megaphone size={16} className="animate-pulse" />
          </span>
          <div className="text-xs sm:text-sm">
            <strong className="text-white font-bold mr-2">
              [PENGUMUMAN GUILD] {announcement.title}:
            </strong>
            <span className="text-gray-300">
              {announcement.content.length > 120
                ? `${announcement.content.slice(0, 120)}...`
                : announcement.content}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-[11px] font-mono text-purple-400 self-end sm:self-auto">
          <span>👑 {announcement.author.username ?? "Emperor"}</span>
          <span>• Aktif 24 Jam</span>
        </div>
      </div>
    </aside>
  );
}
