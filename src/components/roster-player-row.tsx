"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface RosterPlayerRowProps {
  index: number;
  name: string;
  inGameId: string;
  isCaptain?: boolean;
  isSub?: boolean;
  onCopyCustom?: (text: string) => void;
}

export function RosterPlayerRow({
  index,
  name,
  inGameId,
  isCaptain = false,
  isSub = false,
  onCopyCustom,
}: RosterPlayerRowProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!inGameId) return;
    if (onCopyCustom) {
      onCopyCustom(inGameId);
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(inGameId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="grid grid-cols-12 gap-2 items-center text-xs w-full">
      {/* Kotak Kiri (col-span-7): Nickname In-Game */}
      <div className="col-span-7 px-3 py-2 rounded-md bg-white/[0.03] border border-gray-200 dark:border-[#211C2B] flex items-center gap-2 min-w-0">
        <span
          className={`w-4 h-4 rounded-full text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${
            isSub
              ? "bg-amber-500/20 text-amber-500 dark:text-amber-400"
              : "bg-purple-500/20 text-[#9D4EDD]"
          }`}
        >
          {isSub ? `C${index}` : index}
        </span>
        <span className="font-bold text-gray-900 dark:text-white truncate">
          {name || "Pemain"}
        </span>
        {isCaptain && (
          <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/25">
            Kapten
          </span>
        )}
        {isSub && (
          <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/25">
            Cadangan
          </span>
        )}
      </div>

      {/* Kotak Kanan (col-span-5): ID / Tag Game (Salin Cepat) */}
      <button
        type="button"
        onClick={handleCopy}
        className="col-span-5 px-3 py-2 rounded-md bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 font-mono text-xs text-right text-purple-400 hover:text-purple-300 hover:border-[#9D4EDD] transition flex items-center justify-end gap-1.5 min-w-0 cursor-pointer group"
        title="Klik untuk salin ID Game"
      >
        <span className="truncate">{inGameId || "-"}</span>
        <span className="opacity-60 group-hover:opacity-100 transition shrink-0 text-purple-400">
          {copied ? (
            <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-sans font-bold">
              <Check size={11} />
              <span className="hidden sm:inline">Salin!</span>
            </span>
          ) : (
            <Copy size={11} />
          )}
        </span>
      </button>
    </div>
  );
}
