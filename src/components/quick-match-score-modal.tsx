"use client";

import { useState, useEffect } from "react";
import { X, Trophy, Zap, AlertTriangle, UserX, RotateCcw, Play, Pause } from "lucide-react";
import { TournamentMatch, TournamentLossReason } from "@/lib/tournament";

interface QuickMatchScoreModalProps {
  isOpen: boolean;
  match: TournamentMatch | null;
  onClose: () => void;
  onSave: (
    matchId: string,
    winnerName: string,
    winnerId?: string,
    scoreA?: number,
    scoreB?: number,
    lossReason?: TournamentLossReason
  ) => void;
  onReset?: (matchId: string) => void;
  onToggleStatus?: (matchId: string, status: "UPCOMING" | "LIVE" | "FINISHED") => void;
}

export function QuickMatchScoreModal({
  isOpen,
  match,
  onClose,
  onSave,
  onReset,
  onToggleStatus,
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
  const isFinished = match.matchStatus === "FINISHED" || Boolean(match.winner);
  const isLive = match.matchStatus === "LIVE";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] rounded-2xl w-full max-w-lg p-5 shadow-2xl relative space-y-4 my-auto animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
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
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-bold text-[#9D4EDD] uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={13} />
              <span>KONTROL PERTANDINGAN ADMIN</span>
            </span>

            {/* Quick Status Toggle Button */}
            {onToggleStatus && (
              <div>
                {isLive ? (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleStatus(match.matchId, "UPCOMING");
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition"
                    title="Batalkan status live dan kembali ke jadwal menunggu"
                  >
                    <Pause size={12} />
                    <span>⏸ Batalkan Live (Kembali Menunggu)</span>
                  </button>
                ) : isFinished ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    ✓ SELESAI
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleStatus(match.matchId, "LIVE");
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 transition"
                    title="Mulai pertandingan dan tandai sedang live"
                  >
                    <Play size={12} />
                    <span>🔴 Set Live</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <h3 className="text-base font-black text-gray-900 dark:text-white mt-1">
            Atur Skor &amp; Keputusan Pertandingan
          </h3>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            {match.roundName} (Match #{match.matchId})
          </p>
        </div>

        {/* Input Skor Pertandingan */}
        <div>
          <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block mb-1.5 text-center">
            Papan Skor Akhir (Manual)
          </label>
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
        </div>

        {/* Keputusan Pemenang: Tim A */}
        <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300 truncate">
              Keputusan untuk Tim A: <span className="text-white font-black">{teamAName}</span>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                onSave(match.matchId, teamAName, match.teamA?.id, scoreA, scoreB, "NORMAL");
                onClose();
              }}
              className="px-2.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] shadow-xs transition flex items-center justify-center gap-1"
            >
              <Trophy size={13} className="text-amber-300" />
              <span>Menang Skor</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(match.matchId, teamAName, match.teamA?.id, 1, 0, "WO");
                onClose();
              }}
              className="px-2.5 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[11px] shadow-xs transition flex items-center justify-center gap-1"
              title="Menang karena Tim B tidak hadir / WalkOut"
            >
              <UserX size={13} />
              <span>Menang WO</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(match.matchId, teamAName, match.teamA?.id, 1, 0, "DQ");
                onClose();
              }}
              className="px-2.5 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-bold text-[11px] shadow-xs transition flex items-center justify-center gap-1"
              title="Menang karena Tim B didiskualifikasi (pelanggaran aturan)"
            >
              <AlertTriangle size={13} />
              <span>Menang DQ</span>
            </button>
          </div>
        </div>

        {/* Keputusan Pemenang: Tim B */}
        <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300 truncate">
              Keputusan untuk Tim B: <span className="text-white font-black">{teamBName}</span>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                onSave(match.matchId, teamBName, match.teamB?.id, scoreA, scoreB, "NORMAL");
                onClose();
              }}
              className="px-2.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] shadow-xs transition flex items-center justify-center gap-1"
            >
              <Trophy size={13} className="text-amber-300" />
              <span>Menang Skor</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(match.matchId, teamBName, match.teamB?.id, 0, 1, "WO");
                onClose();
              }}
              className="px-2.5 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[11px] shadow-xs transition flex items-center justify-center gap-1"
              title="Menang karena Tim A tidak hadir / WalkOut"
            >
              <UserX size={13} />
              <span>Menang WO</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(match.matchId, teamBName, match.teamB?.id, 0, 1, "DQ");
                onClose();
              }}
              className="px-2.5 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-bold text-[11px] shadow-xs transition flex items-center justify-center gap-1"
              title="Menang karena Tim A didiskualifikasi (pelanggaran aturan)"
            >
              <AlertTriangle size={13} />
              <span>Menang DQ</span>
            </button>
          </div>
        </div>

        {/* Reset / Edit Ulang Match */}
        {isFinished && onReset && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                const confirmReset = window.confirm(
                  `Yakin ingin mereset hasil match #${match.matchId}? Pemenang saat ini (${match.winner}) akan dibatalkan dari babak berikutnya.`
                );
                if (confirmReset) {
                  onReset(match.matchId);
                  onClose();
                }
              }}
              className="w-full py-2.5 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={14} />
              <span>↺ Edit Ulang Match (Reset Pemenang &amp; Buka Kunci)</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="button button-quiet w-full text-xs font-semibold"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
