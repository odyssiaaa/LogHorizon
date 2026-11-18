"use client";

import { FormEvent, Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Award,
  Calendar,
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
  FileCode,
  FileSpreadsheet,
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
import { advanceMatchWinner, resetMatchResult, updateMatchStatus, TournamentMatch, TournamentTeam, TournamentRosterPlayer, TournamentLossReason, DEFAULT_TOURNAMENT_RULES, evaluateAutoLiveMatches, formatMatchScheduleDisplay, isoToDateTimeLocal, dateTimeLocalToIso, formatWibDateTime, formatLiveCountdown, extractTournamentPodium } from "@/lib/tournament";
import { DragScrollContainer } from "@/components/drag-scroll-container";
import { ShareButton } from "@/components/share-button";
import { GachaBracketModal } from "@/components/gacha-bracket-modal";
import { TournamentRulesModal } from "@/components/tournament-rules-modal";
import { RosterPlayerRow } from "@/components/roster-player-row";
import { QuickMatchScoreModal } from "@/components/quick-match-score-modal";
import { ImageUploader } from "@/components/ui/image-uploader";
import { MatchLobbyModal } from "@/components/match-lobby-modal";
import { BracketZoomControl } from "@/components/bracket-zoom-control";
import { EditTournamentModal } from "@/components/edit-tournament-modal";
import { TournamentBackupDropdown } from "@/components/tournament-backup-dropdown";
import { StaffCardModerationMenu } from "@/components/staff-moderation-dropdown";
import { exportTournamentToCsv, exportTournamentToJson } from "@/lib/tournament-export";
import { useLiveSync } from "@/hooks/use-live-sync";

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
  completedAt?: string | null;
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

export function TournamentCardCountdownBadge({
  eventDate,
  status,
}: {
  eventDate?: string | Date;
  status: string;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (status === "COMPLETED") {
    return (
      <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
        ● SELESAI
      </span>
    );
  }

  const target = eventDate ? new Date(eventDate).getTime() : NaN;
  const diff = !isNaN(target) ? target - now : 1;

  if (status === "ONGOING" || diff <= 0) {
    return (
      <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/30 animate-pulse flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
        ● SEDANG BERMAIN (LIVE)
      </span>
    );
  }

  const countdown = formatLiveCountdown(eventDate, now);

  return (
    <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse flex items-center gap-1">
      ⏳ Mulai dalam: {countdown.formatted}
    </span>
  );
}

export function EventsBoard() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");

  const [activeTab, setActiveTab] = useState<"all" | "mabar" | "turnamen">("all");
  const [tournamentSubTab, setTournamentSubTab] = useState<"active" | "history">("active");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [lfgPosts, setLfgPosts] = useState<LfgPost[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Update currentTime periodically for live cooldown countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Hitung jumlah party aktif milik user dan sisa cooldown 10 menit
  const isOwner = session?.user?.username?.toLowerCase() === ".odyssia" || session?.user?.username?.toLowerCase() === "odyssia";
  const myActiveParties = lfgPosts.filter(
    (p) => p.isOwner && p.expiresAt && new Date(p.expiresAt).getTime() > currentTime
  );
  const myActiveCount = myActiveParties.length;
  const isQuotaFull = myActiveCount >= 3;

  // Cek party terakhir milik user untuk hitung mundur cooldown
  const myLatestParty = lfgPosts
    .filter((p) => p.isOwner && p.createdAt)
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())[0];

  const cooldownRemainingSeconds = (() => {
    if (isOwner || !myLatestParty || !myLatestParty.createdAt) return 0;
    const diffMs = currentTime - new Date(myLatestParty.createdAt).getTime();
    const cooldownMs = 10 * 60 * 1000;
    return diffMs < cooldownMs ? Math.ceil((cooldownMs - diffMs) / 1000) : 0;
  })();

  const isCooldownActive = cooldownRemainingSeconds > 0;

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

  // Search & Filter State for Manage Tournament Modal
  const [adminMatchSearch, setAdminMatchSearch] = useState("");
  const [adminMatchFilter, setAdminMatchFilter] = useState<"ALL" | "LIVE" | "UNFINISHED">("ALL");

  // Search State for Public Bracket Tree (per tournamentId)
  const [bracketSearchQueries, setBracketSearchQueries] = useState<Record<string, string>>({});
  // Zoom State for Bracket Tree (per tournamentId, default 1.0 on desktop, 0.75 on mobile < 640px)
  const [bracketZoomLevels, setBracketZoomLevels] = useState<Record<string, number>>({});

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setBracketZoomLevels((prev) => {
        const next: Record<string, number> = { ...prev };
        tournaments.forEach((t) => {
          if (next[t.id] === undefined) {
            next[t.id] = 0.75;
          }
        });
        return next;
      });
    }
  }, [tournaments]);
  const [massScheduleRound, setMassScheduleRound] = useState<number>(1);
  const [massScheduleInput, setMassScheduleInput] = useState<string>("");
  const [activeLobbyMatch, setActiveLobbyMatch] = useState<{ tournamentId: string; match: TournamentMatch } | null>(null);
  const [editingTournament, setEditingTournament] = useState<any | null>(null);
  const pausePollingUntilRef = useRef<number>(0);

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

  // Instant Real-Time sync on custom events (e.g. from Satpam AI Co-Pilot creation)
  useEffect(() => {
    const handleLfgRefresh = () => {
      setRefreshKey((prev) => prev + 1);
    };
    window.addEventListener("lh:lfg-refresh", handleLfgRefresh);
    return () => window.removeEventListener("lh:lfg-refresh", handleLfgRefresh);
  }, []);

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

  // Sync seconds ago counter
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setSyncSecondsAgo(Math.max(0, Math.floor((Date.now() - lastSyncTime) / 1000)));
    }, 1000);
    return () => clearInterval(tickInterval);
  }, [lastSyncTime]);

  // SMART AUTO-POLLING (useLiveSync berbasis Silent JSON Diffing)
  useLiveSync(
    async () => {
      if (Date.now() < pausePollingUntilRef.current) return;

      try {
        const [freshTournaments, freshLfg] = await Promise.all([
          fetch(`/api/tournaments?t=${Date.now()}`, {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          }).then((r) => (r.ok ? r.json() : null)),
          fetch(`/api/lfg?t=${Date.now()}`, {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          }).then((r) => (r.ok ? r.json() : null)),
        ]);

        if (Array.isArray(freshTournaments)) {
          setTournaments((prev) => (JSON.stringify(prev) === JSON.stringify(freshTournaments) ? prev : freshTournaments));
          setLastSyncTime(Date.now());
          setSyncSecondsAgo(0);

          if (managingTournament) {
            const current = freshTournaments.find((t: Tournament) => t.id === managingTournament.id);
            if (current) {
              setManagingTournament((prev) => (JSON.stringify(prev) === JSON.stringify(current) ? prev : { ...prev, ...current }));
              setManageMatches((prev) => {
                const freshMatches = current.matches || [];
                return JSON.stringify(prev) === JSON.stringify(freshMatches) ? prev : freshMatches;
              });
              setManageTeams((prev) => {
                const freshTeams = current.teams || [];
                return JSON.stringify(prev) === JSON.stringify(freshTeams) ? prev : freshTeams;
              });
            }
          }
        }

        if (Array.isArray(freshLfg)) {
          setLfgPosts((prev) => (JSON.stringify(prev) === JSON.stringify(freshLfg) ? prev : freshLfg));
        }
      } catch {
        // Silently skip transient network failure during background polling
      }
    },
    { intervalMs: 5000, revalidateOnFocus: true }
  );

  // Optimistic Quick Update handler for bracket card admin action buttons
  function handleAdminQuickUpdate(
    tournamentId: string,
    matchId: string,
    action: "SET_LIVE" | "CANCEL_LIVE" | "RESET_MATCH" | "FINISH_MATCH"
  ) {
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
    } else if (action === "CANCEL_LIVE") {
      // 0ms Optimistic UI update
      const updatedMatches = updateMatchStatus(targetTournament.matches || [], matchId, "UPCOMING");
      setTournaments((prev) =>
        prev.map((t) => (t.id === tournamentId ? { ...t, matches: updatedMatches } : t))
      );
      if (managingTournament && managingTournament.id === tournamentId) {
        setManageMatches(updatedMatches);
        setManagingTournament((prev) => (prev ? { ...prev, matches: updatedMatches } : prev));
      }
      setNotice(`Status LIVE Match #${match.matchId} dibatalkan (kembali menunggu).`);

      // Background DB Sync
      fetch(`/api/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, matchStatus: "UPCOMING", manualOverride: true }),
      }).catch((err) => {
        console.error("Gagal batalkan match status LIVE:", err);
      });
    } else if (action === "RESET_MATCH") {
      // 0ms Optimistic UI rollback
      const updatedMatches = resetMatchResult(targetTournament.matches || [], matchId);
      setTournaments((prev) =>
        prev.map((t) => (t.id === tournamentId ? { ...t, matches: updatedMatches } : t))
      );
      if (managingTournament && managingTournament.id === tournamentId) {
        setManageMatches(updatedMatches);
        setManagingTournament((prev) => (prev ? { ...prev, matches: updatedMatches } : prev));
      }
      setNotice(`Match #${match.matchId} direset & kunci pertandingan dibuka kembali.`);

      // Background DB Sync
      fetch(`/api/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, resetMatch: true }),
      }).catch((err) => {
        console.error("Gagal reset match:", err);
      });
    } else if (action === "FINISH_MATCH") {
      setQuickScoreModalMatch({ tournamentId, match });
    }
  }

  function handleMatchScheduleChange(
    tournamentId: string,
    matchId: string,
    scheduledAt: string | null
  ) {
    const targetTournament = tournaments.find((t) => t.id === tournamentId);
    if (!targetTournament) return;

    // Pause polling for 3 seconds to protect optimistic state from stale responses
    pausePollingUntilRef.current = Date.now() + 3000;

    const updatedMatches = (targetTournament.matches || []).map((m) =>
      m.matchId?.toLowerCase() === matchId.toLowerCase() ? { ...m, scheduledAt, manualOverride: false } : m
    );

    setTournaments((prev) =>
      prev.map((t) => (t.id === tournamentId ? { ...t, matches: updatedMatches } : t))
    );
    if (managingTournament && managingTournament.id === tournamentId) {
      setManageMatches(updatedMatches);
      setManagingTournament((prev) => (prev ? { ...prev, matches: updatedMatches } : prev));
    }

    setQuickScoreModalMatch((prev) =>
      prev
        ? {
            ...prev,
            match: { ...prev.match, scheduledAt, manualOverride: false },
          }
        : null
    );

    const wibText = scheduledAt ? formatWibDateTime(scheduledAt) : "-";
    setNotice(
      scheduledAt
        ? `🕒 Jadwal pertandingan #${matchId.toUpperCase()} berhasil diperbarui menjadi ${wibText}.`
        : `🕒 Jadwal pertandingan #${matchId.toUpperCase()} berhasil dihapus.`
    );

    fetch(`/api/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, scheduledAt, manualOverride: false }),
    }).catch((err) => {
      console.error("Gagal sync jadwal match:", err);
    });
  }

  function handleApplyMassSchedule() {
    if (!managingTournament || !massScheduleInput) return;
    const iso = dateTimeLocalToIso(massScheduleInput);
    if (!iso) return;

    // Pause polling for 3 seconds to protect optimistic state
    pausePollingUntilRef.current = Date.now() + 3000;

    const updated = manageMatches.map((m) =>
      m.round === massScheduleRound ? { ...m, scheduledAt: iso, manualOverride: false } : m
    );
    setManageMatches(updated);
    setManagingTournament((prev) => (prev ? { ...prev, matches: updated } : prev));
    setTournaments((prev) =>
      prev.map((t) => (t.id === managingTournament.id ? { ...t, matches: updated } : t))
    );

    const roundName =
      manageMatches.find((m) => m.round === massScheduleRound)?.roundName || `Ronde ${massScheduleRound}`;
    const wibText = formatWibDateTime(iso);
    setNotice(`🕒 Jadwal seluruh pertandingan di ${roundName} berhasil diperbarui menjadi ${wibText}.`);

    fetch(`/api/tournaments/${managingTournament.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roundSchedule: { round: massScheduleRound, scheduledAt: iso },
      }),
    }).catch((err) => {
      console.error("Gagal sync jadwal massal ronde:", err);
    });
  }

  // Handle saving score from QuickMatchScoreModal with 0ms Optimistic UI
  async function handleSaveQuickScore(
    matchId: string,
    winnerName: string,
    winnerId?: string,
    scoreA?: number,
    scoreB?: number,
    lossReason: TournamentLossReason = "NORMAL"
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
      scoreB,
      lossReason
    );

    setTournaments((prev) =>
      prev.map((t) => (t.id === tournamentId ? { ...t, matches: updatedMatches } : t))
    );
    if (managingTournament && managingTournament.id === tournamentId) {
      setManageMatches(updatedMatches);
      setManagingTournament((prev) => (prev ? { ...prev, matches: updatedMatches } : prev));
    }
    setQuickScoreModalMatch(null);
    setNotice(
      lossReason === "WO"
        ? `${winnerName} dinyatakan Menang WO (Lawan Tidak Hadir)!`
        : lossReason === "DQ"
        ? `${winnerName} dinyatakan Menang DQ (Lawan Diskualifikasi)!`
        : `Skor tersimpan! ${winnerName} lolos ke babak berikutnya.`
    );

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
          lossReason,
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
    setAdminMatchSearch("");
    setAdminMatchFilter("ALL");
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
  function handleSelectWinner(
    matchId: string,
    winnerName: string,
    winnerId?: string,
    scoreA?: number,
    scoreB?: number,
    lossReason: TournamentLossReason = "NORMAL"
  ) {
    setManageMatches((prev) =>
      advanceMatchWinner(prev, matchId, winnerName, winnerId, scoreA, scoreB, lossReason)
    );
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

  async function handleQuickUpdateTournamentStatus(tournamentId: string, nextStatus: string, title: string) {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status turnamen.");
      setTournaments((prev) =>
        prev.map((t) => (t.id === tournamentId ? { ...t, status: nextStatus } : t))
      );
      setNotice(`Status "${title}" berhasil diubah menjadi ${nextStatus}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status turnamen.");
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

  const activeTournaments = visibleTournaments.filter((t) => t.status !== "COMPLETED");
  const historyTournaments = visibleTournaments
    .filter((t) => t.status === "COMPLETED")
    .sort((a, b) => {
      const timeA = new Date(a.completedAt || a.eventDate).getTime();
      const timeB = new Date(b.completedAt || b.eventDate).getTime();
      return timeB - timeA;
    });

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
    <main className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-12 overflow-x-hidden">
      <header className="events-heading mb-6 text-left border-b border-slate-200 dark:border-[#2E1E45] pb-6">
        <p className="section-kicker text-xs font-mono font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-widest mb-1.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#7C3AED]" />
          GUILD ARENA &amp; OPERATIONS // MATCH BOARD
        </p>
        <h1 className="page-title font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-[#F8FAFC] break-words">
          ARENA &amp; <span className="text-[#7C3AED] dark:text-[#A78BFA]">MABAR GUILD</span>
        </h1>
        <p className="muted-copy text-xs sm:text-sm md:text-base text-slate-600 dark:text-[#A78BFA] mt-1.5 leading-relaxed font-sans">
          Koordinasikan jadwal mabar cepat atau berkompetisi di turnamen resmi dengan bagan terstruktur.
        </p>
      </header>

      {error && <p className="p-3 text-xs font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-500/30 rounded-none mb-4" role="alert">{error}</p>}
      {notice && <p className="p-3 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-none mb-4" role="status">{notice}</p>}

      {/* TOP FILTER NAVIGATION: ALL / MABAR / TURNAMEN */}
      <div className="flex items-center gap-1.5 p-1 rounded-none bg-slate-100 dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45] overflow-x-auto scrollbar-none mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2.5 rounded-none text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 border ${
            activeTab === "all"
              ? "bg-[#7C3AED] text-white border-[#7C3AED]"
              : "bg-white dark:bg-[#1A0E2E] text-slate-700 dark:text-[#A78BFA] border-slate-200 dark:border-[#2E1E45] hover:border-[#7C3AED] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
          }`}
        >
          Semua Kegiatan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("turnamen")}
          className={`px-4 py-2.5 rounded-none text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 shrink-0 border ${
            activeTab === "turnamen"
              ? "bg-[#7C3AED] text-white border-[#7C3AED]"
              : "bg-white dark:bg-[#1A0E2E] text-slate-700 dark:text-[#A78BFA] border-slate-200 dark:border-[#2E1E45] hover:border-[#7C3AED] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
          }`}
        >
          <Trophy size={14} />
          <span>Turnamen &amp; Bagan</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("mabar")}
          className={`px-4 py-2.5 rounded-none text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 shrink-0 border ${
            activeTab === "mabar"
              ? "bg-[#7C3AED] text-white border-[#7C3AED]"
              : "bg-white dark:bg-[#1A0E2E] text-slate-700 dark:text-[#A78BFA] border-slate-200 dark:border-[#2E1E45] hover:border-[#7C3AED] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
          }`}
        >
          <Swords size={14} />
          <span>Cari Teman Mabar (LFG)</span>
        </button>
      </div>

      {/* QUICK SEARCH BAR */}
      <div className="flex items-center gap-3 px-3.5 h-11 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] focus-within:border-[#7C3AED] transition-colors mb-6 shadow-sm dark:shadow-none" role="search">
        <Search size={16} className="shrink-0 text-slate-400 dark:text-[#A78BFA] pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari turnamen, tim, game, atau ajakan mabar…"
          aria-label="Cari turnamen dan jadwal party"
          className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#A78BFA]/50 p-0 font-sans"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="shrink-0 text-[#A78BFA] hover:text-[#F8FAFC] font-mono text-xs uppercase"
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
              <p className="section-kicker font-mono text-xs font-bold text-[#A78BFA] uppercase tracking-wider mb-1">
                COMPETITIVE ARENA // TOURNAMENTS
              </p>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-[#F8FAFC] flex items-center gap-2">
                <Trophy size={20} className="text-[#A78BFA]" />
                <span>Turnamen Resmi &amp; Bagan Pertandingan</span>
              </h2>
            </div>

            {isAdminOrMod && (
              <button
                type="button"
                onClick={() => setShowTemplateModal(true)}
                className="px-4 py-2 rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F8FAFC] border border-[#7C3AED] inline-flex items-center gap-2 self-start sm:self-auto"
              >
                <Plus size={15} />
                <span>Buat Turnamen dari Template</span>
              </button>
            )}
          </div>

          {/* CONTACT PERSON PROPOSAL BANNER */}
          <div className="mb-6 rounded-none border border-[#2E1E45] bg-[#130921] p-4 text-xs leading-relaxed text-[#A78BFA] text-left">
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

          {/* SUB-TABS TURNAMEN: AKTIF VS HISTORY */}
          <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-[#2E1E45] pb-3 flex-wrap">
            <button
              type="button"
              onClick={() => setTournamentSubTab("active")}
              className={`px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border ${
                tournamentSubTab === "active"
                  ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-sm"
                  : "bg-slate-100 dark:bg-[#1A0E2E] text-slate-700 dark:text-[#A78BFA] border-slate-200 dark:border-[#2E1E45] hover:border-[#7C3AED]/50"
              }`}
            >
              <Flame size={14} className={tournamentSubTab === "active" ? "text-amber-300" : "text-amber-500"} />
              <span>Turnamen Aktif ({activeTournaments.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setTournamentSubTab("history")}
              className={`px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border ${
                tournamentSubTab === "history"
                  ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-sm"
                  : "bg-slate-100 dark:bg-[#1A0E2E] text-slate-700 dark:text-[#A78BFA] border-slate-200 dark:border-[#2E1E45] hover:border-[#7C3AED]/50"
              }`}
            >
              <Trophy size={14} className={tournamentSubTab === "history" ? "text-amber-300" : "text-amber-500"} />
              <span>📜 History Turnamen ({historyTournaments.length})</span>
            </button>
          </div>

          {/* LIST TURNAMEN: GRID KARTU RINGKAS */}
          <div>
            {tournamentSubTab === "active" ? (
              activeTournaments.length === 0 ? (
                <p className="empty-state">
                  {search ? "Tidak ada turnamen aktif yang cocok dengan kata kunci pencarian." : "Belum ada turnamen aktif yang sedang berlangsung atau membuka pendaftaran."}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  {activeTournaments.map((tournament) => {
                    const registeredTeamsCount = tournament.participants?.length || tournament.teams?.length || 0;
                    const isRegistrationOpen = tournament.status === "OPEN" || tournament.status === "REGISTRATION";
                    const eventDateStr = tournament.eventDate
                      ? new Date(tournament.eventDate).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Jakarta",
                        }) + " WIB"
                      : "Jadwal Segera Diumumkan";

                    return (
                      <article
                        key={tournament.id}
                        className="p-5 sm:p-6 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-lg hover:border-[#7C3AED] transition-all flex flex-col justify-between relative group"
                      >
                        {/* Top Badges */}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            <span className="px-2.5 py-0.5 rounded-none text-[10px] font-mono font-extrabold uppercase bg-[#7C3AED] text-white">
                              {tournament.game}
                            </span>
                            <TournamentCardCountdownBadge eventDate={tournament.eventDate} status={tournament.status} />
                            {tournament.isFreeEntry || !tournament.entryFee ? (
                              <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase">
                                FREE ENTRY
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase">
                                BIAYA REGIST: RP {tournament.entryFee.toLocaleString("id-ID")}
                              </span>
                            )}
                          </div>

                          {/* Judul Turnamen */}
                          <Link
                            href={`/events/turnamen/${tournament.id}`}
                            className="text-lg sm:text-xl font-display font-extrabold text-slate-900 dark:text-white hover:text-[#7C3AED] dark:hover:text-[#A78BFA] transition-colors uppercase block leading-snug tracking-tight"
                          >
                            {tournament.title || `${tournament.game} Community Tournament`}
                          </Link>

                          {/* Info Ringkas 3 Baris */}
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#211438] space-y-2 text-xs font-mono text-slate-600 dark:text-[#A78BFA]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-400 dark:text-slate-500">📅 Jadwal Mulai:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{eventDateStr}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-400 dark:text-slate-500">🎁 Total Hadiah:</span>
                              <span className="font-bold text-amber-600 dark:text-amber-400 truncate max-w-[220px]">
                                {tournament.prizePool || "Prizepool Resmi Guild"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-400 dark:text-slate-500">👥 Kuota Tim:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                <strong className="text-emerald-600 dark:text-emerald-400">{registeredTeamsCount}</strong> / {tournament.maxSlots} Tim Terdaftar
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed border-slate-200 dark:border-[#211438]">
                              <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                <Clock size={12} className="text-[#7C3AED]" />
                                <span>Hitung Mundur:</span>
                              </span>
                              <TournamentCardCountdownBadge eventDate={tournament.eventDate} status={tournament.status} />
                            </div>
                          </div>
                        </div>

                        {/* Tombol Aksi Utama */}
                        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-[#2E1E45] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                          <Link
                            href={`/events/turnamen/${tournament.id}`}
                            className="h-10 px-4 whitespace-nowrap rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-white border border-[#7C3AED] inline-flex items-center justify-center gap-2 transition-all shadow-sm"
                          >
                            <Trophy size={14} />
                            <span>Buka Bagan &amp; Detail Turnamen</span>
                          </Link>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            {isRegistrationOpen && (
                              <button
                                type="button"
                                onClick={() => handlePromptRulesAndRegister(tournament)}
                                className="h-10 px-4 whitespace-nowrap rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-600 inline-flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                              >
                                <Plus size={14} />
                                <span>Daftar Tim</span>
                              </button>
                            )}

                            {isAdminOrMod && (
                              <StaffCardModerationMenu
                                label="⚙️ Opsi Staf"
                                buttonClassName="h-10 px-3.5 w-full sm:w-auto justify-center rounded-none font-mono text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 border border-[#7C3AED]/40 bg-purple-500/15 hover:bg-[#7C3AED]/25 text-[#7C3AED] dark:text-[#A78BFA] transition-all cursor-pointer shadow-sm shrink-0 whitespace-nowrap"
                                actions={[
                                  {
                                    label: "⚙️ Kelola Tim, Jadwal & Skor",
                                    icon: <Settings size={13} />,
                                    onClick: () => { window.location.href = `/events/turnamen/${tournament.id}#bracket-section`; },
                                  },
                                  {
                                    label: "✏️ Edit Info & Waktu Mulai",
                                    icon: <Edit3 size={13} />,
                                    onClick: () => setEditingTournament(tournament),
                                  },
                                  {
                                    label: "🎲 Gacha / Acak Bagan",
                                    icon: <Dices size={13} />,
                                    disabled: tournament.status === "COMPLETED",
                                    onClick: () => handleGachaBracket(tournament),
                                  },
                                  {
                                    label: "💾 Unduh Laporan Excel (.CSV)",
                                    icon: <FileSpreadsheet size={13} />,
                                    onClick: () => exportTournamentToCsv(tournament),
                                  },
                                  {
                                    label: "📦 Unduh Backup (.JSON)",
                                    icon: <FileCode size={13} />,
                                    onClick: () => exportTournamentToJson(tournament),
                                  },
                                  {
                                    label: "🗑️ Hapus Turnamen",
                                    icon: <Trash2 size={13} />,
                                    danger: true,
                                    onClick: () => handleDeleteTournament(tournament.id, tournament.title),
                                  },
                                ]}
                              />
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )
            ) : (
              /* HISTORY TURNAMEN (ARSIP SELESAI) */
              historyTournaments.length === 0 ? (
                <p className="empty-state">
                  {search ? "Tidak ada history turnamen yang cocok dengan kata kunci pencarian." : "Belum ada turnamen yang selesai diarsipkan."}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  {historyTournaments.map((tournament) => {
                    const registeredTeamsCount = tournament.participants?.length || tournament.teams?.length || 0;
                    const finishDateStr = formatWibDateTime(tournament.completedAt || tournament.eventDate);
                    const podium = extractTournamentPodium(tournament);

                    return (
                      <article
                        key={tournament.id}
                        className="p-5 sm:p-6 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-lg hover:border-amber-500/50 transition-all flex flex-col justify-between relative group"
                      >
                        {/* Top Badges */}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            <span className="px-2.5 py-0.5 rounded-none text-[10px] font-mono font-extrabold uppercase bg-[#7C3AED] text-white">
                              {tournament.game}
                            </span>
                            <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase flex items-center gap-1">
                              <span>●</span>
                              <span>SELESAI (COMPLETED)</span>
                            </span>
                            {tournament.isFreeEntry || !tournament.entryFee ? (
                              <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-extrabold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 uppercase">
                                FREE ENTRY
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase">
                                REGIST: RP {tournament.entryFee.toLocaleString("id-ID")}
                              </span>
                            )}
                          </div>

                          {/* Judul Turnamen */}
                          <Link
                            href={`/events/turnamen/${tournament.id}`}
                            className="text-lg sm:text-xl font-display font-extrabold text-slate-900 dark:text-white hover:text-amber-500 transition-colors uppercase block leading-snug tracking-tight"
                          >
                            {tournament.title || `${tournament.game} Community Tournament`}
                          </Link>

                          {/* Info Ringkas 3 Baris */}
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#211438] space-y-2 text-xs font-mono text-slate-600 dark:text-[#A78BFA]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-400 dark:text-slate-500">🏁 Waktu Selesai:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{finishDateStr}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-400 dark:text-slate-500">🎁 Total Hadiah:</span>
                              <span className="font-bold text-amber-600 dark:text-amber-400 truncate max-w-[220px]">
                                {tournament.prizePool || "Prizepool Resmi Guild"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-400 dark:text-slate-500">👥 Total Peserta:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                <strong className="text-slate-900 dark:text-white">{registeredTeamsCount}</strong> / {tournament.maxSlots} Tim Berpartisipasi
                              </span>
                            </div>
                          </div>

                          {/* KOTAK RINGKASAN PODIUM JUARA (1, 2, 3) */}
                          <div className="mt-4 p-3.5 rounded-none bg-slate-50 dark:bg-[#1A0E2E]/80 border border-amber-500/25 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                                <Trophy size={13} className="text-amber-400" />
                                <span>Podium Kejuaraan</span>
                              </p>
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Arsip Resmi</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs font-mono">
                              <div className="p-2.5 rounded-none bg-amber-500/10 border border-amber-500/30">
                                <span className="text-[10px] font-bold text-amber-500 block mb-0.5">🥇 JUARA 1 (CHAMPION)</span>
                                <span className="font-extrabold text-slate-900 dark:text-white truncate block text-sm">
                                  {podium?.championTeam || "TBD"}
                                </span>
                                {podium?.championRoster && podium.championRoster.length > 0 && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                                    {podium.championRoster.length} Pemain Roster
                                  </span>
                                )}
                              </div>
                              <div className="p-2.5 rounded-none bg-slate-500/10 border border-slate-400/30">
                                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">🥈 JUARA 2 (RUNNER-UP)</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block text-sm">
                                  {podium?.runnerUpTeam || "TBD"}
                                </span>
                                {podium?.runnerUpRoster && podium.runnerUpRoster.length > 0 && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                                    {podium.runnerUpRoster.length} Pemain Roster
                                  </span>
                                )}
                              </div>
                              <div className="p-2.5 rounded-none bg-amber-700/10 border border-amber-700/30">
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 block mb-0.5">🥉 JUARA 3</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block text-sm">
                                  {podium?.thirdPlaceTeam || "TBD"}
                                </span>
                                {podium?.thirdPlaceRoster && podium.thirdPlaceRoster.length > 0 && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                                    {podium.thirdPlaceRoster.length} Pemain Roster
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Tombol Aksi History */}
                        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-[#2E1E45] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <Link
                              href={`/events/turnamen/${tournament.id}`}
                              className="h-10 px-4 whitespace-nowrap rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-white border border-[#7C3AED] inline-flex items-center justify-center gap-2 transition-all shadow-sm"
                            >
                              <Search size={14} />
                              <span>Lihat Bagan Akhir &amp; Roster Juara</span>
                            </Link>
                            <Link
                              href="/hall-of-winners"
                              className="h-10 px-4 whitespace-nowrap rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 inline-flex items-center justify-center gap-2 transition-all shadow-sm"
                            >
                              <Award size={14} />
                              <span>Buka Hall of Winners</span>
                            </Link>
                          </div>

                          {isAdminOrMod && (
                            <StaffCardModerationMenu
                              label="⚙️ Opsi Staf"
                              buttonClassName="h-10 px-3.5 w-full sm:w-auto justify-center rounded-none font-mono text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 border border-[#7C3AED]/40 bg-purple-500/15 hover:bg-[#7C3AED]/25 text-[#7C3AED] dark:text-[#A78BFA] transition-all cursor-pointer shadow-sm shrink-0 whitespace-nowrap"
                              actions={[
                                {
                                  label: "⚙️ Kelola Tim & Bagan",
                                  icon: <Settings size={13} />,
                                  onClick: () => { window.location.href = `/events/turnamen/${tournament.id}#bracket-section`; },
                                },
                                {
                                  label: "✏️ Edit Info Turnamen",
                                  icon: <Edit3 size={13} />,
                                  onClick: () => setEditingTournament(tournament),
                                },
                                {
                                  label: "💾 Unduh Laporan Excel (.CSV)",
                                  icon: <FileSpreadsheet size={13} />,
                                  onClick: () => exportTournamentToCsv(tournament),
                                },
                                {
                                  label: "📦 Unduh Backup (.JSON)",
                                  icon: <FileCode size={13} />,
                                  onClick: () => exportTournamentToJson(tournament),
                                },
                                {
                                  label: "🗑️ Hapus Turnamen",
                                  icon: <Trash2 size={13} />,
                                  danger: true,
                                  onClick: () => handleDeleteTournament(tournament.id, tournament.title),
                                },
                              ]}
                            />
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 2. SEKSI LOOKING FOR GROUP / FIND TEAMMATE */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "mabar") && (
        <section className="events-section mb-12">
          <div className="events-section-heading flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
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
              className="button button-primary text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              {showLfgForm ? <X size={15} /> : <Plus size={15} />}
              <span>{showLfgForm ? "Tutup Form" : "Buat Ajakan Mabar"}</span>
            </button>
          </div>

          {/* GAME FILTER CHIPS */}
          <div className="mb-4 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex items-center gap-2 pb-1 text-xs whitespace-nowrap min-w-max">
              <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] shrink-0">Filter Game:</span>
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
                  className={`px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer ${
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
            <form className="mb-6 p-4 sm:p-5 rounded-none border border-purple-500/30 bg-purple-950/10 space-y-4 shadow-lg animate-in fade-in duration-200" onSubmit={createLfg}>
              <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider">
                    AJAKAN MABAR CEPAT
                  </span>
                  {session?.user && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      isQuotaFull
                        ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    }`}>
                      Kuota Party Aktif Kamu: {myActiveCount} / 3
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowLfgForm(false)}
                  className="text-gray-400 hover:text-white"
                  aria-label="Tutup Form"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Banner Peringatan Kuota Penuh atau Cooldown */}
              {isQuotaFull && (
                <div className="p-3 rounded-none bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono">
                  ⚠️ <strong>Batas Tercapai (3/3):</strong> Kamu sudah memiliki 3 ajakan mabar aktif. Hapus salah satu party lamamu di bawah atau tunggu hingga sesi selesai sebelum membuat yang baru.
                </div>
              )}

              {isCooldownActive && !isQuotaFull && (
                <div className="p-3 rounded-none bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center justify-between">
                  <span>
                    ⏳ <strong>Cooldown Anti-Spam:</strong> Tunggu{" "}
                    <strong>
                      {Math.floor(cooldownRemainingSeconds / 60)} menit{" "}
                      {cooldownRemainingSeconds % 60} detik
                    </strong>{" "}
                    lagi sebelum membuat ajakan mabar baru.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">1. Pilih Game</label>
                  <select
                    value={lfgGame}
                    onChange={(e) => setLfgGame(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-white dark:bg-[#130921] border border-gray-200 dark:border-[#2E1E45] text-xs text-gray-900 dark:text-white outline-none focus:border-[#9D4EDD]"
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
                      className="mt-2 w-full px-3 py-1.5 rounded-md bg-white dark:bg-[#130921] border border-gray-200 dark:border-[#2E1E45] text-xs text-gray-900 dark:text-white outline-none focus:border-[#9D4EDD]"
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">2. Butuh Berapa Slot?</label>
                  <select
                    value={neededSlots}
                    onChange={(e) => setNeededSlots(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-white dark:bg-[#130921] border border-gray-200 dark:border-[#2E1E45] text-xs text-gray-900 dark:text-white outline-none focus:border-[#9D4EDD]"
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
                      className="mt-2 w-full px-3 py-1.5 rounded-md bg-white dark:bg-[#130921] border border-gray-200 dark:border-[#2E1E45] text-xs text-gray-900 dark:text-white outline-none focus:border-[#9D4EDD]"
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">3. Masa Aktif Ajakan</label>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-white dark:bg-[#130921] border border-gray-200 dark:border-[#2E1E45] text-xs text-gray-900 dark:text-white outline-none focus:border-[#9D4EDD]"
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
                    className="w-full px-3 py-2 rounded-md bg-white dark:bg-[#130921] border border-gray-200 dark:border-[#2E1E45] text-xs text-gray-900 dark:text-white outline-none focus:border-[#9D4EDD]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isQuotaFull || isCooldownActive}
                  className={`button text-xs font-bold ${
                    isQuotaFull || isCooldownActive
                      ? "bg-slate-300 dark:bg-[#211438] text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-60"
                      : "button-primary"
                  }`}
                >
                  {isQuotaFull ? (
                    <span>Batas Tercapai (Maksimal 3 Party)</span>
                  ) : isCooldownActive ? (
                    <span>
                      Tunggu {Math.floor(cooldownRemainingSeconds / 60)}m{" "}
                      {cooldownRemainingSeconds % 60}s
                    </span>
                  ) : (
                    <span>Publikasikan Ajakan Mabar</span>
                  )}
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
                  className={`p-4 sm:p-5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] flex flex-col justify-between shadow-md transition-all text-left ${
                    isFull ? "opacity-75" : "hover:border-[#7C3AED]"
                  }`}
                  key={post.id}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-none text-[10px] font-mono font-extrabold bg-[#7C3AED] text-[#F8FAFC] uppercase">
                          {post.game}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/30">
                          {currentFilled}/{post.maxSlots} SLOT
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-600 dark:text-[#A78BFA] flex items-center gap-1">
                        <Clock size={12} /> {formatRemainingTime(post.expiresAt)}
                      </span>
                    </div>

                    {/* Visual Slot Matrix */}
                    <div className="flex items-center gap-1.5 my-2.5">
                      <span className="text-[9px] font-mono text-slate-500 dark:text-[#A78BFA] uppercase tracking-wider">Slot:</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: post.maxSlots }).map((_, idx) => (
                          <span
                            key={idx}
                            className={`w-3.5 h-3.5 rounded-none border ${
                              idx < currentFilled
                                ? "bg-[#7C3AED] border-[#7C3AED]"
                                : "bg-slate-100 dark:bg-[#1A0E2E] border-slate-300 dark:border-[#2E1E45]"
                            }`}
                            title={`Slot ${idx + 1}: ${idx < currentFilled ? "Terisi" : "Kosong"}`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="font-display font-bold text-sm text-slate-900 dark:text-[#F8FAFC] mb-2 leading-snug uppercase tracking-tight">
                      {post.description}
                    </p>

                    <div className="text-xs text-slate-600 dark:text-[#A78BFA] font-mono space-y-1 mb-4">
                      <p>
                        Host: <strong className="text-slate-900 dark:text-[#F8FAFC]">{post.author.username ?? "Gamer"}</strong>
                        {(post.author.username?.toLowerCase() === ".odyssia" || post.author.username?.toLowerCase() === "odyssia") && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 ml-1">👑 Emperor</span>
                        )}
                        {post.author.inGameName && ` (IGN: ${post.author.inGameName})`}
                      </p>
                      {post.joins.length > 0 && (
                        <p className="text-[11px] text-slate-500 dark:text-[#A78BFA]/80">
                          Party: {post.joins.map((j) => j.username ?? "Gamer").join(", ")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-[#2E1E45] flex flex-wrap items-center justify-between gap-2 font-mono">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href="https://discord.gg/aJvbVyTxNb"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[#5865F2] hover:underline inline-flex items-center gap-1"
                      >
                        <Headphones size={13} /> <span>Voice</span>
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
                        className="text-xs text-slate-600 dark:text-[#A78BFA] hover:text-slate-900 dark:hover:text-[#F8FAFC] inline-flex items-center gap-1 ml-1 cursor-pointer"
                      >
                        <MessageSquare size={13} />
                        <span>Chat ({partyChatMessages[post.id]?.length ?? 0})</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                      {isAdminOrMod && (
                        <StaffCardModerationMenu
                          actions={[
                            {
                              label: "Hapus / Bubarkan Party",
                              icon: <Trash2 size={13} />,
                              danger: true,
                              onClick: () => deleteParty(post.id, post.game),
                            },
                          ]}
                        />
                      )}
                      {post.isOwner && !isAdminOrMod && (
                        <button
                          type="button"
                          onClick={() => deleteParty(post.id, post.game)}
                          className="w-full sm:w-auto px-2.5 py-1.5 rounded-none border border-red-500/30 text-xs font-mono text-rose-400 hover:text-rose-300 hover:bg-red-950/20 inline-flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0"
                          title="Hapus / Tutup Party Mabar"
                        >
                          <Trash2 size={13} />
                          <span>Hapus Party</span>
                        </button>
                      )}
                      {!post.isOwner && (
                        <button
                          type="button"
                          disabled={!post.joinedByViewer && isFull}
                          onClick={() => toggleJoin(post.id, post.joinedByViewer)}
                          className={`w-full sm:w-auto px-4 py-2 sm:py-1.5 rounded-none text-xs font-mono font-bold uppercase tracking-wider transition text-center justify-center flex items-center cursor-pointer ${
                            post.joinedByViewer
                              ? "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                              : isFull
                                ? "bg-slate-100 dark:bg-[#1A0E2E] text-slate-400 dark:text-[#A78BFA]/50 border border-slate-200 dark:border-[#2E1E45] cursor-not-allowed"
                                : "bg-[#7C3AED] text-[#F8FAFC] hover:bg-[#6D28D9] border border-[#7C3AED]"
                          }`}
                        >
                          {post.joinedByViewer ? "Keluar Party" : isFull ? "Penuh" : "GABUNG PARTY"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* MINI PARTY CHAT */}
                  {activePartyChat === post.id && (
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-[#2E1E45] space-y-2">
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
                          className="flex-1 px-2.5 py-1.5 rounded bg-white dark:bg-[#130921] border border-gray-200 dark:border-[#2E1E45] text-xs"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2A1B42] rounded-xl w-[calc(100vw-1.5rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative my-auto">
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
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#2E1E45] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
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
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#2E1E45] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
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
                      className="w-24 px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#2E1E45] text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
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
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#2E1E45] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
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
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#2E1E45] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
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
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#2E1E45] text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
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
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#2E1E45] text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">0 s/d 5 cadangan (isi 0 jika tanpa cadangan)</span>
                </div>
              </div>

              {/* Pengaturan Biaya Pendaftaran (Gratis vs Berbayar QRIS) */}
              <div className="p-3 sm:p-4 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-gray-50/50 dark:bg-[#16121E]/60 space-y-3">
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
                        : "border-gray-200 dark:border-[#2E1E45] text-gray-400 hover:text-white"
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
                        : "border-gray-200 dark:border-[#2E1E45] text-gray-400 hover:text-white"
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
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#2E1E45] text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
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
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#2E1E45] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2A1B42] rounded-xl w-[calc(100vw-1.5rem)] sm:max-w-4xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative my-auto">
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
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-[#2E1E45] pb-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setManageTab("scores")}
                  className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold tracking-wider uppercase border transition ${
                    manageTab === "scores"
                      ? "bg-[#7C3AED] text-[#F8FAFC] border-[#7C3AED]"
                      : "bg-[#11091D] text-[#A78BFA] border-[#2A1B42] hover:text-[#F8FAFC] hover:border-[#7C3AED]"
                  }`}
                >
                  1. Update Skor &amp; Pemenang Match
                </button>
                <button
                  type="button"
                  onClick={() => setManageTab("teams")}
                  className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold tracking-wider uppercase border transition ${
                    manageTab === "teams"
                      ? "bg-[#7C3AED] text-[#F8FAFC] border-[#7C3AED]"
                      : "bg-[#11091D] text-[#A78BFA] border-[#2A1B42] hover:text-[#F8FAFC] hover:border-[#7C3AED]"
                  }`}
                >
                  2. Daftar Tim &amp; Roster Pemain
                </button>
                <button
                  type="button"
                  onClick={() => setManageTab("settings")}
                  className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold tracking-wider uppercase border transition flex items-center gap-1.5 ${
                    manageTab === "settings"
                      ? "bg-[#7C3AED] text-[#F8FAFC] border-[#7C3AED]"
                      : "bg-[#11091D] text-[#A78BFA] border-[#2A1B42] hover:text-[#F8FAFC] hover:border-[#7C3AED]"
                  }`}
                >
                  <Settings size={13} />
                  <span>3. Pengaturan Bagan &amp; Slot</span>
                </button>
                <button
                  type="button"
                  onClick={() => setManageTab("verifications")}
                  className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold tracking-wider uppercase border transition flex items-center gap-1.5 ${
                    manageTab === "verifications"
                      ? "bg-[#7C3AED] text-[#F8FAFC] border-[#7C3AED]"
                      : "bg-[#11091D] text-[#A78BFA] border-[#2A1B42] hover:text-[#F8FAFC] hover:border-[#7C3AED]"
                  }`}
                >
                  <ShieldCheck size={13} />
                  <span>4. Verifikasi Tim ({managingTournament.participants?.length || 0})</span>
                  {(() => {
                    const pendingCount = managingTournament.participants?.filter((p) => p.paymentStatus === "PENDING_PAYMENT").length || 0;
                    return pendingCount > 0 ? (
                      <span className="ml-1 px-1.5 py-0.2 rounded-none text-[9px] font-black bg-amber-400 text-black">
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
                  className="px-3 py-1.5 rounded-none text-xs font-mono font-bold border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 shrink-0 flex items-center gap-1.5 transition ml-auto shadow-xs"
                  title="Gacha / Acak Susunan Lawan Bagan (Fisher-Yates)"
                >
                  <Dices size={13} className="text-amber-400" />
                  <span>🎲 Gacha Bagan (Acak Lawan)</span>
                </button>
              )}
            </div>

            {/* SUB-PANEL 1: SKOR & PEMENANG (AUTO ADVANCE) */}
            {manageTab === "scores" && (() => {
              const q = adminMatchSearch.trim().toLowerCase();
              const cleanQ = q.replace(/^#/, "");
              const filteredMatches = manageMatches.filter((m) => {
                // Filter status
                if (adminMatchFilter === "LIVE" && m.matchStatus !== "LIVE") return false;
                if (adminMatchFilter === "UNFINISHED" && Boolean(m.winner)) return false;
                // Search keyword
                if (!q) return true;
                return (
                  m.matchId.toLowerCase().includes(cleanQ) ||
                  (m.teamA?.name || "").toLowerCase().includes(q) ||
                  (m.teamB?.name || "").toLowerCase().includes(q) ||
                  (m.roundName || "").toLowerCase().includes(q)
                );
              });

              const liveCount = manageMatches.filter((m) => m.matchStatus === "LIVE").length;
              const unfinishedCount = manageMatches.filter((m) => !m.winner).length;

              return (
                <div className="space-y-3">
                  {/* SEARCH & QUICK FILTER BAR */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2 border-b border-gray-200 dark:border-[#2E1E45]">
                    <div className="relative flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2.5 px-3.5 h-10 rounded-none border border-gray-300 dark:border-[#2E1E45] bg-white dark:bg-[#130921] focus-within:border-[#9D4EDD] focus-within:ring-1 focus-within:ring-[#9D4EDD] transition-all">
                        <Search size={15} className="text-gray-400 shrink-0" />
                        <input
                          type="text"
                          value={adminMatchSearch}
                          onChange={(e) => setAdminMatchSearch(e.target.value)}
                          placeholder="Cari nama tim atau kode match (contoh: TeamGuard atau R1-M12)..."
                          className="w-full bg-transparent text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
                        />
                        {adminMatchSearch && (
                          <button
                            type="button"
                            onClick={() => setAdminMatchSearch("")}
                            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10"
                            title="Reset pencarian"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* QUICK FILTERS */}
                    <div className="flex items-center gap-1 bg-black/20 p-1 rounded-none shrink-0 overflow-x-auto scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setAdminMatchFilter("ALL")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                          adminMatchFilter === "ALL"
                            ? "bg-[#9D4EDD] text-white shadow-xs"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        Semua Match ({manageMatches.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminMatchFilter("LIVE")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                          adminMatchFilter === "LIVE"
                            ? "bg-red-500 text-white shadow-xs"
                            : "text-gray-400 hover:text-red-400"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                        <span>Sedang Live ({liveCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminMatchFilter("UNFINISHED")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                          adminMatchFilter === "UNFINISHED"
                            ? "bg-amber-500 text-black shadow-xs font-black"
                            : "text-gray-400 hover:text-amber-400"
                        }`}
                      >
                        Belum Selesai ({unfinishedCount})
                      </button>
                    </div>
                  </div>

                  {/* SET JADWAL MASSAL PER RONDE */}
                  <div className="p-3.5 rounded-none border border-purple-500/30 bg-purple-950/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-[#9D4EDD] uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <Calendar size={13} />
                        <span>Set Jadwal Massal per Ronde (Auto-Live Serentak)</span>
                      </span>
                      <p className="text-[11px] text-gray-400">
                        Setel tanggal &amp; jam tanding sekaligus untuk seluruh pertandingan dalam satu ronde tertentu.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={massScheduleRound}
                        onChange={(e) => setMassScheduleRound(Number(e.target.value))}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#130921] text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                      >
                        {Array.from(new Set(manageMatches.map((m) => m.round || 1)))
                          .sort((a, b) => a - b)
                          .map((r) => {
                            const sampleMatch = manageMatches.find((m) => m.round === r);
                            const rMatchesCount = manageMatches.filter((m) => m.round === r).length;
                            return (
                              <option key={r} value={r}>
                                {sampleMatch?.roundName || `Ronde ${r}`} ({rMatchesCount} Match)
                              </option>
                            );
                          })}
                      </select>

                      <input
                        type="datetime-local"
                        value={massScheduleInput}
                        onChange={(e) => setMassScheduleInput(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#130921] text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                      />

                      <button
                        type="button"
                        disabled={!massScheduleInput}
                        onClick={handleApplyMassSchedule}
                        className="px-3 py-1.5 rounded-lg bg-[#9D4EDD] hover:bg-[#8338EC] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition shrink-0"
                      >
                        <Clock size={13} />
                        <span>Terapkan ke Semua Match di Ronde Ini</span>
                      </button>
                    </div>
                  </div>

                  {/* MATCHES LIST */}
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                    {filteredMatches.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-400 rounded-none border border-dashed border-gray-300 dark:border-white/10">
                        Tidak ada pertandingan yang cocok dengan filter atau kata kunci &quot;{adminMatchSearch}&quot;.
                      </div>
                    ) : (
                      filteredMatches.map((m) => (
                        <div
                          key={m.matchId}
                          className="p-4 rounded-none border border-[#2A1B42] bg-[#11091D] hover:border-[#7C3AED]/60 transition-all flex flex-col gap-3"
                        >
                          {/* BARIS 1: Header Match, Jadwal Langsung, Status Live */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#2A1B42]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-mono font-bold text-[#A78BFA] uppercase tracking-wider">
                                #{m.matchId.toUpperCase()} • {m.roundName}
                              </span>
                              {m.winner && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-none bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                  <span>✔ Pemenang: <strong>{m.winner}</strong></span>
                                  {m.lossReason === "WO" && <span className="text-amber-400 font-bold ml-1">(WO)</span>}
                                  {m.lossReason === "DQ" && <span className="text-rose-400 font-bold ml-1">(DQ)</span>}
                                </span>
                              )}
                            </div>

                            {/* Tengah & Kanan: Jadwal Match Langsung & Toggle Status */}
                            <div className="flex items-center gap-2 flex-wrap ml-auto">
                              <div className="flex items-center gap-1.5 bg-[#180E2B] px-2 py-1 border border-[#2A1B42]">
                                <Clock size={12} className="text-[#A78BFA]" />
                                <span className="text-[10px] font-mono text-[#A78BFA] uppercase">Jadwal:</span>
                                <input
                                  type="datetime-local"
                                  value={isoToDateTimeLocal(m.scheduledAt)}
                                  onChange={(e) => {
                                    const iso = dateTimeLocalToIso(e.target.value);
                                    pausePollingUntilRef.current = Date.now() + 3000;
                                    const updated = manageMatches.map((match) =>
                                      match.matchId?.toLowerCase() === m.matchId.toLowerCase()
                                        ? { ...match, scheduledAt: iso, manualOverride: false }
                                        : match
                                    );
                                    setManageMatches(updated);
                                    setManagingTournament((prev) => (prev ? { ...prev, matches: updated } : prev));
                                    if (managingTournament) {
                                      setTournaments((prev) =>
                                        prev.map((t) => (t.id === managingTournament.id ? { ...t, matches: updated } : t))
                                      );
                                      if (iso) {
                                        setNotice(`🕒 Jadwal pertandingan #${m.matchId.toUpperCase()} berhasil diperbarui menjadi ${formatWibDateTime(iso)}.`);
                                      }
                                      fetch(`/api/tournaments/${managingTournament.id}`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ matchId: m.matchId, scheduledAt: iso, manualOverride: false }),
                                      }).catch(() => {});
                                    }
                                  }}
                                  className="bg-transparent text-[11px] font-mono text-[#F8FAFC] focus:outline-none"
                                />
                                {m.scheduledAt && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      pausePollingUntilRef.current = Date.now() + 3000;
                                      const updated = manageMatches.map((match) =>
                                        match.matchId?.toLowerCase() === m.matchId.toLowerCase()
                                          ? { ...match, scheduledAt: null, manualOverride: false }
                                          : match
                                      );
                                      setManageMatches(updated);
                                      setManagingTournament((prev) => (prev ? { ...prev, matches: updated } : prev));
                                      if (managingTournament) {
                                        setTournaments((prev) =>
                                          prev.map((t) => (t.id === managingTournament.id ? { ...t, matches: updated } : t))
                                        );
                                        setNotice(`🕒 Jadwal pertandingan #${m.matchId.toUpperCase()} berhasil dihapus.`);
                                        fetch(`/api/tournaments/${managingTournament.id}`, {
                                          method: "PATCH",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ matchId: m.matchId, scheduledAt: null, manualOverride: false }),
                                        }).catch(() => {});
                                      }
                                    }}
                                    className="text-rose-400 hover:text-rose-300 ml-1 cursor-pointer"
                                    title="Hapus jadwal spesifik match ini"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>

                              {/* Live / Reset Toggle */}
                              {m.matchStatus === "LIVE" ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = updateMatchStatus(manageMatches, m.matchId, "UPCOMING", true);
                                    setManageMatches(updated);
                                    if (managingTournament) {
                                      fetch(`/api/tournaments/${managingTournament.id}`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ matchId: m.matchId, matchStatus: "UPCOMING", manualOverride: true }),
                                      }).catch(() => {});
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-none text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition flex items-center gap-1.5 cursor-pointer"
                                  title="Batalkan status live dan kembali ke jadwal menunggu"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                                  <span>⏸ Batal Live</span>
                                </button>
                              ) : (m.matchStatus === "FINISHED" || Boolean(m.winner)) ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = resetMatchResult(manageMatches, m.matchId);
                                    setManageMatches(updated);
                                    if (managingTournament) {
                                      fetch(`/api/tournaments/${managingTournament.id}`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ matchId: m.matchId, resetMatch: true }),
                                      }).catch(() => {});
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-none text-[11px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition flex items-center gap-1.5 cursor-pointer"
                                  title="Buka kembali kunci match & reset pemenang"
                                >
                                  <span>↺ Edit Ulang Match</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = updateMatchStatus(manageMatches, m.matchId, "LIVE");
                                    setManageMatches(updated);
                                    if (managingTournament) {
                                      fetch(`/api/tournaments/${managingTournament.id}`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ matchId: m.matchId, matchStatus: "LIVE" }),
                                      }).catch(() => {});
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-none text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition flex items-center gap-1.5 cursor-pointer"
                                  title="Mulai pertandingan dan tandai sedang live"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                  <span>🔴 Set Live</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* BARIS 2: Skor Tim & Aksi Pemenang */}
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                            {/* Skor Tim A vs Tim B */}
                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs sm:text-sm font-bold ${m.winner === m.teamA.name ? "text-emerald-400" : "text-[#F8FAFC]"}`}>
                                  {m.teamA.name || "TBD"}
                                </span>
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
                                  className="w-14 text-center py-1.5 rounded-none font-bold font-mono bg-[#11091D] border border-[#2A1B42] text-sm text-[#F8FAFC] focus:border-[#7C3AED] focus:outline-none"
                                />
                              </div>

                              <span className="text-xs font-mono font-bold text-[#A78BFA] px-1">VS</span>

                              <div className="flex items-center gap-2">
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
                                  className="w-14 text-center py-1.5 rounded-none font-bold font-mono bg-[#11091D] border border-[#2A1B42] text-sm text-[#F8FAFC] focus:border-[#7C3AED] focus:outline-none"
                                />
                                <span className={`text-xs sm:text-sm font-bold ${m.winner === m.teamB.name ? "text-emerald-400" : "text-[#F8FAFC]"}`}>
                                  {m.teamB.name || "TBD"}
                                </span>
                              </div>
                            </div>

                            {/* Tombol Aksi Pemenang */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Tim A Winner Options */}
                              <div className="flex items-center gap-1 bg-[#1A0E2E] p-1 border border-[#2E1E45]">
                                <span className="text-[10px] font-mono font-bold text-[#A78BFA] px-1 truncate max-w-[80px]" title={m.teamA.name || "Tim A"}>
                                  {m.teamA.name || "Tim A"}:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleSelectWinner(m.matchId, m.teamA.name, m.teamA.id, m.teamA.score, m.teamB.score, "NORMAL")}
                                  className="px-2 py-1 text-[10px] font-mono font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F8FAFC] border border-[#7C3AED] transition cursor-pointer"
                                  title="Simpan skor & tetapkan Tim A sebagai pemenang"
                                >
                                  ✓ Simpan Skor
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectWinner(m.matchId, m.teamA.name, m.teamA.id, m.teamA.score, m.teamB.score, "WO")}
                                  className="px-2 py-1 text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition cursor-pointer"
                                  title="Menang WO (Lawan Tidak Hadir)"
                                >
                                  Menang WO
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectWinner(m.matchId, m.teamA.name, m.teamA.id, m.teamA.score, m.teamB.score, "DQ")}
                                  className="px-2 py-1 text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition cursor-pointer"
                                  title="Menang DQ (Lawan Diskualifikasi)"
                                >
                                  Menang DQ
                                </button>
                              </div>

                              {/* Tim B Winner Options */}
                              <div className="flex items-center gap-1 bg-[#1A0E2E] p-1 border border-[#2E1E45]">
                                <span className="text-[10px] font-mono font-bold text-[#A78BFA] px-1 truncate max-w-[80px]" title={m.teamB.name || "Tim B"}>
                                  {m.teamB.name || "Tim B"}:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleSelectWinner(m.matchId, m.teamB.name, m.teamB.id, m.teamA.score, m.teamB.score, "NORMAL")}
                                  className="px-2 py-1 text-[10px] font-mono font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F8FAFC] border border-[#7C3AED] transition cursor-pointer"
                                  title="Simpan skor & tetapkan Tim B sebagai pemenang"
                                >
                                  ✓ Simpan Skor
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectWinner(m.matchId, m.teamB.name, m.teamB.id, m.teamA.score, m.teamB.score, "WO")}
                                  className="px-2 py-1 text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition cursor-pointer"
                                  title="Menang WO (Lawan Tidak Hadir)"
                                >
                                  Menang WO
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectWinner(m.matchId, m.teamB.name, m.teamB.id, m.teamA.score, m.teamB.score, "DQ")}
                                  className="px-2 py-1 text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition cursor-pointer"
                                  title="Menang DQ (Lawan Diskualifikasi)"
                                >
                                  Menang DQ
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}

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
                      className="p-3.5 rounded-lg border border-gray-200 dark:border-[#2E1E45] bg-gray-50 dark:bg-[#181324] space-y-2.5"
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
                            className="w-full px-3 py-1.5 rounded bg-white dark:bg-[#130921] border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-white"
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
                            className="w-full px-3 py-1.5 rounded bg-white dark:bg-[#130921] border border-gray-300 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
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
                            className="w-full px-3 py-1.5 rounded bg-white dark:bg-[#130921] border border-gray-300 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
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
                <div className="p-4 sm:p-5 rounded-none border border-purple-500/30 bg-purple-950/15 space-y-4">
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
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
                  <div className="p-4 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] space-y-3">
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
                  <div className="p-4 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] space-y-3">
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
                            : "border-gray-200 dark:border-[#2E1E45] text-gray-400 hover:text-white"
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
                            : "border-gray-200 dark:border-[#2E1E45] text-gray-400 hover:text-white"
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
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1A1624] border border-gray-200 dark:border-[#2E1E45] text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
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
                  <div className="p-8 text-center border border-dashed border-gray-300 dark:border-gray-800 rounded-none text-xs text-gray-400">
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
                        className={`p-4 rounded-none border transition-all ${
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
                          <div className="space-y-1.5 p-2.5 rounded-lg bg-white/60 dark:bg-[#130921]/60 border border-gray-200 dark:border-white/5">
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
                          <div className="space-y-1.5 p-2.5 rounded-lg bg-white/60 dark:bg-[#130921]/60 border border-gray-200 dark:border-white/5">
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

            <div className="flex justify-between items-center gap-2 pt-4 border-t border-gray-200 dark:border-[#2E1E45] mt-4">
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2A1B42] rounded-xl w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative my-auto">
            <button
              type="button"
              onClick={() => setRegisteringTournament(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="mb-5 pb-3 border-b border-gray-200 dark:border-[#2E1E45]">
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
              <div className="space-y-3.5 p-4 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-gray-50/50 dark:bg-[#181324]/50">
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
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#130921] border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
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
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#130921] border border-gray-300 dark:border-gray-700 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
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
              <div className="space-y-3 p-4 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-gray-50/50 dark:bg-[#181324]/50">
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
                      className="p-3 rounded-lg bg-white dark:bg-[#130921] border border-gray-200 dark:border-gray-800 space-y-2"
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
                            className="w-full px-3 py-2 rounded-md bg-white/[0.03] border border-[#2E1E45] text-xs font-bold text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-[#9D4EDD]"
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
                <div className="space-y-3 p-4 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-gray-50/50 dark:bg-[#181324]/50">
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
                        className="p-3 rounded-lg bg-white dark:bg-[#130921] border border-gray-200 dark:border-gray-800 space-y-2"
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
                              className="w-full px-3 py-2 rounded-md bg-white/[0.03] border border-[#2E1E45] text-xs text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500"
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
                <div className="space-y-4 p-4 rounded-none border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/15">
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
                  <div className="p-4 rounded-none bg-white dark:bg-[#130921] border border-amber-500/20 text-center flex flex-col items-center">
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
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#130921] border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-amber-400"
                      />
                      <span className="text-[10px] text-gray-400 mt-0.5 block">
                        Nama yang tertera pada mutasi transfer
                      </span>
                    </div>

                    {/* Kolom 2: Upload Gambar Bukti Bayar */}
                    <div>
                      <ImageUploader
                        value={registerPaymentProof}
                        onChange={setRegisterPaymentProof}
                        label="2. Upload Bukti Transfer (JPG/PNG/WebP) *"
                        required={!registerPaymentProof}
                        description="Pilih screenshot bukti transfer QRIS langsung dari HP atau PC."
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 leading-relaxed">
                    ℹ️ <strong>Catatan:</strong> Pendaftaran turnamen berbayar akan masuk status antrean <em>Menunggu Verifikasi</em>. Tim kamu akan resmi dimasukkan ke bagan turnamen setelah panitia mengecek bukti transfer kas.
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-[#2E1E45]">
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
          <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2A1B42] rounded-xl w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 my-auto">
              <button
                type="button"
                onClick={() => setViewingRoster(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200 dark:border-[#2E1E45]">
                <div className="w-10 h-10 rounded-none bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[#9D4EDD] shrink-0">
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
            className="relative max-w-xl max-h-[90vh] bg-white dark:bg-[#130921] border border-gray-300 dark:border-white/20 rounded-none p-4 shadow-2xl flex flex-col items-center my-auto"
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
            <div className="rounded-none overflow-hidden border border-gray-200 dark:border-white/10 max-h-[72vh] flex items-center justify-center bg-black/50">
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

      {/* DEDICATED EDIT TOURNAMENT INFO MODAL */}
      <EditTournamentModal
        isOpen={Boolean(editingTournament)}
        tournament={editingTournament}
        onClose={() => setEditingTournament(null)}
        onSuccess={(updated) => {
          setTournaments((prev) =>
            prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
          );
          setEditingTournament(null);
        }}
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
        onReset={(matchId) => {
          if (quickScoreModalMatch) {
            handleAdminQuickUpdate(quickScoreModalMatch.tournamentId, matchId, "RESET_MATCH");
          }
        }}
        onToggleStatus={(matchId, st) => {
          if (quickScoreModalMatch) {
            handleAdminQuickUpdate(
              quickScoreModalMatch.tournamentId,
              matchId,
              st === "LIVE" ? "SET_LIVE" : "CANCEL_LIVE"
            );
          }
        }}
        onUpdateSchedule={(matchId, scheduledAt) => {
          if (quickScoreModalMatch) {
            handleMatchScheduleChange(
              quickScoreModalMatch.tournamentId,
              matchId,
              scheduledAt
            );
          }
        }}
      />
      {/* MATCH LOBBY & CUSTOM ROOM COORDINATION MODAL */}
      <MatchLobbyModal
        isOpen={Boolean(activeLobbyMatch)}
        tournamentId={activeLobbyMatch?.tournamentId || ""}
        match={activeLobbyMatch?.match || null}
        onClose={() => setActiveLobbyMatch(null)}
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
  searchQuery = "",
  onOpenLobby,
  currentUserId,
  currentUsername,
  tournamentEventDate,
}: {
  match: TournamentMatch;
  teams: TournamentTeam[];
  isFinal?: boolean;
  onTeamClick: (team: TournamentTeam) => void;
  isAdminOrMod?: boolean;
  onAdminQuickUpdate?: (matchId: string, action: "SET_LIVE" | "CANCEL_LIVE" | "RESET_MATCH" | "FINISH_MATCH") => void;
  searchQuery?: string;
  onOpenLobby?: (match: TournamentMatch) => void;
  currentUserId?: string;
  currentUsername?: string;
  tournamentEventDate?: string | Date;
}) {
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const teamAData = teams.find((t) => t.teamName.toLowerCase() === match.teamA.name.toLowerCase() || t.id === match.teamA.id);
  const teamBData = teams.find((t) => t.teamName.toLowerCase() === match.teamB.name.toLowerCase() || t.id === match.teamB.id);

  const hasWinner = Boolean(match.winner);
  const isWinnerA = Boolean(hasWinner && match.winner?.toLowerCase() === match.teamA.name.toLowerCase());
  const isWinnerB = Boolean(hasWinner && match.winner?.toLowerCase() === match.teamB.name.toLowerCase());
  const isLoserA = Boolean(hasWinner && !isWinnerA && match.teamA.name && match.teamA.name !== "TBD");
  const isLoserB = Boolean(hasWinner && !isWinnerB && match.teamB.name && match.teamB.name !== "TBD" && match.teamB.name !== "BYE");

  const hasBothTeams = Boolean(
    match.teamA?.name && match.teamA.name !== "TBD" && match.teamA.name !== "BYE" &&
    match.teamB?.name && match.teamB.name !== "TBD" && match.teamB.name !== "BYE"
  );

  const isCapA = Boolean(
    (currentUserId && (teamAData?.id === currentUserId || teamAData?.representativeDiscordId === currentUserId)) ||
    (currentUsername && teamAData?.captainName?.toLowerCase() === currentUsername.toLowerCase()) ||
    (currentUsername && teamAData?.representativeDiscord?.toLowerCase() === currentUsername.toLowerCase())
  );

  const isCapB = Boolean(
    (currentUserId && (teamBData?.id === currentUserId || teamBData?.representativeDiscordId === currentUserId)) ||
    (currentUsername && teamBData?.captainName?.toLowerCase() === currentUsername.toLowerCase()) ||
    (currentUsername && teamBData?.representativeDiscord?.toLowerCase() === currentUsername.toLowerCase())
  );

  const canAccessLobby = hasBothTeams && (isAdminOrMod || isCapA || isCapB);

  const isRound1 = match.round === 1;
  const effectiveScheduledAt =
    match.scheduledAt ||
    (isRound1 && tournamentEventDate
      ? typeof tournamentEventDate === "string"
        ? tournamentEventDate
        : tournamentEventDate.toISOString()
      : null);

  const isScheduledDue = Boolean(
    !hasWinner &&
    match.matchStatus !== "FINISHED" &&
    effectiveScheduledAt &&
    match.manualOverride !== true &&
    nowMs >= new Date(effectiveScheduledAt).getTime()
  );

  const isBothCaptainsReady = Boolean(match.teamAReady && match.teamBReady);
  const isLive = (match.matchStatus === "LIVE" || (isRound1 && isScheduledDue && hasBothTeams) || isBothCaptainsReady) && !hasWinner;
  const isFinished = match.matchStatus === "FINISHED" || hasWinner || (match.teamA.score > 0 || match.teamB.score > 0);
  const isUpcoming = !isLive && !isFinished;

  const scheduleInfo = formatMatchScheduleDisplay(effectiveScheduledAt, match.schedule, match.manualOverride, nowMs);
  const r1Countdown = formatLiveCountdown(effectiveScheduledAt, nowMs);

  // Search match highlight
  const isSearchActive = Boolean(searchQuery && searchQuery.trim().length > 0);
  const q = isSearchActive ? searchQuery.trim().toLowerCase() : "";
  const cleanQ = q.replace(/^#/, "");
  const matchIdMatched = cleanQ.length > 0 && match.matchId.toLowerCase().includes(cleanQ);
  const teamAMatched = q.length > 0 && match.teamA.name.toLowerCase().includes(q);
  const teamBMatched = q.length > 0 && match.teamB.name.toLowerCase().includes(q);
  const isMatched = isSearchActive && (matchIdMatched || teamAMatched || teamBMatched);

  return (
    <div
      id={`bracket-match-${match.matchId}`}
      className={`w-[310px] min-w-[310px] rounded-none border transition-all duration-150 ${
        isMatched
          ? "border-[#7C3AED] bg-[#7C3AED]/20 z-20"
          : isSearchActive
          ? "opacity-35 grayscale-[50%] border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]"
          : isLive
          ? "border-[#7C3AED] bg-purple-50 dark:bg-[#1A0E2E]"
          : isFinal
          ? "border-[#F59E0B]/50 bg-amber-50/50 dark:bg-[#1A0E2E]"
          : "border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] hover:border-[#7C3AED]"
      } p-3 relative overflow-hidden flex flex-col justify-between`}
    >
      {/* Baris 1 (Atas — Info Match & Status): 2 elemen bersebelahan tanpa tabrakan */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200 dark:border-[#2A1B42]">
        {/* Kiri: Kode & Ronde ringkas 1 baris */}
        <div className="flex items-center gap-1.5 min-w-0">
          {isFinal && <Crown size={13} className="text-[#F59E0B] shrink-0" />}
          <span className="whitespace-nowrap text-[11px] font-mono font-bold text-slate-700 dark:text-[#A78BFA] uppercase truncate">
            {match.matchId ? `#${match.matchId.toUpperCase()}` : ""} • {match.roundName}
          </span>
        </div>

        {/* Kanan: Badge status utuh */}
        <div className="shrink-0">
          {isLive ? (
            <span className="whitespace-nowrap shrink-0 px-2 py-0.5 rounded-none bg-red-500/15 border border-red-500/30 text-red-500 dark:text-red-400 font-mono font-bold text-[10px] flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              <span>🔴 LIVE</span>
            </span>
          ) : isFinished ? (
            <span className="whitespace-nowrap shrink-0 px-2 py-0.5 rounded-none bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] font-mono font-bold text-[10px]">
              ✓ SELESAI
            </span>
          ) : isRound1 ? (
            hasBothTeams && !r1Countdown.isDue ? (
              <span className="whitespace-nowrap shrink-0 px-2 py-0.5 rounded-none bg-amber-500/15 border border-amber-500/40 text-amber-500 font-mono font-bold text-[10px] animate-pulse">
                ⏳ Mulai dalam: {r1Countdown.formatted}
              </span>
            ) : hasBothTeams && r1Countdown.isDue ? (
              <span className="whitespace-nowrap shrink-0 px-2 py-0.5 rounded-none bg-red-500/15 border border-red-500/30 text-red-500 dark:text-red-400 font-mono font-bold text-[10px] animate-pulse">
                🔴 LIVE
              </span>
            ) : (
              <span className="whitespace-nowrap shrink-0 px-2 py-0.5 rounded-none bg-slate-100 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45] text-slate-500 font-mono font-bold text-[10px]">
                ⏳ MENUNGGU LAWAN
              </span>
            )
          ) : hasBothTeams ? (
            match.teamAReady || match.teamBReady ? (
              <span className="whitespace-nowrap shrink-0 px-2 py-0.5 rounded-none bg-amber-500/15 border border-amber-500/40 text-amber-500 font-mono font-bold text-[10px] animate-pulse">
                ⏳ 1/2 TIM SIAP
              </span>
            ) : match.scheduledAt ? (
              <span className="whitespace-nowrap shrink-0 px-2 py-0.5 rounded-none bg-purple-500/15 border border-purple-500/30 text-purple-400 font-mono font-bold text-[10px]">
                {scheduleInfo.badgeText}
              </span>
            ) : (
              <span className="whitespace-nowrap shrink-0 px-2 py-0.5 rounded-none bg-slate-100 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45] text-slate-600 dark:text-[#A78BFA] font-mono font-bold text-[10px]">
                ⏳ MENUNGGU KESIAPAN TIM
              </span>
            )
          ) : (
            <span className="whitespace-nowrap shrink-0 px-2 py-0.5 rounded-none bg-slate-100 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45] text-slate-500 font-mono text-[10px]">
              ⏳ MENUNGGU BAGAN
            </span>
          )}
        </div>
      </div>

      {/* Baris 2 (Tengah — Dua Baris Tim & Skor): */}
      <div className="space-y-1.5 font-mono mb-2">
        {/* TEAM A */}
        <div
          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-none transition-all ${
            isWinnerA
              ? "bg-[#10B981]/15 border border-[#10B981]/40 border-l-4 border-l-[#10B981] text-slate-900 dark:text-[#F8FAFC] font-bold"
              : isLoserA
              ? "opacity-40 grayscale text-zinc-500 line-through decoration-zinc-600/60 bg-slate-100 dark:bg-[#09040F] border border-slate-200 dark:border-[#2E1E45]"
              : "bg-slate-50 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45] text-slate-900 dark:text-[#F8FAFC]"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => teamAData && onTeamClick(teamAData)}
              className={`text-xs truncate min-w-0 text-left hover:underline ${
                teamAMatched
                  ? "text-[#F59E0B] font-black underline underline-offset-2"
                  : isWinnerA
                  ? "text-slate-900 dark:text-[#F8FAFC] font-bold"
                  : isLoserA
                  ? "text-zinc-500"
                  : "text-slate-900 dark:text-[#F8FAFC]"
              }`}
              title={teamAData ? "Klik untuk melihat susunan pemain" : undefined}
            >
              {match.teamA.name || "TBD"}
            </button>
            {isWinnerA && (
              <span className="text-[9px] font-mono font-bold text-[#10B981] shrink-0 whitespace-nowrap">
                {match.lossReason === "WO"
                  ? "✓ WO"
                  : match.lossReason === "DQ"
                  ? "✓ DQ"
                  : "✓ WIN"}
              </span>
            )}
            {isLoserA && match.lossReason === "WO" && (
              <span className="text-[9px] font-mono font-bold text-[#F59E0B] bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-1 py-0.2 rounded-none shrink-0 whitespace-nowrap">
                ✖ WO
              </span>
            )}
            {isLoserA && match.lossReason === "DQ" && (
              <span className="text-[9px] font-mono font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-1 py-0.2 rounded-none shrink-0 whitespace-nowrap">
                🚫 DQ
              </span>
            )}
          </div>
          <span
            className={`shrink-0 w-8 text-center text-xs font-mono py-0.5 rounded-none border ${
              isWinnerA
                ? "bg-[#10B981]/30 border-[#10B981]/50 text-slate-900 dark:text-[#F8FAFC] font-black"
                : isLoserA
                ? "bg-slate-100 dark:bg-[#09040F] border-slate-200 dark:border-[#2E1E45] text-zinc-500 font-bold"
                : "bg-slate-100 dark:bg-[#09040F] border-slate-200 dark:border-[#2E1E45] text-slate-900 dark:text-[#F8FAFC] font-bold"
            }`}
          >
            {isLoserA && match.lossReason === "WO"
              ? "WO"
              : isLoserA && match.lossReason === "DQ"
              ? "DQ"
              : match.teamA.score}
          </span>
        </div>

        {/* TEAM B */}
        <div
          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-none transition-all ${
            isWinnerB
              ? "bg-[#10B981]/15 border border-[#10B981]/40 border-l-4 border-l-[#10B981] text-slate-900 dark:text-[#F8FAFC] font-bold"
              : isLoserB
              ? "opacity-40 grayscale text-zinc-500 line-through decoration-zinc-600/60 bg-slate-100 dark:bg-[#09040F] border border-slate-200 dark:border-[#2E1E45]"
              : match.teamB.name === "BYE"
              ? "bg-slate-100 dark:bg-[#1A0E2E]/40 border border-slate-200 dark:border-[#2E1E45] text-slate-500 dark:text-[#A78BFA] italic"
              : "bg-slate-50 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45] text-slate-900 dark:text-[#F8FAFC]"
          }`}
        >
          {match.teamB.name === "BYE" ? (
            <span className="text-[11px] font-mono text-slate-500 dark:text-[#A78BFA] italic truncate min-w-0">BYE (Lolos Otomatis)</span>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => teamBData && onTeamClick(teamBData)}
                className={`text-xs truncate min-w-0 text-left hover:underline ${
                  teamBMatched
                    ? "text-[#F59E0B] font-black underline underline-offset-2"
                    : isWinnerB
                    ? "text-slate-900 dark:text-[#F8FAFC] font-bold"
                    : isLoserB
                    ? "text-zinc-500"
                    : "text-slate-900 dark:text-[#F8FAFC]"
                }`}
                title={teamBData ? "Klik untuk melihat susunan pemain" : undefined}
              >
                {match.teamB.name || "TBD"}
              </button>
              {isWinnerB && (
                <span className="text-[9px] font-mono font-bold text-[#10B981] shrink-0 whitespace-nowrap">
                  {match.lossReason === "WO"
                    ? "✓ WO"
                    : match.lossReason === "DQ"
                    ? "✓ DQ"
                    : "✓ WIN"}
                </span>
              )}
              {isLoserB && match.lossReason === "WO" && (
                <span className="text-[9px] font-mono font-bold text-[#F59E0B] bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-1 py-0.2 rounded-none shrink-0 whitespace-nowrap">
                  ✖ WO
                </span>
              )}
              {isLoserB && match.lossReason === "DQ" && (
                <span className="text-[9px] font-mono font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-1 py-0.2 rounded-none shrink-0 whitespace-nowrap">
                  🚫 DQ
                </span>
              )}
            </div>
          )}
          <span
            className={`shrink-0 w-8 text-center text-xs font-mono py-0.5 rounded-none border ${
              isWinnerB
                ? "bg-[#10B981]/30 border-[#10B981]/50 text-slate-900 dark:text-[#F8FAFC] font-black"
                : isLoserB
                ? "bg-slate-100 dark:bg-[#09040F] border-slate-200 dark:border-[#2E1E45] text-zinc-500 font-bold"
                : "bg-slate-100 dark:bg-[#09040F] border-slate-200 dark:border-[#2E1E45] text-slate-900 dark:text-[#F8FAFC] font-bold"
            }`}
          >
            {match.teamB.name === "BYE"
              ? "-"
              : isLoserB && match.lossReason === "WO"
              ? "WO"
              : isLoserB && match.lossReason === "DQ"
              ? "DQ"
              : match.teamB.score}
          </span>
        </div>
      </div>

      {/* Baris 3 (Bawah — Tombol Aksi Rapi): */}
      {(canAccessLobby || (isAdminOrMod && onAdminQuickUpdate)) && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-[#2A1B42] text-[10px] font-mono">
          {/* Kiri: Tombol 💬 Lobby Chat */}
          <div>
            {canAccessLobby && onOpenLobby ? (
              <button
                type="button"
                onClick={() => onOpenLobby(match)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-[10px] font-mono font-bold bg-slate-100 dark:bg-[#1A0E2E] text-slate-700 dark:text-[#A78BFA] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:border-[#7C3AED] border border-slate-200 dark:border-[#2E1E45] transition whitespace-nowrap"
                title="Buka Ruang Koordinasi Match (Khusus Kapten & Panitia)"
              >
                <MessageSquare size={11} />
                <span>💬 Match Chat</span>
              </button>
            ) : <div />}
          </div>

          {/* Kanan: Kontrol Admin */}
          {isAdminOrMod && onAdminQuickUpdate && (
            <div className="flex items-center gap-1.5 shrink-0">
              {match.matchStatus === "LIVE" ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdminQuickUpdate(match.matchId, "CANCEL_LIVE");
                  }}
                  className="px-2 py-0.5 rounded-none bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 font-bold whitespace-nowrap transition"
                  title="Batalkan LIVE dan kembali menunggu"
                >
                  ⏸ Batal
                </button>
              ) : isFinished ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdminQuickUpdate(match.matchId, "RESET_MATCH");
                  }}
                  className="px-2 py-0.5 rounded-none bg-amber-500/15 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 font-bold whitespace-nowrap transition"
                  title="Reset hasil dan buka kembali kunci match ini"
                >
                  ↺ Reset
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdminQuickUpdate(match.matchId, "SET_LIVE");
                  }}
                  className="px-2 py-0.5 rounded-none bg-red-500/15 text-red-400 hover:bg-red-500/30 border border-red-500/30 font-bold whitespace-nowrap transition"
                  title="Set status pertandingan ke LIVE"
                >
                  🔴 Live
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdminQuickUpdate(match.matchId, "FINISH_MATCH");
                }}
                className="px-2.5 py-0.5 rounded-none bg-purple-500/20 text-purple-300 hover:bg-purple-500/35 border border-purple-500/40 font-bold whitespace-nowrap transition"
                title="Update skor & tentukan pemenang pertandingan"
              >
                ⚡ Skor
              </button>
            </div>
          )}
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
    <div className="w-10 sm:w-12 shrink-0 flex flex-col">
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
    <div className="w-10 sm:w-12 shrink-0 flex flex-col">
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
    <div className="w-10 sm:w-12 shrink-0 flex flex-col">
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
    <div className="w-10 sm:w-12 shrink-0 flex flex-col">
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
    <div className="p-4 rounded-none border-2 border-amber-500/80 bg-gradient-to-b from-amber-500/25 via-[#1a1424] to-amber-950/40 text-center shadow-[0_0_25px_rgba(234,179,8,0.25)] animate-in zoom-in-95 duration-300 space-y-2">
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

      <div className="pt-2 border-t border-amber-500/20">
        <Link
          href="/hall-of-winners"
          className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition shadow-xs"
        >
          <span>Lihat &amp; Unduh Kartu Juara 🖼️</span>
        </Link>
      </div>
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
  searchQuery = "",
  onOpenLobby,
  currentUserId,
  currentUsername,
  tournamentEventDate,
}: {
  sortedRoundNumbers: number[];
  roundsMap: Map<number, TournamentMatch[]>;
  teams: TournamentTeam[];
  onTeamClick: (team: TournamentTeam) => void;
  isAdminOrMod?: boolean;
  onAdminQuickUpdate?: (matchId: string, action: "SET_LIVE" | "CANCEL_LIVE" | "RESET_MATCH" | "FINISH_MATCH") => void;
  searchQuery?: string;
  onOpenLobby?: (match: TournamentMatch) => void;
  currentUserId?: string;
  currentUsername?: string;
  tournamentEventDate?: string | Date;
}) {
  const totalRounds = sortedRoundNumbers.length;

  // 1. Debounce kata kunci pencarian selama 350ms agar tidak memicu scroll berlebihan di setiap ketukan keyboard
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Simpan referensi data rounds & matches terbaru di ref agar useEffect auto-scroll
  // TIDAK terpicu ulang oleh polling auto-refresh 4 detik
  const latestDataRef = useRef({ sortedRoundNumbers, roundsMap });
  useEffect(() => {
    latestDataRef.current = { sortedRoundNumbers, roundsMap };
  });

  // 2. Auto-scroll HANYA 1 KALI per perubahan kata kunci debouncedSearchQuery
  // Menggunakan scrollTo horizontal pada container pembungkus (.overflow-x-auto) tanpa scrollIntoView
  useEffect(() => {
    if (!debouncedSearchQuery || !debouncedSearchQuery.trim()) return;
    const q = debouncedSearchQuery.trim().toLowerCase();
    const cleanQ = q.replace(/^#/, "");

    const { sortedRoundNumbers: rNums, roundsMap: rMap } = latestDataRef.current;
    let targetMatchId: string | null = null;
    for (const rNum of rNums) {
      const rMatches = rMap.get(rNum) || [];
      const matched = rMatches.find(
        (m) =>
          (cleanQ.length > 0 && m.matchId.toLowerCase().includes(cleanQ)) ||
          (q.length > 0 && (m.teamA?.name || "").toLowerCase().includes(q)) ||
          (q.length > 0 && (m.teamB?.name || "").toLowerCase().includes(q))
      );
      if (matched) {
        targetMatchId = matched.matchId;
        break;
      }
    }

    if (targetMatchId) {
      const targetEl = document.getElementById(`bracket-match-${targetMatchId}`);
      if (targetEl) {
        // Cari kontainer pembungkus scroll horizontal (.overflow-x-auto)
        const scrollContainer = targetEl.closest(".overflow-x-auto") as HTMLDivElement | null;
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const targetRect = targetEl.getBoundingClientRect();
          const targetOffset = targetRect.left - containerRect.left + scrollContainer.scrollLeft;
          const targetLeft = Math.max(
            0,
            targetOffset - scrollContainer.clientWidth / 2 + targetEl.clientWidth / 2
          );

          scrollContainer.scrollTo({
            left: targetLeft,
            behavior: "smooth",
          });
        }
      }
    }
  }, [debouncedSearchQuery]);

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
              searchQuery={searchQuery}
              onOpenLobby={onOpenLobby}
              currentUserId={currentUserId}
              currentUsername={currentUsername}
              tournamentEventDate={tournamentEventDate}
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
  const allTournamentMatches: TournamentMatch[] = [];
  roundsMap.forEach((mList) => allTournamentMatches.push(...mList));

  const bronzeMatch = allTournamentMatches.find(
    (m) => m.matchId === "BRONZE-01" || m.roundName?.toLowerCase().includes("bronze")
  );

  const finalRoundNum = sortedRoundNumbers[sortedRoundNumbers.length - 1];
  const gfMatches = roundsMap.get(finalRoundNum) || [];
  const gfMatch =
    gfMatches.find((m) => m.matchId !== "BRONZE-01" && !m.roundName?.toLowerCase().includes("bronze")) ||
    gfMatches[0];

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
  const minWidthPx = Math.max(1100, totalCols * 320 + totalConnectors * 48);

  return (
    <div
      className="flex items-stretch gap-6 sm:gap-8 pb-4 pt-2 select-none"
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
            <div className="flex-1 flex flex-col w-[310px] min-w-[310px]">
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
                    searchQuery={searchQuery}
                    onOpenLobby={onOpenLobby}
                    currentUserId={currentUserId}
                    currentUsername={currentUsername}
                    tournamentEventDate={tournamentEventDate}
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

      {/* 2. TENGAH (CENTER STAGE): Kotak GRAND FINAL & PODIUM JUARA 1, serta KOTAK BRONZE MATCH */}
      <div className="flex-1 flex flex-col w-[330px] min-w-[330px] px-3 py-4 rounded-none border border-[#F59E0B]/50 bg-amber-50/20 dark:bg-[#130921] shadow-2xl">
        <div className="h-10 text-center pb-2 border-b border-slate-200 dark:border-[#2E1E45] shrink-0 mb-3 flex flex-col justify-center">
          <span className="text-[10px] font-mono text-[#F59E0B] uppercase tracking-widest block font-bold">
            ⚔️ TITIK TEMU FINAL ⚔️
          </span>
          <p className="text-xs sm:text-sm font-display font-bold text-slate-900 dark:text-[#F8FAFC] uppercase tracking-tight flex items-center justify-center gap-1.5 mt-0.5">
            <Crown size={15} className="text-[#F59E0B]" />
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
              searchQuery={searchQuery}
              onOpenLobby={onOpenLobby}
              currentUserId={currentUserId}
              currentUsername={currentUsername}
              tournamentEventDate={tournamentEventDate}
            />
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">Menunggu babak final</p>
          )}

          {/* Podium Juara 1 */}
          {gfMatch?.winner && (
            <ChampionCelebrationCard winnerName={gfMatch.winner} teams={teams} />
          )}

          {/* 🥉 KOTAK PEREBUTAN JUARA 3 (BRONZE MATCH) */}
          {bronzeMatch && (
            <div className="pt-4 mt-2 border-t border-slate-200 dark:border-[#2E1E45] space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#F59E0B] px-1">
                <span className="flex items-center gap-1 uppercase tracking-wider">
                  <Award size={13} className="text-[#F59E0B]" />
                  <span>🥉 BRONZE MATCH (PEREBUTAN JUARA 3)</span>
                </span>
                <span className="px-1.5 py-0.2 rounded-none bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-[9px]">
                  3RD PLACE
                </span>
              </div>
              <MatchCard
                match={bronzeMatch}
                teams={teams}
                isFinal={false}
                onTeamClick={onTeamClick}
                isAdminOrMod={isAdminOrMod}
                onAdminQuickUpdate={onAdminQuickUpdate}
                searchQuery={searchQuery}
                onOpenLobby={onOpenLobby}
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                tournamentEventDate={tournamentEventDate}
              />
              {bronzeMatch.winner && (
                <div className="p-2 rounded-none bg-slate-100 dark:bg-[#09040F] border border-slate-200 dark:border-[#2E1E45] text-center">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-gray-400 block">JUARA 3 RESMI (BRONZE):</span>
                  <span className="text-xs font-mono font-bold text-[#F59E0B] uppercase">{bronzeMatch.winner}</span>
                </div>
              )}
            </div>
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

            <div className="flex-1 flex flex-col w-[310px] min-w-[310px]">
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
                    searchQuery={searchQuery}
                    onOpenLobby={onOpenLobby}
                    currentUserId={currentUserId}
                    currentUsername={currentUsername}
                    tournamentEventDate={tournamentEventDate}
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
