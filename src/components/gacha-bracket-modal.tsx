"use client";

import { useEffect, useState } from "react";
import { Dices, Sparkles, Trophy, Flame } from "lucide-react";

interface GachaBracketModalProps {
  isOpen: boolean;
  tournamentTitle: string;
  isRolling: boolean;
  onFinish?: () => void;
  teamsList?: string[];
}

export function GachaBracketModal({
  isOpen,
  tournamentTitle,
  isRolling,
  onFinish,
  teamsList = [],
}: GachaBracketModalProps) {
  const [shufflingMatchup, setShufflingMatchup] = useState<string>("Mengacak susunan lawan...");
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setRevealed(false);
      return;
    }

    const sampleTeams = teamsList.length >= 2
      ? teamsList
      : ["RRQ Kingdom", "Onic Genesis", "Evos Legends", "Alter Ego", "Bigetron Alpha", "Geek Fam", "Aura Fire", "Dewa United"];

    let interval: NodeJS.Timeout | null = null;

    if (isRolling) {
      setRevealed(false);
      interval = setInterval(() => {
        const randA = sampleTeams[Math.floor(Math.random() * sampleTeams.length)];
        let randB = sampleTeams[Math.floor(Math.random() * sampleTeams.length)];
        while (randB === randA && sampleTeams.length > 1) {
          randB = sampleTeams[Math.floor(Math.random() * sampleTeams.length)];
        }
        setShufflingMatchup(`${randA} ⚔️ ${randB}`);
      }, 65);
    } else {
      setRevealed(true);
      const timer = setTimeout(() => {
        onFinish?.();
      }, 900);
      return () => clearTimeout(timer);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, isRolling, teamsList, onFinish]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gacha-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl border-2 border-[#9D4EDD] bg-gradient-to-b from-[#1E142B] via-[#120F17] to-black shadow-2xl shadow-[#9D4EDD]/40 text-center overflow-hidden">
        {/* Glow ambient circle */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#9D4EDD]/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

        {/* Dice & Aura Animation */}
        <div className="relative flex items-center justify-center my-4">
          <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-[#9D4EDD]/30 to-amber-500/20 border border-purple-500/50 shadow-inner">
            <Dices
              size={54}
              className={`text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)] ${
                isRolling ? "animate-spin" : "scale-110 transition-transform duration-300"
              }`}
            />
            {isRolling && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1 mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Flame size={13} className="text-amber-400" />
            <span>GACHA / ACAK BAGAN RESMI</span>
          </div>
          <h3 id="gacha-title" className="text-lg sm:text-xl font-black text-white truncate px-2">
            {tournamentTitle}
          </h3>
          <p className="text-xs text-gray-400">
            {isRolling
              ? "Mengundi susunan lawan secara adil dengan algoritma Fisher-Yates..."
              : "Bagan berhasil diacak! Menyusun ulang bagan Ronde 1..."}
          </p>
        </div>

        {/* Slot Machine Matchup Rolling Box */}
        <div className="p-3.5 rounded-xl border border-purple-500/40 bg-black/60 shadow-inner my-4 min-h-[58px] flex items-center justify-center">
          {isRolling ? (
            <p className="text-xs sm:text-sm font-mono font-black text-amber-300 animate-pulse tracking-wide truncate">
              {shufflingMatchup}
            </p>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs sm:text-sm animate-bounce">
              <Sparkles size={16} />
              <span>Susunan Pertandingan Baru Siap!</span>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-gray-400">
          <Trophy size={13} className="text-amber-400" />
          <span>Auto-BYE terdistribusi simetris kiri-kanan</span>
        </div>
      </div>
    </div>
  );
}
