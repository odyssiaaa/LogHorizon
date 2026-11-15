"use client";

import { FormEvent, Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Award,
  CalendarDays,
  Check,
  CheckCircle,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Dices,
  Edit3,
  ExternalLink,
  Eye,
  Flame,
  Headphones,
  ImageIcon,
  LogOut,
  Medal,
  MessageSquare,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Swords,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { readApiResponse } from "@/lib/api-response";
import { advanceMatchWinner, updateMatchStatus, TournamentMatch, TournamentTeam, TournamentRosterPlayer, DEFAULT_TOURNAMENT_RULES } from "@/lib/tournament";
import { DragScrollContainer } from "@/components/drag-scroll-container";
import { ShareButton } from "@/components/share-button";
import { GachaBracketModal } from "@/components/gacha-bracket-modal";
import { TournamentRulesModal } from "@/components/tournament-rules-modal";
import { RosterPlayerRow } from "@/components/roster-player-row";
import { QuickMatchScoreModal } from "@/components/quick-match-score-modal";

type Participant = {
  id: string;
  teamName: string;
  phone?: string | null;
  roster?: TournamentRosterPlayer[];
  paymentStatus?: string;
  senderName?: string | null;
  paymentProof?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
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
  entryFee?: number;
  isFreeEntry?: boolean;
  rules?: string | null;
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
  const [customSlots, setCustomSlots] = useState("5");
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
  const [templateIsFree, setTemplateIsFree] = useState<boolean>(true);
  const [templateEntryFee, setTemplateEntryFee] = useState<number>(0);
  const [templateRules, setTemplateRules] = useState<string>(DEFAULT_TOURNAMENT_RULES);
  const [templateDate, setTemplateDate] = useState("");
  const [templateStatus, setTemplateStatus] = useState<"REGISTRATION" | "ONGOING">("REGISTRATION");
  const [creatingTournament, setCreatingTournament] = useState(false);

  // Manage Tournament Modal State (Admin / Mod)
  const [managingTournament, setManagingTournament] = useState<Tournament | null>(null);
  const [manageTab, setManageTab] = useState<"scores" | "teams" | "settings" | "verifications">("scores");
  const [manageMatches, setManageMatches] = useState<TournamentMatch[]>([]);
  const [manageTeams, setManageTeams] = useState<TournamentTeam[]>([]);
  const [manageSlotCount, setManageSlotCount] = useState<number>(8);
  const [manageMainPlayers, setManageMainPlayers] = useState<number>(5);
  const [manageSubPlayers, setManageSubPlayers] = useState<number>(2);
  const [manageIsFree, setManageIsFree] = useState<boolean>(true);
  const [manageEntryFee, setManageEntryFee] = useState<number>(0);
  const [manageRules, setManageRules] = useState<string>(DEFAULT_TOURNAMENT_RULES);
  const [isResizingBracket, setIsResizingBracket] = useState(false);
  const [savingManage, setSavingManage] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState<string | null>(null);
  const [selectedProofModal, setSelectedProofModal] = useState<string | null>(null);

  // Gacha Bracket Modal State
  const [gachaModalState, setGachaModalState] = useState<{
    isOpen: boolean;
    isRolling: boolean;
    tournamentTitle: string;
    teamsList: string[];
  }>({
    isOpen: false,
    isRolling: false,
    tournamentTitle: "",
    teamsList: [],
  });

  // Team Registration Modal State (Structured Form)
  const [rulesGateTournament, setRulesGateTournament] = useState<Tournament | null>(null);
  const [registeringTournament, setRegisteringTournament] = useState<Tournament | null>(null);
  const [registerTeamName, setRegisterTeamName] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerSenderName, setRegisterSenderName] = useState("");
  const [registerPaymentProof, setRegisterPaymentProof] = useState<string>("");
  const [compressingProof, setCompressingProof] = useState(false);
  const [registerMainPlayers, setRegisterMainPlayers] = useState<{ nickname: string; gameId: string }[]>([]);
  const [registerSubPlayers, setRegisterSubPlayers] = useState<{ nickname: string; gameId: string }[]>([]);
  const [submittingRegistration, setSubmittingRegistration] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Inisialisasi Otomatis Roster Pemain saat Modal Registrasi Terbuka
  useEffect(() => {
    if (registeringTournament) {
      const mainCount = registeringTournament.mainPlayersCount ?? 5;
      const subCount = registeringTournament.subPlayersCount ?? 2;
      setRegisterMainPlayers((prev) => {
        if (prev.length === mainCount && prev.some((p) => p.nickname || p.gameId)) return prev;
        const mains: { nickname: string; gameId: string }[] = [];
        for (let i = 0; i < mainCount; i++) {
          mains.push({
            nickname: i === 0 ? (session?.user?.username ?? session?.user?.name ?? "") : (prev[i]?.nickname ?? ""),
            gameId: prev[i]?.gameId ?? "",
          });
        }
        return mains;
      });
      setRegisterSubPlayers((prev) => {
        if (prev.length === subCount && prev.some((p) => p.nickname || p.gameId)) return prev;
        const subs: { nickname: string; gameId: string }[] = [];
        for (let i = 0; i < subCount; i++) {
          subs.push({
            nickname: prev[i]?.nickname ?? "",
            gameId: prev[i]?.gameId ?? "",
          });
        }
        return subs;
      });
    }
  }, [registeringTournament, session]);

  // Canvas Image Compression Helper for Payment Proof
  function handleProofFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("File bukti transfer harus berupa gambar (JPG, PNG, atau WebP).");
      return;
    }
    setCompressingProof(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const maxWidth = 800;
        const maxHeight = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setCompressingProof(false);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setRegisterPaymentProof(compressedDataUrl);
        setCompressingProof(false);
      };
      img.onerror = () => {
        setError("Gagal memproses gambar bukti pembayaran.");
        setCompressingProof(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  // View Team Roster Popup
  const [viewingRoster, setViewingRoster] = useState<TournamentTeam | null>(null);

  // Live Auto-Refresh & Real-Time Sync State
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  const [syncSecondsAgo, setSyncSecondsAgo] = useState<number>(0);
  const [quickScoreModalMatch, setQuickScoreModalMatch] = useState<{
    tournamentId: string;
    match: TournamentMatch;
  } | null>(null);

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

  // SMART AUTO-POLLING (Setiap 4 Detik saat tab browser aktif)
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setSyncSecondsAgo(Math.max(0, Math.floor((Date.now() - lastSyncTime) / 1000)));
    }, 1000);

    const pollInterval = setInterval(async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      const shouldPoll =
        activeTab === "turnamen" ||
        tournaments.some((t) => t.status === "ONGOING" || t.status === "REGISTRATION");
      if (!shouldPoll) return;

      try {
        const res = await fetch(`/api/tournaments?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) return;
        const fresh = await res.json();
        if (Array.isArray(fresh)) {
          setTournaments(fresh);
          setLastSyncTime(Date.now());
          setSyncSecondsAgo(0);

          if (managingTournament) {
            const current = fresh.find((t) => t.id === managingTournament.id);
            if (current) {
              setManagingTournament((prev) => (prev ? { ...prev, ...current } : prev));
              setManageMatches(current.matches || []);
              setManageTeams(current.teams || []);
            }
          }
        }
      } catch {
        // Silently skip transient network failure during polling
      }
    }, 4000);

    return () => {
      clearInterval(tickInterval);
      clearInterval(pollInterval);
    };
  }, [activeTab, tournaments, managingTournament, lastSyncTime]);

  // Optimistic Quick Update handler for bracket card admin action buttons
  function handleAdminQuickUpdate(tournamentId: string, matchId: string, action: "SET_LIVE" | "FINISH_MATCH") {
    const targetTournament = tournaments.find((t) => t.id === tournamentId);
    if (!targetTournament) return;
    const match = targetTournament.matches?.find((m) => m.matchId === matchId);
    if (!match) return;

    if (action === "SET_LIVE") {
      // 0ms Optimistic UI update
      const updatedMatches = updateMatchStatus(targetTournament.matches || [], matchId, "LIVE");
      setTournaments((prev) =>
        prev.map((t) => (t.id === tournamentId ? { ...t, matches: updatedMatches } : t))
      );
      if (managingTournament && managingTournament.id === tournamentId) {
        setManageMatches(updatedMatches);
        setManagingTournament((prev) => (prev ? { ...prev, matches: updatedMatches } : prev));
      }
      setNotice(`Match ${match.roundName} #${match.matchId} kini berstatus LIVE!`);

      // Background DB Sync
      fetch(`/api/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, matchStatus: "LIVE" }),
      }).catch((err) => {
        console.error("Gagal sync match status LIVE:", err);
      });
    } else if (action === "FINISH_MATCH") {
      setQuickScoreModalMatch({ tournamentId, match });
    }
  }

  // Handle saving score from QuickMatchScoreModal with 0ms Optimistic UI
  async function handleSaveQuickScore(
    matchId: string,
    winnerName: string,
    winnerId?: string,
    scoreA?: number,
    scoreB?: number
  ) {
    if (!quickScoreModalMatch) return;
    const { tournamentId } = quickScoreModalMatch;
    const targetTournament = tournaments.find((t) => t.id === tournamentId);
    if (!targetTournament) return;

    // 0ms Optimistic local update
    const updatedMatches = advanceMatchWinner(
      targetTournament.matches || [],
      matchId,
      winnerName,
      winnerId,
      scoreA,
      scoreB
    );

    setTournaments((prev) =>
      prev.map((t) => (t.id === tournamentId ? { ...t, matches: updatedMatches } : t))
    );
    if (managingTournament && managingTournament.id === tournamentId) {
      setManageMatches(updatedMatches);
      setManagingTournament((prev) => (prev ? { ...prev, matches: updatedMatches } : prev));
    }
    setQuickScoreModalMatch(null);
    setNotice(`Skor tersimpan! ${winnerName} lolos ke babak berikutnya.`);

    // Background DB Sync
    try {
      await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          winner: winnerName,
          winnerId,
          scoreA,
          scoreB,
        }),
      });
    } catch (err) {
      console.error("Gagal sync skor match:", err);
      setError("Gagal menyinkronkan skor ke database. Mohon periksa koneksi.");
    }
  }

  // Open Manage Modal
  function handleOpenManage(tournament: Tournament) {
    setManagingTournament(tournament);
    setManageMatches(tournament.matches || []);
    setManageTeams(tournament.teams || []);
    setManageSlotCount(tournament.maxSlots || tournament.teams?.length || 8);
    setManageMainPlayers(tournament.mainPlayersCount ?? 5);
    setManageSubPlayers(tournament.subPlayersCount ?? 2);
    setManageIsFree(tournament.isFreeEntry ?? (tournament.entryFee === 0));
    setManageEntryFee(tournament.entryFee ?? 0);
    setManageRules(tournament.rules || DEFAULT_TOURNAMENT_RULES);
    setManageTab("scores");
  }

  // Open Tournament Rules Gate before Registration Form
  function handlePromptRulesAndRegister(t: Tournament) {
    if (!session?.user) {
      void signIn("discord");
      return;
    }
    setRulesGateTournament(t);
  }

  function handleRulesAgreed() {
    if (!rulesGateTournament) return;
    const target = rulesGateTournament;
    setRulesGateTournament(null);
    openRegisterModal(target);
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
    setRegisterSenderName("");
    setRegisterPaymentProof("");
    const mainCount = t.mainPlayersCount ?? 5;
    const subCount = t.subPlayersCount ?? 2;

    const mains: { nickname: string; gameId: string }[] = [];
    for (let i = 0; i < mainCount; i++) {
      mains.push({
        nickname: i === 0 ? (session.user.username ?? session.user.name ?? "") : "",
        gameId: "",
      });
    }
    setRegisterMainPlayers(mains);

    const subs: { nickname: string; gameId: string }[] = [];
    for (let i = 0; i < subCount; i++) {
      subs.push({ nickname: "", gameId: "" });
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

  // Gacha / Fisher-Yates Random Bracket Seeding
  async function handleGachaBracket(tournament: Tournament) {
    const hasScores = tournament.matches?.some(
      (m: any) => (m.teamA?.score > 0 || m.teamB?.score > 0 || (m.winner && m.round > 1))
    );

    if (hasScores) {
      const confirmShuffle = window.confirm(
        "⚠️ Peringatan: Beberapa pertandingan di turnamen ini sudah memiliki skor atau pemenang!\n\nMengacak bagan sekarang akan mereset bagan Ronde 1 dan menghapus skor yang sudah tercatat.\n\nApakah kamu yakin ingin tetap mengacak susunan lawan?"
      );
      if (!confirmShuffle) return;
    }

    const existingTeamNames = (tournament.teams || [])
      .map((t) => t.teamName)
      .filter((n) => n && !n.startsWith("Tim ") && n !== "BYE" && n !== "TBD");

    setGachaModalState({
      isOpen: true,
      isRolling: true,
      tournamentTitle: tournament.title,
      teamsList: existingTeamNames,
    });

    const startTime = Date.now();
    try {
      const response = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shuffleBracket: true }),
      });
      const data = await readApiResponse<{
        tournament: { teams: TournamentTeam[]; matches: TournamentMatch[]; maxSlots: number; format: string };
      }>(response, "Gagal mengacak bagan.");

      const elapsed = Date.now() - startTime;
      if (elapsed < 750) {
        await new Promise((r) => setTimeout(r, 750 - elapsed));
      }

      if (managingTournament && managingTournament.id === tournament.id) {
        setManageMatches(data.tournament.matches);
        setManageTeams(data.tournament.teams);
        setManagingTournament((prev) =>
          prev
            ? {
                ...prev,
                teams: data.tournament.teams,
                matches: data.tournament.matches,
              }
            : prev
        );
      }

      setRefreshKey((k) => k + 1);
      setGachaModalState((prev) => ({ ...prev, isRolling: false }));
      setNotice("🎲 Bagan berhasil diacak! Susunan pertandingan baru telah disimpan.");
    } catch (err) {
      setGachaModalState({ isOpen: false, isRolling: false, tournamentTitle: "", teamsList: [] });
      setError(err instanceof Error ? err.message : "Gagal mengacak bagan turnamen.");
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
          isFreeEntry: templateIsFree,
          entryFee: templateIsFree ? 0 : templateEntryFee,
          rules: templateRules.trim() || DEFAULT_TOURNAMENT_RULES,
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
          isFreeEntry: manageIsFree,
          entryFee: manageIsFree ? 0 : manageEntryFee,
          rules: manageRules.trim() || DEFAULT_TOURNAMENT_RULES,
        }),
      });
      await readApiResponse(response, "Gagal memperbarui turnamen.");
      setNotice("Bagan turnamen, tim, dan pengaturan biaya berhasil disimpan!");
      setManagingTournament(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan bagan.");
    } finally {
      setSavingManage(false);
    }
  }

  // Admin Verification Action (ACC / Reject Team Registration)
  async function handleVerificationAction(participantId: string, action: "APPROVE" | "REJECT") {
    if (!managingTournament) return;
    let reason = "";
    if (action === "REJECT") {
      const inputReason = window.prompt("Masukkan alasan penolakan (opsional):", "Bukti transfer tidak valid atau belum masuk ke rekening kas guild.");
      if (inputReason === null) return;
      reason = inputReason;
    }
    setVerificationLoading(participantId);
    try {
      const response = await fetch(`/api/tournaments/${managingTournament.id}/participants`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, action, reason }),
      });
      const result = await readApiResponse<{ message: string }>(response, "Gagal memproses verifikasi.");
      setNotice(result.message);
      // Refresh tournament data in manage modal
      const refreshed = await fetch(`/api/tournaments/${managingTournament.id}`).then((r) => r.json());
      if (refreshed?.tournament) {
        setManagingTournament(refreshed.tournament);
        setManageTeams(refreshed.tournament.teams || []);
        setManageMatches(refreshed.tournament.matches || []);
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses verifikasi.");
    } finally {
      setVerificationLoading(null);
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

    const isPaid = !registeringTournament.isFreeEntry && (registeringTournament.entryFee ?? 0) > 0;
    if (isPaid) {
      if (!registerSenderName.trim()) {
        setError("Nama pengirim / pemilik rekening transfer wajib diisi.");
        return;
      }
      if (!registerPaymentProof) {
        setError("Upload bukti transfer pembayaran QRIS wajib dilampirkan.");
        return;
      }
    }

    for (let i = 0; i < registerMainPlayers.length; i++) {
      const p = registerMainPlayers[i];
      if (!p.nickname.trim() || !p.gameId.trim()) {
        setError(`Pemain Inti #${i + 1} wajib diisi lengkap (Nickname dan ID / Tag Game).`);
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
          senderName: isPaid ? registerSenderName.trim() : undefined,
          paymentProof: isPaid ? registerPaymentProof : undefined,
          mainPlayers: registerMainPlayers.map((p) => ({
            name: p.nickname.trim(),
            nickname: p.nickname.trim(),
            inGameId: p.gameId.trim(),
            gameId: p.gameId.trim(),
          })),
          subPlayers: registerSubPlayers
            .filter((p) => p.nickname.trim() && p.gameId.trim())
            .map((p) => ({
              name: p.nickname.trim(),
              nickname: p.nickname.trim(),
              inGameId: p.gameId.trim(),
              gameId: p.gameId.trim(),
            })),
        }),
      });
      const result = await readApiResponse<{ message?: string; status?: string }>(response, "Pendaftaran turnamen gagal.");
      setNotice(result.message || `Party "${registerTeamName}" berhasil didaftarkan ke turnamen!`);
      setRegisteringTournament(null);
      setRegisterTeamName("");
      setRegisterPhone("");
      setRegisterSenderName("");
      setRegisterPaymentProof("");
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
    const finalSlots = (neededSlots === "custom" ? Number(customSlots || 5) : Number(neededSlots)) + 1;
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
                        {tournament.isFreeEntry || !tournament.entryFee ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
                            FREE ENTRY
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wide">
                            BIAYA REGIST: Rp {tournament.entryFee.toLocaleString("id-ID")}
                          </span>
                        )}
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
                          onClick={() => handlePromptRulesAndRegister(tournament)}
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

                      {/* Gacha / Randomize Bracket Button (Admin / Mod) */}
                      {isAdminOrMod && tournament.status !== "COMPLETED" && (
                        <button
                          type="button"
                          onClick={() => handleGachaBracket(tournament)}
                          className="button button-quiet text-xs font-bold inline-flex items-center gap-1.5 border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-all hover:scale-105"
                          title="Gacha / Acak Susunan Lawan Bagan (Fisher-Yates)"
                        >
                          <Dices size={14} className="text-amber-400" />
                          <span>🎲 Gacha Bagan</span>
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
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Flame size={14} className="text-[#9D4EDD]" />
                          <span>Pohon Bagan Pertandingan (Bracket Tree)</span>
                        </span>
                        {/* 🔴 LIVE SYNC AKTIF BADGE */}
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          LIVE SYNC AKTIF
                          <span className="text-emerald-500/70 font-normal">
                            ({syncSecondsAgo <= 1 ? "baru saja" : `${syncSecondsAgo}d lalu`})
                          </span>
                        </span>
                      </div>
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
                          isAdminOrMod={session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR"}
                          onAdminQuickUpdate={(matchId, action) => handleAdminQuickUpdate(tournament.id, matchId, action)}
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
                    <option value="1">1 - Butuh 1 Orang</option>
                    <option value="2">2 - Butuh 2 Orang</option>
                    <option value="3">3 - Butuh 3 Orang</option>
                    <option value="4">4 - Butuh 4 Orang (Full Team)</option>
                    <option value="custom">custom - Custom / Bebas (Rame-rame)</option>
                  </select>
                  {neededSlots === "custom" && (
                    <input
                      type="number"
                      min={1}
                      max={100}
                      placeholder="Masukkan jumlah orang (misal: 15)"
                      value={customSlots}
                      onChange={(e) => setCustomSlots(e.target.value)}
                      className="mt-2 w-full px-3 py-1.5 rounded-md bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] text-xs text-gray-900 dark:text-white outline-none focus:border-[#9D4EDD]"
                      required
                    />
                  )}
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

              {/* Pengaturan Biaya Pendaftaran (Gratis vs Berbayar QRIS) */}
              <div className="p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-gray-50/50 dark:bg-[#16121E]/60 space-y-3">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                  Mode Biaya Pendaftaran Tim
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateIsFree(true);
                      setTemplateEntryFee(0);
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      templateIsFree
                        ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400"
                        : "border-gray-200 dark:border-[#211C2B] text-gray-400 hover:text-white"
                    }`}
                  >
                    <span>🟢 Free Entry (Gratis)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateIsFree(false);
                      if (templateEntryFee === 0) setTemplateEntryFee(25000);
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      !templateIsFree
                        ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                        : "border-gray-200 dark:border-[#211C2B] text-gray-400 hover:text-white"
                    }`}
                  >
                    <span>💰 Berbayar (QRIS)</span>
                  </button>
                </div>

                {!templateIsFree && (
                  <div className="pt-1">
                    <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                      Nominal Biaya Pendaftaran per Tim (Rupiah) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">Rp</span>
                      <input
                        type="number"
                        min={1000}
                        step={1000}
                        value={templateEntryFee || ""}
                        onChange={(e) => setTemplateEntryFee(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        placeholder="Contoh: 25000 atau 50000"
                        className="w-full pl-10 pr-3 py-2 rounded-lg bg-white dark:bg-[#1A1624] border border-amber-500/40 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-amber-400/80 mt-1 block">
                      Peserta turnamen ini wajib mentransfer biaya via QRIS dan mengupload bukti transfer sebelum di-ACC panitia.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Peraturan Resmi Turnamen (Rules Agreement)
                </label>
                <textarea
                  rows={4}
                  value={templateRules}
                  onChange={(e) => setTemplateRules(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#211C2B] text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                  placeholder="Peraturan resmi turnamen..."
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Peraturan ini wajib dibaca &amp; disetujui peserta melalui pop-up sebelum formulir pendaftaran tim dapat diisi.
                </span>
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
            <div className="flex items-center justify-between gap-2 border-b border-gray-200 dark:border-[#211C2B] pb-2 mb-4 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
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
                  <span>3. Pengaturan Slot &amp; Biaya</span>
                </button>
                <button
                  type="button"
                  onClick={() => setManageTab("verifications")}
                  className={`px-3 py-1.5 rounded text-xs font-bold shrink-0 flex items-center gap-1.5 ${
                    manageTab === "verifications"
                      ? "bg-[#9D4EDD] text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <ShieldCheck size={13} />
                  <span>4. Verifikasi Tim ({managingTournament.participants?.length || 0})</span>
                  {(() => {
                    const pendingCount = managingTournament.participants?.filter((p) => p.paymentStatus === "PENDING_PAYMENT").length || 0;
                    return pendingCount > 0 ? (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-400 text-black">
                        {pendingCount} PENDING
                      </span>
                    ) : null;
                  })()}
                </button>
              </div>

              {/* Gacha / Randomize Bracket Button */}
              {managingTournament.status !== "COMPLETED" && (
                <button
                  type="button"
                  onClick={() => handleGachaBracket(managingTournament)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 shrink-0 flex items-center gap-1.5 transition ml-2 shadow-xs"
                  title="Gacha / Acak Susunan Lawan Bagan (Fisher-Yates)"
                >
                  <Dices size={13} className="text-amber-400" />
                  <span>🎲 Gacha Bagan (Acak Lawan)</span>
                </button>
              )}
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
                        onClick={() => {
                          const nextStatus = m.matchStatus === "LIVE" ? "UPCOMING" : "LIVE";
                          const updated = updateMatchStatus(manageMatches, m.matchId, nextStatus);
                          setManageMatches(updated);
                          if (managingTournament) {
                            fetch(`/api/tournaments/${managingTournament.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ matchId: m.matchId, matchStatus: nextStatus }),
                            }).catch(() => {});
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                          m.matchStatus === "LIVE"
                            ? "bg-red-500/20 text-red-300 border border-red-500/40"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                        }`}
                      >
                        {m.matchStatus === "LIVE" ? "⏹ Set Selesai/Upcoming" : "🔴 Mulai Match (Set LIVE)"}
                      </button>
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
                          <div className="space-y-1.5">
                            {rosterList.map((player, pIdx) => (
                              <RosterPlayerRow
                                key={pIdx}
                                index={pIdx + 1}
                                name={player.name}
                                inGameId={player.inGameId}
                                isCaptain={pIdx === 0 && player.role !== "SUB"}
                                isSub={player.role === "SUB"}
                              />
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

                  {/* Mode Biaya Pendaftaran (Gratis vs Berbayar) */}
                  <div className="p-4 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] space-y-3">
                    <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                      Mode Biaya Pendaftaran Turnamen
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setManageIsFree(true);
                          setManageEntryFee(0);
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                          manageIsFree
                            ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400"
                            : "border-gray-200 dark:border-[#211C2B] text-gray-400 hover:text-white"
                        }`}
                      >
                        <span>🟢 Free Entry (Gratis)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setManageIsFree(false);
                          if (manageEntryFee === 0) setManageEntryFee(25000);
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                          !manageIsFree
                            ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                            : "border-gray-200 dark:border-[#211C2B] text-gray-400 hover:text-white"
                        }`}
                      >
                        <span>💰 Berbayar (QRIS)</span>
                      </button>
                    </div>

                    {!manageIsFree && (
                      <div className="pt-1">
                        <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                          Nominal Biaya Pendaftaran per Tim (Rupiah) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">Rp</span>
                          <input
                            type="number"
                            min={1000}
                            step={1000}
                            value={manageEntryFee || ""}
                            onChange={(e) => setManageEntryFee(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            placeholder="Contoh: 25000 atau 50000"
                            className="w-full pl-10 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-amber-500/40 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-amber-400"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Edit Rules per Tournament */}
                  <div className="pt-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      Peraturan Resmi Turnamen (Rules Agreement)
                    </label>
                    <textarea
                      rows={5}
                      value={manageRules}
                      onChange={(e) => setManageRules(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#211C2B] text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                      placeholder="Tuliskan peraturan turnamen di sini..."
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      Admin dapat menyesuaikan peraturan spesifik game untuk turnamen ini (muncul di pop-up pendaftaran peserta).
                    </span>
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

            {/* SUB-PANEL 4: ANTREAN VERIFIKASI PENDAFTARAN TIM */}
            {manageTab === "verifications" && (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {(!managingTournament.participants || managingTournament.participants.length === 0) ? (
                  <div className="p-8 text-center border border-dashed border-gray-300 dark:border-gray-800 rounded-xl text-xs text-gray-400">
                    Belum ada tim yang mendaftar ke turnamen ini.
                  </div>
                ) : (
                  managingTournament.participants.map((p) => {
                    const isPending = p.paymentStatus === "PENDING_PAYMENT";
                    const isApproved = p.paymentStatus === "APPROVED";
                    const roster = p.roster || [];
                    const mains = roster.filter((r) => r.role === "MAIN");
                    const subs = roster.filter((r) => r.role === "SUB");

                    return (
                      <div
                        key={p.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isPending
                            ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/10"
                            : isApproved
                              ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
                              : "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/10"
                        } space-y-3`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-black text-sm text-gray-900 dark:text-white">
                                {p.teamName}
                              </h5>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                  isPending
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                                    : isApproved
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                      : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                                }`}
                              >
                                {isPending ? "⏳ MENUNGGU VERIFIKASI" : isApproved ? "✅ APPROVED" : "❌ REJECTED"}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>Kapten: <strong>@{p.leader.username || p.leader.name}</strong></span>
                              {p.phone && (
                                <>
                                  <span>•</span>
                                  <a
                                    href={`https://wa.me/${p.phone.replace(/\D/g, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-emerald-400 hover:underline flex items-center gap-1"
                                  >
                                    <Phone size={11} />
                                    <span>{p.phone}</span>
                                  </a>
                                </>
                              )}
                              {p.createdAt && (
                                <>
                                  <span>•</span>
                                  <span>{new Date(p.createdAt).toLocaleString("id-ID")}</span>
                                </>
                              )}
                            </p>
                          </div>

                          {/* Tombol Aksi Verifikasi */}
                          {isPending && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={verificationLoading === p.id}
                                onClick={() => handleVerificationAction(p.id, "APPROVE")}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-xs transition"
                              >
                                <CheckCircle size={14} />
                                <span>{verificationLoading === p.id ? "Memproses..." : "ACC & Masukkan ke Bagan"}</span>
                              </button>
                              <button
                                type="button"
                                disabled={verificationLoading === p.id}
                                onClick={() => handleVerificationAction(p.id, "REJECT")}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600/80 hover:bg-rose-600 text-white flex items-center gap-1 shadow-xs transition"
                              >
                                <X size={14} />
                                <span>Tolak</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Roster & Info Pembayaran */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-200/40 dark:border-white/5 text-xs">
                          {/* Info Pembayaran */}
                          <div className="space-y-1.5 p-2.5 rounded-lg bg-white/60 dark:bg-[#120F17]/60 border border-gray-200 dark:border-white/5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                              DATA PEMBAYARAN TRANSFER
                            </span>
                            <p className="text-gray-700 dark:text-gray-300">
                              Nama Pengirim / Pemilik Rekening:{" "}
                              <strong className="text-purple-400">{p.senderName || "- (Free Entry)"}</strong>
                            </p>
                            {p.rejectionReason && (
                              <p className="text-rose-400 text-[11px]">
                                Alasan Ditolak: <em>{p.rejectionReason}</em>
                              </p>
                            )}

                            {p.paymentProof ? (
                              <div className="pt-1.5">
                                <span className="text-[11px] font-semibold text-gray-400 block mb-1">
                                  Bukti Transfer (Klik untuk perbesar):
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedProofModal(p.paymentProof || null)}
                                  className="group relative inline-block rounded-lg overflow-hidden border border-purple-500/30 hover:border-purple-500 transition"
                                >
                                  <img
                                    src={p.paymentProof}
                                    alt="Bukti Transfer"
                                    className="w-28 h-20 object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Eye size={16} className="text-white" />
                                  </div>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic block">
                                Tidak ada lampiran gambar bukti (Turnamen Free Entry)
                              </span>
                            )}
                          </div>

                          {/* Susunan Pemain / Roster */}
                          <div className="space-y-1.5 p-2.5 rounded-lg bg-white/60 dark:bg-[#120F17]/60 border border-gray-200 dark:border-white/5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                              SUSUNAN PEMAIN ({mains.length} Inti {subs.length ? `+ ${subs.length} Cad` : ""})
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                              {mains.map((m, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20"
                                >
                                  {m.name} ({m.inGameId})
                                </span>
                              ))}
                              {subs.map((s, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                >
                                  [Cad] {s.name} ({s.inGameId})
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
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

                      <div className="grid grid-cols-12 gap-2">
                        {/* Kotak Kiri (col-span-7): Nickname In-Game */}
                        <div className="col-span-7">
                          <input
                            required
                            type="text"
                            value={player.nickname}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRegisterMainPlayers((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, nickname: val } : p))
                              );
                            }}
                            placeholder={idx === 0 ? "Nickname In-Game Kapten *" : `Nickname Pemain #${idx + 1} *`}
                            className="w-full px-3 py-2 rounded-md bg-white/[0.03] border border-[#211C2B] text-xs font-bold text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-[#9D4EDD]"
                          />
                        </div>

                        {/* Kotak Kanan (col-span-5): ID / Tag Game */}
                        <div className="col-span-5">
                          <input
                            required
                            type="text"
                            value={player.gameId}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRegisterMainPlayers((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, gameId: val } : p))
                              );
                            }}
                            placeholder="ID / Tag Game *"
                            className="w-full px-3 py-2 rounded-md bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 font-mono text-xs text-right text-purple-400 placeholder:text-purple-400/50 focus:outline-none focus:border-[#9D4EDD]"
                          />
                        </div>
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

                        <div className="grid grid-cols-12 gap-2">
                          {/* Kotak Kiri (col-span-7): Nickname In-Game */}
                          <div className="col-span-7">
                            <input
                              type="text"
                              value={sub.nickname}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRegisterSubPlayers((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, nickname: val } : p))
                                );
                              }}
                              placeholder={`Nickname Cadangan #${idx + 1} (Opsional)`}
                              className="w-full px-3 py-2 rounded-md bg-white/[0.03] border border-[#211C2B] text-xs text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          {/* Kotak Kanan (col-span-5): ID / Tag Game */}
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={sub.gameId}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRegisterSubPlayers((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, gameId: val } : p))
                                );
                              }}
                              placeholder="ID Game (Opsional)"
                              className="w-full px-3 py-2 rounded-md bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 font-mono text-xs text-right text-purple-400 placeholder:text-purple-400/50 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BAGIAN D: PEMBAYARAN QRIS (KHUSUS TURNAMEN BERBAYAR) */}
              {!registeringTournament.isFreeEntry && (registeringTournament.entryFee ?? 0) > 0 && (
                <div className="space-y-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/15">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <QrCode size={15} />
                      <span>Bagian D: Pembayaran Biaya Pendaftaran (QRIS)</span>
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400 text-black">
                      Rp {registeringTournament.entryFee?.toLocaleString("id-ID")}
                    </span>
                  </div>

                  {/* QRIS Official Box */}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#120F17] border border-amber-500/20 text-center flex flex-col items-center">
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                      Scan QRIS Resmi Kas Guild LogHorizon
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3 max-w-sm">
                      Dukung operasional &amp; prizepool turnamen. Transfer tepat sejumlah <strong>Rp {registeringTournament.entryFee?.toLocaleString("id-ID")}</strong> melalui e-wallet atau m-banking.
                    </p>
                    <div className="relative w-44 h-56 sm:w-52 sm:h-64 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 shadow-md bg-white">
                      <Image
                        src="/qris-guild.png"
                        alt="QRIS Resmi Guild LogHorizon"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  </div>

                  {/* 2 Kolom Verifikasi Pembayaran */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Kolom 1: Nama Pengirim */}
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                        1. Nama Pengirim / Pemilik Rekening *
                      </label>
                      <input
                        required
                        type="text"
                        value={registerSenderName}
                        onChange={(e) => setRegisterSenderName(e.target.value)}
                        placeholder="Contoh: Budi Santoso / Akun Dana"
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#120F17] border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-amber-400"
                      />
                      <span className="text-[10px] text-gray-400 mt-0.5 block">
                        Nama yang tertera pada mutasi transfer
                      </span>
                    </div>

                    {/* Kolom 2: Upload Gambar Bukti Bayar */}
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                        2. Upload Bukti Transfer (JPG/PNG/WebP) *
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleProofFileSelect}
                        className="w-full text-xs text-gray-500 dark:text-gray-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#9D4EDD] file:text-white hover:file:bg-[#8637c7] cursor-pointer"
                        required={!registerPaymentProof}
                      />
                      {compressingProof && (
                        <span className="text-[10px] text-purple-400 animate-pulse mt-1 block">
                          Mengompresi gambar bukti...
                        </span>
                      )}
                      {registerPaymentProof && (
                        <div className="mt-2 flex items-center gap-2">
                          <img
                            src={registerPaymentProof}
                            alt="Preview Bukti"
                            className="w-16 h-12 object-cover rounded border border-amber-400/50"
                          />
                          <button
                            type="button"
                            onClick={() => setRegisterPaymentProof("")}
                            className="text-[11px] text-rose-400 hover:underline"
                          >
                            Hapus &amp; Ganti
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 leading-relaxed">
                    ℹ️ <strong>Catatan:</strong> Pendaftaran turnamen berbayar akan masuk status antrean <em>Menunggu Verifikasi</em>. Tim kamu akan resmi dimasukkan ke bagan turnamen setelah panitia mengecek bukti transfer kas.
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
                  disabled={submittingRegistration || compressingProof}
                  className="button button-primary text-xs font-bold"
                >
                  {submittingRegistration
                    ? "Mengirim Pendaftaran…"
                    : registeringTournament.isFreeEntry || !registeringTournament.entryFee
                      ? "Konfirmasi & Daftarkan Tim"
                      : "Kirim Pendaftaran & Bukti Transfer"}
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
                    <div className="space-y-2">
                      {mainList.map((player, idx) => (
                        <RosterPlayerRow
                          key={idx}
                          index={idx + 1}
                          name={player.name}
                          inGameId={player.inGameId}
                          isCaptain={idx === 0}
                          isSub={false}
                        />
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
                      <div className="space-y-2">
                        {subList.map((player, idx) => (
                          <RosterPlayerRow
                            key={idx}
                            index={idx + 1}
                            name={player.name}
                            inGameId={player.inGameId}
                            isCaptain={false}
                            isSub={true}
                          />
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
                    viewingRoster.players.map((player, idx) => {
                      const match = player.match(/^(.*?)\s*\((.*?)\)$/);
                      const pName = match ? match[1] : player;
                      const pId = match ? match[2] : "-";
                      return (
                        <RosterPlayerRow
                          key={idx}
                          index={idx + 1}
                          name={pName}
                          inGameId={pId}
                          isCaptain={idx === 0}
                          isSub={false}
                        />
                      );
                    })
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

      {/* LIGHTBOX BUKTI PEMBAYARAN QRIS */}
      {selectedProofModal && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedProofModal(null)}
        >
          <div
            className="relative max-w-xl max-h-[90vh] bg-white dark:bg-[#120F17] border border-gray-300 dark:border-white/20 rounded-2xl p-4 shadow-2xl flex flex-col items-center my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedProofModal(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white bg-black/40 rounded-full p-1.5 transition"
            >
              <X size={18} />
            </button>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-3 self-start flex items-center gap-2">
              <QrCode size={16} className="text-[#9D4EDD]" />
              <span>Bukti Transfer QRIS Pendaftaran Turnamen</span>
            </p>
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 max-h-[72vh] flex items-center justify-center bg-black/50">
              <img
                src={selectedProofModal}
                alt="Bukti Transfer QRIS"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* GACHA / RANDOMIZE BRACKET VISUAL DRAW MODAL */}
      <GachaBracketModal
        isOpen={gachaModalState.isOpen}
        tournamentTitle={gachaModalState.tournamentTitle}
        isRolling={gachaModalState.isRolling}
        teamsList={gachaModalState.teamsList}
        onFinish={() => setGachaModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* MANDATORY TOURNAMENT RULES AGREEMENT MODAL */}
      {rulesGateTournament && (
        <TournamentRulesModal
          isOpen={Boolean(rulesGateTournament)}
          tournamentTitle={rulesGateTournament.title}
          game={rulesGateTournament.game}
          rules={rulesGateTournament.rules}
          onClose={() => setRulesGateTournament(null)}
          onAgree={handleRulesAgreed}
        />
      )}
      {/* QUICK MATCH SCORE & FINISH MODAL */}
      <QuickMatchScoreModal
        isOpen={Boolean(quickScoreModalMatch)}
        match={quickScoreModalMatch?.match || null}
        onClose={() => setQuickScoreModalMatch(null)}
        onSave={handleSaveQuickScore}
      />
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
  isAdminOrMod = false,
  onAdminQuickUpdate,
}: {
  match: TournamentMatch;
  teams: TournamentTeam[];
  isFinal?: boolean;
  onTeamClick: (team: TournamentTeam) => void;
  isAdminOrMod?: boolean;
  onAdminQuickUpdate?: (matchId: string, action: "SET_LIVE" | "FINISH_MATCH") => void;
}) {
  const teamAData = teams.find((t) => t.teamName.toLowerCase() === match.teamA.name.toLowerCase() || t.id === match.teamA.id);
  const teamBData = teams.find((t) => t.teamName.toLowerCase() === match.teamB.name.toLowerCase() || t.id === match.teamB.id);

  const hasWinner = Boolean(match.winner);
  const isWinnerA = Boolean(hasWinner && match.winner?.toLowerCase() === match.teamA.name.toLowerCase());
  const isWinnerB = Boolean(hasWinner && match.winner?.toLowerCase() === match.teamB.name.toLowerCase());
  const isLoserA = Boolean(hasWinner && !isWinnerA && match.teamA.name && match.teamA.name !== "TBD");
  const isLoserB = Boolean(hasWinner && !isWinnerB && match.teamB.name && match.teamB.name !== "TBD" && match.teamB.name !== "BYE");

  const isLive = match.matchStatus === "LIVE" && !hasWinner;
  const isFinished = match.matchStatus === "FINISHED" || hasWinner || (match.teamA.score > 0 || match.teamB.score > 0);
  const isUpcoming = !isLive && !isFinished;

  return (
    <div
      className={`rounded-xl border transition-all ${
        isLive
          ? "border-[#9D4EDD] shadow-[0_0_15px_rgba(157,78,221,0.35)] ring-1 ring-[#9D4EDD] bg-gradient-to-b from-purple-950/25 via-[#130F1A] to-[#0E0B14]"
          : isFinal
          ? "border-amber-500/40 bg-amber-950/10 shadow-amber-950/20 shadow-lg"
          : "border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#0E0B14] hover:border-[#9D4EDD]/50"
      } p-3 relative overflow-hidden`}
    >
      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-gray-100 dark:border-[#211C2B]/80 text-[10px] font-mono">
        <span className="font-bold flex items-center gap-1 text-gray-400">
          {isFinal && <Crown size={12} className="text-amber-400" />}
          <span>{match.roundName}</span>
        </span>

        {/* Status Badge */}
        {isLive ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-[9px] animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            <span>SEDANG BERMAIN</span>
          </span>
        ) : isFinished ? (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold text-[9px]">
            ✓ ROUND SELESAI
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-gray-500/10 border border-gray-500/20 text-gray-400 text-[9px]">
            ⏳ {match.schedule ? match.schedule : "MENUNGGU JADWAL"}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {/* TEAM A */}
        <div
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all ${
            isWinnerA
              ? "bg-emerald-500/15 border border-emerald-500/40 border-l-4 border-l-emerald-400 text-white font-bold shadow-xs"
              : isLoserA
              ? "opacity-40 grayscale text-zinc-500 line-through decoration-zinc-600/60 bg-black/10 dark:bg-black/30"
              : "bg-gray-50 dark:bg-[#161220] text-gray-800 dark:text-gray-200"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => teamAData && onTeamClick(teamAData)}
              className={`text-xs truncate max-w-[135px] text-left hover:underline ${
                isWinnerA ? "text-white font-bold" : isLoserA ? "text-zinc-500" : ""
              }`}
              title={teamAData ? "Klik untuk melihat susunan pemain" : undefined}
            >
              {match.teamA.name || "TBD"}
            </button>
            {isWinnerA && (
              <span className="text-[9px] font-mono font-bold text-emerald-400 shrink-0">
                ✓ LOLOS
              </span>
            )}
          </div>
          <span
            className={`text-xs font-mono px-1.5 py-0.5 rounded ml-2 ${
              isWinnerA
                ? "bg-emerald-500/30 text-white font-black"
                : isLoserA
                ? "bg-black/20 text-zinc-500"
                : "bg-black/20 font-bold"
            }`}
          >
            {match.teamA.score}
          </span>
        </div>

        {/* TEAM B */}
        <div
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all ${
            isWinnerB
              ? "bg-emerald-500/15 border border-emerald-500/40 border-l-4 border-l-emerald-400 text-white font-bold shadow-xs"
              : isLoserB
              ? "opacity-40 grayscale text-zinc-500 line-through decoration-zinc-600/60 bg-black/10 dark:bg-black/30"
              : match.teamB.name === "BYE"
              ? "bg-gray-100/40 dark:bg-[#120F17]/40 text-gray-400 dark:text-gray-500 italic"
              : "bg-gray-50 dark:bg-[#161220] text-gray-800 dark:text-gray-200"
          }`}
        >
          {match.teamB.name === "BYE" ? (
            <span className="text-[11px] font-mono text-gray-400 italic">BYE (Lolos Otomatis)</span>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => teamBData && onTeamClick(teamBData)}
                className={`text-xs truncate max-w-[135px] text-left hover:underline ${
                  isWinnerB ? "text-white font-bold" : isLoserB ? "text-zinc-500" : ""
                }`}
                title={teamBData ? "Klik untuk melihat susunan pemain" : undefined}
              >
                {match.teamB.name || "TBD"}
              </button>
              {isWinnerB && (
                <span className="text-[9px] font-mono font-bold text-emerald-400 shrink-0">
                  ✓ LOLOS
                </span>
              )}
            </div>
          )}
          <span
            className={`text-xs font-mono px-1.5 py-0.5 rounded ml-2 ${
              isWinnerB
                ? "bg-emerald-500/30 text-white font-black"
                : isLoserB
                ? "bg-black/20 text-zinc-500"
                : "bg-black/20 font-bold"
            }`}
          >
            {match.teamB.name === "BYE" ? "-" : match.teamB.score}
          </span>
        </div>
      </div>

      {/* Admin Quick Control Toolbar on Match Card */}
      {isAdminOrMod && onAdminQuickUpdate && !hasWinner && (
        <div className="pt-2 mt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-1 text-[10px]">
          {match.matchStatus !== "LIVE" ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAdminQuickUpdate(match.matchId, "SET_LIVE");
              }}
              className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 hover:bg-red-500/30 font-bold flex items-center gap-1 transition"
              title="Set status pertandingan ke LIVE"
            >
              🔴 Set LIVE
            </button>
          ) : (
            <span className="text-red-400 font-bold flex items-center gap-1 text-[9px]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
              LIVE
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdminQuickUpdate(match.matchId, "FINISH_MATCH");
            }}
            className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 hover:bg-purple-500/30 font-bold ml-auto transition"
            title="Update skor & tentukan pemenang pertandingan"
          >
            ⚡ Update Skor
          </button>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// SUB-KOMPONEN CONNECTOR: GARIS PENGHUBUNG SIKU SIMETRIS BAGAN TURNAMEN
// =========================================================================

function LeftSemiToFinalConnector({ match }: { match?: TournamentMatch }) {
  const hasWinner = Boolean(match?.winner);
  return (
    <div className="w-8 sm:w-11 shrink-0 flex flex-col">
      <div
        className="h-10 text-center pb-1.5 border-b border-transparent shrink-0 mb-3 select-none opacity-0 flex flex-col justify-center"
        aria-hidden="true"
      >
        <span className="text-[10px] block">Sayap</span>
        <p className="text-[11px]">Ronde</p>
      </div>
      <div className="flex-1 flex items-center justify-center relative py-1">
        <svg className="w-full h-8 overflow-visible" viewBox="0 0 40 20" preserveAspectRatio="none">
          <defs>
            <filter id="bracketGlowLeftFinal" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#9D4EDD" floodOpacity="0.9" />
            </filter>
          </defs>
          <line
            x1="0"
            y1="10"
            x2="40"
            y2="10"
            className={hasWinner ? "stroke-[#9D4EDD]" : "stroke-[#9D4EDD]/40"}
            stroke={hasWinner ? "#9D4EDD" : "rgba(157, 78, 221, 0.4)"}
            strokeWidth={hasWinner ? "2.5" : "1.5"}
            vectorEffect="non-scaling-stroke"
            filter={hasWinner ? "url(#bracketGlowLeftFinal)" : undefined}
          />
          {hasWinner && <circle cx="37" cy="10" r="2.5" className="fill-[#C77DFF]" fill="#C77DFF" />}
        </svg>
      </div>
    </div>
  );
}

function RightFinalToSemiConnector({ match }: { match?: TournamentMatch }) {
  const hasWinner = Boolean(match?.winner);
  return (
    <div className="w-8 sm:w-11 shrink-0 flex flex-col">
      <div
        className="h-10 text-center pb-1.5 border-b border-transparent shrink-0 mb-3 select-none opacity-0 flex flex-col justify-center"
        aria-hidden="true"
      >
        <span className="text-[10px] block">Sayap</span>
        <p className="text-[11px]">Ronde</p>
      </div>
      <div className="flex-1 flex items-center justify-center relative py-1">
        <svg className="w-full h-8 overflow-visible" viewBox="0 0 40 20" preserveAspectRatio="none">
          <defs>
            <filter id="bracketGlowRightFinal" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#9D4EDD" floodOpacity="0.9" />
            </filter>
          </defs>
          <line
            x1="0"
            y1="10"
            x2="40"
            y2="10"
            className={hasWinner ? "stroke-[#9D4EDD]" : "stroke-[#9D4EDD]/40"}
            stroke={hasWinner ? "#9D4EDD" : "rgba(157, 78, 221, 0.4)"}
            strokeWidth={hasWinner ? "2.5" : "1.5"}
            vectorEffect="non-scaling-stroke"
            filter={hasWinner ? "url(#bracketGlowRightFinal)" : undefined}
          />
          {hasWinner && <circle cx="3" cy="10" r="2.5" className="fill-[#C77DFF]" fill="#C77DFF" />}
        </svg>
      </div>
    </div>
  );
}

function LeftElbowConnectorColumn({
  matches,
  rNum,
}: {
  matches: TournamentMatch[];
  rNum: number;
}) {
  const pairCount = Math.max(1, Math.floor(matches.length / 2));
  const pairs = Array.from({ length: pairCount }, (_, i) => ({
    upper: matches[i * 2],
    lower: matches[i * 2 + 1],
  }));

  return (
    <div className="w-8 sm:w-11 shrink-0 flex flex-col">
      <div
        className="h-10 text-center pb-1.5 border-b border-transparent shrink-0 mb-3 select-none opacity-0 flex flex-col justify-center"
        aria-hidden="true"
      >
        <span className="text-[10px] block">Sayap</span>
        <p className="text-[11px]">Ronde</p>
      </div>
      <div className="flex-1 flex flex-col justify-around py-1">
        {pairs.map((p, idx) => {
          const upperActive = Boolean(p.upper?.winner);
          const lowerActive = Boolean(p.lower?.winner);
          const stemActive = upperActive || lowerActive;
          const filterId = `bracketGlowL-${rNum}-${idx}`;

          return (
            <div key={idx} className="flex-1 flex flex-col justify-center relative min-h-[90px] w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 40 100" preserveAspectRatio="none">
                <defs>
                  <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#9D4EDD" floodOpacity="0.9" />
                  </filter>
                </defs>
                {/* Cabang Atas */}
                <path
                  d="M 0 25 L 20 25 L 20 50"
                  fill="none"
                  className={upperActive ? "stroke-[#9D4EDD]" : "stroke-[#9D4EDD]/40"}
                  stroke={upperActive ? "#9D4EDD" : "rgba(157, 78, 221, 0.4)"}
                  strokeWidth={upperActive ? "2.5" : "1.5"}
                  vectorEffect="non-scaling-stroke"
                  filter={upperActive ? `url(#${filterId})` : undefined}
                />
                {/* Cabang Bawah */}
                <path
                  d="M 0 75 L 20 75 L 20 50"
                  fill="none"
                  className={lowerActive ? "stroke-[#9D4EDD]" : "stroke-[#9D4EDD]/40"}
                  stroke={lowerActive ? "#9D4EDD" : "rgba(157, 78, 221, 0.4)"}
                  strokeWidth={lowerActive ? "2.5" : "1.5"}
                  vectorEffect="non-scaling-stroke"
                  filter={lowerActive ? `url(#${filterId})` : undefined}
                />
                {/* Tangkai Tengah Masuk ke Ronde Berikutnya */}
                <path
                  d="M 20 50 L 40 50"
                  fill="none"
                  className={stemActive ? "stroke-[#9D4EDD]" : "stroke-[#9D4EDD]/40"}
                  stroke={stemActive ? "#9D4EDD" : "rgba(157, 78, 221, 0.4)"}
                  strokeWidth={stemActive ? "2.5" : "1.5"}
                  vectorEffect="non-scaling-stroke"
                  filter={stemActive ? `url(#${filterId})` : undefined}
                />
                {stemActive && <circle cx="37" cy="50" r="2.5" className="fill-[#C77DFF]" fill="#C77DFF" />}
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RightElbowConnectorColumn({
  matches,
  rNum,
}: {
  matches: TournamentMatch[];
  rNum: number;
}) {
  const pairCount = Math.max(1, Math.floor(matches.length / 2));
  const pairs = Array.from({ length: pairCount }, (_, i) => ({
    upper: matches[i * 2],
    lower: matches[i * 2 + 1],
  }));

  return (
    <div className="w-8 sm:w-11 shrink-0 flex flex-col">
      <div
        className="h-10 text-center pb-1.5 border-b border-transparent shrink-0 mb-3 select-none opacity-0 flex flex-col justify-center"
        aria-hidden="true"
      >
        <span className="text-[10px] block">Sayap</span>
        <p className="text-[11px]">Ronde</p>
      </div>
      <div className="flex-1 flex flex-col justify-around py-1">
        {pairs.map((p, idx) => {
          const upperActive = Boolean(p.upper?.winner);
          const lowerActive = Boolean(p.lower?.winner);
          const stemActive = upperActive || lowerActive;
          const filterId = `bracketGlowR-${rNum}-${idx}`;

          return (
            <div key={idx} className="flex-1 flex flex-col justify-center relative min-h-[90px] w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 40 100" preserveAspectRatio="none">
                <defs>
                  <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#9D4EDD" floodOpacity="0.9" />
                  </filter>
                </defs>
                {/* Cabang Atas dari Kanan Masuk ke Tengah */}
                <path
                  d="M 40 25 L 20 25 L 20 50"
                  fill="none"
                  className={upperActive ? "stroke-[#9D4EDD]" : "stroke-[#9D4EDD]/40"}
                  stroke={upperActive ? "#9D4EDD" : "rgba(157, 78, 221, 0.4)"}
                  strokeWidth={upperActive ? "2.5" : "1.5"}
                  vectorEffect="non-scaling-stroke"
                  filter={upperActive ? `url(#${filterId})` : undefined}
                />
                {/* Cabang Bawah dari Kanan Masuk ke Tengah */}
                <path
                  d="M 40 75 L 20 75 L 20 50"
                  fill="none"
                  className={lowerActive ? "stroke-[#9D4EDD]" : "stroke-[#9D4EDD]/40"}
                  stroke={lowerActive ? "#9D4EDD" : "rgba(157, 78, 221, 0.4)"}
                  strokeWidth={lowerActive ? "2.5" : "1.5"}
                  vectorEffect="non-scaling-stroke"
                  filter={lowerActive ? `url(#${filterId})` : undefined}
                />
                {/* Tangkai Tengah Masuk ke Kiri (Ronde Terdalam) */}
                <path
                  d="M 20 50 L 0 50"
                  fill="none"
                  className={stemActive ? "stroke-[#9D4EDD]" : "stroke-[#9D4EDD]/40"}
                  stroke={stemActive ? "#9D4EDD" : "rgba(157, 78, 221, 0.4)"}
                  strokeWidth={stemActive ? "2.5" : "1.5"}
                  vectorEffect="non-scaling-stroke"
                  filter={stemActive ? `url(#${filterId})` : undefined}
                />
                {stemActive && <circle cx="3" cy="50" r="2.5" className="fill-[#C77DFF]" fill="#C77DFF" />}
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =========================================================================
// SUB-KOMPONEN: BAGAN SIMETRIS SPLIT DUAL-WING (SAYAP KIRI - TENGAH - SAYAP KANAN)
// =========================================================================
export function ChampionCelebrationCard({
  winnerName,
  teams,
}: {
  winnerName: string;
  teams: TournamentTeam[];
}) {
  const winningTeam = teams.find(
    (t) => t.teamName.toLowerCase() === winnerName.toLowerCase() || t.id === winnerName
  );
  const playersList =
    winningTeam?.mainPlayers?.map((p) => (typeof p === "string" ? p : p.name)).filter(Boolean) ||
    winningTeam?.players?.map((p) => p.replace(/\s*\(.*?\)$/, "")).filter(Boolean) ||
    [];

  return (
    <div className="p-4 rounded-xl border-2 border-amber-500/80 bg-gradient-to-b from-amber-500/25 via-[#1a1424] to-amber-950/40 text-center shadow-[0_0_25px_rgba(234,179,8,0.25)] animate-in zoom-in-95 duration-300 space-y-2">
      <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-400/60 shadow-[0_0_15px_rgba(234,179,8,0.4)]">
        <Trophy size={20} className="text-amber-300 animate-pulse" />
      </div>
      <div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-extrabold block">
          🏆 JUARA 1 TURNAMEN 🏆
        </span>
        <h4 className="text-base sm:text-lg font-black text-amber-200 mt-0.5 tracking-wide drop-shadow-[0_2px_10px_rgba(234,179,8,0.5)] truncate">
          {winnerName}
        </h4>
        {winningTeam?.captainName && (
          <p className="text-[11px] text-amber-300/80 font-mono mt-0.5">
            Kapten: <span className="text-white font-bold">{winningTeam.captainName}</span>
          </p>
        )}
      </div>

      {playersList.length > 0 && (
        <div className="pt-2 border-t border-amber-500/20">
          <p className="text-[9px] font-mono uppercase text-amber-400/70 tracking-wider mb-1.5 font-bold">
            Roster Pemenang:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1 max-h-24 overflow-y-auto">
            {playersList.map((pName, pIdx) => (
              <span
                key={pIdx}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 border border-amber-500/30 text-amber-200"
              >
                {pName}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DualWingBracketView({
  sortedRoundNumbers,
  roundsMap,
  teams,
  onTeamClick,
  isAdminOrMod = false,
  onAdminQuickUpdate,
}: {
  sortedRoundNumbers: number[];
  roundsMap: Map<number, TournamentMatch[]>;
  teams: TournamentTeam[];
  onTeamClick: (team: TournamentTeam) => void;
  isAdminOrMod?: boolean;
  onAdminQuickUpdate?: (matchId: string, action: "SET_LIVE" | "FINISH_MATCH") => void;
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
            <MatchCard
              match={gfMatch}
              teams={teams}
              isFinal={true}
              onTeamClick={onTeamClick}
              isAdminOrMod={isAdminOrMod}
              onAdminQuickUpdate={onAdminQuickUpdate}
            />
          )}
          {gfMatch?.winner && (
            <ChampionCelebrationCard winnerName={gfMatch.winner} teams={teams} />
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
  const semiRoundNum = finalRoundNum - 1;
  const semiMatches = roundsMap.get(semiRoundNum) || [];
  const semiHalf = Math.ceil(semiMatches.length / 2);
  const semiLeftMatch = semiMatches.slice(0, semiHalf)[0];
  const semiRightMatch = semiMatches.slice(semiHalf)[0] || semiMatches[1];

  const reversedPreliminaryRounds = [...preliminaryRounds].reverse();
  const totalCols = preliminaryRounds.length * 2 + 1;
  const totalConnectors = preliminaryRounds.length * 2;
  const minWidthPx = Math.max(920, totalCols * 260 + totalConnectors * 40);

  return (
    <div
      className="flex items-stretch gap-1 sm:gap-2 pb-4 pt-2 select-none"
      style={{ minWidth: `${minWidthPx}px` }}
    >
      {/* 1. SAYAP KIRI (LEFT WING): Ronde 1 -> Ronde 2 -> ... -> Semifinal Kiri */}
      {preliminaryRounds.map((rNum) => {
        const roundMatches = roundsMap.get(rNum) || [];
        const half = Math.ceil(roundMatches.length / 2);
        const leftMatches = roundMatches.slice(0, half);
        const isSemi = rNum === semiRoundNum;
        const baseName = roundMatches[0]?.roundName?.replace(/\s*\d+$/, "") || `Ronde ${rNum}`;
        const heading = isSemi ? "Semifinal Kiri ➔" : `${baseName} (Kiri) ➔`;

        return (
          <Fragment key={`left-group-${rNum}`}>
            <div className="flex-1 flex flex-col min-w-[240px]">
              <div className="h-10 text-center pb-1.5 border-b border-purple-500/30 shrink-0 mb-3 flex flex-col justify-center">
                <span className="text-[10px] font-mono text-purple-400/70 uppercase tracking-widest block">
                  Sayap Kiri
                </span>
                <p className="text-[11px] font-mono font-bold text-purple-300 uppercase tracking-wider">
                  {heading}
                </p>
              </div>
              <div className="flex-1 flex flex-col justify-around gap-4 py-1">
                {leftMatches.map((m) => (
                  <MatchCard
                    key={m.matchId}
                    match={m}
                    teams={teams}
                    isFinal={false}
                    onTeamClick={onTeamClick}
                    isAdminOrMod={isAdminOrMod}
                    onAdminQuickUpdate={onAdminQuickUpdate}
                  />
                ))}
              </div>
            </div>

            {/* Garis Penghubung Siku Keluar ke Kanan */}
            {isSemi ? (
              <LeftSemiToFinalConnector match={semiLeftMatch} />
            ) : (
              <LeftElbowConnectorColumn matches={leftMatches} rNum={rNum} />
            )}
          </Fragment>
        );
      })}

      {/* 2. TENGAH (CENTER STAGE): Kotak GRAND FINAL & PODIUM JUARA 1 */}
      <div className="flex-1 flex flex-col min-w-[260px] max-w-[300px] px-3 py-4 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-[#130F1A] to-purple-950/20 shadow-2xl shadow-amber-950/20">
        <div className="h-10 text-center pb-2 border-b border-amber-500/30 shrink-0 mb-3 flex flex-col justify-center">
          <span className="text-[10px] font-mono text-amber-400/80 uppercase tracking-widest block font-bold">
            ⚔️ TITIK TEMU FINAL ⚔️
          </span>
          <p className="text-xs sm:text-sm font-mono font-black text-amber-400 uppercase tracking-wider flex items-center justify-center gap-1.5 mt-0.5">
            <Crown size={15} className="text-amber-400 animate-bounce" />
            <span>GRAND FINAL 🏆</span>
          </p>
        </div>

        <div className="flex-1 flex flex-col justify-center space-y-4 py-1">
          {gfMatch ? (
            <MatchCard
              match={gfMatch}
              teams={teams}
              isFinal={true}
              onTeamClick={onTeamClick}
              isAdminOrMod={isAdminOrMod}
              onAdminQuickUpdate={onAdminQuickUpdate}
            />
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">Menunggu babak final</p>
          )}

          {/* Podium Juara 1 */}
          {gfMatch?.winner && (
            <ChampionCelebrationCard winnerName={gfMatch.winner} teams={teams} />
          )}
        </div>
      </div>

      {/* 3. SAYAP KANAN (RIGHT WING): Semifinal Kanan <- ... <- Ronde 2 <- Ronde 1 (Mirrored) */}
      <RightFinalToSemiConnector match={semiRightMatch} />

      {reversedPreliminaryRounds.map((rNum) => {
        const roundMatches = roundsMap.get(rNum) || [];
        const half = Math.ceil(roundMatches.length / 2);
        const rightMatches = roundMatches.slice(half);
        const isSemi = rNum === semiRoundNum;
        const baseName = roundMatches[0]?.roundName?.replace(/\s*\d+$/, "") || `Ronde ${rNum}`;
        const heading = isSemi ? "⬅ Semifinal Kanan" : `⬅ ${baseName} (Kanan)`;

        return (
          <Fragment key={`right-group-${rNum}`}>
            {/* Jika bukan semifinal (misal QF atau R1), render connector siku di sebelah kiri match card-nya */}
            {!isSemi && <RightElbowConnectorColumn matches={rightMatches} rNum={rNum} />}

            <div className="flex-1 flex flex-col min-w-[240px]">
              <div className="h-10 text-center pb-1.5 border-b border-purple-500/30 shrink-0 mb-3 flex flex-col justify-center">
                <span className="text-[10px] font-mono text-purple-400/70 uppercase tracking-widest block">
                  Sayap Kanan
                </span>
                <p className="text-[11px] font-mono font-bold text-purple-300 uppercase tracking-wider">
                  {heading}
                </p>
              </div>
              <div className="flex-1 flex flex-col justify-around gap-4 py-1">
                {rightMatches.map((m) => (
                  <MatchCard
                    key={m.matchId}
                    match={m}
                    teams={teams}
                    isFinal={false}
                    onTeamClick={onTeamClick}
                    isAdminOrMod={isAdminOrMod}
                    onAdminQuickUpdate={onAdminQuickUpdate}
                  />
                ))}
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
