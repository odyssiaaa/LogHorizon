"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MessageSquare, Users, ExternalLink, Zap } from "lucide-react";

interface DiscordWidgetData {
  serverName: string;
  onlineCount: number;
  totalMembers: number;
  inviteUrl: string;
  activeMembers: Array<{
    id: string;
    username: string;
    avatarUrl: string | null;
    status: string;
    game?: string;
  }>;
}

export function DiscordLiveBanner({
  className = "",
  variant = "full",
  inviteUrl: propInviteUrl,
}: {
  className?: string;
  variant?: "full" | "compact";
  inviteUrl?: string;
}) {
  const [data, setData] = useState<DiscordWidgetData | null>(null);
  const [loading, setLoading] = useState(true);

  const fallbackInviteUrl = propInviteUrl || "https://discord.gg/aJvbVyTxNb";

  useEffect(() => {
    async function loadWidget() {
      try {
        const res = await fetch("/api/discord/widget");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.warn("[DiscordLiveBanner] Error:", err);
      } finally {
        setLoading(false);
      }
    }
    void loadWidget();
  }, []);

  const onlineCount = data?.onlineCount ?? 75;
  const totalMembers = data?.totalMembers ?? 1250;
  const inviteUrl = data?.inviteUrl || fallbackInviteUrl;
  const activeMembers = data?.activeMembers || [];

  if (variant === "compact") {
    return (
      <div
        className={`p-4 rounded-xl border border-[#5865F2]/40 bg-[#110926]/90 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 text-left shadow-lg ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2] shrink-0">
            <MessageSquare size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {onlineCount.toLocaleString("id-ID")} Member Online Sekarang
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              Komunitas discord mabar 24 jam • {totalMembers.toLocaleString("id-ID")} Anggota
            </p>
          </div>
        </div>

        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold font-mono inline-flex items-center justify-center gap-2 transition-colors shadow-md"
        >
          <span>🚀 Gabung Server</span>
          <ExternalLink size={13} />
        </a>
      </div>
    );
  }

  return (
    <div
      className={`p-6 sm:p-8 rounded-none border-2 border-[#5865F2] bg-gradient-to-br from-[#120826] via-[#100720] to-[#0A0414] shadow-2xl relative overflow-hidden text-left ${className}`}
    >
      {/* Background Discord Watermark */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#5865F2]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          {/* Real-time Status Indicator */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5865F2]/15 border border-[#5865F2]/40 text-xs font-mono">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="font-bold text-emerald-400">
              🟢 {onlineCount.toLocaleString("id-ID")} Member Online Sekarang
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-purple-300 font-bold">
              {totalMembers.toLocaleString("id-ID")} Total Anggota
            </span>
          </div>

          <h3 className="font-display text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Markas Komunikasi &amp; Voice Channel 24/7
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            Mencari rekan squad ranked Valorant &amp; MLBB, koordinasi scrim turnamen, streaming mabar, atau sekadar nongkrong musik santai. Semua aktivitas berlangsung aktif di Server Discord resmi LogHorizon!
          </p>

          {/* Active Members Mini Avatars */}
          {activeMembers.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex -space-x-2 overflow-hidden">
                {activeMembers.slice(0, 6).map((m, idx) => (
                  <div
                    key={`${m.id}-${idx}`}
                    className="relative inline-block w-8 h-8 rounded-full ring-2 ring-[#100720] bg-[#1E1A3A] overflow-hidden"
                    title={`@${m.username}`}
                  >
                    {m.avatarUrl ? (
                      <Image
                        src={m.avatarUrl}
                        alt={m.username}
                        width={32}
                        height={32}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-purple-300">
                        {m.username.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <span className="text-[11px] font-mono text-purple-300 font-medium">
                + puluhan petualang sedang aktif di voice &amp; chat
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="shrink-0 w-full sm:w-auto flex flex-col gap-2">
          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-7 py-4 rounded-none bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm sm:text-base font-black font-mono inline-flex items-center justify-center gap-3 transition-all duration-200 shadow-xl hover:scale-[1.02] cursor-pointer"
          >
            <span>🚀 Gabung Server Discord Sekarang (1-Klik)</span>
            <ExternalLink size={18} />
          </a>
          <span className="text-[10px] font-mono text-slate-400 text-center sm:text-right">
            Gratis • Tanpa Syarat Ribet • Langsung Dapat Role
          </span>
        </div>
      </div>
    </div>
  );
}
