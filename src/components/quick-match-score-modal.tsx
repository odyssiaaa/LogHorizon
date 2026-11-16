"use client";

import { useState, useEffect } from "react";
import { X, Trophy, Zap, AlertTriangle, UserX, RotateCcw, Play, Pause, Calendar, Clock } from "lucide-react";
import { TournamentMatch, TournamentLossReason, isoToDateTimeLocal, dateTimeLocalToIso, formatMatchScheduleDisplay } from "@/lib/tournament";

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
  onUpdateSchedule?: (matchId: string, scheduledAt: string | null) => void;
}

export function QuickMatchScoreModal({
  isOpen,
  match,
  onClose,
  onSave,
  onReset,
  onToggleStatus,
  onUpdateSchedule,
}: QuickMatchScoreModalProps) {
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [schedInput, setSchedInput] = useState("");
  const [schedSaved, setSchedSaved] = useState(false);

  useEffect(() => {
    if (match) {
      setScoreA(match.teamA?.score ?? 0);
      setScoreB(match.teamB?.score ?? 0);
      setSchedInput(isoToDateTimeLocal(match.scheduledAt));
      setSchedSaved(false);
    }
  }, [match]);

  if (!isOpen || !match) return null;

  const teamAName = match.teamA?.name || "Tim A";
  const teamBName = match.teamB?.name || "Tim B";
  const isFinished = match.matchStatus === "FINISHED" || Boolean(match.winner);
  const isLive = match.matchStatus === "LIVE";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#130921] border border-[#2E1E45] rounded-none w-full max-w-lg p-6 shadow-2xl relative space-y-4 my-auto animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
        >
          <X size={18} />
        </button>

        <div className="pb-3 border-b border-[#2E1E45]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#A78BFA] flex items-center gap-1.5">
              <Zap size={13} className="text-[#7C3AED]" />
              <span>CONTROL // ADMIN TOURNAMENT</span>
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/40 hover:bg-amber-500/20 transition"
                    title="Batalkan status live dan kembali ke jadwal menunggu"
                  >
                    <Pause size={12} />
                    <span>⏸ BATALKAN LIVE</span>
                  </button>
                ) : isFinished ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    ✓ FINISHED
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleStatus(match.matchId, "LIVE");
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-[10px] font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/40 hover:bg-rose-500/20 transition"
                    title="Mulai pertandingan dan tandai sedang live"
                  >
                    <Play size={12} />
                    <span>🔴 SET LIVE</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <h3 className="text-lg font-bold text-white font-display mt-1 tracking-tight">
            Skor &amp; Keputusan Pertandingan
          </h3>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            {match.roundName} &bull; MATCH #{match.matchId}
          </p>
        </div>

        {/* Jadwal Pertandingan & Auto-Live Trigger */}
        {onUpdateSchedule && (
          <div className="p-3 rounded-none border border-[#2E1E45] bg-[#09040F] space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-[10px] font-mono uppercase tracking-wider text-[#A78BFA] flex items-center gap-1.5">
                <Calendar size={13} className="text-[#7C3AED]" />
                <span>Jadwal Jam Tanding (Auto-Live)</span>
              </label>
              {match.manualOverride && (
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-none">
                  MANUAL OVERRIDE
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={schedInput}
                onChange={(e) => {
                  setSchedInput(e.target.value);
                  setSchedSaved(false);
                }}
                className="flex-1 px-3 py-1.5 rounded-none border border-[#2E1E45] bg-[#130921] text-xs font-mono text-white focus:outline-none focus:border-[#7C3AED]"
              />
              <button
                type="button"
                onClick={() => {
                  const iso = dateTimeLocalToIso(schedInput);
                  onUpdateSchedule(match.matchId, iso);
                  setSchedSaved(true);
                  setTimeout(() => setSchedSaved(false), 2500);
                }}
                className="px-3 py-1.5 rounded-none bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-mono font-bold transition shrink-0"
              >
                {schedSaved ? "✓ TERSIMPAN" : "SET JADWAL"}
              </button>
              {schedInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSchedInput("");
                    onUpdateSchedule(match.matchId, null);
                    setSchedSaved(true);
                    setTimeout(() => setSchedSaved(false), 2500);
                  }}
                  className="px-2 py-1.5 rounded-none border border-[#2E1E45] text-gray-400 hover:text-white text-xs transition"
                  title="Hapus jadwal waktu"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {match.scheduledAt && (
              <div className="text-[11px] text-gray-400 font-mono flex items-center gap-2 pt-0.5">
                <Clock size={12} className="text-[#A78BFA]" />
                <span>Status Waktu: <strong className="text-purple-300 font-mono">{formatMatchScheduleDisplay(match.scheduledAt, match.schedule, match.manualOverride).badgeText}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Input Skor Pertandingan */}
        <div>
          <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block mb-1.5 text-center">
            PAPAN SKOR AKHIR (MANUAL)
          </label>
          <div className="grid grid-cols-2 gap-3 items-center">
            <div className="p-3 rounded-none border border-[#2E1E45] bg-[#09040F] space-y-2 text-center">
              <span className="text-xs font-bold text-white truncate block font-display">
                {teamAName}
              </span>
              <input
                type="number"
                min={0}
                max={99}
                value={scoreA}
                onChange={(e) => setScoreA(Math.max(0, Number(e.target.value)))}
                className="w-16 h-10 text-center mx-auto rounded-none bg-[#130921] text-sm font-mono font-black border border-[#2E1E45] text-white focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div className="p-3 rounded-none border border-[#2E1E45] bg-[#09040F] space-y-2 text-center">
              <span className="text-xs font-bold text-white truncate block font-display">
                {teamBName}
              </span>
              <input
                type="number"
                min={0}
                max={99}
                value={scoreB}
                onChange={(e) => setScoreB(Math.max(0, Number(e.target.value)))}
                className="w-16 h-10 text-center mx-auto rounded-none bg-[#130921] text-sm font-mono font-black border border-[#2E1E45] text-white focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
          </div>
        </div>

        {/* Keputusan Pemenang: Tim A */}
        <div className="p-3 rounded-none border border-[#2E1E45] bg-[#09040F] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-300 truncate">
              Keputusan untuk Tim A: <span className="text-white font-bold">{teamAName}</span>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                onSave(match.matchId, teamAName, match.teamA?.id, scoreA, scoreB, "NORMAL");
                onClose();
              }}
              className="px-2.5 py-2 rounded-none bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-mono font-bold text-[11px] transition flex items-center justify-center gap-1"
            >
              <Trophy size={13} className="text-amber-300" />
              <span>MENANG SKOR</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(match.matchId, teamAName, match.teamA?.id, 1, 0, "WO");
                onClose();
              }}
              className="px-2.5 py-2 rounded-none bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold text-[11px] transition flex items-center justify-center gap-1"
              title="Menang karena Tim B tidak hadir / WalkOut"
            >
              <UserX size={13} />
              <span>MENANG WO</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(match.matchId, teamAName, match.teamA?.id, 1, 0, "DQ");
                onClose();
              }}
              className="px-2.5 py-2 rounded-none bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-bold text-[11px] transition flex items-center justify-center gap-1"
              title="Menang karena Tim B didiskualifikasi (pelanggaran aturan)"
            >
              <AlertTriangle size={13} />
              <span>MENANG DQ</span>
            </button>
          </div>
        </div>

        {/* Keputusan Pemenang: Tim B */}
        <div className="p-3 rounded-none border border-[#2E1E45] bg-[#09040F] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-300 truncate">
              Keputusan untuk Tim B: <span className="text-white font-bold">{teamBName}</span>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                onSave(match.matchId, teamBName, match.teamB?.id, scoreA, scoreB, "NORMAL");
                onClose();
              }}
              className="px-2.5 py-2 rounded-none bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-mono font-bold text-[11px] transition flex items-center justify-center gap-1"
            >
              <Trophy size={13} className="text-amber-300" />
              <span>MENANG SKOR</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(match.matchId, teamBName, match.teamB?.id, 0, 1, "WO");
                onClose();
              }}
              className="px-2.5 py-2 rounded-none bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold text-[11px] transition flex items-center justify-center gap-1"
              title="Menang karena Tim A tidak hadir / WalkOut"
            >
              <UserX size={13} />
              <span>MENANG WO</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(match.matchId, teamBName, match.teamB?.id, 0, 1, "DQ");
                onClose();
              }}
              className="px-2.5 py-2 rounded-none bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-bold text-[11px] transition flex items-center justify-center gap-1"
              title="Menang karena Tim A didiskualifikasi (pelanggaran aturan)"
            >
              <AlertTriangle size={13} />
              <span>MENANG DQ</span>
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
              className="w-full py-2.5 rounded-none border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-mono font-bold transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={14} />
              <span>↺ RESET PEMENANG &amp; BUKA KUNCI MATCH</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 rounded-none border border-[#2E1E45] bg-[#1A0E2E] hover:bg-[#251540] text-gray-300 font-mono text-xs transition"
        >
          TUTUP
        </button>
      </div>
    </div>
  );
}
