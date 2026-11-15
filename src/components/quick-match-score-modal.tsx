"use client";

import { useState, useEffect } from "react";
import { X, Trophy, Swords, Zap } from "lucide-react";
import { TournamentMatch } from "@/lib/tournament";

interface QuickMatchScoreModalProps {
  isOpen: boolean;
  match: TournamentMatch | null;
  onClose: () => void;
  onSave: (
    matchId: string,
    winnerName: string,
    winnerId?: string,
    scoreA?: number,
    scoreB?: number
  ) => void;
}

export function QuickMatchScoreModal({
  isOpen,
  match,
  onClose,
  onSave,
}: QuickMatchScoreModalProps) {
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);

  useEffect(() => {
    if (match) {
      setScoreA(match.teamA?.score ?? 0);
      setScoreB(match.teamB?.score ?? 0);
    }
  }, [match]);

  if (!isOpen || !match) return null;

  const teamAName = match.teamA?.name || "Tim A";
  const teamBName = match.teamB?.name || "Tim B";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] rounded-2xl w-full max-w-md p-5 shadow-2xl relative space-y-4 my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="pb-3 border-b border-gray-200 dark:border-[#211C2B]">
          <span className="text-[10px] font-mono font-bold text-[#9D4EDD] uppercase tracking-wider flex items-center gap-1.5">
            <Zap size={13} />
            <span>KONTROL CEPAT MATCH ADMIN</span>
          </span>
          <h3 className="text-base font-black text-gray-900 dark:text-white mt-0.5">
            Update Skor &amp; Tentukan Pemenang
          </h3>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            {match.roundName} (Match #{match.matchId})
          </p>
        </div>

        {/* Input Skor Pertandingan */}
        <div className="grid grid-cols-2 gap-3 items-center">
          <div className="p-3 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#161220] space-y-2 text-center">
            <span className="text-xs font-bold text-gray-900 dark:text-white truncate block">
              {teamAName}
            </span>
            <input
              type="number"
              min={0}
              max={99}
              value={scoreA}
              onChange={(e) => setScoreA(Math.max(0, Number(e.target.value)))}
              className="w-16 h-10 text-center mx-auto rounded-lg bg-white dark:bg-[#120F17] text-sm font-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
            />
          </div>

          <div className="p-3 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#161220] space-y-2 text-center">
            <span className="text-xs font-bold text-gray-900 dark:text-white truncate block">
              {teamBName}
            </span>
            <input
              type="number"
              min={0}
              max={99}
              value={scoreB}
              onChange={(e) => setScoreB(Math.max(0, Number(e.target.value)))}
              className="w-16 h-10 text-center mx-auto rounded-lg bg-white dark:bg-[#120F17] text-sm font-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
            />
          </div>
        </div>

        {/* Action Buttons to Decide Winner & Advance */}
        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-[#211C2B]">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">
            Pilih Pemenang Pertandingan:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onSave(match.matchId, teamAName, match.teamA?.id, scoreA, scoreB);
                onClose();
              }}
              className="px-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition flex items-center justify-center gap-1.5"
            >
              <Trophy size={14} className="text-amber-300" />
              <span className="truncate">Menangkan {teamAName}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(match.matchId, teamBName, match.teamB?.id, scoreA, scoreB);
                onClose();
              }}
              className="px-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition flex items-center justify-center gap-1.5"
            >
              <Trophy size={14} className="text-amber-300" />
              <span className="truncate">Menangkan {teamBName}</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="button button-quiet w-full text-xs font-semibold"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
