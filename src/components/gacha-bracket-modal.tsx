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
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-fadeIn"
    >
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-none border border-[#7C3AED] bg-[#130921] shadow-2xl text-center overflow-hidden">
        {/* Dice Animation */}
        <div className="relative flex items-center justify-center my-4">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-none bg-[#09040F] border border-[#2E1E45]">
            <Dices
              size={44}
              className={`text-[#7C3AED] ${
                isRolling ? "animate-spin" : "scale-105 transition-transform duration-300 text-amber-400"
              }`}
            />
            {isRolling && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-none bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-none h-3 w-3 bg-amber-500" />
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1 mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/40">
            <Flame size={12} className="text-amber-400" />
            <span>BRACKET SHUFFLE // SEEDING</span>
          </div>
          <h3 id="gacha-title" className="text-lg sm:text-xl font-bold font-display text-white truncate px-2 tracking-tight">
            {tournamentTitle}
          </h3>
          <p className="text-xs text-gray-400 font-sans">
            {isRolling
              ? "Mengundi susunan lawan secara acak dengan algoritma Fisher-Yates..."
              : "Bagan berhasil diacak. Menyusun ulang bagan Ronde 1..."}
          </p>
        </div>

        {/* Slot Machine Matchup Rolling Box */}
        <div className="p-3.5 rounded-none border border-[#2E1E45] bg-[#09040F] my-4 min-h-[58px] flex items-center justify-center">
          {isRolling ? (
            <p className="text-xs sm:text-sm font-mono font-bold text-amber-300 animate-pulse tracking-wide truncate">
              {shufflingMatchup}
            </p>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-xs sm:text-sm">
              <Sparkles size={16} />
              <span>SUSUNAN PERTANDINGAN BARU SIAP</span>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-gray-400">
          <Trophy size={13} className="text-[#A78BFA]" />
          <span>AUTO-BYE TERDISTRIBUSI SIMETRIS KIRI-KANAN</span>
        </div>
      </div>
    </div>
  );
}
