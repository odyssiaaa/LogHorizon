"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Clock,
  Crown,
  Edit3,
  ExternalLink,
  Flame,
  Headphones,
  LogOut,
  Medal,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Swords,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { advanceMatchWinner, TournamentMatch, TournamentTeam } from "@/lib/tournament";

type Participant = { id: string; teamName: string; leader: { username: string | null } };

type Tournament = {
  id: string;
  title: string;
  game: string;
  prizePool?: string | null;
  format: string;
  maxSlots: number;
  eventDate: string;
  status: string;
  teams?: TournamentTeam[];
  matches?: TournamentMatch[];
  bracket?: any;
  participants: Participant[];
};

type LfgPost = {
  id: string;
  game: string;
  description: string;
  scheduledAt: string;
  expiresAt?: string;
  createdAt?: string;
  maxSlots: number;
  status: "OPEN" | "FULL" | "CLOSED";
  targetRank?: string;
  roleNeeded?: string;
  playGoal?: string;
  playTime?: string;
  isOwner: boolean;
  canManage?: boolean;
  joinedByViewer: boolean;
  author: {
    username: string | null;
    inGameName?: string | null;
    highestRank?: string | null;
    primaryRole?: string | null;
    isPremium?: boolean;
  };
  joins: { username: string | null }[];
};

function formatRemainingTime(expiresAtStr?: string) {
  if (!expiresAtStr) return "Aktif";
  const diffMs = new Date(expiresAtStr).getTime() - Date.now();
  if (diffMs <= 0) return "Kedaluwarsa";
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours > 0) {
    return `${hours}j ${minutes}m`;
  }
  return `${minutes}m`;
}

export function EventsBoard() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");

  const [activeTab, setActiveTab] = useState<"all" | "mabar" | "turnamen">("all");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [lfgPosts, setLfgPosts] = useState<LfgPost[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");

  // Sync tab with URL query parameter
  useEffect(() => {
    if (viewParam === "mabar") setActiveTab("mabar");
    else if (viewParam === "turnamen") setActiveTab("turnamen");
    else setActiveTab("all");
  }, [viewParam]);

  // LFG Form State
  const [lfgGame, setLfgGame] = useState("Mobile Legends");
  const [customGame, setCustomGame] = useState("");
  const [neededSlots, setNeededSlots] = useState("2");
  const [durationHours, setDurationHours] = useState("24");
  const [description, setDescription] = useState("");
  const [showLfgForm, setShowLfgForm] = useState(false);
  const [filterGame, setFilterGame] = useState("ALL");

  // Party Chat State
  const [activePartyChat, setActivePartyChat] = useState<string | null>(null);
  const [partyChatMessages, setPartyChatMessages] = useState<Record<string, { sender: string; text: string; time: string }[]>>({});
  const [chatInput, setChatInput] = useState("");

  // Template Tournament Builder State (Admin / Mod)
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateGame, setTemplateGame] = useState("Valorant");
  const [templatePrize, setTemplatePrize] = useState("Rp 500.000 + Discord Role");
  const [templateFormat, setTemplateFormat] = useState<"4 Tim" | "8 Tim">("8 Tim");
  const [templateDate, setTemplateDate] = useState("");
  const [templateStatus, setTemplateStatus] = useState<"REGISTRATION" | "ONGOING">("REGISTRATION");
  const [creatingTournament, setCreatingTournament] = useState(false);

  // Manage Tournament Modal State (Admin / Mod)
  const [managingTournament, setManagingTournament] = useState<Tournament | null>(null);
  const [manageTab, setManageTab] = useState<"scores" | "teams" | "settings">("scores");
  const [manageMatches, setManageMatches] = useState<TournamentMatch[]>([]);
  const [manageTeams, setManageTeams] = useState<TournamentTeam[]>([]);
  const [savingManage, setSavingManage] = useState(false);

  // Team Registration Modal State
  const [registeringTournament, setRegisteringTournament] = useState<Tournament | null>(null);
  const [registerTeamName, setRegisterTeamName] = useState("");
  const [registerRoster, setRegisterRoster] = useState("");
  const [submittingRegistration, setSubmittingRegistration] = useState(false);

  // View Team Roster Popup
  const [viewingRoster, setViewingRoster] = useState<TournamentTeam | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/tournaments").then((response) => readApiResponse<Tournament[]>(response, "Gagal memuat turnamen.")),
      fetch("/api/lfg").then((response) => readApiResponse<LfgPost[]>(response, "Gagal memuat jadwal party.")),
    ])
      .then(([events, parties]) => {
        if (!active) return;
        setTournaments(events);
        setLfgPosts(parties);
        setError("");
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Data event gagal dimuat.");
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  // Open Manage Modal
  function handleOpenManage(tournament: Tournament) {
    setManagingTournament(tournament);
    setManageMatches(tournament.matches || []);
    setManageTeams(tournament.teams || []);
    setManageTab("scores");
  }

  // Create Tournament from Template
  async function handleCreateTemplateTournament(e: FormEvent) {
    e.preventDefault();
    if (!templateTitle || !templateGame) {
      setError("Nama turnamen dan game wajib diisi.");
      return;
    }
    setCreatingTournament(true);
    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: templateTitle.trim(),
          game: templateGame.trim(),
          prizePool: templatePrize.trim(),
          format: templateFormat,
          eventDate: templateDate ? new Date(templateDate).toISOString() : new Date(Date.now() + 86400000 * 3).toISOString(),
          status: templateStatus,
        }),
      });
      await readApiResponse(response, "Gagal membuat template turnamen.");
      setNotice(`Turnamen "${templateTitle}" berhasil dibuat lengkap dengan bagan otomatis!`);
      setShowTemplateModal(false);
      setTemplateTitle("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat turnamen.");
    } finally {
      setCreatingTournament(false);
    }
  }

  // Auto Advance Winner & Update Score in Local Manage State
  function handleSelectWinner(matchId: string, winnerName: string, winnerId?: string, scoreA?: number, scoreB?: number) {
    setManageMatches((prev) => advanceMatchWinner(prev, matchId, winnerName, winnerId, scoreA, scoreB));
  }

  // Save Managed Tournament to Database
  async function handleSaveTournamentManage() {
    if (!managingTournament) return;
    setSavingManage(true);
    try {
      const response = await fetch(`/api/tournaments/${managingTournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matches: manageMatches,
          teams: manageTeams,
        }),
      });
      await readApiResponse(response, "Gagal memperbarui turnamen.");
      setNotice("Bagan turnamen dan skor berhasil disimpan!");
      setManagingTournament(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan bagan.");
    } finally {
      setSavingManage(false);
    }
  }

  // Delete Tournament
  async function handleDeleteTournament(id: string, title: string) {
    if (!confirm(`Hapus turnamen "${title}" secara permanen? Seluruh bagan dan data peserta akan terhapus.`)) return;
    try {
      const response = await fetch(`/api/tournaments/${id}`, { method: "DELETE" });
      await readApiResponse(response, "Gagal menghapus turnamen.");
      setNotice(`Turnamen "${title}" berhasil dihapus.`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus turnamen.");
    }
  }

  // Register Team to Tournament
  async function handleRegisterTeam(e: FormEvent) {
    e.preventDefault();
    if (!session?.user) {
      await signIn("discord");
      return;
    }
    if (!registeringTournament || !registerTeamName.trim()) return;

    setSubmittingRegistration(true);
    try {
      const playerList = registerRoster
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      const response = await fetch(`/api/tournaments/${registeringTournament.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: registerTeamName.trim(),
          players: playerList,
        }),
      });
      await readApiResponse(response, "Pendaftaran turnamen gagal.");
      setNotice(`Party "${registerTeamName}" berhasil didaftarkan ke turnamen!`);
      setRegisteringTournament(null);
      setRegisterTeamName("");
      setRegisterRoster("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pendaftaran gagal.");
    } finally {
      setSubmittingRegistration(false);
    }
  }

  // LFG Action Helpers
  async function createLfg(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.user) {
      await signIn("discord");
      return;
    }
    const gameToSave = lfgGame === "Game Lainnya" ? customGame.trim() || "Game Komunitas" : lfgGame;
    const finalSlots = Number(neededSlots) + 1;
    try {
      const response = await fetch("/api/lfg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: gameToSave,
          description: description.trim(),
          maxSlots: finalSlots,
          durationHours: Number(durationHours),
        }),
      });
      await readApiResponse(response, "Jadwal party gagal dibuat.");
      setNotice("Ajakan mabar berhasil dipublikasikan! Rekan guild dapat langsung bergabung.");
      setShowLfgForm(false);
      setDescription("");
      setRefreshKey((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Jadwal party gagal dibuat.");
    }
  }

  async function deleteParty(id: string, gameTitle: string) {
    if (!confirm(`Tutup dan bubarkan party "${gameTitle}" sekarang?`)) return;
    try {
      const response = await fetch(`/api/lfg/${id}`, { method: "DELETE" });
      await readApiResponse(response, "Gagal menutup party.");
      setNotice(`Party "${gameTitle}" berhasil ditutup.`);
      if (activePartyChat === id) setActivePartyChat(null);
      setRefreshKey((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menutup party.");
    }
  }

  async function toggleJoin(id: string, currentlyJoined: boolean) {
    if (!session?.user) {
      await signIn("discord");
      return;
    }
    try {
      const response = await fetch(`/api/lfg/${id}/join`, { method: currentlyJoined ? "DELETE" : "POST" });
      await readApiResponse(response, currentlyJoined ? "Gagal keluar dari party." : "Gagal bergabung ke party.");
      setNotice(currentlyJoined ? "Kamu telah keluar dari party." : "Berhasil bergabung ke party! Silakan koordinasi di voice channel.");
      setRefreshKey((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Operasi party gagal.");
    }
  }

  function handleSendPartyChat(partyId: string) {
    if (!chatInput.trim()) return;
    const newMsg = {
      sender: session?.user?.username ?? session?.user?.name ?? "Gamer",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };
    setPartyChatMessages((prev) => ({
      ...prev,
      [partyId]: [...(prev[partyId] || []), newMsg],
    }));
    setChatInput("");
  }

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleTournaments = tournaments.filter((tournament) =>
    [
      tournament.title || "",
      tournament.game,
      tournament.status,
      tournament.prizePool || "",
      ...(tournament.teams ? tournament.teams.map((t) => t.teamName) : []),
      ...tournament.participants.map((p) => p.teamName),
      ...tournament.participants.map((p) => p.leader.username ?? ""),
    ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch))
  );

  const visibleLfgPosts = lfgPosts.filter((post) => {
    const matchesSearch = [
      post.game,
      post.description,
      post.author.username ?? "",
      ...post.joins.map((join) => join.username ?? ""),
    ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));

    const matchesGame = filterGame === "ALL" || post.game.toLowerCase().includes(filterGame.toLowerCase());
    return matchesSearch && matchesGame;
  });

  const isAdminOrMod = session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR";

  return (
    <main className="page-shell events-page py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full max-w-full overflow-x-hidden">
      <header className="events-heading mb-6">
        <p className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-1">
          GUILD ARENA &amp; OPERATIONS
        </p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white break-words">
          Arena &amp; <span className="text-[#9D4EDD] dark:text-[#C77DFF]">Mabar Guild</span>
        </h1>
        <p className="muted-copy text-base md:text-lg text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
          Koordinasikan jadwal mabar cepat atau berkompetisi di turnamen resmi dengan bagan terstruktur.
        </p>
      </header>

      {error && <p className="inline-error mb-4" role="alert">{error}</p>}
      {notice && <p className="inline-notice mb-4" role="status">{notice}</p>}

      {/* TOP FILTER NAVIGATION: ALL / MABAR / TURNAMEN */}
      <div className="flex items-center gap-2 mb-6 border-b border-gray-200 dark:border-[#211C2B] pb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === "all"
              ? "bg-[#9D4EDD] text-white shadow-sm shadow-purple-950/20"
              : "bg-white dark:bg-[#120F17] text-gray-600 dark:text-gray-300 hover:text-white border border-gray-200 dark:border-[#211C2B]"
          }`}
        >
          Semua Kegiatan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("turnamen")}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "turnamen"
              ? "bg-[#9D4EDD] text-white shadow-sm shadow-purple-950/20"
              : "bg-white dark:bg-[#120F17] text-gray-600 dark:text-gray-300 hover:text-white border border-gray-200 dark:border-[#211C2B]"
          }`}
        >
          <Trophy size={15} />
          <span>Turnamen &amp; Bagan</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("mabar")}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "mabar"
              ? "bg-[#9D4EDD] text-white shadow-sm shadow-purple-950/20"
              : "bg-white dark:bg-[#120F17] text-gray-600 dark:text-gray-300 hover:text-white border border-gray-200 dark:border-[#211C2B]"
          }`}
        >
          <Swords size={15} />
          <span>Cari Teman Mabar (LFG)</span>
        </button>
      </div>

      {/* QUICK SEARCH BAR */}
      <div className="flex items-center gap-3 px-3.5 h-11 rounded-md border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] focus-within:border-[#9D4EDD] transition-colors mb-6" role="search">
        <Search size={16} className="shrink-0 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari turnamen, tim, game, atau ajakan mabar…"
          aria-label="Cari turnamen dan jadwal party"
          className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 p-0"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="shrink-0 text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. SEKSI TURNAMEN RESMI & BAGAN INTERAKTIF */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "turnamen") && (
        <section className="events-section mb-12">
          <div className="events-section-heading flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <p className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-1">
                COMPETITIVE ARENA
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Trophy size={20} className="text-[#9D4EDD]" />
                <span>Turnamen Resmi &amp; Bagan Pertandingan</span>
              </h2>
            </div>

            {isAdminOrMod && (
              <button
                type="button"
                onClick={() => setShowTemplateModal(true)}
                className="button button-primary text-xs font-bold inline-flex items-center gap-2 self-start sm:self-auto"
              >
                <Plus size={15} />
                <span>+ Buat Turnamen dari Template</span>
              </button>
            )}
          </div>

          {/* CONTACT PERSON PROPOSAL BANNER */}
          <div className="mb-6 rounded-lg border border-purple-500/20 bg-purple-950/20 p-4 text-xs leading-relaxed text-gray-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-bold text-sm text-purple-300 mb-1 flex items-center gap-1.5">
                  <Award size={15} /> Prizepool Terjamin &amp; Transparansi Bracket
                </p>
                <p className="text-gray-400">
                  Turnamen resmi LogHorizon divalidasi langsung oleh High Council / Emperor untuk memastikan prizepool dan penjadwalan berjalan fair play. Ingin menyelenggarakan turnamen divisi game komunitasmu?
                </p>
              </div>
              <a
                href="https://discord.com/users/706661230835925042"
                target="_blank"
                rel="noreferrer"
                className="button button-discord text-xs font-semibold whitespace-nowrap self-start sm:self-center flex items-center gap-1.5"
                title="Hubungi CP Owner (.odyssia)"
              >
                <span>Hubungi CP Owner (.odyssia)</span> <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* LIST TURNAMEN DENGAN BAGAN INTERAKTIF */}
          <div className="space-y-8">
            {visibleTournaments.length === 0 && (
              <p className="empty-state">
                {search ? "Tidak ada turnamen yang cocok dengan kata kunci pencarian." : "Belum ada turnamen resmi yang dijadwalkan."}
              </p>
            )}

            {visibleTournaments.map((tournament) => {
              const is4Team = tournament.format === "4 Tim";
              const matches = tournament.matches || [];
              const teams = tournament.teams || [];

              // Group matches by round for bracket view
              const round1Matches = matches.filter((m) => m.round === 1);
              const round2Matches = matches.filter((m) => m.round === 2);
              const round3Matches = matches.filter((m) => m.round === 3);

              return (
                <article
                  key={tournament.id}
                  className="p-5 sm:p-6 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] shadow-lg relative overflow-hidden"
                >
                  {/* Top Bar Turnamen */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200 dark:border-[#211C2B]">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-[#9D4EDD] text-white uppercase">
                          {tournament.game}
                        </span>
                        <span className="text-xs font-mono text-gray-500">
                          {tournament.format} ({tournament.maxSlots} Slot)
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          tournament.status === "ONGOING"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : tournament.status === "COMPLETED"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        }`}>
                          {tournament.status === "ONGOING"
                            ? "Sedang Berlangsung"
                            : tournament.status === "COMPLETED"
                              ? "Selesai"
                              : "Pendaftaran Dibuka"}
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
                        {tournament.title || `${tournament.game} Community Tournament`}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                        <span>📅 {new Date(tournament.eventDate).toLocaleString("id-ID")}</span>
                        <span>•</span>
                        <span className="text-[#9D4EDD] dark:text-[#C77DFF] font-semibold">
                          🎁 Hadiah: {tournament.prizePool || "Prizepool Resmi Guild"}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Register Button for Members */}
                      {(tournament.status === "OPEN" || tournament.status === "REGISTRATION") && (
                        <button
                          type="button"
                          onClick={() => setRegisteringTournament(tournament)}
                          className="button button-primary text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <Plus size={14} />
                          <span>Daftar Tim / Party</span>
                        </button>
                      )}

                      {/* Manage Tournament Button (Admin / Mod) */}
                      {isAdminOrMod && (
                        <button
                          type="button"
                          onClick={() => handleOpenManage(tournament)}
                          className="button button-quiet text-xs font-bold inline-flex items-center gap-1.5 border border-[#9D4EDD]/40"
                          title="Kelola Tim, Roster & Skor Bagan"
                        >
                          <Edit3 size={14} className="text-[#9D4EDD]" />
                          <span>Kelola Tim &amp; Skor</span>
                        </button>
                      )}

                      {/* Delete Tournament Button (Admin / Mod) */}
                      {isAdminOrMod && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTournament(tournament.id, tournament.title)}
                          className="p-2 rounded border border-red-500/30 text-red-400 hover:bg-red-950/20 transition-colors"
                          title="Hapus Turnamen"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* VISUAL INTERACTIVE BRACKET TREE */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Flame size={14} className="text-[#9D4EDD]" />
                        <span>Pohon Bagan Pertandingan (Bracket Tree)</span>
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Klik nama tim untuk melihat susunan pemain (roster)
                      </span>
                    </div>

                    {matches.length > 0 ? (
                      <div className="overflow-x-auto scrollbar-none pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                        <div className="flex items-stretch gap-6 sm:gap-8 min-w-[680px]">
                          {/* ROUND 1: QUARTERFINALS / SEMIFINALS */}
                          <div className="flex-1 flex flex-col justify-around space-y-4">
                            <p className="text-[11px] font-mono font-bold text-purple-400 uppercase tracking-wider text-center pb-1 border-b border-purple-500/20">
                              {is4Team ? "Babak Semifinal" : "Babak Quarterfinal"}
                            </p>
                            {round1Matches.map((m) => (
                              <MatchCard
                                key={m.matchId}
                                match={m}
                                teams={teams}
                                onTeamClick={(team) => setViewingRoster(team)}
                              />
                            ))}
                          </div>

                          {/* ROUND 2: SEMIFINALS (for 8 Teams) or GRAND FINAL (for 4 Teams) */}
                          <div className="flex-1 flex flex-col justify-around space-y-4">
                            <p className="text-[11px] font-mono font-bold text-purple-400 uppercase tracking-wider text-center pb-1 border-b border-purple-500/20">
                              {is4Team ? "Grand Final 🏆" : "Babak Semifinal"}
                            </p>
                            {round2Matches.map((m) => (
                              <MatchCard
                                key={m.matchId}
                                match={m}
                                teams={teams}
                                isFinal={is4Team}
                                onTeamClick={(team) => setViewingRoster(team)}
                              />
                            ))}
                          </div>

                          {/* ROUND 3: GRAND FINAL (for 8 Teams) */}
                          {!is4Team && round3Matches.length > 0 && (
                            <div className="flex-1 flex flex-col justify-around space-y-4">
                              <p className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider text-center pb-1 border-b border-amber-500/20">
                                Grand Final 🏆
                              </p>
                              {round3Matches.map((m) => (
                                <MatchCard
                                  key={m.matchId}
                                  match={m}
                                  teams={teams}
                                  isFinal={true}
                                  onTeamClick={(team) => setViewingRoster(team)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-6">
                        Bagan belum dibuat. Admin dapat mengatur bagan melalui tombol &quot;Kelola Tim &amp; Skor&quot;.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 2. SEKSI LOOKING FOR GROUP / FIND TEAMMATE */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "mabar") && (
        <section className="events-section mb-12">
          <div className="events-section-heading flex items-center justify-between flex-wrap gap-3 mb-6">
            <div>
              <p className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-1">
                PARTY FINDER &amp; LFG
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users size={20} className="text-[#9D4EDD]" />
                <span>Pencarian Teman Mabar (Party)</span>
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowLfgForm((prev) => !prev)}
              className="button button-primary text-xs font-bold inline-flex items-center gap-1.5"
            >
              {showLfgForm ? <X size={15} /> : <Plus size={15} />}
              <span>{showLfgForm ? "Tutup Form" : "+ Buat Ajakan Mabar"}</span>
            </button>
          </div>

          {/* GAME FILTER CHIPS */}
          <div className="mb-4 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex items-center gap-2 pb-1 text-xs whitespace-nowrap min-w-max">
              <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Filter Game:</span>
              {[
                { id: "ALL", label: "Semua Game" },
                { id: "Mobile Legends", label: "Mobile Legends" },
                { id: "Valorant", label: "Valorant" },
                { id: "Genshin Impact", label: "Genshin Impact" },
                { id: "CS2", label: "CS2" },
                { id: "Dota 2", label: "Dota 2" },
                { id: "Roblox", label: "Roblox" },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setFilterGame(g.id)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                    filterGame === g.id
                      ? "bg-[#9D4EDD] text-white font-bold shadow-sm"
                      : "bg-gray-100 dark:bg-[#1E1926] text-gray-700 dark:text-gray-300 hover:text-white"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* COLLAPSIBLE 4-INPUT LFG FORM */}
          {showLfgForm && (
            <form className="mb-6 p-4 sm:p-5 rounded-xl border border-purple-500/30 bg-purple-950/10 space-y-4 shadow-lg animate-in fade-in duration-200" onSubmit={createLfg}>
              <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
                <span className="text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider">
                  AJAKAN MABAR CEPAT
                </span>
                <button
                  type="button"
                  onClick={() => setShowLfgForm(false)}
                  className="text-gray-400 hover:text-white"
                  aria-label="Tutup Form"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">1. Pilih Game</label>
                  <select
                    value={lfgGame}
                    onChange={(e) => setLfgGame(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] text-xs text-gray-900 dark:text-white outline-none focus:border-[#9D4EDD]"
                  >
                    <option value="Mobile Legends">Mobile Legends</option>
                    <option value="Valorant">Valorant</option>
                    <option value="Genshin Impact">Genshin Impact</option>
                    <option value="CS2">Counter-Strike 2</option>
                    <option value="Dota 2">Dota 2</option>
                    <option value="Roblox">Roblox</option>
                    <option value="Game Lainnya">Game Lainnya…</option>
                  </select>
                  {lfgGame === "Game Lainnya" && (
                    <input
                      type="text"
                      placeholder="Ketik nama game..."
                      value={customGame}
                      onChange={(e) => setCustomGame(e.target.value)}
                      className="mt-2 w-full px-3 py-1.5 rounded-md bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] text-xs text-gray-900 dark:text-white outline-none focus:border-[#9D4EDD]"
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">2. Butuh Berapa Slot?</label>
                  <select
                    value={neededSlots}
                    onChange={(e) => setNeededSlots(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] text-xs text-gray-900 dark:text-white outline-none focus:border-[#9D4EDD]"
                  >
                    <option value="1">Butuh 1 Orang</option>
                    <option value="2">Butuh 2 Orang</option>
                    <option value="3">Butuh 3 Orang</option>
                    <option value="4">Butuh 4 Orang (Full Team)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">3. Masa Aktif Ajakan</label>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] text-xs text-gray-900 dark:text-white outline-none focus:border-[#9D4EDD]"
                  >
                    <option value="1">Mabar Sekarang (1 Jam)</option>
                    <option value="3">Sesi Santai (3 Jam)</option>
                    <option value="12">Jadwal Nanti Malam (12 Jam)</option>
                    <option value="24">Aktif Seharian (24 Jam)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">4. Catatan / Target Mabar</label>
                  <input
                    required
                    type="text"
                    maxLength={140}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Contoh: Push Rank Mythic Immortal, butuh Roamer/Mage asik no toxic."
                    className="w-full px-3 py-2 rounded-md bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] text-xs text-gray-900 dark:text-white outline-none focus:border-[#9D4EDD]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" className="button button-primary text-xs font-bold">
                  <span>Publikasikan Ajakan Mabar</span>
                </button>
              </div>
            </form>
          )}

          {/* LIST POSTINGAN MABAR */}
          <div className="lfg-grid grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleLfgPosts.length === 0 && (
              <p className="empty-state md:col-span-2">
                {search ? "Tidak ada party yang cocok dengan pencarian." : "Belum ada ajakan mabar aktif. Jadilah yang pertama membuat party!"}
              </p>
            )}

            {visibleLfgPosts.map((post) => {
              const currentFilled = 1 + post.joins.length;
              const isFull = currentFilled >= post.maxSlots;

              return (
                <article
                  className={`p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] flex flex-col justify-between shadow-md transition-all ${
                    isFull ? "opacity-75" : "hover:border-[#9D4EDD]/40"
                  }`}
                  key={post.id}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-[#9D4EDD] text-white uppercase">
                          {post.game}
                        </span>
                        <span className="text-[11px] font-mono text-gray-400">
                          {post.joins.length + 1}/{post.maxSlots} Orang
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
                        <Clock size={12} /> {formatRemainingTime(post.expiresAt)}
                      </span>
                    </div>

                    <p className="font-bold text-sm text-gray-900 dark:text-white mb-2 leading-snug">
                      {post.description}
                    </p>

                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-4">
                      <p>
                        Host: <strong className="text-gray-800 dark:text-gray-200">{post.author.username ?? "Gamer"}</strong>
                        {post.author.inGameName && ` (IGN: ${post.author.inGameName})`}
                      </p>
                      {post.joins.length > 0 && (
                        <p className="text-[11px]">
                          Bergabung: {post.joins.map((j) => j.username ?? "Gamer").join(", ")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-[#211C2B] flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <a
                        href="https://discord.gg/aJvbVyTxNb"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[#5865F2] hover:underline inline-flex items-center gap-1"
                      >
                        <Headphones size={13} /> <span>Voice Discord</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setActivePartyChat(activePartyChat === post.id ? null : post.id)}
                        className="text-xs font-semibold text-gray-400 hover:text-white inline-flex items-center gap-1 ml-2"
                      >
                        <MessageSquare size={13} />
                        <span>Chat ({partyChatMessages[post.id]?.length ?? 0})</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {(post.isOwner || isAdminOrMod) && (
                        <button
                          type="button"
                          onClick={() => deleteParty(post.id, post.game)}
                          className="p-1.5 rounded text-red-400 hover:bg-red-950/20"
                          title="Tutup Party"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {!post.isOwner && (
                        <button
                          type="button"
                          disabled={!post.joinedByViewer && isFull}
                          onClick={() => toggleJoin(post.id, post.joinedByViewer)}
                          className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                            post.joinedByViewer
                              ? "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                              : isFull
                                ? "bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed"
                                : "bg-[#9D4EDD] text-white hover:bg-[#8338ec]"
                          }`}
                        >
                          {post.joinedByViewer ? "Keluar Party" : isFull ? "Penuh" : "Gabung Party"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* MINI PARTY CHAT */}
                  {activePartyChat === post.id && (
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-[#211C2B] space-y-2">
                      <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs pr-1">
                        {(partyChatMessages[post.id] || []).map((msg, i) => (
                          <div key={i} className="p-1.5 rounded bg-gray-50 dark:bg-[#1a1526]">
                            <span className="font-bold text-[#9D4EDD]">{msg.sender}</span>: {msg.text}
                          </div>
                        ))}
                        {!(partyChatMessages[post.id] || []).length && (
                          <p className="text-[11px] text-gray-500 text-center py-2">Belum ada obrolan party.</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSendPartyChat(post.id)}
                          placeholder="Pesan koordinasi party…"
                          className="flex-1 px-2.5 py-1.5 rounded bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleSendPartyChat(post.id)}
                          className="px-3 py-1.5 rounded bg-[#9D4EDD] text-white text-xs font-bold"
                        >
                          Kirim
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SETUP TEMPLATE TURNAMEN (Khusus Admin / Moderator) */}
      {/* ========================================================================= */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowTemplateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="mb-5">
              <span className="text-[10px] font-mono font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider">
                TOURNAMENT BRACKET GENERATOR
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                Buat Turnamen dari Template
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Sistem akan secara otomatis menyusun kerangka bagan pertandingan dan slot tim kosong siap pakai.
              </p>
            </div>

            <form onSubmit={handleCreateTemplateTournament} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Nama Turnamen *
                </label>
                <input
                  required
                  type="text"
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  placeholder="Contoh: LogHorizon Valorant Champions S1"
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#211C2B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Pilih Game *
                  </label>
                  <input
                    required
                    type="text"
                    value={templateGame}
                    onChange={(e) => setTemplateGame(e.target.value)}
                    placeholder="Valorant / Mobile Legends / CS2"
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#211C2B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Format / Ukuran Bagan *
                  </label>
                  <select
                    value={templateFormat}
                    onChange={(e) => setTemplateFormat(e.target.value as "4 Tim" | "8 Tim")}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#211C2B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                  >
                    <option value="8 Tim">8 Tim (Quarterfinal ➔ Semifinal ➔ Final)</option>
                    <option value="4 Tim">4 Tim (Semifinal ➔ Final)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Hadiah / Prizepool
                  </label>
                  <input
                    type="text"
                    value={templatePrize}
                    onChange={(e) => setTemplatePrize(e.target.value)}
                    placeholder="Contoh: Rp 1.000.000 + Discord Role"
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#211C2B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Tanggal &amp; Waktu Pelaksanaan
                  </label>
                  <input
                    type="datetime-local"
                    value={templateDate}
                    onChange={(e) => setTemplateDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#211C2B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Status Turnamen
                </label>
                <select
                  value={templateStatus}
                  onChange={(e) => setTemplateStatus(e.target.value as "REGISTRATION" | "ONGOING")}
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#211C2B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                >
                  <option value="REGISTRATION">Pendaftaran Dibuka (REGISTRATION)</option>
                  <option value="ONGOING">Langsung Dimulai (ONGOING)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="button button-quiet text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingTournament}
                  className="button button-primary text-xs font-bold"
                >
                  {creatingTournament ? "Menyusun Bagan…" : "Generate & Publikasikan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: KELOLA TIM, PEMAIN & UPDATE SKOR (Admin / Moderator) */}
      {/* ========================================================================= */}
      {managingTournament && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] rounded-2xl w-full max-w-3xl p-6 shadow-2xl relative my-8">
            <button
              type="button"
              onClick={() => setManagingTournament(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-mono font-bold text-[#9D4EDD] uppercase tracking-wider">
                PANEL MANAJEMEN BAGAN TURNAMEN
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                Kelola: {managingTournament.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Atur skor pertandingan, tetapkan pemenang (auto-advance ke babak berikutnya), dan kelola susunan pemain tim.
              </p>
            </div>

            {/* TAB SELECTOR DALAM MODAL */}
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-[#211C2B] pb-2 mb-4">
              <button
                type="button"
                onClick={() => setManageTab("scores")}
                className={`px-3 py-1.5 rounded text-xs font-bold ${
                  manageTab === "scores"
                    ? "bg-[#9D4EDD] text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                1. Atur Skor &amp; Pemenang Match
              </button>
              <button
                type="button"
                onClick={() => setManageTab("teams")}
                className={`px-3 py-1.5 rounded text-xs font-bold ${
                  manageTab === "teams"
                    ? "bg-[#9D4EDD] text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                2. Daftar Tim &amp; Roster Pemain
              </button>
            </div>

            {/* SUB-PANEL 1: SKOR & PEMENANG (AUTO ADVANCE) */}
            {manageTab === "scores" && (
              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                {manageMatches.map((m) => (
                  <div
                    key={m.matchId}
                    className="p-3.5 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-gray-50 dark:bg-[#181324] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">
                        {m.roundName} (Match #{m.matchId})
                      </span>
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-900 dark:text-white mt-1">
                        <span className={m.winner === m.teamA.name ? "text-emerald-400 font-black" : ""}>
                          {m.teamA.name || "TBD"}
                        </span>
                        <span className="text-xs text-gray-400">VS</span>
                        <span className={m.winner === m.teamB.name ? "text-emerald-400 font-black" : ""}>
                          {m.teamB.name || "TBD"}
                        </span>
                      </div>
                      {m.winner && (
                        <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                          ✔ Pemenang: {m.winner}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded">
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={m.teamA.score}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setManageMatches((prev) =>
                              prev.map((match) =>
                                match.matchId === m.matchId
                                  ? { ...match, teamA: { ...match.teamA, score: val } }
                                  : match
                              )
                            );
                          }}
                          className="w-10 text-center py-1 rounded bg-white dark:bg-[#120F17] text-xs font-bold border border-gray-300 dark:border-gray-700"
                        />
                        <span className="text-xs text-gray-400">-</span>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={m.teamB.score}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setManageMatches((prev) =>
                              prev.map((match) =>
                                match.matchId === m.matchId
                                  ? { ...match, teamB: { ...match.teamB, score: val } }
                                  : match
                              )
                            );
                          }}
                          className="w-10 text-center py-1 rounded bg-white dark:bg-[#120F17] text-xs font-bold border border-gray-300 dark:border-gray-700"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectWinner(m.matchId, m.teamA.name, m.teamA.id, m.teamA.score, m.teamB.score)}
                        className="px-2.5 py-1.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 transition"
                      >
                        Menangkan Tim A ➔
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectWinner(m.matchId, m.teamB.name, m.teamB.id, m.teamA.score, m.teamB.score)}
                        className="px-2.5 py-1.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 transition"
                      >
                        Menangkan Tim B ➔
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SUB-PANEL 2: KELOLA NAMA TIM & ROSTER */}
            {manageTab === "teams" && (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {manageTeams.map((team, idx) => (
                  <div
                    key={team.id || idx}
                    className="p-3.5 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-gray-50 dark:bg-[#181324] space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                          Nama Tim #{idx + 1}
                        </label>
                        <input
                          type="text"
                          value={team.teamName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManageTeams((prev) =>
                              prev.map((t, i) => (i === idx ? { ...t, teamName: val } : t))
                            );
                          }}
                          className="w-full px-3 py-1.5 rounded bg-white dark:bg-[#120F17] border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                          Kapten Tim
                        </label>
                        <input
                          type="text"
                          value={team.captainName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManageTeams((prev) =>
                              prev.map((t, i) => (i === idx ? { ...t, captainName: val } : t))
                            );
                          }}
                          className="w-full px-3 py-1.5 rounded bg-white dark:bg-[#120F17] border border-gray-300 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                        Daftar Pemain / Roster (Pisahkan dengan tanda koma)
                      </label>
                      <input
                        type="text"
                        value={team.players.join(", ")}
                        onChange={(e) => {
                          const val = e.target.value.split(",").map((p) => p.trim());
                          setManageTeams((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, players: val } : t))
                          );
                        }}
                        placeholder="Contoh: TenZ, aspas, Boaster, Derke, Chronicle"
                        className="w-full px-3 py-1.5 rounded bg-white dark:bg-[#120F17] border border-gray-300 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center gap-2 pt-4 border-t border-gray-200 dark:border-[#211C2B] mt-4">
              <span className="text-[11px] text-gray-400">
                Pemenang pertandingan otomatis mengisi slot babak selanjutnya.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setManagingTournament(null)}
                  className="button button-quiet text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={savingManage}
                  onClick={handleSaveTournamentManage}
                  className="button button-primary text-xs font-bold"
                >
                  {savingManage ? "Menyimpan…" : "Simpan Perubahan Bagan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PENDAFTARAN TIM MEMBER KE TURNAMEN */}
      {/* ========================================================================= */}
      {registeringTournament && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setRegisteringTournament(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-mono font-bold text-[#9D4EDD] uppercase tracking-wider">
                PENDAFTARAN TURNAMEN GUILD
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                Daftar ke: {registeringTournament.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Masukkan nama tim dan daftar pemain. Tim kamu akan mengisi slot bagan yang tersedia.
              </p>
            </div>

            <form onSubmit={handleRegisterTeam} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Nama Party / Tim *
                </label>
                <input
                  required
                  type="text"
                  maxLength={64}
                  value={registerTeamName}
                  onChange={(e) => setRegisterTeamName(e.target.value)}
                  placeholder="Contoh: LogHorizon Vanguard"
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#211C2B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Daftar Pemain / Roster (Pisahkan dengan tanda koma)
                </label>
                <textarea
                  rows={3}
                  value={registerRoster}
                  onChange={(e) => setRegisterRoster(e.target.value)}
                  placeholder="Pemain 1 (Kapten), Pemain 2, Pemain 3, Pemain 4, Pemain 5"
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#211C2B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRegisteringTournament(null)}
                  className="button button-quiet text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingRegistration}
                  className="button button-primary text-xs font-bold"
                >
                  {submittingRegistration ? "Mendaftarkan…" : "Kirim Pendaftaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP: LIHAT SUSUNAN PEMAIN (ROSTER) TIM */}
      {/* ========================================================================= */}
      {viewingRoster && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] rounded-2xl w-full max-w-sm p-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setViewingRoster(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Shield size={18} className="text-[#9D4EDD]" />
              <div>
                <h4 className="text-base font-extrabold text-gray-900 dark:text-white">
                  {viewingRoster.teamName}
                </h4>
                <p className="text-[11px] font-mono text-[#9D4EDD]">
                  Kapten: {viewingRoster.captainName || "Leader Party"}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 my-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Susunan Pemain (Roster):
              </p>
              {viewingRoster.players && viewingRoster.players.length > 0 ? (
                viewingRoster.players.map((player, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-1.5 rounded bg-gray-50 dark:bg-[#181324] text-xs font-medium text-gray-800 dark:text-gray-200"
                  >
                    <span>{player}</span>
                    <span className="text-[10px] font-mono text-gray-400">Slot #{idx + 1}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">Roster pemain belum diisi oleh kapten tim.</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setViewingRoster(null)}
              className="button button-quiet w-full text-xs font-bold mt-2"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// =========================================================================
// SUB-KOMPONEN: KARTU PERTANDINGAN BAGAN VISUAL (CYBER MINIMALIST)
// =========================================================================
function MatchCard({
  match,
  teams,
  isFinal = false,
  onTeamClick,
}: {
  match: TournamentMatch;
  teams: TournamentTeam[];
  isFinal?: boolean;
  onTeamClick: (team: TournamentTeam) => void;
}) {
  const teamAData = teams.find((t) => t.teamName.toLowerCase() === match.teamA.name.toLowerCase() || t.id === match.teamA.id);
  const teamBData = teams.find((t) => t.teamName.toLowerCase() === match.teamB.name.toLowerCase() || t.id === match.teamB.id);

  const isWinnerA = match.winner && match.winner.toLowerCase() === match.teamA.name.toLowerCase();
  const isWinnerB = match.winner && match.winner.toLowerCase() === match.teamB.name.toLowerCase();

  return (
    <div
      className={`rounded-xl border transition-all ${
        isFinal
          ? "border-amber-500/40 bg-amber-950/10 shadow-amber-950/20 shadow-lg"
          : "border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#0E0B14] hover:border-[#9D4EDD]/50"
      } p-3`}
    >
      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-gray-100 dark:border-[#211C2B]/80 text-[10px] font-mono text-gray-400">
        <span className="font-bold flex items-center gap-1">
          {isFinal && <Crown size={12} className="text-amber-400" />}
          <span>{match.roundName}</span>
        </span>
        {match.schedule && <span>{match.schedule}</span>}
      </div>

      <div className="space-y-1.5">
        {/* TEAM A */}
        <div
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
            isWinnerA
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-black"
              : "bg-gray-50 dark:bg-[#161220] text-gray-800 dark:text-gray-200"
          }`}
        >
          <button
            type="button"
            onClick={() => teamAData && onTeamClick(teamAData)}
            className="text-xs truncate max-w-[150px] text-left hover:underline"
            title={teamAData ? "Klik untuk melihat susunan pemain" : undefined}
          >
            {match.teamA.name || "TBD"}
          </button>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-black/20 font-bold ml-2">
            {match.teamA.score}
          </span>
        </div>

        {/* TEAM B */}
        <div
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
            isWinnerB
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-black"
              : "bg-gray-50 dark:bg-[#161220] text-gray-800 dark:text-gray-200"
          }`}
        >
          <button
            type="button"
            onClick={() => teamBData && onTeamClick(teamBData)}
            className="text-xs truncate max-w-[150px] text-left hover:underline"
            title={teamBData ? "Klik untuk melihat susunan pemain" : undefined}
          >
            {match.teamB.name || "TBD"}
          </button>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-black/20 font-bold ml-2">
            {match.teamB.score}
          </span>
        </div>
      </div>
    </div>
  );
}
