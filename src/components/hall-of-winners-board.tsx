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
    <div className="space-y-6 text-left">
      {/* SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-sm">
        <div className="relative flex-1">
          <div className="flex items-center gap-2.5 px-3 h-10 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] focus-within:border-[#7C3AED] transition-all">
            <Search size={15} className="text-slate-500 dark:text-[#A78BFA] shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama turnamen, tim juara, atau game…"
              className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#A78BFA]/50 outline-none font-sans"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-slate-500 dark:text-[#A78BFA] hover:text-slate-900 dark:hover:text-[#F8FAFC] font-mono text-xs px-1 uppercase"
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
            className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold uppercase tracking-wider transition whitespace-nowrap border ${
              selectedGame === "ALL"
                ? "bg-[#7C3AED] text-white border-[#7C3AED]"
                : "bg-slate-100 dark:bg-[#1A0E2E] text-slate-600 dark:text-[#A78BFA] border-slate-200 dark:border-[#2E1E45] hover:border-[#7C3AED] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
            }`}
          >
            Semua Game ({items.length})
          </button>
          {gamesList.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGame(g)}
              className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold uppercase tracking-wider transition whitespace-nowrap border ${
                selectedGame === g
                  ? "bg-[#7C3AED] text-white border-[#7C3AED]"
                  : "bg-slate-100 dark:bg-[#1A0E2E] text-slate-600 dark:text-[#A78BFA] border-slate-200 dark:border-[#2E1E45] hover:border-[#7C3AED] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* WINNERS CARD LIST */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-none border border-dashed border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] space-y-3">
          <Trophy size={40} className="mx-auto text-slate-400 dark:text-[#A78BFA] opacity-60" />
          <h3 className="font-display text-base font-extrabold uppercase tracking-tight text-slate-900 dark:text-[#F8FAFC]">
            Belum ada arsip juara ditemukan
          </h3>
          <p className="text-xs text-slate-600 dark:text-[#A78BFA] max-w-md mx-auto font-sans">
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
                className="rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-xl overflow-hidden transition-all hover:border-[#7C3AED]"
              >
                {/* SEASON HEADER */}
                <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-none bg-purple-500/10 dark:bg-[#7C3AED]/20 text-purple-700 dark:text-[#A78BFA] border border-purple-500/20 dark:border-[#7C3AED]/40 flex items-center gap-1 uppercase">
                        <Gamepad2 size={12} />
                        <span>{item.game}</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-none bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 font-bold uppercase">
                        {item.season}
                      </span>
                      {item.prizePool && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 uppercase">
                          🏆 {item.prizePool}
                        </span>
                      )}
                    </div>
                    <h2 className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-[#F8FAFC]">
                      {item.tournamentTitle}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#A78BFA] font-mono">
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
                        className="px-3 py-1.5 rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-[#130921] text-slate-700 dark:text-[#A78BFA] border border-slate-200 dark:border-[#2E1E45] hover:border-[#7C3AED] hover:text-slate-900 dark:hover:text-[#F8FAFC] inline-flex items-center gap-1.5"
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
                  <div className="lg:col-span-6 rounded-none border-2 border-[#F59E0B]/50 bg-amber-500/5 dark:bg-[#1A0E2E] p-5 relative overflow-hidden flex flex-col justify-between shadow-xl">
                    <div className="absolute top-0 right-0 p-3 opacity-15 pointer-events-none">
                      <Crown size={120} className="text-[#F59E0B]" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono font-bold text-[#F59E0B] uppercase tracking-widest flex items-center gap-1.5">
                          <Crown size={14} className="text-[#F59E0B]" />
                          <span>👑 JUARA 1 (GRAND CHAMPION)</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-none text-[9px] font-mono font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 uppercase">
                          GOLD MEDAL
                        </span>
                      </div>

                      <h3 className="font-display text-2xl sm:text-3xl font-black text-amber-500 dark:text-[#F59E0B] uppercase tracking-tight my-1">
                        {item.championTeam}
                      </h3>

                      {/* Roster Pemain Juara 1 */}
                      <div className="mt-4 pt-3 border-t border-[#F59E0B]/20 font-mono">
                        <p className="text-[10px] text-slate-600 dark:text-[#A78BFA] uppercase tracking-wider mb-2 flex items-center gap-1">
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
                              className="flex items-center justify-between p-1.5 px-2.5 rounded-none bg-slate-100 dark:bg-[#09040F] border border-amber-500/20 text-xs"
                            >
                              <span className="font-semibold text-slate-900 dark:text-[#F8FAFC] truncate max-w-[120px]">
                                {idx + 1}. {p.name}
                              </span>
                              <span className="text-[10px] text-[#F59E0B] bg-[#F59E0B]/10 px-1 rounded-none border border-[#F59E0B]/30">
                                {p.inGameId || "VERIFIED"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Tombol Unduh Sertifikat */}
                    <div className="mt-5 pt-3 border-t border-[#F59E0B]/20 flex items-center justify-between gap-2 font-mono">
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
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-none text-xs font-bold uppercase tracking-wider bg-[#F59E0B] text-black hover:bg-amber-400 transition"
                      >
                        <FileText size={15} />
                        <span>Lihat &amp; Unduh Kartu Juara 🖼️</span>
                      </button>
                    </div>
                  </div>

                  {/* PODIUM 2 & 3: RUNNER UP & 3RD PLACE - SPANS 6 COLUMNS */}
                  <div className="lg:col-span-6 flex flex-col justify-between gap-4 font-mono">
                    {/* RUNNER-UP (JUARA 2) */}
                    <div className="flex-1 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] p-4 relative overflow-hidden flex flex-col justify-between shadow-sm">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-bold text-slate-700 dark:text-[#A78BFA] uppercase tracking-widest flex items-center gap-1.5">
                            <Medal size={14} className="text-slate-400" />
                            <span>🥈 JUARA 2 (RUNNER-UP)</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-none text-[9px] font-bold bg-white dark:bg-[#130921] text-slate-700 dark:text-[#A78BFA] border border-slate-200 dark:border-[#2E1E45] uppercase">
                            SILVER MEDAL
                          </span>
                        </div>

                        <h4 className="font-display text-xl font-black text-slate-900 dark:text-[#F8FAFC] uppercase tracking-tight">
                          {item.runnerUpTeam || "TBD"}
                        </h4>

                        {item.runnerUpRoster && item.runnerUpRoster.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-[#2E1E45]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.runnerUpRoster.slice(0, 5).map((p, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-2 py-0.5 rounded-none bg-slate-100 dark:bg-[#09040F] text-slate-700 dark:text-[#A78BFA] border border-slate-200 dark:border-[#2E1E45]"
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
                    <div className="flex-1 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] p-4 relative overflow-hidden flex flex-col justify-between shadow-sm">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-widest flex items-center gap-1.5">
                            <Award size={14} className="text-[#F59E0B]" />
                            <span>🥉 JUARA 3 (BRONZE PLACE)</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-none text-[9px] font-bold bg-white dark:bg-[#130921] text-[#F59E0B] border border-slate-200 dark:border-[#2E1E45] uppercase">
                            BRONZE MEDAL
                          </span>
                        </div>

                        <h4 className="font-display text-xl font-black text-slate-900 dark:text-[#F8FAFC] uppercase tracking-tight">
                          {item.thirdPlaceTeam || "Perebutan Juara 3"}
                        </h4>

                        {item.thirdPlaceRoster && item.thirdPlaceRoster.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-[#2E1E45]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.thirdPlaceRoster.slice(0, 5).map((p, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-2 py-0.5 rounded-none bg-slate-100 dark:bg-[#09040F] text-slate-700 dark:text-[#A78BFA] border border-slate-200 dark:border-[#2E1E45]"
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
