"use client";

import { useState, useMemo } from "react";
import { Search, ShieldCheck, Clock, XCircle, AlertCircle, Swords, Users, Calendar, Trophy, X } from "lucide-react";
import { TournamentMatch } from "@/lib/tournament";

export interface TrackerParticipant {
  id: string;
  teamName: string;
  captainName?: string | null;
  teamTag?: string | null;
  paymentStatus?: string | null;
  rejectionReason?: string | null;
  createdAt?: string | Date;
  leader?: {
    id?: string;
    username?: string | null;
    name?: string | null;
  } | null;
}

export interface TrackerTournament {
  id: string;
  title: string;
  game: string;
  eventDate?: string | Date | null;
  status?: string;
  participants?: TrackerParticipant[] | any[];
  matches?: unknown;
}

interface GuestTournamentTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: TrackerTournament | null;
}

export function GuestTournamentTrackerModal({
  isOpen,
  onClose,
  tournament,
}: GuestTournamentTrackerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen || !tournament) return null;

  const matches = (tournament.matches as TournamentMatch[]) || [];
  const participants = (tournament.participants as TrackerParticipant[]) || [];

  const filteredParticipants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return participants.filter((p) => {
      const matchName = p.teamName?.toLowerCase().includes(q);
      const matchTag = p.teamTag?.toLowerCase().includes(q);
      const matchCaptain = (p.captainName || p.leader?.username || p.leader?.name || "").toLowerCase().includes(q);
      return matchName || matchTag || matchCaptain;
    });
  }, [searchQuery, participants]);

  // Helper to find first match opponent in bracket
  const getFirstMatchInfo = (teamName: string, participantId: string) => {
    const norm = teamName.trim().toLowerCase();
    for (const match of matches) {
      const isTeamA = match.teamA?.id === participantId || (match.teamA?.name && match.teamA.name.trim().toLowerCase() === norm);
      const isTeamB = match.teamB?.id === participantId || (match.teamB?.name && match.teamB.name.trim().toLowerCase() === norm);

      if (isTeamA) {
        return {
          matchId: match.matchId,
          roundName: match.roundName || "Round 1",
          opponentName: match.teamB?.name || "TBD (Menunggu Lawan)",
          matchStatus: match.matchStatus,
          scheduledTime: match.scheduledAt,
        };
      }
      if (isTeamB) {
        return {
          matchId: match.matchId,
          roundName: match.roundName || "Round 1",
          opponentName: match.teamA?.name || "TBD (Menunggu Lawan)",
          matchStatus: match.matchStatus,
          scheduledTime: match.scheduledAt,
        };
      }
    }
    return null;
  };

  const eventTime = tournament.eventDate ? new Date(tournament.eventDate).getTime() : NaN;
  const now = Date.now();
  const isPast = !isNaN(eventTime) && now >= eventTime;
  const hoursUntil = !isNaN(eventTime) && !isPast ? Math.max(0, Math.floor((eventTime - now) / (1000 * 60 * 60))) : 0;
  const minsUntil = !isNaN(eventTime) && !isPast ? Math.max(0, Math.floor(((eventTime - now) % (1000 * 60 * 60)) / (1000 * 60))) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#11091D] border border-[#7C3AED]/60 shadow-2xl p-5 sm:p-6 text-left select-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#2A1B42]">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/40 flex items-center justify-center text-[#7C3AED] dark:text-[#A78BFA] shrink-0">
              <Search size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Cek Status Pendaftaran Tim
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tournament.title} • {tournament.game}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A0E2E] transition cursor-pointer"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Input Box */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Cari Nama Tim atau Nama Kapten:
          </label>
          <div className="relative">
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Contoh: Garuda Esports, Omega Team..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-[#181026] border border-slate-200 dark:border-[#2A1B42] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED] transition"
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Results Area */}
        <div className="mt-4 space-y-3 max-h-[340px] overflow-y-auto pr-1">
          {searchQuery.trim() === "" ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
              <Users size={28} className="mx-auto mb-2 opacity-40 text-[#7C3AED]" />
              <p className="font-medium text-slate-700 dark:text-slate-300">Ketik nama tim yang didaftarkan</p>
              <p className="mt-0.5 text-[11px]">Sistem akan menampilkan status ACC, jadwal tanding, dan lawan pertama tanpa membocorkan nomor HP demi privasi.</p>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
              <AlertCircle size={28} className="mx-auto mb-2 opacity-50 text-amber-500" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">Tim &quot;{searchQuery}&quot; tidak ditemukan</p>
              <p className="mt-1 text-[11px]">Pastikan ejaan nama tim benar, atau tim Anda belum menyelesaikan formulir pendaftaran.</p>
            </div>
          ) : (
            filteredParticipants.map((p) => {
              const matchInfo = getFirstMatchInfo(p.teamName, p.id);
              const isApproved = p.paymentStatus === "APPROVED";
              const isRejected = p.paymentStatus === "REJECTED";
              const isPending = !isApproved && !isRejected;

              return (
                <div
                  key={p.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#160D27] space-y-3"
                >
                  {/* Top Bar: Team Name & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        {p.teamTag && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/40">
                            [{p.teamTag}]
                          </span>
                        )}
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {p.teamName}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Kapten: <span className="font-medium text-slate-700 dark:text-slate-200">{p.captainName || p.leader?.username || p.leader?.name || "Kapten Tim"}</span>
                      </p>
                    </div>

                    {/* Status Badge */}
                    {isApproved && (
                      <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck size={12} />
                        <span>✅ Lolos Bagan</span>
                      </span>
                    )}
                    {isPending && (
                      <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Clock size={12} />
                        <span>⏳ Menunggu Verifikasi</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <XCircle size={12} />
                        <span>❌ Ditolak</span>
                      </span>
                    )}
                  </div>

                  {/* Rejection Note */}
                  {isRejected && p.rejectionReason && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs">
                      <span className="font-bold">Alasan Penolakan: </span>
                      {p.rejectionReason}
                    </div>
                  )}

                  {/* Pending Notice */}
                  {isPending && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                      ⚡ Data tim sedang ditinjau oleh panitia turnamen. Pantau terus status timmu di sini!
                    </p>
                  )}

                  {/* Approved: Schedule & Opponent Info */}
                  {isApproved && (
                    <div className="pt-2 border-t border-slate-200 dark:border-[#2A1B42]/80 space-y-2 text-xs">
                      {matchInfo ? (
                        <div className="p-2.5 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/30 space-y-1.5">
                          <div className="flex items-center justify-between text-[#7C3AED] dark:text-[#A78BFA] font-bold text-[11px]">
                            <span className="flex items-center gap-1">
                              <Swords size={12} />
                              Lawan Pertama ({matchInfo.roundName})
                            </span>
                            <span className="font-mono">{matchInfo.matchId}</span>
                          </div>
                          <p className="text-sm font-black text-slate-900 dark:text-white">
                            VS {matchInfo.opponentName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <Clock size={11} />
                            <span>
                              {isPast ? "Turnamen Sedang / Telah Berjalan" : `Kick-off: ${hoursUntil} jam ${minsUntil} menit lagi`}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2A1B42] text-slate-500 dark:text-slate-400 text-[11px]">
                          <p className="font-semibold text-slate-700 dark:text-slate-300">🎲 Menunggu Pengacakan Bagan</p>
                          <p className="mt-0.5">Lawan tanding akan otomatis muncul di sini setelah panitia mengacak bagan (Gacha Bagan).</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#2A1B42] flex items-center justify-between text-[11px] text-slate-400">
          <span>🔒 Privasi Terjamin: No. WhatsApp disembunyikan</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-200 dark:bg-[#1F1433] hover:bg-slate-300 dark:hover:bg-[#2A1B42] text-slate-700 dark:text-slate-300 font-medium transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
