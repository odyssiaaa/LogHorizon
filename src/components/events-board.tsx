"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  Award,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Edit3,
  ExternalLink,
  Flame,
  Headphones,
  LogOut,
  Medal,
  MessageSquare,
  Phone,
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
import { advanceMatchWinner, TournamentMatch, TournamentTeam, TournamentRosterPlayer } from "@/lib/tournament";
import { DragScrollContainer } from "@/components/drag-scroll-container";
import { ShareButton } from "@/components/share-button";

type Participant = {
  id: string;
  teamName: string;
  phone?: string | null;
  roster?: TournamentRosterPlayer[];
  leader: {
    id?: string;
    username: string | null;
    discordId?: string | null;
    name?: string | null;
  };
};

type Tournament = {
  id: string;
  title: string;
  game: string;
  prizePool?: string | null;
  format: string;
  maxSlots: number;
  mainPlayersCount?: number;
  subPlayersCount?: number;
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
  const [templateTeamCount, setTemplateTeamCount] = useState<number>(8);
  const [templateMainPlayers, setTemplateMainPlayers] = useState<number>(5);
  const [templateSubPlayers, setTemplateSubPlayers] = useState<number>(2);
  const [templateDate, setTemplateDate] = useState("");
  const [templateStatus, setTemplateStatus] = useState<"REGISTRATION" | "ONGOING">("REGISTRATION");
  const [creatingTournament, setCreatingTournament] = useState(false);

  // Manage Tournament Modal State (Admin / Mod)
  const [managingTournament, setManagingTournament] = useState<Tournament | null>(null);
  const [manageTab, setManageTab] = useState<"scores" | "teams" | "settings">("scores");
  const [manageMatches, setManageMatches] = useState<TournamentMatch[]>([]);
  const [manageTeams, setManageTeams] = useState<TournamentTeam[]>([]);
  const [manageSlotCount, setManageSlotCount] = useState<number>(8);
  const [manageMainPlayers, setManageMainPlayers] = useState<number>(5);
  const [manageSubPlayers, setManageSubPlayers] = useState<number>(2);
  const [isResizingBracket, setIsResizingBracket] = useState(false);
  const [savingManage, setSavingManage] = useState(false);

  // Team Registration Modal State (Structured Form)
  const [registeringTournament, setRegisteringTournament] = useState<Tournament | null>(null);
  const [registerTeamName, setRegisterTeamName] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerMainPlayers, setRegisterMainPlayers] = useState<{ name: string; inGameId: string }[]>([]);
  const [registerSubPlayers, setRegisterSubPlayers] = useState<{ name: string; inGameId: string }[]>([]);
  const [submittingRegistration, setSubmittingRegistration] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

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
    setManageSlotCount(tournament.maxSlots || tournament.teams?.length || 8);
    setManageMainPlayers(tournament.mainPlayersCount ?? 5);
    setManageSubPlayers(tournament.subPlayersCount ?? 2);
    setManageTab("scores");
  }

  // Open Structured Registration Modal
  function openRegisterModal(t: Tournament) {
    if (!session?.user) {
      void signIn("discord");
      return;
    }
    setRegisteringTournament(t);
    setRegisterTeamName("");
    setRegisterPhone("");
    const mainCount = t.mainPlayersCount ?? 5;
    const subCount = t.subPlayersCount ?? 2;

    const mains: { name: string; inGameId: string }[] = [];
    for (let i = 0; i < mainCount; i++) {
      mains.push({
        name: i === 0 ? (session.user.username ?? session.user.name ?? "") : "",
        inGameId: "",
      });
    }
    setRegisterMainPlayers(mains);

    const subs: { name: string; inGameId: string }[] = [];
    for (let i = 0; i < subCount; i++) {
      subs.push({ name: "", inGameId: "" });
    }
    setRegisterSubPlayers(subs);
  }

  function handleCopyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setNotice(`${label} berhasil disalin ke clipboard!`);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2500);
  }

  // Resize slot count & regenerate bracket structure while preserving teams
  async function handleResizeAndRegenerate(newCount: number) {
    if (!managingTournament) return;
    const clamped = Math.min(128, Math.max(2, newCount));

    if (managingTournament.status === "ONGOING") {
      const confirmReset = window.confirm(
        "Peringatan: Turnamen ini sedang berstatus ONGOING (Sedang Berlangsung). Mengubah jumlah slot dan me-regenerate bagan akan mereset skor dan progres babak saat ini. Yakin ingin melanjutkan?"
      );
      if (!confirmReset) return;
    }

    setIsResizingBracket(true);
    try {
      const response = await fetch(`/api/tournaments/${managingTournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamCount: clamped,
          maxSlots: clamped,
          regenerateBracket: true,
          teams: manageTeams,
        }),
      });
      const data = await readApiResponse<{
        tournament: { teams: TournamentTeam[]; matches: TournamentMatch[]; maxSlots: number; format: string };
      }>(response, "Gagal mengubah ukuran bagan.");

      setManageMatches(data.tournament.matches);
      setManageTeams(data.tournament.teams);
      setManageSlotCount(clamped);
      setManagingTournament((prev) =>
        prev
          ? {
              ...prev,
              maxSlots: clamped,
              format: data.tournament.format,
              matches: data.tournament.matches,
              teams: data.tournament.teams,
            }
          : prev
      );
      setNotice(`Bagan turnamen berhasil disesuaikan ulang menjadi ${clamped} Tim!`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyesuaikan bagan.");
    } finally {
      setIsResizingBracket(false);
    }
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
          teamCount: templateTeamCount,
          mainPlayersCount: templateMainPlayers,
          subPlayersCount: templateSubPlayers,
          format: `${templateTeamCount} Tim`,
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
          mainPlayersCount: manageMainPlayers,
          subPlayersCount: manageSubPlayers,
        }),
      });
      await readApiResponse(response, "Gagal memperbarui turnamen.");
      setNotice("Bagan turnamen, tim, dan pengaturan slot pemain berhasil disimpan!");
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

  // Register Team to Tournament (Structured Form with Main/Sub slots & Representative Contact)
  async function handleRegisterTeam(e: FormEvent) {
    e.preventDefault();
    if (!session?.user) {
      await signIn("discord");
      return;
    }
    if (!registeringTournament || !registerTeamName.trim()) {
      setError("Nama party/tim wajib diisi.");
      return;
    }

    const cleanPhone = registerPhone.replace(/[^\d+]/g, "");
    if (!cleanPhone || cleanPhone.replace(/\D/g, "").length < 8) {
      setError("Nomor WhatsApp/telepon perwakilan wajib diisi (minimal 8 angka).");
      return;
    }

    for (let i = 0; i < registerMainPlayers.length; i++) {
      const p = registerMainPlayers[i];
      if (!p.name.trim() || !p.inGameId.trim()) {
        setError(`Pemain Inti #${i + 1} wajib diisi lengkap (Nickname dan ID/Tag In-Game).`);
        return;
      }
    }

    setSubmittingRegistration(true);
    try {
      const response = await fetch(`/api/tournaments/${registeringTournament.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: registerTeamName.trim(),
          phone: cleanPhone,
          mainPlayers: registerMainPlayers.map((p) => ({
            name: p.name.trim(),
            inGameId: p.inGameId.trim(),
          })),
          subPlayers: registerSubPlayers
            .filter((p) => p.name.trim() && p.inGameId.trim())
            .map((p) => ({
              name: p.name.trim(),
              inGameId: p.inGameId.trim(),
            })),
        }),
      });
      await readApiResponse(response, "Pendaftaran turnamen gagal.");
      setNotice(`Party "${registerTeamName}" berhasil didaftarkan ke turnamen!`);
      setRegisteringTournament(null);
      setRegisterTeamName("");
      setRegisterPhone("");
      setRegisterMainPlayers([]);
      setRegisterSubPlayers([]);
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
    <main className="events-page py-6 sm:py-10 px-4 sm:px-6 lg:px-10 max-w-[1360px] 2xl:max-w-[1440px] mx-auto w-full overflow-x-hidden">
      <header className="events-heading mb-6 text-left">
        <p className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-1">
          GUILD ARENA &amp; OPERATIONS
        </p>
        <h1 className="page-title text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white break-words">
          Arena &amp; <span className="text-[#9D4EDD] dark:text-[#C77DFF]">Mabar Guild</span>
        </h1>
        <p className="muted-copy text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
          Koordinasikan jadwal mabar cepat atau berkompetisi di turnamen resmi dengan bagan terstruktur.
        </p>
      </header>

      {error && <p className="inline-error mb-4" role="alert">{error}</p>}
      {notice && <p className="inline-notice mb-4" role="status">{notice}</p>}

      {/* TOP FILTER NAVIGATION: ALL / MABAR / TURNAMEN */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-[#120F17] border border-gray-200 dark:border-white/5 overflow-x-auto scrollbar-none mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
            activeTab === "all"
              ? "bg-[#9D4EDD] text-white shadow-sm shadow-[#9D4EDD]/25"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Semua Kegiatan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("turnamen")}
          className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 shrink-0 ${
            activeTab === "turnamen"
              ? "bg-[#9D4EDD] text-white shadow-sm shadow-[#9D4EDD]/25"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Trophy size={14} />
          <span>Turnamen &amp; Bagan</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("mabar")}
          className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 shrink-0 ${
            activeTab === "mabar"
              ? "bg-[#9D4EDD] text-white shadow-sm shadow-[#9D4EDD]/25"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Swords size={14} />
          <span>Cari Teman Mabar (LFG)</span>
        </button>
      </div>

      {/* QUICK SEARCH BAR */}
      <div className="flex items-center gap-3 px-3.5 h-11 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#120F17] focus-within:border-[#9D4EDD] transition-colors mb-6" role="search">
        <Search size={16} className="shrink-0 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari turnamen, tim, game, atau ajakan mabar…"
          aria-label="Cari turnamen dan jadwal party"
          className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 p-0"
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
            <div className="text-left">
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
          <div className="mb-6 rounded-xl border border-purple-500/15 bg-purple-950/15 p-4 text-xs leading-relaxed text-gray-300 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-bold text-xs sm:text-sm text-purple-300 mb-0.5 flex items-center gap-1.5">
                  <Award size={15} /> Prizepool Terjamin &amp; Transparansi Bracket
                </p>
                <p className="text-gray-400 text-[11px] sm:text-xs">
                  Turnamen resmi LogHorizon divalidasi langsung oleh High Council / Emperor untuk memastikan prizepool dan penjadwalan berjalan fair play. Ingin menyelenggarakan turnamen divisi game komunitasmu?
                </p>
              </div>
              <a
                href="https://discord.com/users/706661230835925042"
                target="_blank"
                rel="noreferrer"
                className="button button-discord text-xs font-semibold whitespace-nowrap self-start sm:self-center flex items-center gap-1.5 py-2 px-3"
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

              // Group matches dynamically by round
              const roundsMap = new Map<number, TournamentMatch[]>();
              for (const m of matches) {
                const list = roundsMap.get(m.round) || [];
                list.push(m);
                roundsMap.set(m.round, list);
              }
              const sortedRoundNumbers = Array.from(roundsMap.keys()).sort((a, b) => a - b);

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
                        <span className="text-[10.5px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          👥 {tournament.mainPlayersCount ?? 5} Inti {tournament.subPlayersCount ? `+ ${tournament.subPlayersCount} Cad` : ""}
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
                          onClick={() => openRegisterModal(tournament)}
                          className="button button-primary text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <Plus size={14} />
                          <span>Daftar Tim / Party</span>
                        </button>
                      )}

                      {/* Share Tournament Button */}
                      <ShareButton
                        url={`/events/turnamen/${tournament.id}`}
                        title={`🏆 ${tournament.title} - Turnamen LogHorizon`}
                        text={`Ikuti turnamen ${tournament.game}! Hadiah: ${tournament.prizePool || "Prizepool Resmi"}. Cek bagan dan daftar sekarang:`}
                        label="Bagikan Turnamen 🔗"
                        variant="secondary"
                      />

                      {/* Copy Registration Link Button */}
                      <ShareButton
                        url={`/events/turnamen/${tournament.id}#daftar`}
                        title={`Daftar Turnamen ${tournament.title}`}
                        text={`Link Pendaftaran Turnamen ${tournament.title} (${tournament.game}):`}
                        label="Salin Link Pendaftaran"
                        variant="outline"
                      />

                      {/* Dedicated Tournament Page Link */}
                      <Link
                        href={`/events/turnamen/${tournament.id}`}
                        className="button button-quiet text-xs font-semibold inline-flex items-center gap-1"
                        title="Buka halaman lengkap turnamen"
                      >
                        <ExternalLink size={13} />
                        <span>Halaman Khusus</span>
                      </Link>

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
                      <DragScrollContainer
                        buttonPosition="top"
                        label="🖱️ Drag mouse / tombol ◀ ▶: Sayap Kiri ➔ GRAND FINAL 🏆 ⬅ Sayap Kanan"
                        className="pt-1 pb-3"
                      >
                        <DualWingBracketView
                          sortedRoundNumbers={sortedRoundNumbers}
                          roundsMap={roundsMap}
                          teams={teams}
                          onTeamClick={(team) => setViewingRoster(team)}
                        />
                      </DragScrollContainer>
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
          <div className="lfg-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleLfgPosts.length === 0 && (
              <p className="empty-state sm:col-span-2 lg:col-span-3 xl:col-span-4">
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
                        {(post.author.username?.toLowerCase() === ".odyssia" || post.author.username?.toLowerCase() === "odyssia") && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 ml-1">👑 Emperor</span>
                        )}
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
                      <ShareButton
                        url={`/events?view=mabar&post=${post.id}`}
                        title={`🎮 Mabar ${post.game} - LogHorizon`}
                        text={`Yuk mabar ${post.game}! Dibutuhkan rekan party di LogHorizon:`}
                        label="Share"
                        variant="ghost"
                      />
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] rounded-2xl w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto p-5 sm:p-6 shadow-2xl relative my-auto">
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Jumlah Tim ({templateTeamCount} Tim) *
                    </label>
                    <span className="text-[10px] text-purple-400 font-mono">
                      Bagan: {Math.pow(2, Math.ceil(Math.log2(Math.max(2, templateTeamCount))))} Slot
                      {Math.pow(2, Math.ceil(Math.log2(Math.max(2, templateTeamCount)))) > templateTeamCount ? " (Auto-BYE)" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      required
                      type="number"
                      min={2}
                      max={128}
                      value={templateTeamCount}
                      onChange={(e) => setTemplateTeamCount(Math.min(128, Math.max(2, parseInt(e.target.value, 10) || 2)))}
                      className="w-24 px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#211C2B] text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                    />
                    <div className="flex items-center gap-1 flex-wrap">
                      {[4, 8, 16, 32, 64].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setTemplateTeamCount(n)}
                          className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition ${
                            templateTeamCount === n
                              ? "bg-[#9D4EDD] text-white shadow-xs"
                              : "bg-gray-100 dark:bg-[#1C1726] text-gray-700 dark:text-gray-300 hover:text-white"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
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

              {/* Pengaturan Slot Pemain Inti & Cadangan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Pemain Inti per Tim (Wajib) *
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={10}
                    value={templateMainPlayers}
                    onChange={(e) => setTemplateMainPlayers(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#211C2B] text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">1 untuk Solo, 4 untuk BR, 5 untuk MOBA/FPS</span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Maks. Pemain Cadangan (Opsional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={templateSubPlayers}
                    onChange={(e) => setTemplateSubPlayers(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#211C2B] text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">0 s/d 5 cadangan (isi 0 jika tanpa cadangan)</span>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] rounded-2xl w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[85vh] overflow-y-auto p-5 sm:p-6 shadow-2xl relative my-auto">
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
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-[#211C2B] pb-2 mb-4 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setManageTab("scores")}
                className={`px-3 py-1.5 rounded text-xs font-bold shrink-0 ${
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
                className={`px-3 py-1.5 rounded text-xs font-bold shrink-0 ${
                  manageTab === "teams"
                    ? "bg-[#9D4EDD] text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                2. Daftar Tim &amp; Roster Pemain
              </button>
              <button
                type="button"
                onClick={() => setManageTab("settings")}
                className={`px-3 py-1.5 rounded text-xs font-bold shrink-0 flex items-center gap-1.5 ${
                  manageTab === "settings"
                    ? "bg-[#9D4EDD] text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Settings size={13} />
                <span>3. Ubah Ukuran Slot ({manageSlotCount} Tim)</span>
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
                {manageTeams.map((team, idx) => {
                  const participant = managingTournament.participants?.find(
                    (p) => p.teamName?.toLowerCase() === team.teamName?.toLowerCase() || p.id === team.id
                  );
                  const repDiscord = team.representativeDiscord || (participant?.leader?.username ? `@${participant.leader.username}` : null);
                  const repDiscordId = team.representativeDiscordId || participant?.leader?.discordId;
                  const repPhone = team.representativePhone || participant?.phone;
                  const rosterList = (team.roster && team.roster.length > 0)
                    ? team.roster
                    : (participant?.roster && Array.isArray(participant.roster) && participant.roster.length > 0)
                      ? participant.roster
                      : null;

                  return (
                    <div
                      key={team.id || idx}
                      className="p-3.5 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-gray-50 dark:bg-[#181324] space-y-2.5"
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

                      {/* Info Kontak Perwakilan & WA (Khusus Admin/Panitia) */}
                      {(repPhone || repDiscord || repDiscordId) && (
                        <div className="p-2 rounded bg-purple-950/20 border border-purple-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-3 flex-wrap">
                            {repDiscord && (
                              <span className="text-purple-300 font-mono text-[11px]">
                                Discord: <strong className="text-white">{repDiscord}</strong>
                                {repDiscordId && <span className="text-gray-400 text-[10px] ml-1">({repDiscordId})</span>}
                              </span>
                            )}
                            {repPhone && (
                              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                                <Phone size={12} className="shrink-0" />
                                <span>WA: <strong className="text-emerald-300">{repPhone}</strong></span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {repPhone && (
                              <button
                                type="button"
                                onClick={() => handleCopyText(repPhone, `wa-${idx}`)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 text-[10px] font-bold transition"
                              >
                                {copiedText === `wa-${idx}` ? <Check size={11} /> : <Copy size={11} />}
                                <span>{copiedText === `wa-${idx}` ? "Tersalin!" : "Salin WA"}</span>
                              </button>
                            )}
                            {repDiscordId && (
                              <button
                                type="button"
                                onClick={() => handleCopyText(repDiscordId, `dc-${idx}`)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 text-[10px] font-bold transition"
                              >
                                {copiedText === `dc-${idx}` ? <Check size={11} /> : <Copy size={11} />}
                                <span>{copiedText === `dc-${idx}` ? "Tersalin!" : "Salin ID"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Roster Terstruktur */}
                      {rosterList && rosterList.length > 0 ? (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-gray-400 block">
                            Susunan Pemain Terdaftar ({rosterList.length} Orang):
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {rosterList.map((player, pIdx) => (
                              <div
                                key={pIdx}
                                className="flex items-center justify-between px-2.5 py-1 rounded bg-black/30 border border-white/5 text-[11px]"
                              >
                                <span className="font-semibold text-gray-200">
                                  {player.name}
                                  {player.role === "SUB" && (
                                    <span className="ml-1 px-1 py-0.2 text-[9px] rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Cad</span>
                                  )}
                                </span>
                                <span className="text-[10px] font-mono text-purple-400">{player.inGameId}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                            Daftar Pemain / Roster (Pisahkan dengan tanda koma)
                          </label>
                          <input
                            type="text"
                            value={(team.players || []).join(", ")}
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
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* SUB-PANEL 3: UBAH / RESIZE JUMLAH SLOT TIM & REGENERATE */}
            {manageTab === "settings" && (
              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                <div className="p-4 sm:p-5 rounded-xl border border-purple-500/30 bg-purple-950/15 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Settings size={16} className="text-[#9D4EDD]" />
                      <span>Ubah Jumlah Slot Tim &amp; Sesuaikan Bagan</span>
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Tambah atau kurangi kapasitas peserta turnamen (2 s/d 128 tim). Nama tim dan susunan pemain yang sudah terisi akan otomatis dipertahankan.
                    </p>
                  </div>

                  {/* Kontrol Tambah & Kurangi Slot */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17]">
                    <div>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
                        Kapasitas Slot Turnamen:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setManageSlotCount((c) => Math.max(2, c - 1))}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#1C1726] border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white text-xs font-black hover:border-[#9D4EDD] active:scale-95 transition"
                          title="Kurangi 1 Slot"
                        >
                          - Kurangi
                        </button>
                        <input
                          type="number"
                          min={2}
                          max={128}
                          value={manageSlotCount}
                          onChange={(e) => setManageSlotCount(Math.min(128, Math.max(2, parseInt(e.target.value, 10) || 2)))}
                          className="w-20 text-center py-1.5 rounded-lg bg-gray-50 dark:bg-[#181324] border border-gray-300 dark:border-gray-700 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                        />
                        <button
                          type="button"
                          onClick={() => setManageSlotCount((c) => Math.min(128, c + 1))}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#1C1726] border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white text-xs font-black hover:border-[#9D4EDD] active:scale-95 transition"
                          title="Tambah 1 Slot"
                        >
                          + Tambah
                        </button>
                      </div>
                      <span className="text-[10px] text-purple-400 font-mono mt-1 block">
                        Pohon Bagan: {Math.pow(2, Math.ceil(Math.log2(Math.max(2, manageSlotCount))))} Slot
                        {Math.pow(2, Math.ceil(Math.log2(Math.max(2, manageSlotCount)))) > manageSlotCount ? " (Auto-BYE Otomatis)" : ""}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-mono text-gray-400 block mb-1.5">Preset Cepat:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[4, 6, 8, 10, 12, 16, 24, 32, 64].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setManageSlotCount(n)}
                            className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition ${
                              manageSlotCount === n
                                ? "bg-[#9D4EDD] text-white shadow-xs"
                                : "bg-gray-100 dark:bg-[#1C1726] text-gray-700 dark:text-gray-300 hover:text-white"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pengaturan Slot Pemain Inti & Cadangan */}
                  <div className="p-4 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] space-y-3">
                    <div>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                        Konfigurasi Roster Pemain per Tim:
                      </span>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Tentukan berapa pemain inti yang wajib didaftarkan kapten dan batas cadangan.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                          Jumlah Pemain Inti (Wajib)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={manageMainPlayers}
                          onChange={(e) => setManageMainPlayers(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-full px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-[#181324] border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-white"
                        />
                        <span className="text-[10px] text-gray-400 mt-0.5 block">1 (Solo), 4 (BR), 5 (MOBA/FPS)</span>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                          Maksimal Pemain Cadangan
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={5}
                          value={manageSubPlayers}
                          onChange={(e) => setManageSubPlayers(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-full px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-[#181324] border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-white"
                        />
                        <span className="text-[10px] text-gray-400 mt-0.5 block">0 sampai 5 pemain cadangan</span>
                      </div>
                    </div>
                  </div>

                  {/* Warning Box */}
                  <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      ⚠️ Informasi Penting Penyesuaian Bagan:
                    </p>
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">
                      Mengubah jumlah slot akan menyusun ulang pohon pertandingan ({manageSlotCount} Tim menuju Grand Final) dan mereset skor ronde ke awal. Daftar nama tim dan roster pemain yang sudah diinput sebelumnya akan tetap dipertahankan.
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={isResizingBracket}
                      onClick={() => handleResizeAndRegenerate(manageSlotCount)}
                      className="button button-primary text-xs font-bold inline-flex items-center gap-2"
                    >
                      <RefreshCw size={14} className={isResizingBracket ? "animate-spin" : ""} />
                      <span>{isResizingBracket ? "Menyesuaikan Bagan…" : "Regenerate / Sesuaikan Ulang Bagan"}</span>
                    </button>
                  </div>
                </div>
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
      {/* MODAL 3: PENDAFTARAN TIM MEMBER KE TURNAMEN (FORM TERSTRUKTUR) */}
      {/* ========================================================================= */}
      {registeringTournament && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] rounded-2xl w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[88vh] overflow-y-auto p-5 sm:p-6 shadow-2xl relative my-auto">
            <button
              type="button"
              onClick={() => setRegisteringTournament(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="mb-5 pb-3 border-b border-gray-200 dark:border-[#211C2B]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold text-[#9D4EDD] uppercase tracking-wider">
                  PENDAFTARAN TURNAMEN GUILD
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  {registeringTournament.mainPlayersCount ?? 5} Inti + {registeringTournament.subPlayersCount ?? 2} Cadangan
                </span>
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">
                Daftar Turnamen: {registeringTournament.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Lengkapi identitas tim, kontak perwakilan, serta susunan roster pemain inti dan cadangan.
              </p>
            </div>

            <form onSubmit={handleRegisterTeam} className="space-y-5">
              {/* BAGIAN A: IDENTITAS TIM & KONTAK PERWAKILAN */}
              <div className="space-y-3.5 p-4 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-gray-50/50 dark:bg-[#181324]/50">
                <h4 className="text-xs font-bold text-[#9D4EDD] uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={14} />
                  <span>Bagian A: Identitas Tim &amp; Kontak Perwakilan</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      Nama Party / Tim *
                    </label>
                    <input
                      required
                      type="text"
                      minLength={3}
                      maxLength={64}
                      value={registerTeamName}
                      onChange={(e) => setRegisterTeamName(e.target.value)}
                      placeholder="Contoh: LogHorizon Vanguard"
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#120F17] border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      Nomor WhatsApp Perwakilan (Wajib) *
                    </label>
                    <input
                      required
                      type="tel"
                      value={registerPhone}
                      onChange={(e) => setRegisterPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#120F17] border border-gray-300 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Hanya untuk koordinasi panitia turnamen</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Akun Discord Perwakilan (Terkunci Otomatis)
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#14101E] border border-gray-300 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 font-mono">
                    <span className="text-purple-400">@</span>
                    <span className="font-bold">{session?.user?.username || session?.user?.name || "Akun Discord"}</span>
                    {session?.user?.discordId && (
                      <span className="text-[10px] text-gray-500">({session.user.discordId})</span>
                    )}
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      Terverifikasi
                    </span>
                  </div>
                </div>
              </div>

              {/* BAGIAN B: PEMAIN INTI WAJIB */}
              <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-gray-50/50 dark:bg-[#181324]/50">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={14} className="text-[#9D4EDD]" />
                    <span>Bagian B: Pemain Inti Wajib ({registerMainPlayers.length} Pemain)</span>
                  </h4>
                  <span className="text-[11px] text-purple-400 font-mono">Slot Wajib Terisi Penuh</span>
                </div>

                <div className="space-y-2.5">
                  {registerMainPlayers.map((player, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-white dark:bg-[#120F17] border border-gray-200 dark:border-gray-800 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-purple-500/20 text-[#9D4EDD] inline-flex items-center justify-center text-[10px] font-mono">
                            {idx + 1}
                          </span>
                          <span>{idx === 0 ? "Pemain #1 (Kapten Tim) *" : `Pemain Inti #${idx + 1} *`}</span>
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">Slot Wajib</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          required
                          type="text"
                          value={player.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRegisterMainPlayers((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, name: val } : p))
                            );
                          }}
                          placeholder={idx === 0 ? "Nickname In-Game Kapten *" : `Nickname Pemain #${idx + 1} *`}
                          className="w-full px-3 py-1.5 rounded bg-gray-50 dark:bg-[#181324] border border-gray-300 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                        />
                        <input
                          required
                          type="text"
                          value={player.inGameId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRegisterMainPlayers((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, inGameId: val } : p))
                            );
                          }}
                          placeholder="ID / Tag In-Game (contoh: #1234 / UID: 9988) *"
                          className="w-full px-3 py-1.5 rounded bg-gray-50 dark:bg-[#181324] border border-gray-300 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BAGIAN C: PEMAIN CADANGAN OPSIONAL */}
              {registerSubPlayers.length > 0 && (
                <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-gray-50/50 dark:bg-[#181324]/50">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={14} className="text-amber-400" />
                      <span>Bagian C: Pemain Cadangan (Maks. {registerSubPlayers.length} Pemain - Opsional)</span>
                    </h4>
                    <span className="text-[11px] text-amber-400 font-mono">Boleh Dikosongkan</span>
                  </div>

                  <div className="space-y-2.5">
                    {registerSubPlayers.map((sub, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-white dark:bg-[#120F17] border border-gray-200 dark:border-gray-800 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 inline-flex items-center justify-center text-[10px] font-mono">
                              C{idx + 1}
                            </span>
                            <span>Pemain Cadangan #{idx + 1}</span>
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">Opsional</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={sub.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRegisterSubPlayers((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, name: val } : p))
                              );
                            }}
                            placeholder={`Nickname Cadangan #${idx + 1} (Opsional)`}
                            className="w-full px-3 py-1.5 rounded bg-gray-50 dark:bg-[#181324] border border-gray-300 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                          />
                          <input
                            type="text"
                            value={sub.inGameId}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRegisterSubPlayers((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, inGameId: val } : p))
                              );
                            }}
                            placeholder="ID / Tag In-Game (Opsional)"
                            className="w-full px-3 py-1.5 rounded bg-gray-50 dark:bg-[#181324] border border-gray-300 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-[#211C2B]">
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
                  {submittingRegistration ? "Mendaftarkan Tim…" : "Konfirmasi & Daftarkan Tim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP: LIHAT SUSUNAN PEMAIN (ROSTER) TIM */}
      {/* ========================================================================= */}
      {viewingRoster && (() => {
        const hasStructured = (viewingRoster.mainPlayers && viewingRoster.mainPlayers.length > 0) ||
          (viewingRoster.roster && viewingRoster.roster.length > 0);
        
        const mainList = viewingRoster.mainPlayers && viewingRoster.mainPlayers.length > 0
          ? viewingRoster.mainPlayers
          : viewingRoster.roster
            ? viewingRoster.roster.filter((p) => p.role !== "SUB")
            : [];

        const subList = viewingRoster.subPlayers && viewingRoster.subPlayers.length > 0
          ? viewingRoster.subPlayers
          : viewingRoster.roster
            ? viewingRoster.roster.filter((p) => p.role === "SUB")
            : [];

        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] rounded-2xl w-[calc(100vw-2rem)] sm:max-w-md max-h-[85vh] overflow-y-auto p-5 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 my-auto">
              <button
                type="button"
                onClick={() => setViewingRoster(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200 dark:border-[#211C2B]">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[#9D4EDD] shrink-0">
                  <Shield size={20} />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-gray-900 dark:text-white">
                    {viewingRoster.teamName}
                  </h4>
                  <p className="text-[11px] font-mono text-[#9D4EDD]">
                    Kapten: {viewingRoster.captainName || "Leader Party"}
                  </p>
                </div>
              </div>

              {hasStructured ? (
                <div className="space-y-4 my-3">
                  {/* Pemain Inti */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        Pemain Inti ({mainList.length} Orang):
                      </p>
                      <span className="text-[10px] font-mono text-purple-400">Roster Utama</span>
                    </div>
                    <div className="space-y-1.5">
                      {mainList.map((player, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#181324] border border-gray-200 dark:border-[#211C2B] text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-purple-500/20 text-[#9D4EDD] inline-flex items-center justify-center text-[10px] font-mono font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-gray-900 dark:text-white">{player.name}</span>
                            {idx === 0 && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/25">
                                Kapten
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-purple-400 font-semibold">{player.inGameId}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pemain Cadangan */}
                  {subList.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">
                          Pemain Cadangan ({subList.length} Orang):
                        </p>
                        <span className="text-[10px] font-mono text-amber-400">Substitute</span>
                      </div>
                      <div className="space-y-1.5">
                        {subList.map((player, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#181324] border border-gray-200 dark:border-[#211C2B] text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 inline-flex items-center justify-center text-[10px] font-mono font-bold">
                                C{idx + 1}
                              </span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">{player.name}</span>
                            </div>
                            <span className="text-[11px] font-mono text-gray-400">{player.inGameId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
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
              )}

              <button
                type="button"
                onClick={() => setViewingRoster(null)}
                className="button button-quiet w-full text-xs font-bold mt-3"
              >
                Tutup
              </button>
            </div>
          </div>
        );
      })()}
    </main>
  );
}

// =========================================================================
// SUB-KOMPONEN: KARTU PERTANDINGAN BAGAN VISUAL (CYBER MINIMALIST)
// =========================================================================
export function MatchCard({
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
              : match.teamB.name === "BYE"
                ? "bg-gray-100/40 dark:bg-[#120F17]/40 text-gray-400 dark:text-gray-500 italic"
                : "bg-gray-50 dark:bg-[#161220] text-gray-800 dark:text-gray-200"
          }`}
        >
          {match.teamB.name === "BYE" ? (
            <span className="text-[11px] font-mono text-gray-400 italic">BYE (Lolos Otomatis)</span>
          ) : (
            <button
              type="button"
              onClick={() => teamBData && onTeamClick(teamBData)}
              className="text-xs truncate max-w-[150px] text-left hover:underline"
              title={teamBData ? "Klik untuk melihat susunan pemain" : undefined}
            >
              {match.teamB.name || "TBD"}
            </button>
          )}
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-black/20 font-bold ml-2">
            {match.teamB.name === "BYE" ? "-" : match.teamB.score}
          </span>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SUB-KOMPONEN: BAGAN SIMETRIS SPLIT DUAL-WING (SAYAP KIRI - TENGAH - SAYAP KANAN)
// =========================================================================
export function DualWingBracketView({
  sortedRoundNumbers,
  roundsMap,
  teams,
  onTeamClick,
}: {
  sortedRoundNumbers: number[];
  roundsMap: Map<number, TournamentMatch[]>;
  teams: TournamentTeam[];
  onTeamClick: (team: TournamentTeam) => void;
}) {
  const totalRounds = sortedRoundNumbers.length;

  // Format tunggal di tengah untuk 1 ronde saja (2-3 tim)
  if (totalRounds <= 1) {
    const gfMatches = roundsMap.get(1) || [];
    const gfMatch = gfMatches[0];
    return (
      <div className="flex justify-center py-6">
        <div className="w-full max-w-sm space-y-4">
          <p className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider text-center pb-1 border-b border-amber-500/30">
            Grand Final 🏆
          </p>
          {gfMatch && (
            <MatchCard match={gfMatch} teams={teams} isFinal={true} onTeamClick={onTeamClick} />
          )}
          {gfMatch?.winner && (
            <div className="p-3.5 rounded-xl border border-amber-500/60 bg-amber-500/10 text-center">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                👑 JUARA 1 TURNAMEN
              </span>
              <span className="text-sm font-black text-white mt-0.5 block truncate">
                {gfMatch.winner}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Format Bagan Simetris Dua Sayap (Left Wing - Center Final - Right Wing)
  const finalRoundNum = sortedRoundNumbers[sortedRoundNumbers.length - 1];
  const gfMatches = roundsMap.get(finalRoundNum) || [];
  const gfMatch = gfMatches[0];

  // Ronde sebelum final: 1, 2, ..., finalRoundNum - 1
  const preliminaryRounds = sortedRoundNumbers.slice(0, -1);
  const totalCols = preliminaryRounds.length * 2 + 1;

  return (
    <div
      className="flex items-stretch gap-5 sm:gap-7 pb-4 pt-2 select-none"
      style={{ minWidth: `${Math.max(860, totalCols * 265)}px` }}
    >
      {/* 1. SAYAP KIRI (LEFT WING): Ronde 1 -> Ronde 2 -> ... -> Semifinal Kiri */}
      {preliminaryRounds.map((rNum) => {
        const roundMatches = roundsMap.get(rNum) || [];
        const half = Math.ceil(roundMatches.length / 2);
        const leftMatches = roundMatches.slice(0, half);
        const isSemi = rNum === finalRoundNum - 1;
        const baseName = roundMatches[0]?.roundName?.replace(/\s*\d+$/, "") || `Ronde ${rNum}`;
        const heading = isSemi ? "Semifinal Kiri ➔" : `${baseName} (Kiri) ➔`;

        return (
          <div key={`left-r-${rNum}`} className="flex-1 flex flex-col justify-around space-y-4 min-w-[240px]">
            <div className="text-center pb-1.5 border-b border-purple-500/30">
              <span className="text-[10px] font-mono text-purple-400/70 uppercase tracking-widest block">
                Sayap Kiri
              </span>
              <p className="text-[11px] font-mono font-bold text-purple-300 uppercase tracking-wider">
                {heading}
              </p>
            </div>
            {leftMatches.map((m) => (
              <MatchCard
                key={m.matchId}
                match={m}
                teams={teams}
                isFinal={false}
                onTeamClick={onTeamClick}
              />
            ))}
          </div>
        );
      })}

      {/* 2. TENGAH (CENTER STAGE): Kotak GRAND FINAL & PODIUM JUARA 1 */}
      <div className="flex-1 flex flex-col justify-center space-y-4 min-w-[260px] max-w-[300px] px-3 py-4 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-[#130F1A] to-purple-950/20 shadow-2xl shadow-amber-950/20">
        <div className="text-center pb-2 border-b border-amber-500/30">
          <span className="text-[10px] font-mono text-amber-400/80 uppercase tracking-widest block font-bold">
            ⚔️ TITIK TEMU FINAL ⚔️
          </span>
          <p className="text-xs sm:text-sm font-mono font-black text-amber-400 uppercase tracking-wider flex items-center justify-center gap-1.5 mt-0.5">
            <Crown size={15} className="text-amber-400 animate-bounce" />
            <span>GRAND FINAL 🏆</span>
          </p>
        </div>

        {gfMatch ? (
          <MatchCard
            match={gfMatch}
            teams={teams}
            isFinal={true}
            onTeamClick={onTeamClick}
          />
        ) : (
          <p className="text-xs text-gray-500 text-center py-4">Menunggu babak final</p>
        )}

        {/* Podium Juara 1 */}
        {gfMatch?.winner && (
          <div className="p-3 rounded-xl border border-amber-500/60 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-amber-500/20 text-center shadow-lg shadow-amber-950/30 animate-in zoom-in-95 duration-200">
            <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/50">
              <Crown size={16} />
            </div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-amber-300 font-extrabold block">
              👑 JUARA 1 TURNAMEN
            </span>
            <span className="text-xs sm:text-sm font-black text-white block mt-0.5 truncate">
              {gfMatch.winner}
            </span>
          </div>
        )}
      </div>

      {/* 3. SAYAP KANAN (RIGHT WING): Semifinal Kanan <- ... <- Ronde 2 <- Ronde 1 (Mirrored) */}
      {[...preliminaryRounds].reverse().map((rNum) => {
        const roundMatches = roundsMap.get(rNum) || [];
        const half = Math.ceil(roundMatches.length / 2);
        const rightMatches = roundMatches.slice(half);
        const isSemi = rNum === finalRoundNum - 1;
        const baseName = roundMatches[0]?.roundName?.replace(/\s*\d+$/, "") || `Ronde ${rNum}`;
        const heading = isSemi ? "⬅ Semifinal Kanan" : `⬅ ${baseName} (Kanan)`;

        return (
          <div key={`right-r-${rNum}`} className="flex-1 flex flex-col justify-around space-y-4 min-w-[240px]">
            <div className="text-center pb-1.5 border-b border-purple-500/30">
              <span className="text-[10px] font-mono text-purple-400/70 uppercase tracking-widest block">
                Sayap Kanan
              </span>
              <p className="text-[11px] font-mono font-bold text-purple-300 uppercase tracking-wider">
                {heading}
              </p>
            </div>
            {rightMatches.map((m) => (
              <MatchCard
                key={m.matchId}
                match={m}
                teams={teams}
                isFinal={false}
                onTeamClick={onTeamClick}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
