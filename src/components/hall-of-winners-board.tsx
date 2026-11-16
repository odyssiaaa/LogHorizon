"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Calendar,
  Search,
  Sparkles,
  ExternalLink,
  Users,
  ShieldCheck,
  ChevronRight,
  Gamepad2,
  FileText,
} from "lucide-react";
import { ShareButton } from "@/components/share-button";
import { ChampionCertificateModal, RosterPlayer } from "@/components/champion-certificate-modal";
import { HallOfWinnerItem } from "@/app/api/hall-of-winners/route";

interface HallOfWinnersBoardProps {
  initialItems: HallOfWinnerItem[];
}

export function HallOfWinnersBoard({ initialItems }: HallOfWinnersBoardProps) {
  const [items] = useState<HallOfWinnerItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [selectedGame, setSelectedGame] = useState("ALL");

  // Certificate Modal State
  const [certModal, setCertModal] = useState<{
    isOpen: boolean;
    tournamentTitle: string;
    game: string;
    season: string;
    eventDate: string | Date;
    prizePool?: string;
    teamName: string;
    roster: RosterPlayer[];
  } | null>(null);

  // Unique games for filter
  const gamesList = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.game) set.add(item.game);
    });
    return Array.from(set);
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedGame !== "ALL" && item.game !== selectedGame) return false;
      if (!q) return true;
      return (
        item.tournamentTitle.toLowerCase().includes(q) ||
        item.game.toLowerCase().includes(q) ||
        item.championTeam.toLowerCase().includes(q) ||
        (item.runnerUpTeam && item.runnerUpTeam.toLowerCase().includes(q)) ||
        (item.thirdPlaceTeam && item.thirdPlaceTeam.toLowerCase().includes(q))
      );
    });
  }, [items, search, selectedGame]);

  return (
    <div className="space-y-6">
      {/* SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] shadow-sm">
        <div className="relative flex-1">
          <div className="flex items-center gap-2.5 px-3 h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/30 focus-within:border-[#9D4EDD] focus-within:ring-1 focus-within:ring-[#9D4EDD] transition-all">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama turnamen, tim juara, atau game…"
              className="w-full bg-transparent text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-500 outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-gray-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Game Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedGame("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedGame === "ALL"
                ? "bg-[#9D4EDD] text-white shadow-xs"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Semua Game ({items.length})
          </button>
          {gamesList.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGame(g)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedGame === g
                  ? "bg-[#9D4EDD] text-white shadow-xs"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* WINNERS CARD LIST */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-gray-300 dark:border-white/10 bg-white/40 dark:bg-[#120F17]/40 space-y-3">
          <Trophy size={40} className="mx-auto text-gray-400 opacity-60" />
          <h3 className="text-base font-bold text-gray-700 dark:text-gray-300">
            Belum ada arsip juara ditemukan
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {search
              ? `Tidak ada turnamen atau tim yang cocok dengan kata kunci "${search}".`
              : "Arsip turnamen yang selesai akan otomatis tercatat di sini setelah babak Grand Final usai."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredItems.map((item) => {
            const formattedDate = new Date(item.eventDate).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });

            return (
              <div
                key={item.id}
                className="rounded-3xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#0E0B14] shadow-xl overflow-hidden transition-all hover:border-[#9D4EDD]/40"
              >
                {/* SEASON HEADER */}
                <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-[#211C2B]/80 bg-gradient-to-r from-purple-950/25 via-[#130F1A] to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#9D4EDD]/20 text-[#C77DFF] border border-[#9D4EDD]/30 flex items-center gap-1">
                        <Gamepad2 size={12} />
                        <span>{item.game}</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                        {item.season}
                      </span>
                      {item.prizePool && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                          🏆 {item.prizePool}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                      {item.tournamentTitle}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                      <Calendar size={13} />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Actions & Share */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <ShareButton
                      url={`/hall-of-winners#${item.id}`}
                      title={`Juara ${item.tournamentTitle} - LogHorizon`}
                      text={`Selamat kepada ${item.championTeam} atas kemenangan Juara 1 di turnamen ${item.tournamentTitle} (${item.game})!`}
                      label="Bagikan"
                      variant="outline"
                    />

                    {item.tournamentId && (
                      <Link
                        href={`/events/turnamen/${item.tournamentId}`}
                        className="button button-quiet text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <span>Lihat Bagan</span>
                        <ExternalLink size={13} />
                      </Link>
                    )}
                  </div>
                </div>

                {/* PODIUM CARDS (JUARA 1, JUARA 2, JUARA 3) */}
                <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* PODIUM 1: JUARA 1 (CHAMPION) - SPANS 6 COLUMNS */}
                  <div className="lg:col-span-6 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/10 via-[#130F1A] to-[#181324] p-5 relative overflow-hidden flex flex-col justify-between shadow-xl shadow-amber-950/20">
                    <div className="absolute top-0 right-0 p-3 opacity-15 pointer-events-none">
                      <Crown size={120} className="text-amber-400" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Crown size={14} className="text-amber-400 animate-bounce" />
                          <span>👑 JUARA 1 (GRAND CHAMPION)</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          GOLD MEDAL
                        </span>
                      </div>

                      <h3 className="text-2xl sm:text-3xl font-black text-amber-300 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)] my-1">
                        {item.championTeam}
                      </h3>

                      {/* Roster Pemain Juara 1 */}
                      <div className="mt-4 pt-3 border-t border-amber-500/20">
                        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Users size={12} />
                          <span>Roster Pemain Juara:</span>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {(item.championRoster.length > 0
                            ? item.championRoster
                            : [{ name: "Kapten & Roster Tim", inGameId: "VERIFIED" }]
                          ).map((p, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-1.5 px-2.5 rounded-lg bg-black/30 border border-amber-500/15 text-xs"
                            >
                              <span className="font-semibold text-white truncate max-w-[120px]">
                                {idx + 1}. {p.name}
                              </span>
                              <span className="font-mono text-[10px] text-amber-300/80 bg-amber-500/10 px-1 rounded">
                                {p.inGameId || "VERIFIED"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Tombol Unduh Sertifikat */}
                    <div className="mt-5 pt-3 border-t border-amber-500/20 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCertModal({
                            isOpen: true,
                            tournamentTitle: item.tournamentTitle,
                            game: item.game,
                            season: item.season,
                            eventDate: item.eventDate,
                            prizePool: item.prizePool || undefined,
                            teamName: item.championTeam,
                            roster: item.championRoster,
                          })
                        }
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 active:scale-95 transition shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                      >
                        <FileText size={15} />
                        <span>Lihat &amp; Unduh Kartu Juara 🖼️</span>
                      </button>
                    </div>
                  </div>

                  {/* PODIUM 2 & 3: RUNNER UP & 3RD PLACE - SPANS 6 COLUMNS */}
                  <div className="lg:col-span-6 flex flex-col justify-between gap-4">
                    {/* RUNNER-UP (JUARA 2) */}
                    <div className="flex-1 rounded-2xl border border-slate-400/40 bg-gradient-to-b from-slate-900/30 via-[#130F1A] to-[#161220] p-4 relative overflow-hidden flex flex-col justify-between shadow-sm">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                            <Medal size={14} className="text-slate-300" />
                            <span>🥈 JUARA 2 (RUNNER-UP)</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-400/20 text-slate-300 border border-slate-400/40">
                            SILVER MEDAL
                          </span>
                        </div>

                        <h4 className="text-xl font-black text-slate-200">
                          {item.runnerUpTeam || "TBD"}
                        </h4>

                        {item.runnerUpRoster && item.runnerUpRoster.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-400/15">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.runnerUpRoster.slice(0, 5).map((p, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/25 text-slate-300 border border-slate-400/15"
                                >
                                  {p.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3RD PLACE (JUARA 3) */}
                    <div className="flex-1 rounded-2xl border border-amber-700/40 bg-gradient-to-b from-amber-950/20 via-[#130F1A] to-[#161220] p-4 relative overflow-hidden flex flex-col justify-between shadow-sm">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-mono font-bold text-amber-600/90 dark:text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Award size={14} className="text-amber-600/90 dark:text-amber-500" />
                            <span>🥉 JUARA 3 (BRONZE PLACE)</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-700/20 text-amber-500 border border-amber-700/40">
                            BRONZE MEDAL
                          </span>
                        </div>

                        <h4 className="text-xl font-black text-amber-500/90 dark:text-amber-400">
                          {item.thirdPlaceTeam || "Perebutan Juara 3"}
                        </h4>

                        {item.thirdPlaceRoster && item.thirdPlaceRoster.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-amber-700/15">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.thirdPlaceRoster.slice(0, 5).map((p, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/25 text-amber-400/90 border border-amber-700/20"
                                >
                                  {p.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CHAMPION CERTIFICATE MODAL */}
      {certModal && (
        <ChampionCertificateModal
          isOpen={certModal.isOpen}
          onClose={() => setCertModal(null)}
          tournamentTitle={certModal.tournamentTitle}
          game={certModal.game}
          season={certModal.season}
          eventDate={certModal.eventDate}
          prizePool={certModal.prizePool}
          teamName={certModal.teamName}
          roster={certModal.roster}
        />
      )}
    </div>
  );
}
