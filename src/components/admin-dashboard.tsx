"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  BookOpen,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Crown,
  Dices,
  DollarSign,
  Download,
  Edit3,
  ExternalLink,
  Flag,
  ImageIcon,
  LayoutDashboard,
  Megaphone,
  Pin,
  PinOff,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Trophy,
  Users,
  CheckCircle,
  Eye,
  Terminal,
  Zap,
  MessageSquare,
  X,
} from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { DiscordAvatar } from "@/components/discord-avatar";
import { EscrowChatModal } from "@/components/escrow-chat-modal";
import { DragScrollContainer } from "@/components/drag-scroll-container";
import { GachaBracketModal } from "@/components/gacha-bracket-modal";
import { TournamentRulesModal } from "@/components/tournament-rules-modal";
import { EditTournamentModal } from "@/components/edit-tournament-modal";
import { TournamentBackupDropdown } from "@/components/tournament-backup-dropdown";
import { RosterPlayerRow } from "@/components/roster-player-row";
import { ImageUploader } from "@/components/ui/image-uploader";
import { useLiveSync } from "@/hooks/use-live-sync";
import { AiAdminTerminal } from "@/components/ai-admin-terminal";

type Role = "MEMBER" | "MODERATOR" | "ADMIN";

type Report = {
  id: string;
  postId: string;
  reason: string;
  createdAt: string;
  post: { id: string; title: string; category: string; isPinned?: boolean; author: { username: string | null } };
  reporter: { username: string | null };
};

type RecentPost = {
  id: string;
  title: string;
  category: string;
  isPinned: boolean;
  createdAt: string;
  author: { username: string | null };
};

type Member = {
  id: string;
  username: string | null;
  avatar: string | null;
  discordId?: string | null;
  role: Role;
  isBanned: boolean;
  isPremium?: boolean;
  xp?: number;
  level?: number;
  badges?: string[];
  joinedAt: string;
};

type MarketplaceListing = {
  id: string;
  title: string;
  marketData: unknown;
  createdAt: string;
  author: { id: string; username: string | null };
};

type DonationRecord = {
  id: string;
  userId: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUCCEEDED" | "FAILED";
  senderName?: string | null;
  notes?: string | null;
  proofUrl?: string | null;
  gatewayRef?: string | null;
  createdAt: string;
  user?: { id: string; username: string | null; avatar: string | null; badges?: string[] };
};

type AnnouncementRecord = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  expiresAt: string;
  author: { username: string | null };
};

type SiteConfig = {
  id: string;
  statMembers: string;
  statParties: string;
  statVoice: string;
  qrisImageUrl: string;
  rekberAccount: string;
  rekberFee: number;
  monthlyGoal: number;
  minDonation: number;
  discordInviteUrl: string;
  discordWebhookUrl?: string | null;
  discordAnnouncementChannelId?: string | null;
  discordGiveawayChannelId?: string | null;
  discordTournamentLiveChannelId?: string | null;
  discordInfoLiveChannelId?: string | null;
  discordPartnershipChannelId?: string | null;
  discordShopChannelId?: string | null;
  discordLfgChannelId?: string | null;
  discordModLogChannelId?: string | null;
  aiKnowledgeBase?: string | null;
  updatedAt?: string;
};

type Sponsor = {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  tier: string;
  createdAt: string;
};

type EscrowRecord = {
  id: string;
  amount: number;
  status: string;
  claimedById: string | null;
  createdAt: string;
  post: { id: string; title: string };
  buyer: { id: string; username: string | null; discordId: string | null };
  seller: { id: string; username: string | null; discordId: string | null };
  claimedBy: { id: string; username: string | null } | null;
};

type SecurityLogRecord = {
  id: string;
  userId: string | null;
  username: string;
  action: string;
  reason: string;
  content: string;
  flagged: string | null;
  severity: string;
  createdAt: string | Date;
};

type DashboardData = {
  stats: {
    totalMembers: number;
    totalForumThreads: number;
    activeMarketplaceListings: number;
    activeEscrows?: number;
    pendingDonations?: number;
    pendingTournamentRegistrations?: number;
    pendingReports: number;
    totalDonations: number;
  };
  reports: Report[];
  recentPosts?: RecentPost[];
  users: Member[];
  marketplaceListings?: MarketplaceListing[];
  donations?: DonationRecord[];
  announcements?: AnnouncementRecord[];
  siteConfig?: SiteConfig;
  sponsors?: Sponsor[];
  escrowTransactions?: EscrowRecord[];
  securityLogs?: SecurityLogRecord[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  canManageRoles: boolean;
  canBanMembers: boolean;
  canBroadcast: boolean;
  currentUserId: string;
};

type Tab = "overview" | "ai_command" | "settings" | "tournaments" | "hall_of_winners" | "treasury" | "members" | "moderation" | "security_logs";

const formatMoney = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export function AdminDashboard({ role, isOwner = false }: { role: Role; isOwner?: boolean }) {
  const isAdmin = role === "ADMIN";
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedEscrowId, setSelectedEscrowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");

  // Tournament Management State
  const [tournamentsList, setTournamentsList] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [tournamentFilterStatus, setTournamentFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [adminProofLightbox, setAdminProofLightbox] = useState<string | null>(null);
  const [adminVerificationLoading, setAdminVerificationLoading] = useState<string | null>(null);
  const [adminRulesViewModal, setAdminRulesViewModal] = useState<any | null>(null);
  const [editTournamentModal, setEditTournamentModal] = useState<any | null>(null);

  // Admin Gacha Bracket Modal State
  const [adminGachaModalState, setAdminGachaModalState] = useState<{
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

  // Tournament Creation State
  const [createTournamentOpen, setCreateTournamentOpen] = useState(false);
  const [creatingTournament, setCreatingTournament] = useState(false);
  const [newTourneyForm, setNewTourneyForm] = useState({
    title: "",
    game: "Mobile Legends: Bang Bang",
    prizePool: "Rp 500.000",
    teamCount: 8,
    mainPlayersCount: 5,
    subPlayersCount: 2,
    isFreeEntry: true,
    entryFee: 0,
    eventDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
    status: "REGISTRATION",
    rules: "",
  });

  async function handleCreateTournament(e: React.FormEvent) {
    e.preventDefault();
    if (!newTourneyForm.title.trim() || !newTourneyForm.game.trim()) {
      setError("Nama turnamen dan game wajib diisi.");
      return;
    }
    setCreatingTournament(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTourneyForm.title.trim(),
          game: newTourneyForm.game.trim(),
          prizePool: newTourneyForm.prizePool.trim() || "Prizepool Komunitas",
          teamCount: Number(newTourneyForm.teamCount) || 8,
          mainPlayersCount: Number(newTourneyForm.mainPlayersCount) || 5,
          subPlayersCount: Number(newTourneyForm.subPlayersCount) || 2,
          isFreeEntry: newTourneyForm.isFreeEntry,
          entryFee: newTourneyForm.isFreeEntry ? 0 : Number(newTourneyForm.entryFee) || 0,
          rules: newTourneyForm.rules.trim() || undefined,
          eventDate: newTourneyForm.eventDate ? new Date(newTourneyForm.eventDate).toISOString() : new Date().toISOString(),
          status: newTourneyForm.status,
        }),
      });
      const created = await readApiResponse<any>(response, "Gagal membuat turnamen.");
      setNotice(`Turnamen "${created.title}" berhasil dibuat lengkap dengan bagan!`);
      setCreateTournamentOpen(false);
      setNewTourneyForm({
        title: "",
        game: "Mobile Legends: Bang Bang",
        prizePool: "Rp 500.000",
        teamCount: 8,
        mainPlayersCount: 5,
        subPlayersCount: 2,
        isFreeEntry: true,
        entryFee: 0,
        eventDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
        status: "REGISTRATION",
        rules: "",
      });
      await fetchTournaments();
      setSelectedTournamentId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat turnamen.");
    } finally {
      setCreatingTournament(false);
    }
  }

  // Hall of Winners Management State
  const [hallOfWinnersList, setHallOfWinnersList] = useState<any[]>([]);
  const [loadingHow, setLoadingHow] = useState(false);
  const [howModalOpen, setHowModalOpen] = useState(false);
  const [howForm, setHowForm] = useState({
    tournamentTitle: "",
    game: "Mobile Legends: Bang Bang",
    season: "Season 1",
    prizePool: "Rp 500.000",
    eventDate: new Date().toISOString().slice(0, 10),
    championTeam: "",
    championRosterStr: "",
    runnerUpTeam: "",
    thirdPlaceTeam: "",
    notes: "",
  });

  async function fetchHallOfWinners() {
    setLoadingHow(true);
    try {
      const res = await fetch("/api/hall-of-winners");
      const list = await res.json();
      if (Array.isArray(list)) setHallOfWinnersList(list);
    } catch (err) {
      console.error("Gagal mengambil data Hall of Winners:", err);
    } finally {
      setLoadingHow(false);
    }
  }

  async function handleCreateHow(e: React.FormEvent) {
    e.preventDefault();
    if (!howForm.tournamentTitle || !howForm.championTeam) {
      setError("Judul Turnamen dan Nama Tim Juara 1 wajib diisi!");
      return;
    }

    try {
      const rosterArr = howForm.championRosterStr
        ? howForm.championRosterStr
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((name) => ({ name, inGameId: "VERIFIED" }))
        : [];

      const res = await fetch("/api/hall-of-winners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentTitle: howForm.tournamentTitle,
          game: howForm.game,
          season: howForm.season,
          prizePool: howForm.prizePool,
          eventDate: howForm.eventDate,
          championTeam: howForm.championTeam,
          championRoster: rosterArr,
          runnerUpTeam: howForm.runnerUpTeam || undefined,
          thirdPlaceTeam: howForm.thirdPlaceTeam || undefined,
          notes: howForm.notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyimpan arsip.");
      }

      setNotice("Arsip Hall of Winners berhasil ditambahkan!");
      setHowModalOpen(false);
      setHowForm({
        tournamentTitle: "",
        game: "Mobile Legends: Bang Bang",
        season: "Season 1",
        prizePool: "Rp 500.000",
        eventDate: new Date().toISOString().slice(0, 10),
        championTeam: "",
        championRosterStr: "",
        runnerUpTeam: "",
        thirdPlaceTeam: "",
        notes: "",
      });
      fetchHallOfWinners();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan arsip.");
    }
  }

  async function handleDeleteHow(id: string) {
    if (!window.confirm("Apakah kamu yakin ingin menghapus arsip manual ini?")) return;
    try {
      const res = await fetch(`/api/hall-of-winners/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus arsip.");
      setNotice("Arsip berhasil dihapus.");
      fetchHallOfWinners();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus arsip.");
    }
  }

  async function handleAdminGachaBracket(tournament: any) {
    if (!tournament) return;

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
      .map((t: any) => t.teamName)
      .filter((n: any) => n && !n.startsWith("Tim ") && n !== "BYE" && n !== "TBD");

    setAdminGachaModalState({
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
      await readApiResponse(response, "Gagal mengacak bagan.");

      const elapsed = Date.now() - startTime;
      if (elapsed < 750) {
        await new Promise((r) => setTimeout(r, 750 - elapsed));
      }

      await fetchTournaments();
      setAdminGachaModalState((prev) => ({ ...prev, isRolling: false }));
      setNotice("🎲 Bagan berhasil diacak! Susunan pertandingan baru telah disimpan.");
    } catch (err) {
      setAdminGachaModalState({ isOpen: false, isRolling: false, tournamentTitle: "", teamsList: [] });
      setError(err instanceof Error ? err.message : "Gagal mengacak bagan turnamen.");
    }
  }

  const fetchTournaments = async () => {
    try {
      const res = await fetch("/api/tournaments");
      const list = await res.json();
      if (Array.isArray(list)) {
        setTournamentsList((prev) => (JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
        if (!selectedTournamentId && list.length > 0) {
          setSelectedTournamentId(list[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  async function handleAdminVerification(tournamentId: string, participantId: string, action: "APPROVE" | "REJECT") {
    let reason = "";
    if (action === "REJECT") {
      const promptReason = window.prompt("Masukkan alasan penolakan (opsional):", "Bukti transfer tidak valid atau belum masuk ke rekening kas guild.");
      if (promptReason === null) return;
      reason = promptReason;
    }
    setAdminVerificationLoading(participantId);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/participants`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, action, reason }),
      });
      const res = await readApiResponse<{ message: string }>(response, "Gagal memproses verifikasi.");
      setNotice(res.message);
      await fetchTournaments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses verifikasi.");
    } finally {
      setAdminVerificationLoading(null);
    }
  }

  // Site Config CMS Form State
  const isConfigInitializedRef = useRef(false);
  const [configForm, setConfigForm] = useState<SiteConfig>({
    id: "default",
    statMembers: "1,200+",
    statParties: "450+",
    statVoice: "24/7",
    qrisImageUrl: "/qris-guild.png",
    rekberAccount: "BCA 1234567890 a.n LogHorizon",
    rekberFee: 5000,
    monthlyGoal: 5000000,
    minDonation: 10000,
    discordInviteUrl: "https://discord.gg/aJvbVyTxNb",
    discordWebhookUrl: "",
    discordAnnouncementChannelId: "1547552373629780038",
    discordGiveawayChannelId: "1547552377396011118",
    discordTournamentLiveChannelId: "1572575614974693427",
    discordInfoLiveChannelId: "1547552381221339149",
    discordPartnershipChannelId: "1572235405770887269",
    discordShopChannelId: "1547552452725973093",
    discordLfgChannelId: "1547552498833825874",
    discordModLogChannelId: "1547552557868777552",
    aiKnowledgeBase: "",
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingBotChannel, setTestingBotChannel] = useState<string | null>(null);

  async function handleTestDiscordBot(channelKey: string, channelId?: string | null) {
    if (testingBotChannel) return;
    setTestingBotChannel(channelKey);
    try {
      const res = await fetch("/api/admin/discord/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelKey, channelId: channelId || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menguji bot Discord.");
      }
      setNotice(data.message || "Pesan tes berhasil dikirim ke channel Discord!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menguji bot Discord.");
    } finally {
      setTestingBotChannel(null);
    }
  }

  // New Sponsor Form State
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorLogo, setSponsorLogo] = useState("");
  const [sponsorWebsite, setSponsorWebsite] = useState("");
  const [sponsorTier, setSponsorTier] = useState("Benefactor");
  const [savingSponsor, setSavingSponsor] = useState(false);

  function loadDashboard() {
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), search });
    fetch(`/api/admin/dashboard?${query}`)
      .then((response) => readApiResponse<DashboardData>(response, "Gagal memuat dashboard."))
      .then((result) => {
        setData(result);
        if (result.siteConfig && !isConfigInitializedRef.current) {
          setConfigForm({
            ...result.siteConfig,
            discordAnnouncementChannelId: result.siteConfig.discordAnnouncementChannelId || "1547552373629780038",
            discordGiveawayChannelId: result.siteConfig.discordGiveawayChannelId || "1547552377396011118",
            discordTournamentLiveChannelId: result.siteConfig.discordTournamentLiveChannelId || "1572575614974693427",
            discordInfoLiveChannelId: result.siteConfig.discordInfoLiveChannelId || "1547552381221339149",
            discordPartnershipChannelId: result.siteConfig.discordPartnershipChannelId || "1572235405770887269",
            discordShopChannelId: result.siteConfig.discordShopChannelId || "1547552452725973093",
            discordLfgChannelId: result.siteConfig.discordLfgChannelId || "1547552498833825874",
            discordModLogChannelId: result.siteConfig.discordModLogChannelId || "1547552557868777552",
          });
          isConfigInitializedRef.current = true;
        }
        setError("");
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Gagal memuat dashboard.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadDashboard();
    fetchTournaments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  // Strict Moderator Guard: Ensure non-admins never access admin-only tabs
  useEffect(() => {
    if (!isAdmin && (tab === "settings" || tab === "treasury" || tab === "ai_command")) {
      setTab("overview");
    }
  }, [isAdmin, tab]);

  useLiveSync(() => {
    const query = new URLSearchParams({ page: String(page), search });
    fetch(`/api/admin/dashboard?${query}`)
      .then((response) => readApiResponse<DashboardData>(response, "Gagal memuat dashboard."))
      .then((result) => {
        setData((prev) => (!prev || JSON.stringify(prev) !== JSON.stringify(result) ? result : prev));
      })
      .catch(() => {});
    fetchTournaments();
  }, { intervalMs: 12000, revalidateOnFocus: true });

  // Save Site Config CMS
  async function handleSaveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingConfig(true);
    setError("");
    try {
      const response = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm),
      });
      const result = await readApiResponse<{ config: SiteConfig; message: string }>(response, "Gagal menyimpan konfigurasi.");
      setConfigForm({
        ...result.config,
        discordAnnouncementChannelId: result.config.discordAnnouncementChannelId || "1547552373629780038",
        discordGiveawayChannelId: result.config.discordGiveawayChannelId || "1547552377396011118",
        discordTournamentLiveChannelId: result.config.discordTournamentLiveChannelId || "1572575614974693427",
        discordInfoLiveChannelId: result.config.discordInfoLiveChannelId || "1547552381221339149",
        discordPartnershipChannelId: result.config.discordPartnershipChannelId || "1572235405770887269",
        discordShopChannelId: result.config.discordShopChannelId || "1547552452725973093",
        discordLfgChannelId: result.config.discordLfgChannelId || "1547552498833825874",
        discordModLogChannelId: result.config.discordModLogChannelId || "1547552557868777552",
      });
      isConfigInitializedRef.current = true;
      setNotice(result.message || "Pengaturan website berhasil disimpan!");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menyimpan konfigurasi.");
    } finally {
      setSavingConfig(false);
    }
  }

  // Reset Simulated Donations to pure Rp 0
  async function handleResetDonations() {
    const confirmed = window.confirm(
      "PERINGATAN: Apakah kamu yakin ingin mereset seluruh data donasi simulasi? Saldo kas terverifikasi akan kembali ke Rp 0."
    );
    if (!confirmed) return;

    setBusyId("reset-donations");
    setError("");
    try {
      const response = await fetch("/api/admin/donations/reset", {
        method: "POST",
      });
      const result = await readApiResponse<{ message: string }>(response, "Gagal mereset data donasi.");
      setNotice(result.message || "Seluruh data transaksi donasi simulasi telah dihapus. Saldo kas kembali Rp 0.");
      loadDashboard();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal mereset data donasi.");
    } finally {
      setBusyId("");
    }
  }

  // Export Financial Report to CSV
  function exportFinancialReportCSV() {
    if (!data?.donations || data.donations.length === 0) {
      alert("Belum ada data mutasi kas donasi untuk diekspor.");
      return;
    }

    const headers = [
      "ID Transaksi",
      "Waktu Mutasi",
      "Kategori",
      "Pengirim / Username",
      "Nominal (IDR)",
      "Status Verifikasi",
      "Catatan",
    ];

    const rows = data.donations.map((d) => [
      `"${d.id}"`,
      `"${new Date(d.createdAt).toLocaleString("id-ID")}"`,
      '"DONASI_KAS_QRIS"',
      `"${(d.senderName || d.user?.username || "Anonim").replace(/"/g, '""')}"`,
      d.amount,
      `"${d.status}"`,
      `"${(d.notes || "-").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Keuangan_Kas_LogHorizon_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setNotice("Laporan Keuangan (.CSV) berhasil diekspor!");
  }

  // Add Sponsor (Logo + Link Website saja)
  async function handleAddSponsor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sponsorLogo) {
      setError("Logo sponsor wajib diunggah!");
      return;
    }
    setSavingSponsor(true);
    setError("");
    try {
      const response = await fetch("/api/admin/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl: sponsorLogo.trim(),
          websiteUrl: sponsorWebsite.trim() || undefined,
          tier: "Official Sponsor",
        }),
      });
      const result = await readApiResponse<{ sponsor: Sponsor }>(response, "Gagal menambahkan sponsor.");
      setData((current) =>
        current
          ? {
              ...current,
              sponsors: [result.sponsor, ...(current.sponsors ?? [])],
            }
          : current
      );
      setSponsorName("");
      setSponsorLogo("");
      setSponsorWebsite("");
      setNotice(`Sponsor baru berhasil ditambahkan.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menambahkan sponsor.");
    } finally {
      setSavingSponsor(false);
    }
  }

  // Delete Sponsor
  async function handleDeleteSponsor(id: string, name: string) {
    if (!window.confirm(`Hapus sponsor "${name}"?`)) return;
    setBusyId(id);
    setError("");
    try {
      await readApiResponse(await fetch(`/api/admin/sponsors/${id}`, { method: "DELETE" }), "Gagal menghapus sponsor.");
      setData((current) =>
        current
          ? {
              ...current,
              sponsors: current.sponsors?.filter((s) => s.id !== id),
            }
          : current
      );
      setNotice(`Sponsor "${name}" berhasil dihapus.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menghapus sponsor.");
    } finally {
      setBusyId("");
    }
  }

  // Handle report dismiss or delete
  async function handleReport(report: Report, action: "dismiss" | "delete-post") {
    const confirmed = window.confirm(
      action === "delete-post"
        ? `Hapus postingan "${report.post.title}" dan seluruh laporannya?`
        : `Abaikan laporan untuk "${report.post.title}"?`
    );
    if (!confirmed) return;
    setBusyId(report.id);
    setError("");
    try {
      await readApiResponse(
        await fetch(`/api/admin/reports/${report.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }),
        "Aksi moderasi gagal."
      );
      setData((current) =>
        current
          ? {
              ...current,
              reports: current.reports.filter((item) =>
                action === "delete-post" ? item.postId !== report.postId : item.id !== report.id
              ),
              stats: {
                ...current.stats,
                pendingReports: Math.max(
                  0,
                  current.stats.pendingReports -
                    (action === "delete-post"
                      ? current.reports.filter((item) => item.postId === report.postId).length
                      : 1)
                ),
              },
            }
          : current
      );
      setNotice(action === "delete-post" ? "Postingan dan laporannya telah dihapus." : "Laporan telah ditandai selesai.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Aksi moderasi gagal.");
    } finally {
      setBusyId("");
    }
  }

  // Handle Pin / Unpin Forum Post
  async function togglePinPost(postId: string, currentPinned: boolean) {
    setBusyId(postId);
    setError("");
    try {
      await readApiResponse(
        await fetch(`/api/posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPinned: !currentPinned }),
        }),
        "Gagal mengubah pin status."
      );
      setData((current) =>
        current
          ? {
              ...current,
              recentPosts: current.recentPosts?.map((p) =>
                p.id === postId ? { ...p, isPinned: !currentPinned } : p
              ),
            }
          : current
      );
      setNotice(!currentPinned ? "Postingan berhasil disematkan (pinned)!" : "Pin postingan dicabut.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal mengubah pin status.");
    } finally {
      setBusyId("");
    }
  }

  // Handle Delete Post directly
  async function deletePostDirect(postId: string, title: string) {
    if (!window.confirm(`Hapus thread "${title}" secara permanen?`)) return;
    setBusyId(postId);
    setError("");
    try {
      await readApiResponse(await fetch(`/api/posts/${postId}`, { method: "DELETE" }), "Gagal menghapus thread.");
      setData((current) =>
        current
          ? {
              ...current,
              recentPosts: current.recentPosts?.filter((p) => p.id !== postId),
              marketplaceListings: current.marketplaceListings?.filter((p) => p.id !== postId),
            }
          : current
      );
      setNotice(`Thread "${title}" berhasil dihapus.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menghapus thread.");
    } finally {
      setBusyId("");
    }
  }

  // Update member properties (role, ban, xp, premium)
  async function updateMember(
    member: Member,
    change: { role?: Role; isBanned?: boolean; isPremium?: boolean; xp?: number; level?: number }
  ) {
    setBusyId(member.id);
    setError("");
    try {
      const updated = await readApiResponse<Member>(
        await fetch(`/api/admin/users/${member.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(change),
        }),
        "Perubahan member gagal disimpan."
      );
      setData((current) =>
        current
          ? {
              ...current,
              users: current.users.map((item) => (item.id === updated.id ? updated : item)),
            }
          : current
      );
      setNotice(`Data anggota ${updated.username ?? "member"} berhasil diperbarui.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Perubahan member gagal disimpan.");
    } finally {
      setBusyId("");
    }
  }

  async function handleEditXpLevel(member: Member) {
    const nextLevelStr = window.prompt(
      `Masukkan Level baru untuk @${member.username ?? "Member"} (1–100):`,
      String(member.level ?? 1)
    );
    if (nextLevelStr === null) return;
    const nextLevel = parseInt(nextLevelStr, 10);
    if (isNaN(nextLevel) || nextLevel < 1 || nextLevel > 100) {
      setError("Level harus berupa angka antara 1 dan 100.");
      return;
    }

    const nextXpStr = window.prompt(
      `Masukkan total XP baru untuk @${member.username ?? "Member"}:`,
      String(member.xp ?? 0)
    );
    if (nextXpStr === null) return;
    const nextXp = parseInt(nextXpStr, 10);
    if (isNaN(nextXp) || nextXp < 0) {
      setError("XP harus berupa angka positif.");
      return;
    }

    await updateMember(member, { level: nextLevel, xp: nextXp });
  }

  // Update Marketplace Listing Status
  async function updateListingStatus(postId: string, newStatus: "AVAILABLE" | "IN_ESCROW" | "SOLD") {
    setBusyId(postId);
    setError("");
    try {
      await readApiResponse(
        await fetch(`/api/posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }),
        "Gagal memperbarui status lapak."
      );
      setData((current) =>
        current
          ? {
              ...current,
              marketplaceListings: current.marketplaceListings?.map((l) => {
                if (l.id !== postId) return l;
                const mData = (l.marketData && typeof l.marketData === "object" ? l.marketData : {}) as Record<string, unknown>;
                return { ...l, marketData: { ...mData, status: newStatus } };
              }),
            }
          : current
      );
      setNotice(`Status lapak diperbarui menjadi ${newStatus}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal memperbarui status lapak.");
    } finally {
      setBusyId("");
    }
  }

  // Claim Escrow Ticket
  async function claimEscrow(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/escrow/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim" }),
      });
      await readApiResponse(res, "Gagal mengklaim tiket rekber.");
      setNotice("Tiket Rekber berhasil diklaim! Membuka ruang chat rekber...");
      setSelectedEscrowId(id);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengklaim tiket rekber.");
    } finally {
      setBusyId("");
    }
  }

  // Verify Donation
  async function verifyDonation(donationId: string, newStatus: "APPROVED" | "REJECTED") {
    setBusyId(donationId);
    setError("");
    try {
      await readApiResponse(
        await fetch(`/api/admin/donations/${donationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }),
        "Gagal memproses verifikasi donasi."
      );
      setData((current) =>
        current
          ? {
              ...current,
              donations: current.donations?.map((d) => (d.id === donationId ? { ...d, status: newStatus } : d)),
            }
          : current
      );
      setNotice(
        newStatus === "APPROVED"
          ? "Donasi berhasil diverifikasi (ACC)! Role & lencana donor otomatis diaktifkan."
          : "Donasi ditolak."
      );
      loadDashboard();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal memproses verifikasi donasi.");
    } finally {
      setBusyId("");
    }
  }

  const pendingDonationsList = data?.donations?.filter((d) => d.status === "PENDING") ?? [];
  const processedDonationsList = data?.donations?.filter((d) => d.status !== "PENDING") ?? [];
  const totalPendingTournament =
    data?.stats.pendingTournamentRegistrations ??
    tournamentsList.reduce(
      (acc, t) =>
        acc +
        (t.participants?.filter((p: any) => p.paymentStatus === "PENDING_PAYMENT").length || 0),
      0
    );

  return (
    <main className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-12 overflow-x-hidden">
      <div>
        <Link href="/" className="back-link inline-flex items-center gap-1.5 text-xs font-bold text-[#9D4EDD] mb-4">
          <ArrowLeft size={15} /> Kembali ke situs
        </Link>

        {/* Title Header */}
        <div className="admin-title-row flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <p className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-1">
              LOGHORIZON / GUILD HEADQUARTERS
            </p>
            <h1 className="page-title text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white break-words">
              Command <span className="text-[#9D4EDD] dark:text-[#C77DFF]">Center</span>
            </h1>
            <p className="muted-copy text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Pusat kendali operasional, CMS website, perbendaharaan, dan manajemen anggota LogHorizon.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => loadDashboard()}
              className="p-2 rounded-md border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] text-gray-600 dark:text-gray-300 hover:border-[#9D4EDD]"
              title="Refresh Data"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <span
              className={`admin-role-badge inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border ${
                isOwner
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : role === "ADMIN"
                    ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                    : "bg-blue-500/15 text-blue-400 border-blue-500/30"
              }`}
            >
              <Shield size={14} />{" "}
              {isOwner
                ? "👑 Emperor (Owner)"
                : role === "ADMIN"
                  ? "✨ Prince / Princess (Admin)"
                  : "⚔️ Lord Commander (Mod)"}
            </span>
          </div>
        </div>

        {/* Global Notifications */}
        {notice && (
          <div className="inline-notice mb-4 p-3 rounded-none bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-between" role="status">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} aria-label="Tutup notifikasi">
              <X size={15} />
            </button>
          </div>
        )}
        {error && (
          <div className="inline-error mb-4 p-3 rounded-none bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center justify-between" role="alert">
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Tutup pesan">
              <X size={15} />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* RESPONSIVE LAYOUT: DESKTOP SIDEBAR + MOBILE HORIZONTAL TABS */}
        {/* ========================================================================= */}
        <div className="lg:flex lg:gap-8 items-start">
          {/* DESKTOP SIDEBAR (< lg hidden) */}
          <aside className="hidden lg:flex flex-col w-64 shrink-0 space-y-1 sticky top-24 p-3 rounded-lg border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-1.5">
              {isAdmin ? "MODUL COMMAND CENTER" : "MODUL MODERASI & WASIT"}
            </p>

            {/* AI COMMAND ASSISTANT (KHUSUS ADMIN) */}
            {isAdmin && (
              <button
                type="button"
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                  tab === "ai_command"
                    ? "bg-[#9D4EDD] text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1C1724]"
                }`}
                onClick={() => setTab("ai_command")}
              >
                <div className="flex items-center gap-2.5">
                  <Terminal size={16} />
                  <span>AI Command Assistant</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${tab === "ai_command" ? "bg-white text-[#9D4EDD]" : "bg-amber-500/20 text-amber-400"}`}>
                  AI
                </span>
              </button>
            )}

            {/* 1. RINGKASAN & KEUANGAN */}
            <button
              type="button"
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                tab === "overview"
                  ? "bg-[#9D4EDD] text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1C1724]"
              }`}
              onClick={() => setTab("overview")}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard size={16} />
                <span>{isAdmin ? "Ringkasan & Keuangan" : "Ringkasan & Moderasi"}</span>
              </div>
            </button>

            {/* 2. TURNAMEN & VERIFIKASI PESERTA */}
            <button
              type="button"
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                tab === "tournaments" || tab === "hall_of_winners"
                  ? "bg-[#9D4EDD] text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1C1724]"
              }`}
              onClick={() => {
                setTab("tournaments");
                fetchTournaments();
              }}
            >
              <div className="flex items-center gap-2.5">
                <Trophy size={16} />
                <span>Turnamen &amp; Peserta</span>
              </div>
              {(() => {
                const totalPending = tournamentsList.reduce((acc, t) => acc + (t.participants?.filter((p: any) => p.paymentStatus === "PENDING_PAYMENT").length || 0), 0);
                return totalPending > 0 ? (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${tab === "tournaments" ? "bg-white text-[#9D4EDD]" : "bg-amber-500/20 text-amber-400"}`}>
                    {totalPending}
                  </span>
                ) : null;
              })()}
            </button>

            {/* 3. VERIFIKASI KAS DONASI & REKBER (KHUSUS ADMIN) */}
            {isAdmin && (
              <button
                type="button"
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                  tab === "treasury"
                    ? "bg-[#9D4EDD] text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1C1724]"
                }`}
                onClick={() => setTab("treasury")}
              >
                <div className="flex items-center gap-2.5">
                  <Coins size={16} />
                  <span>Kas Donasi &amp; Rekber</span>
                </div>
                {Boolean(data?.stats.pendingDonations) && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${tab === "treasury" ? "bg-white text-[#9D4EDD]" : "bg-amber-500/20 text-amber-400"}`}>
                    {data?.stats.pendingDonations}
                  </span>
                )}
              </button>
            )}

            {/* 4. MANAJEMEN MEMBER & KASTA */}
            <button
              type="button"
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                tab === "members"
                  ? "bg-[#9D4EDD] text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1C1724]"
              }`}
              onClick={() => setTab("members")}
            >
              <div className="flex items-center gap-2.5">
                <Users size={16} />
                <span>Member, Kasta &amp; Staf</span>
              </div>
            </button>

            {/* 5. MODERASI & LOG KEAMANAN SATPAM AI */}
            <button
              type="button"
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                tab === "moderation" || tab === "security_logs"
                  ? "bg-[#9D4EDD] text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1C1724]"
              }`}
              onClick={() => setTab("moderation")}
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert size={16} />
                <span>Moderasi &amp; Log AI</span>
              </div>
              {Boolean(data?.stats.pendingReports) && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${tab === "moderation" ? "bg-white text-[#9D4EDD]" : "bg-rose-500/20 text-rose-400"}`}>
                  {data?.stats.pendingReports}
                </span>
              )}
            </button>

            {/* 6. PENGATURAN WEB (CMS), OTAK AI & BROADCAST */}
            {isAdmin && (
              <button
                type="button"
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                  tab === "settings"
                    ? "bg-[#9D4EDD] text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1C1724]"
                }`}
                onClick={() => setTab("settings")}
              >
                <div className="flex items-center gap-2.5">
                  <Settings size={16} />
                  <span>Pengaturan Web &amp; AI</span>
                </div>
              </button>
            )}

            <Link
              href="/events?view=turnamen"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1C1724] border border-dashed border-[#9D4EDD]/40 mt-3 bg-[#9D4EDD]/5 transition-colors"
            >
              <div className="flex items-center gap-2.5 text-[#9D4EDD]">
                <Trophy size={16} />
                <span>Bagan Turnamen Live</span>
              </div>
              <ExternalLink size={12} className="text-gray-400" />
            </Link>
          </aside>

          {/* MOBILE HORIZONTAL SCROLLABLE TABS (>= lg hidden) */}
          <div className="lg:hidden flex overflow-x-auto gap-2 pb-2 mb-6 border-b border-gray-200 dark:border-[#2E1E45] no-scrollbar -mx-4 px-4">
            {isAdmin && (
              <button
                type="button"
                className={`whitespace-nowrap shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
                  tab === "ai_command" ? "bg-[#9D4EDD] text-white shadow-sm" : "bg-gray-100 dark:bg-[#130921] text-gray-700 dark:text-gray-300"
                }`}
                onClick={() => setTab("ai_command")}
              >
                <Terminal size={14} /> <span>⚡ AI Command</span>
              </button>
            )}

            <button
              type="button"
              className={`whitespace-nowrap shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
                tab === "overview" ? "bg-[#9D4EDD] text-white shadow-sm" : "bg-gray-100 dark:bg-[#130921] text-gray-700 dark:text-gray-300"
              }`}
              onClick={() => setTab("overview")}
            >
              <LayoutDashboard size={14} /> <span>{isAdmin ? "1. Ringkasan" : "1. Ringkasan & Wasit"}</span>
            </button>

            <button
              type="button"
              className={`whitespace-nowrap shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
                tab === "tournaments" || tab === "hall_of_winners" ? "bg-[#9D4EDD] text-white shadow-sm" : "bg-gray-100 dark:bg-[#130921] text-gray-700 dark:text-gray-300"
              }`}
              onClick={() => {
                setTab("tournaments");
                fetchTournaments();
              }}
            >
              <Trophy size={14} /> <span>2. Turnamen</span>
              {(() => {
                const totalPending = tournamentsList.reduce((acc, t) => acc + (t.participants?.filter((p: any) => p.paymentStatus === "PENDING_PAYMENT").length || 0), 0);
                return totalPending > 0 ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-extrabold">
                    {totalPending}
                  </span>
                ) : null;
              })()}
            </button>

            {isAdmin && (
              <button
                type="button"
                className={`whitespace-nowrap shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
                  tab === "treasury" ? "bg-[#9D4EDD] text-white shadow-sm" : "bg-gray-100 dark:bg-[#130921] text-gray-700 dark:text-gray-300"
                }`}
                onClick={() => setTab("treasury")}
              >
                <Coins size={14} /> <span>3. Kas &amp; Rekber</span>
                {Boolean(data?.stats.pendingDonations) && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-extrabold">
                    {data?.stats.pendingDonations}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              className={`whitespace-nowrap shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
                tab === "members" ? "bg-[#9D4EDD] text-white shadow-sm" : "bg-gray-100 dark:bg-[#130921] text-gray-700 dark:text-gray-300"
              }`}
              onClick={() => setTab("members")}
            >
              <Users size={14} /> <span>4. Member &amp; Kasta</span>
            </button>

            <button
              type="button"
              className={`whitespace-nowrap shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
                tab === "moderation" || tab === "security_logs" ? "bg-[#9D4EDD] text-white shadow-sm" : "bg-gray-100 dark:bg-[#130921] text-gray-700 dark:text-gray-300"
              }`}
              onClick={() => setTab("moderation")}
            >
              <ShieldAlert size={14} /> <span>5. Moderasi &amp; AI</span>
              {Boolean(data?.stats.pendingReports) && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-extrabold">
                  {data?.stats.pendingReports}
                </span>
              )}
            </button>

            {isAdmin && (
              <button
                type="button"
                className={`whitespace-nowrap shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
                  tab === "settings" ? "bg-[#9D4EDD] text-white shadow-sm" : "bg-gray-100 dark:bg-[#130921] text-gray-700 dark:text-gray-300"
                }`}
                onClick={() => setTab("settings")}
              >
                <Settings size={14} /> <span>6. Web CMS &amp; AI</span>
              </button>
            )}

            <Link
              href="/events?view=turnamen"
              className="whitespace-nowrap shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-[#9D4EDD]/10 text-[#9D4EDD] border border-[#9D4EDD]/30"
            >
              <Trophy size={14} /> <span>Bagan Live</span>
            </Link>
          </div>

          {/* MAIN TAB CONTENT */}
          <div className="min-w-0 flex-1">
            {/* ========================================================================= */}
            {/* TAB: AI ADMIN COMMAND ASSISTANT TERMINAL (EXCLUSIVE ADMIN) */}
            {/* ========================================================================= */}
            {tab === "ai_command" && isAdmin && (
              <section className="space-y-6 pb-28 lg:pb-24" role="tabpanel">
                <AiAdminTerminal
                  onActionExecuted={() => {
                    loadDashboard();
                    fetchTournaments();
                  }}
                />
              </section>
            )}

            {/* ========================================================================= */}
            {/* TAB 1: OVERVIEW & STATISTIK GUILD */}
            {/* ========================================================================= */}
            {tab === "overview" && (
              <section className="space-y-6" role="tabpanel">
                {/* EXECUTIVE HEADER WITH CSV EXPORT */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <DollarSign size={16} className="text-[#9D4EDD]" />
                      <span>{isAdmin ? "Ringkasan Eksekutif & Kas Perbendaharaan Guild" : "Ringkasan Pengawasan & Wasit Turnamen Guild"}</span>
                    </h2>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {isAdmin
                        ? "Pemasukan kas terverifikasi bersifat rahasia dan hanya dapat diakses oleh jajaran pengurus di sini."
                        : "Pantau aktivitas petualang, laporan konten, dan antrean wasit pertandingan komunitas."}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => exportFinancialReportCSV()}
                      className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-none bg-[#9D4EDD] hover:bg-[#7B2CBF] text-white transition shadow-sm shrink-0"
                      title="Unduh seluruh mutasi donasi kas dalam format spreadsheet CSV"
                    >
                      <Download size={14} />
                      <span>Export Laporan Keuangan (.CSV)</span>
                    </button>
                  )}
                </div>

                {/* 5 METRIC CARDS */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                  <article className="p-4 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                    <div className="flex items-center justify-between text-[#9D4EDD]">
                      <Users size={20} />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mt-2">Total Member</span>
                    <strong className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white block mt-0.5">
                      {data?.stats.totalMembers ?? "0"}
                    </strong>
                  </article>

                  {isAdmin ? (
                    <article className="p-4 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                      <div className="flex items-center justify-between text-purple-400">
                        <DollarSign size={20} />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block mt-2">Kas Terverifikasi</span>
                      <strong className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-300 block mt-0.5 truncate">
                        {data ? formatMoney.format(data.stats.totalDonations) : "Rp 0"}
                      </strong>
                    </article>
                  ) : (
                    <article className="p-4 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                      <div className="flex items-center justify-between text-rose-500">
                        <ShieldAlert size={20} />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block mt-2">Laporan Konten</span>
                      <strong className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white block mt-0.5">
                        {data?.stats.pendingReports ?? 0}
                      </strong>
                    </article>
                  )}

                  {isAdmin ? (
                    <article className="p-4 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                      <div className="flex items-center justify-between text-amber-500">
                        <Coins size={20} />
                        {Boolean(data?.stats.pendingDonations) && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-400">
                            AKSI
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block mt-2">Donasi Pending</span>
                      <strong className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white block mt-0.5">
                        {data?.stats.pendingDonations ?? 0}
                      </strong>
                    </article>
                  ) : (
                    <article className="p-4 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                      <div className="flex items-center justify-between text-purple-400">
                        <Trophy size={20} />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block mt-2">Turnamen Aktif</span>
                      <strong className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white block mt-0.5">
                        {tournamentsList.length}
                      </strong>
                    </article>
                  )}

                  {isAdmin ? (
                    <article className="p-4 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                      <div className="flex items-center justify-between text-blue-500">
                        <Store size={20} />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block mt-2">Rekber Aktif</span>
                      <strong className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white block mt-0.5">
                        {data?.stats.activeEscrows ?? 0}
                      </strong>
                    </article>
                  ) : (
                    <article className="p-4 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                      <div className="flex items-center justify-between text-blue-500">
                        <Store size={20} />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block mt-2">Lapak Komunitas</span>
                      <strong className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white block mt-0.5">
                        {data?.stats.activeMarketplaceListings ?? 0}
                      </strong>
                    </article>
                  )}

                  <article className="p-4 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between text-amber-400">
                      <Trophy size={20} />
                      {Boolean(totalPendingTournament) && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-400">
                          AKSI
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mt-2">Antrean Pendaftar Turnamen</span>
                    <strong className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white block mt-0.5">
                      {totalPendingTournament}
                    </strong>
                  </article>
                </div>

                {/* QUICK ACTIONS & STATUS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                      <Sparkles size={18} className="text-[#9D4EDD]" /> Pintasan Manajemen
                    </h2>
                    <div className="space-y-2">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setTab("ai_command")}
                          className="w-full text-left px-3.5 py-2.5 rounded-none border border-purple-500/30 bg-purple-500/5 hover:border-[#9D4EDD] text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center justify-between transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <Terminal size={14} className="text-[#9D4EDD]" />
                            <span>⚡ Buka AI Admin Command Assistant</span>
                          </span>
                          <ChevronRight size={14} className="text-gray-400" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setTab("settings")}
                          className="w-full text-left px-3.5 py-2.5 rounded-none border border-gray-200 dark:border-[#2E1E45] hover:border-[#9D4EDD] text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between"
                        >
                          <span>⚙️ Pengaturan Konten Website (CMS)</span>
                          <ChevronRight size={14} className="text-gray-400" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setTab("treasury")}
                          className="w-full text-left px-3.5 py-2.5 rounded-none border border-gray-200 dark:border-[#2E1E45] hover:border-[#9D4EDD] text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between"
                        >
                          <span>💎 Verifikasi Kas Donasi &amp; Rekber</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 font-bold">
                            {data?.stats.pendingDonations ?? 0} pending
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setTab("members")}
                        className="w-full text-left px-3.5 py-2.5 rounded-none border border-gray-200 dark:border-[#2E1E45] hover:border-[#9D4EDD] text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between"
                      >
                        <span>👥 Kelola Member, Kasta &amp; Status Banned</span>
                        <ChevronRight size={14} className="text-gray-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab("moderation")}
                        className="w-full text-left px-3.5 py-2.5 rounded-none border border-gray-200 dark:border-[#2E1E45] hover:border-[#9D4EDD] text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between"
                      >
                        <span>🛡️ Moderasi Konten, Sponsor &amp; Broadcast</span>
                        <ChevronRight size={14} className="text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                      <ShieldCheck size={18} className="text-emerald-500" /> Status Ekosistem Guild
                    </h2>
                    <ul className="space-y-3 text-xs text-gray-600 dark:text-gray-300">
                      <li className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-[#2E1E45]">
                        <span>Database Neon PostgreSQL:</span>
                        <span className="font-semibold text-emerald-500 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Terhubung / Online
                        </span>
                      </li>
                      <li className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-[#2E1E45]">
                        <span>Otentikasi Member:</span>
                        <span className="font-semibold text-emerald-500">OAuth Discord Aman</span>
                      </li>
                      <li className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-[#2E1E45]">
                        <span>Target Kas Terverifikasi:</span>
                        <span className="font-bold text-purple-400">
                          {formatMoney.format(configForm.monthlyGoal || 5000000)}
                        </span>
                      </li>
                      <li className="flex items-center justify-between py-1">
                        <span>QRIS Resmi Perbendaharaan:</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[180px]">
                          {configForm.qrisImageUrl}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: PENGATURAN KONTEN WEBSITE (SITE SETTINGS CMS) */}
            {/* ========================================================================= */}
            {tab === "settings" && isAdmin && (
              <section className="space-y-6" role="tabpanel">
                <div className="p-6 sm:p-8 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Settings size={20} className="text-[#9D4EDD]" /> Pengaturan Konten Website (Site Settings CMS)
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Ubah statistik beranda, info pembayaran QRIS, nomor rekening Rekber, target kas, dan tautan resmi langsung tanpa edit kode.
                    </p>
                  </div>

                  <form onSubmit={(e) => void handleSaveConfig(e)} className="space-y-6">
                    {/* 1. STATISTIK BERANDA */}
                    <div className="border-t border-gray-200 dark:border-[#2E1E45] pt-4">
                      <h3 className="text-xs font-bold text-[#9D4EDD] uppercase tracking-wider mb-3">
                        01 / STATISTIK COUNTER BERANDA
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Teks Anggota Guild
                          </label>
                          <input
                            type="text"
                            value={configForm.statMembers}
                            onChange={(e) => setConfigForm({ ...configForm, statMembers: e.target.value })}
                            className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                            placeholder="1,200+"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Teks Party Terbentuk
                          </label>
                          <input
                            type="text"
                            value={configForm.statParties}
                            onChange={(e) => setConfigForm({ ...configForm, statParties: e.target.value })}
                            className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                            placeholder="450+"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Teks Voice Aktif
                          </label>
                          <input
                            type="text"
                            value={configForm.statVoice}
                            onChange={(e) => setConfigForm({ ...configForm, statVoice: e.target.value })}
                            className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                            placeholder="24/7"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2. PEMBAYARAN & QRIS */}
                    <div className="border-t border-gray-200 dark:border-[#2E1E45] pt-4">
                      <h3 className="text-xs font-bold text-[#9D4EDD] uppercase tracking-wider mb-3">
                        02 / INFO PEMBAYARAN, QRIS &amp; REKBER
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <ImageUploader
                            value={configForm.qrisImageUrl}
                            onChange={(url) => setConfigForm({ ...configForm, qrisImageUrl: url })}
                            label="Gambar QRIS Resmi Guild *"
                            description="Pilih atau tarik foto barcode QRIS langsung dari galeri HP atau PC. Otomatis dikompresi."
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Nomor Rekening / E-Wallet Rekber
                          </label>
                          <input
                            type="text"
                            value={configForm.rekberAccount}
                            onChange={(e) => setConfigForm({ ...configForm, rekberAccount: e.target.value })}
                            className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                            placeholder="BCA 1234567890 a.n LogHorizon"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Biaya Admin Rekber (IDR)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={1000}
                            value={configForm.rekberFee}
                            onChange={(e) => setConfigForm({ ...configForm, rekberFee: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                            placeholder="5000"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. TARGET KAS & MINIMAL DONASI */}
                    <div className="border-t border-gray-200 dark:border-[#2E1E45] pt-4">
                      <h3 className="text-xs font-bold text-[#9D4EDD] uppercase tracking-wider mb-3">
                        03 / TARGET KAS &amp; BATAS MINIMAL DONASI
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Target Kas Bulanan (IDR)
                          </label>
                          <input
                            type="number"
                            min={100000}
                            step={50000}
                            value={configForm.monthlyGoal}
                            onChange={(e) => setConfigForm({ ...configForm, monthlyGoal: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                            placeholder="5000000"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Batas Minimal Donasi (IDR)
                          </label>
                          <input
                            type="number"
                            min={1000}
                            step={5000}
                            value={configForm.minDonation}
                            onChange={(e) => setConfigForm({ ...configForm, minDonation: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                            placeholder="10000"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* 4. INTEGRASI BOT DISCORD & 6 CHANNEL ROUTER */}
                    <div className="border-t border-gray-200 dark:border-[#2E1E45] pt-4 space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className="text-xs font-bold text-[#9D4EDD] uppercase tracking-wider flex items-center gap-1.5">
                          <MessageSquare size={15} />
                          <span>04 / INTEGRASI 1 BOT DISCORD MULTI-CHANNEL ROUTER</span>
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Discord REST API v10 Router
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        1 Bot Discord LogHorizon terhubung langsung ke 7 channel resmi server via Discord REST API v10 (`DISCORD_BOT_TOKEN`). Atur ID Channel di bawah ini dan gunakan tombol <strong>⚡ Tes Bot</strong> untuk memastikan bot memiliki akses baca &amp; kirim pesan ke masing-masing channel.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Announcements */}
                        <div className="p-3.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#0A0512] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                              <span>📢</span>
                              <span>1. #announcements</span>
                            </label>
                            <span className="text-[10px] font-mono text-purple-600 dark:text-[#A78BFA]">Default Guild</span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Pengumuman resmi guild, info pembukaan pendaftaran turnamen baru, &amp; pengumuman juara Hall of Winners.
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={configForm.discordAnnouncementChannelId ?? "1547552373629780038"}
                              onChange={(e) => setConfigForm({ ...configForm, discordAnnouncementChannelId: e.target.value })}
                              className="flex-1 px-3 py-1.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                              placeholder="1547552373629780038"
                            />
                            <button
                              type="button"
                              disabled={testingBotChannel === "announcements"}
                              onClick={() => void handleTestDiscordBot("announcements", configForm.discordAnnouncementChannelId ?? "1547552373629780038")}
                              className="px-3 py-1.5 rounded-none bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-mono font-bold flex items-center gap-1 transition shrink-0 disabled:opacity-50 cursor-pointer"
                              title="Kirim pesan tes diagnostik ke channel ini"
                            >
                              {testingBotChannel === "announcements" ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                              <span>⚡ Tes Bot</span>
                            </button>
                          </div>
                        </div>

                        {/* 2. Events Giveaway */}
                        <div className="p-3.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#0A0512] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                              <span>🎁</span>
                              <span>2. #events-giveaway</span>
                            </label>
                            <span className="text-[10px] font-mono text-pink-500">Undian &amp; Hadiah</span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Khusus untuk pengumuman Event Giveaway / Undian Berhadiah komunitas.
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={configForm.discordGiveawayChannelId ?? "1547552377396011118"}
                              onChange={(e) => setConfigForm({ ...configForm, discordGiveawayChannelId: e.target.value })}
                              className="flex-1 px-3 py-1.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                              placeholder="1547552377396011118"
                            />
                            <button
                              type="button"
                              disabled={testingBotChannel === "giveaway"}
                              onClick={() => void handleTestDiscordBot("giveaway", configForm.discordGiveawayChannelId ?? "1547552377396011118")}
                              className="px-3 py-1.5 rounded-none bg-pink-600 hover:bg-pink-500 text-white text-xs font-mono font-bold flex items-center gap-1 transition shrink-0 disabled:opacity-50 cursor-pointer"
                              title="Kirim pesan tes diagnostik ke channel ini"
                            >
                              {testingBotChannel === "giveaway" ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                              <span>⚡ Tes Bot</span>
                            </button>
                          </div>
                        </div>

                        {/* 3. Live Info Turnamen (#🏆・live-info-tournament) */}
                        <div className="p-3.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#0A0512] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                              <span>🏆</span>
                              <span>3. Channel Live Info Turnamen (#🏆・live-info-tournament)</span>
                            </label>
                            <span className="text-[10px] font-mono text-purple-500 font-bold">Match &amp; Bagan</span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Siaran otomatis jalannya pertandingan turnamen (Match mulai LIVE, update skor akhir, keputusan WO/DQ, dan hasil pengacakan bagan baru).
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={configForm.discordTournamentLiveChannelId ?? "1572575614974693427"}
                              onChange={(e) => setConfigForm({ ...configForm, discordTournamentLiveChannelId: e.target.value })}
                              className="flex-1 px-3 py-1.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                              placeholder="1572575614974693427"
                            />
                            <button
                              type="button"
                              disabled={testingBotChannel === "tournament_live"}
                              onClick={() => void handleTestDiscordBot("tournament_live", configForm.discordTournamentLiveChannelId ?? "1572575614974693427")}
                              className="px-3 py-1.5 rounded-none bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold flex items-center gap-1 transition shrink-0 disabled:opacity-50 cursor-pointer"
                              title="Kirim pesan tes diagnostik ke channel ini"
                            >
                              {testingBotChannel === "tournament_live" ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                              <span>⚡ Tes Bot</span>
                            </button>
                          </div>
                        </div>

                        {/* 4. Live Streaming (#📡・info-live) */}
                        <div className="p-3.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#0A0512] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                              <span>📡</span>
                              <span>4. Channel Live Streaming (#📡・info-live — Khusus Info Live Stream)</span>
                            </label>
                            <span className="text-[10px] font-mono text-red-500 font-bold">🔴 Live Stream</span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Khusus info dan pengumuman siaran langsung streaming YouTube, Twitch, TikTok, atau broadcast livestream resmi.
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={configForm.discordInfoLiveChannelId ?? "1547552381221339149"}
                              onChange={(e) => setConfigForm({ ...configForm, discordInfoLiveChannelId: e.target.value })}
                              className="flex-1 px-3 py-1.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                              placeholder="1547552381221339149"
                            />
                            <button
                              type="button"
                              disabled={testingBotChannel === "info_live"}
                              onClick={() => void handleTestDiscordBot("info_live", configForm.discordInfoLiveChannelId ?? "1547552381221339149")}
                              className="px-3 py-1.5 rounded-none bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold flex items-center gap-1 transition shrink-0 disabled:opacity-50 cursor-pointer"
                              title="Kirim pesan tes diagnostik ke channel ini"
                            >
                              {testingBotChannel === "info_live" ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                              <span>⚡ Tes Bot</span>
                            </button>
                          </div>
                        </div>

                        {/* 5. Partnership */}
                        <div className="p-3.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#0A0512] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                              <span>🤝</span>
                              <span>5. #partnership</span>
                            </label>
                            <span className="text-[10px] font-mono text-amber-500 font-bold">Sponsor &amp; VIP</span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Promosi otomatis saat member berstatus Donatur / VIP memposting konten promosi serta pengumuman sponsor resmi baru.
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={configForm.discordPartnershipChannelId ?? "1572235405770887269"}
                              onChange={(e) => setConfigForm({ ...configForm, discordPartnershipChannelId: e.target.value })}
                              className="flex-1 px-3 py-1.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                              placeholder="1572235405770887269"
                            />
                            <button
                              type="button"
                              disabled={testingBotChannel === "partnership"}
                              onClick={() => void handleTestDiscordBot("partnership", configForm.discordPartnershipChannelId ?? "1572235405770887269")}
                              className="px-3 py-1.5 rounded-none bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold flex items-center gap-1 transition shrink-0 disabled:opacity-50 cursor-pointer"
                              title="Kirim pesan tes diagnostik ke channel ini"
                            >
                              {testingBotChannel === "partnership" ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                              <span>⚡ Tes Bot</span>
                            </button>
                          </div>
                        </div>

                        {/* 6. Server Shop (Marketplace) */}
                        <div className="p-3.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#0A0512] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                              <span>🛒</span>
                              <span>6. #server-shop</span>
                            </label>
                            <span className="text-[10px] font-mono text-emerald-500 font-bold">Marketplace</span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Siaran otomatis setiap kali member membuka lapak jual-beli akun, item, jasa joki, atau WTB baru di marketplace website.
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={configForm.discordShopChannelId ?? "1547552452725973093"}
                              onChange={(e) => setConfigForm({ ...configForm, discordShopChannelId: e.target.value })}
                              className="flex-1 px-3 py-1.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                              placeholder="1547552452725973093"
                            />
                            <button
                              type="button"
                              disabled={testingBotChannel === "shop"}
                              onClick={() => void handleTestDiscordBot("shop", configForm.discordShopChannelId ?? "1547552452725973093")}
                              className="px-3 py-1.5 rounded-none bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1 transition shrink-0 disabled:opacity-50 cursor-pointer"
                              title="Kirim pesan tes diagnostik ke channel ini"
                            >
                              {testingBotChannel === "shop" ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                              <span>⚡ Tes Bot</span>
                            </button>
                          </div>
                        </div>

                        {/* 7. Gaming Lounge (LFG) */}
                        <div className="p-3.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#0A0512] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                              <span>🎮</span>
                              <span>7. #gaming-lounge</span>
                            </label>
                            <span className="text-[10px] font-mono text-indigo-500 font-bold">Mabar LFG</span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Siaran otomatis setiap kali member membuat ajakan mabar (LFG) baru di website agar member Discord bisa langsung bergabung.
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={configForm.discordLfgChannelId ?? "1547552498833825874"}
                              onChange={(e) => setConfigForm({ ...configForm, discordLfgChannelId: e.target.value })}
                              className="flex-1 px-3 py-1.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                              placeholder="1547552498833825874"
                            />
                            <button
                              type="button"
                              disabled={testingBotChannel === "lfg"}
                              onClick={() => void handleTestDiscordBot("lfg", configForm.discordLfgChannelId ?? "1547552498833825874")}
                              className="px-3 py-1.5 rounded-none bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold flex items-center gap-1 transition shrink-0 disabled:opacity-50 cursor-pointer"
                              title="Kirim pesan tes diagnostik ke channel ini"
                            >
                              {testingBotChannel === "lfg" ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                              <span>⚡ Tes Bot</span>
                            </button>
                          </div>
                        </div>

                        {/* 8. Mod Logs */}
                        <div className="p-3.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#0A0512] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                              <span>🛡️</span>
                              <span>8. #mod-logs</span>
                            </label>
                            <span className="text-[10px] font-mono text-red-500 font-bold">Rahasia Staf</span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Saluran rahasia staf untuk notifikasi tiket Rekber baru, antrean donasi QRIS, dan log keamanan Satpam AI.
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={configForm.discordModLogChannelId ?? "1547552557868777552"}
                              onChange={(e) => setConfigForm({ ...configForm, discordModLogChannelId: e.target.value })}
                              className="flex-1 px-3 py-1.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                              placeholder="1547552557868777552"
                            />
                            <button
                              type="button"
                              disabled={testingBotChannel === "mod_logs"}
                              onClick={() => void handleTestDiscordBot("mod_logs", configForm.discordModLogChannelId ?? "1547552557868777552")}
                              className="px-3 py-1.5 rounded-none bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-bold flex items-center gap-1 transition shrink-0 disabled:opacity-50 cursor-pointer"
                              title="Kirim pesan tes diagnostik ke channel ini"
                            >
                              {testingBotChannel === "mod_logs" ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                              <span>⚡ Tes Bot</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Invite Link & Webhook Fallback */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Link Invite Discord Resmi Guild
                          </label>
                          <input
                            type="url"
                            value={configForm.discordInviteUrl}
                            onChange={(e) => setConfigForm({ ...configForm, discordInviteUrl: e.target.value })}
                            className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                            placeholder="https://discord.gg/aJvbVyTxNb"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Discord Webhook URL (Opsional / Fallback Cadangan)
                          </label>
                          <input
                            type="url"
                            value={configForm.discordWebhookUrl ?? ""}
                            onChange={(e) => setConfigForm({ ...configForm, discordWebhookUrl: e.target.value })}
                            className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                            placeholder="https://discord.com/api/webhooks/..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* 5. OTAK & KNOWLEDGE BASE SATPAM AI */}
                    <div className="border-t border-gray-200 dark:border-[#2E1E45] pt-4">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <h3 className="text-xs font-bold text-[#9D4EDD] uppercase tracking-wider flex items-center gap-1.5">
                          <Bot size={15} />
                          <span>05 / OTAK &amp; KNOWLEDGE BASE KHUSUS SATPAM AI</span>
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-none bg-purple-500/10 text-purple-700 dark:text-[#A78BFA] border border-purple-500/20">
                          Disuntikkan Langsung ke Memori Satpam AI
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Tuliskan instruksi atau ingatan khusus, susunan dewan pengurus resmi (contoh: Emperor .odyssia, Prince/Princess Abbasta, Grand Chancellor Woozy&apos;s &amp; Allegrio, Lord Commander Fikkk01), info jadwal kopdar, atau aturan dadakan komunitas. Satpam Horizon akan selalu mengingat teks ini saat menjawab pertanyaan member.
                      </p>
                      <textarea
                        rows={6}
                        value={configForm.aiKnowledgeBase ?? ""}
                        onChange={(e) => setConfigForm({ ...configForm, aiKnowledgeBase: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD] placeholder:text-gray-400 leading-relaxed"
                        placeholder="Contoh: Susunan Pengurus Resmi Guild LogHorizon:
- Emperor / Founder: .odyssia (Farrel)
- Prince / Princess: Abbasta
- Grand Chancellor: Woozy's, Allegrio
- Lord Commander: Fikkk01
Agenda Guild: Turnamen MLBB & Valorant internal setiap akhir bulan, mabar bareng pengurus setiap malam Minggu di Discord!"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={savingConfig}
                        className="button button-primary px-6 py-2.5 rounded-none text-xs font-bold inline-flex items-center gap-2"
                      >
                        {savingConfig ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" /> Menyimpan Pengaturan…
                          </>
                        ) : (
                          <>
                            <Check size={14} /> Simpan Pengaturan Website (CMS)
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* KELOLA SPONSOR RESMI (LOGO-ONLY & CLICKABLE) */}
                <div className="p-6 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Sparkles size={18} className="text-[#9D4EDD]" /> Kelola Sponsor Resmi (Section 06 Beranda)
                      </h2>
                      <p className="text-xs text-gray-500">
                        Tambah atau hapus mitra dan sponsor resmi yang tampil di halaman depan LogHorizon.
                      </p>
                    </div>
                  </div>

                  {/* Form Tambah Sponsor */}
                  <form onSubmit={(e) => void handleAddSponsor(e)} className="p-4 rounded-none bg-slate-50 dark:bg-[#09040F] border border-slate-200 dark:border-[#2E1E45] mb-6 space-y-4">
                    <p className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[#7C3AED]" />
                      <span>Tambah Sponsor Baru (Logo-Only &amp; Clickable)</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                      <div>
                        <ImageUploader
                          value={sponsorLogo}
                          onChange={setSponsorLogo}
                          label="1. Upload Logo Sponsor"
                          description="Pilih logo dari HP atau komputer (otomatis dikompres)."
                          required
                        />
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-mono font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                            2. Link Laman Tujuan Sponsor <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="url"
                            required
                            value={sponsorWebsite}
                            onChange={(e) => setSponsorWebsite(e.target.value)}
                            placeholder="https://instagram.com/... atau https://discord.gg/..."
                            className="w-full px-3.5 py-2.5 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#7C3AED]"
                          />
                          <p className="text-[10px] font-mono text-slate-500 dark:text-gray-400 mt-1">
                            Pengunjung akan diarahkan ke link ini saat mengklik logo di halaman utama.
                          </p>
                        </div>
                        <button
                          type="submit"
                          disabled={savingSponsor || !sponsorLogo}
                          className="w-full py-2.5 rounded-none bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>{savingSponsor ? "Menyimpan..." : "Simpan Sponsor"}</span>
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* List Sponsor Aktif */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {data?.sponsors?.map((sp) => (
                      <div
                        key={sp.id}
                        className="p-3 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] flex flex-col items-center justify-between gap-3 text-center"
                      >
                        <div className="relative w-full h-14 rounded-none overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-[#09040F] border border-slate-200 dark:border-[#2E1E45] p-2">
                          {sp.logoUrl ? (
                            <Image src={sp.logoUrl} alt={sp.name} fill className="object-contain p-1" unoptimized />
                          ) : (
                            <span className="font-mono text-xs text-purple-700 dark:text-[#A78BFA]">{sp.name}</span>
                          )}
                        </div>
                        {sp.websiteUrl && (
                          <a
                            href={sp.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-mono text-purple-600 dark:text-[#A78BFA] hover:text-[#7C3AED] hover:underline truncate max-w-full block"
                            title={sp.websiteUrl}
                          >
                            🔗 {sp.websiteUrl}
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={busyId === sp.id}
                          onClick={() => void handleDeleteSponsor(sp.id, sp.name)}
                          className="w-full py-1 text-[11px] font-mono font-bold text-rose-400 hover:text-white hover:bg-rose-600/20 border border-rose-500/30 rounded-none transition flex items-center justify-center gap-1 cursor-pointer"
                          title="Hapus Sponsor"
                        >
                          <Trash2 size={12} /> Hapus
                        </button>
                      </div>
                    ))}
                    {!data?.sponsors?.length && (
                      <p className="text-xs font-mono text-gray-400 col-span-full py-6 text-center">
                        Belum ada sponsor khusus yang ditambahkan.
                      </p>
                    )}
                  </div>
                </div>

                {/* BROADCAST PENGUMUMAN RESMI (TAYANG 24 JAM) */}
                <BroadcastSection
                  announcements={data?.announcements ?? []}
                  onNotice={setNotice}
                  onError={setError}
                  onRefresh={loadDashboard}
                />

                {/* LAPORAN UPDATE SISTEM & MAINTENANCE KE DISCORD */}
                <SystemUpdateReportSection
                  onNotice={setNotice}
                  onError={setError}
                />

                {/* FITUR KEBERSIHAN PRA-RILIS (OWNER EXCLUSIVE) */}
                {isOwner && (
                  <div className="p-6 rounded-none border-2 border-red-500/50 bg-red-500/5 dark:bg-red-950/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-red-500 uppercase tracking-wider">
                            👑 KHUSUS GUILD OWNER (.ODYSSIA)
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-red-600 dark:text-red-400 mt-1">
                          🧹 Bersihkan Data Percobaan (Reset Kas &amp; Hapus Dummy)
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 max-w-2xl leading-relaxed">
                          Menghapus seluruh transaksi donasi simulasi agar saldo kas terverifikasi kembali murni <strong className="text-red-500">Rp 0</strong>, serta menghapus turnamen uji coba sebelum link website resmi disiarkan ke Discord.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busyId === "reset-donations"}
                        onClick={() => void handleResetDonations()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-none text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition shadow-md shadow-red-600/30 shrink-0"
                      >
                        <RotateCcw size={14} className={busyId === "reset-donations" ? "animate-spin" : ""} />
                        <span>Bersihkan Data Percobaan</span>
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ========================================================================= */}
            {/* TAB: KELOLA TURNAMEN & ANTREAN VERIFIKASI QRIS */}
            {/* ========================================================================= */}
            {tab === "tournaments" && (
              <section className="space-y-6" role="tabpanel">
                {/* TOOLBAR TURNAMEN */}
                <div className="p-5 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Trophy size={18} className="text-[#9D4EDD]" />
                      <span>Manajemen Turnamen &amp; Verifikasi Peserta QRIS</span>
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Verifikasi bukti transfer QRIS pendaftar turnamen berbayar, masukkan tim ke slot bagan, atau tolak pendaftaran yang tidak valid.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setCreateTournamentOpen(true)}
                      className="button button-primary text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      <span>Buat Turnamen Baru</span>
                    </button>
                    {(() => {
                      const cur = tournamentsList.find((t) => t.id === selectedTournamentId) || tournamentsList[0];
                      return cur && cur.status !== "COMPLETED" ? (
                        <button
                          type="button"
                          onClick={() => handleAdminGachaBracket(cur)}
                          className="button button-quiet text-xs font-bold inline-flex items-center gap-1.5 border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 shadow-xs"
                          title="Gacha / Acak Susunan Lawan Bagan (Fisher-Yates)"
                        >
                          <Dices size={13} className="text-amber-400" />
                          <span>Gacha Bagan (Acak Lawan)</span>
                        </button>
                      ) : null;
                    })()}
                    <button
                      type="button"
                      onClick={fetchTournaments}
                      className="button button-quiet text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <RefreshCw size={13} />
                      <span>Refresh Data</span>
                    </button>
                    <Link
                      href="/events?view=turnamen"
                      className="button button-quiet text-xs font-bold inline-flex items-center gap-1.5 border border-purple-500/30 text-purple-300 hover:bg-purple-500/15"
                    >
                      <ExternalLink size={13} />
                      <span>Bagan Pertandingan</span>
                    </Link>
                  </div>
                </div>

                {/* DAFTAR PILIHAN TURNAMEN */}
                {tournamentsList.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-gray-300 dark:border-gray-800 rounded-none bg-white dark:bg-[#130921] text-xs text-gray-400">
                    Belum ada data turnamen dibuat. Buat turnamen baru melalui tombol di atas atau di halaman Events.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Horizontal Tournament Selector Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                      {tournamentsList.map((t) => {
                        const isSelected = selectedTournamentId === t.id;
                        const pendingInThis = t.participants?.filter((p: any) => p.paymentStatus === "PENDING_PAYMENT").length || 0;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTournamentId(t.id)}
                            className={`px-3.5 py-2 rounded-none text-xs font-bold border transition shrink-0 flex items-center gap-2 ${
                              isSelected
                                ? "bg-[#9D4EDD] text-white border-[#9D4EDD] shadow-sm shadow-[#9D4EDD]/25"
                                : "bg-white dark:bg-[#130921] border-gray-200 dark:border-[#2E1E45] text-gray-700 dark:text-gray-300 hover:border-[#9D4EDD]"
                            }`}
                          >
                            <span>{t.title}</span>
                            <span className="font-mono text-[10px] opacity-75">({t.game})</span>
                            {pendingInThis > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-400 text-black">
                                {pendingInThis} PENDING
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* DETAIL TURNAMEN TERPILIH & ANTREAN PESERTA */}
                    {(() => {
                      const curTournament = tournamentsList.find((t) => t.id === selectedTournamentId) || tournamentsList[0];
                      if (!curTournament) return null;

                      const participants: any[] = curTournament.participants || [];
                      const pendingCount = participants.filter((p) => p.paymentStatus === "PENDING_PAYMENT").length;
                      const approvedCount = participants.filter((p) => p.paymentStatus === "APPROVED").length;
                      const rejectedCount = participants.filter((p) => p.paymentStatus === "REJECTED").length;

                      const filteredParticipants = participants.filter((p) => {
                        if (tournamentFilterStatus === "PENDING") return p.paymentStatus === "PENDING_PAYMENT";
                        if (tournamentFilterStatus === "APPROVED") return p.paymentStatus === "APPROVED";
                        if (tournamentFilterStatus === "REJECTED") return p.paymentStatus === "REJECTED";
                        return true;
                      });

                      return (
                        <div className="space-y-4">
                          {/* Info Ringkas Turnamen */}
                          <div className="p-4 sm:p-5 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#9D4EDD] text-white uppercase">
                                  {curTournament.game}
                                </span>
                                <span className="text-xs font-mono text-gray-500">
                                  {curTournament.format} ({curTournament.maxSlots} Slot)
                                </span>
                                <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                  👥 {curTournament.mainPlayersCount ?? 5} Inti {curTournament.subPlayersCount ? `+ ${curTournament.subPlayersCount} Cad` : ""}
                                </span>
                                {curTournament.isFreeEntry || !curTournament.entryFee ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                                    FREE ENTRY
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                                    BIAYA REGIST: Rp {curTournament.entryFee.toLocaleString("id-ID")}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                                {curTournament.title}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Hadiah: <strong className="text-purple-400">{curTournament.prizePool || "Prizepool Resmi"}</strong> • Pelaksanaan: {new Date(curTournament.eventDate).toLocaleString("id-ID")}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setEditTournamentModal(curTournament)}
                                className="px-3 py-2 rounded-none text-xs font-bold border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] hover:border-[#7C3AED] text-slate-800 dark:text-[#F8FAFC] flex items-center gap-1.5 transition font-mono"
                                title="Edit Info Turnamen (Judul, Tanggal, Hadiah, dll)"
                              >
                                <Edit3 size={13} className="text-slate-500 dark:text-[#A78BFA]" />
                                <span>Edit Turnamen</span>
                              </button>
                              <TournamentBackupDropdown tournament={curTournament} />
                              <button
                                type="button"
                                onClick={() => setAdminRulesViewModal(curTournament)}
                                className="px-3 py-2 rounded-none text-xs font-bold border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#181324] text-gray-700 dark:text-gray-300 hover:text-white flex items-center gap-1.5 transition"
                                title="Lihat Peraturan Resmi Turnamen"
                              >
                                <BookOpen size={13} className="text-[#9D4EDD]" />
                                <span>Peraturan</span>
                              </button>
                              <Link
                                href={`/events/turnamen/${curTournament.id}`}
                                className="px-3.5 py-2 rounded-none text-xs font-bold border border-[#9D4EDD]/40 bg-[#9D4EDD]/15 text-purple-300 hover:bg-[#9D4EDD]/25 flex items-center gap-1.5 transition"
                                title="Buka Bagan & Kelola Jadwal Tanding Turnamen"
                              >
                                <ExternalLink size={13} className="text-[#9D4EDD]" />
                                <span>Bagan &amp; Jadwal Tanding</span>
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setHowForm({
                                    tournamentTitle: curTournament.title,
                                    game: curTournament.game,
                                    season: "Season 1",
                                    prizePool: curTournament.prizePool || "Rp 500.000",
                                    eventDate: new Date(curTournament.eventDate).toISOString().slice(0, 10),
                                    championTeam: "",
                                    championRosterStr: "",
                                    runnerUpTeam: "",
                                    thirdPlaceTeam: "",
                                    notes: "",
                                  });
                                  setHowModalOpen(true);
                                  setTab("hall_of_winners");
                                }}
                                className="px-3 py-2 rounded-none text-xs font-bold border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 flex items-center gap-1.5 transition"
                                title="Catat atau arsipkan turnamen ini ke Hall of Winners"
                              >
                                <Crown size={14} className="text-amber-400" />
                                <span>Arsip Hall of Winners</span>
                              </button>
                              {curTournament.status !== "COMPLETED" && (
                                <button
                                  type="button"
                                  onClick={() => handleAdminGachaBracket(curTournament)}
                                  className="px-3.5 py-2 rounded-none text-xs font-bold border border-amber-500/50 bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-300 hover:from-amber-500/30 hover:to-purple-500/30 flex items-center gap-2 transition shadow-sm shadow-amber-500/10 hover:scale-105"
                                  title="Gacha / Acak Susunan Lawan Bagan (Fisher-Yates)"
                                >
                                  <Dices size={15} className="text-amber-400" />
                                  <span>Gacha Bagan (Acak Lawan)</span>
                                </button>
                              )}
                              <div className="text-right">
                                <span className="text-[10px] uppercase tracking-wider text-gray-400 block font-bold">
                                  Slot Bagan Terisi
                                </span>
                                <strong className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                                  {approvedCount} / {curTournament.maxSlots}
                                </strong>
                              </div>
                            </div>
                          </div>

                          {/* Filter Tabs Antrean */}
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5 p-1 rounded-none bg-gray-100 dark:bg-[#130921] border border-gray-200 dark:border-white/5 overflow-x-auto">
                              <button
                                type="button"
                                onClick={() => setTournamentFilterStatus("ALL")}
                                className={`px-3 py-1.5 rounded-none text-xs font-bold transition ${
                                  tournamentFilterStatus === "ALL"
                                    ? "bg-[#9D4EDD] text-white shadow-xs"
                                    : "text-gray-600 dark:text-gray-400 hover:text-white"
                                }`}
                              >
                                Semua ({participants.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setTournamentFilterStatus("PENDING")}
                                className={`px-3 py-1.5 rounded-none text-xs font-bold transition flex items-center gap-1.5 ${
                                  tournamentFilterStatus === "PENDING"
                                    ? "bg-amber-500 text-black shadow-xs font-black"
                                    : "text-amber-400 hover:text-amber-300"
                                }`}
                              >
                                ⏳ Menunggu Verifikasi ({pendingCount})
                              </button>
                              <button
                                type="button"
                                onClick={() => setTournamentFilterStatus("APPROVED")}
                                className={`px-3 py-1.5 rounded-none text-xs font-bold transition ${
                                  tournamentFilterStatus === "APPROVED"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "text-emerald-400 hover:text-emerald-300"
                                }`}
                              >
                                ✅ Disetujui ({approvedCount})
                              </button>
                              <button
                                type="button"
                                onClick={() => setTournamentFilterStatus("REJECTED")}
                                className={`px-3 py-1.5 rounded-none text-xs font-bold transition ${
                                  tournamentFilterStatus === "REJECTED"
                                    ? "bg-rose-600 text-white shadow-xs"
                                    : "text-rose-400 hover:text-rose-300"
                                }`}
                              >
                                ❌ Ditolak ({rejectedCount})
                              </button>
                            </div>
                          </div>

                          {/* List Pendaftar */}
                          <div className="space-y-3">
                            {filteredParticipants.length === 0 ? (
                              <div className="p-8 text-center border border-dashed border-gray-300 dark:border-gray-800 rounded-none bg-white dark:bg-[#130921] text-xs text-gray-400">
                                Tidak ada pendaftar dengan filter status ini.
                              </div>
                            ) : (
                              filteredParticipants.map((p) => {
                                const isPending = p.paymentStatus === "PENDING_PAYMENT";
                                const isApproved = p.paymentStatus === "APPROVED";
                                const roster = p.roster || [];
                                const mains = roster.filter((r: any) => r.role === "MAIN");
                                const subs = roster.filter((r: any) => r.role === "SUB");

                                return (
                                  <div
                                    key={p.id}
                                    className={`p-4 sm:p-5 rounded-none border bg-white dark:bg-[#130921] shadow-sm transition-all ${
                                      isPending
                                        ? "border-amber-500/40"
                                        : isApproved
                                          ? "border-emerald-500/30"
                                          : "border-rose-500/30"
                                    } space-y-3.5`}
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h4 className="font-black text-base text-gray-900 dark:text-white">
                                            {p.teamName}
                                          </h4>
                                          <span
                                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
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

                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                                          <span>Kapten: <strong>@{p.leader?.username || p.leader?.name || "Member"}</strong></span>
                                          {p.phone && (
                                            <>
                                              <span>•</span>
                                              <a
                                                href={`https://wa.me/${p.phone.replace(/\D/g, "")}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-emerald-500 hover:underline flex items-center gap-1 font-semibold"
                                              >
                                                <Phone size={12} />
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

                                      {/* Tombol Aksi Admin */}
                                      {isPending && (
                                        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto shrink-0">
                                          <button
                                            type="button"
                                            disabled={adminVerificationLoading === p.id}
                                            onClick={() => handleAdminVerification(curTournament.id, p.id, "APPROVE")}
                                            className="h-9 px-3.5 py-2 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50"
                                          >
                                            <CheckCircle size={14} />
                                            <span>{adminVerificationLoading === p.id ? "Memproses..." : "✅ ACC"}</span>
                                          </button>
                                          <button
                                            type="button"
                                            disabled={adminVerificationLoading === p.id}
                                            onClick={() => handleAdminVerification(curTournament.id, p.id, "REJECT")}
                                            className="h-9 px-3 py-2 rounded-md text-xs font-bold bg-rose-600/80 hover:bg-rose-600 text-white flex items-center justify-center gap-1 shadow-sm transition disabled:opacity-50"
                                          >
                                            <X size={14} />
                                            <span>❌ Tolak</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Data Verifikasi Pembayaran & Roster */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-white/5 text-xs">
                                      {/* Data Pembayaran */}
                                      <div className="p-3 rounded-none bg-gray-50 dark:bg-[#181324] border border-gray-200 dark:border-white/5 space-y-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                          DATA BUKTI TRANSFER PEMBAYARAN
                                        </span>
                                        <p className="text-gray-700 dark:text-gray-300">
                                          Nama Pengirim / Pemilik Rekening:{" "}
                                          <strong className="text-purple-400">{p.senderName || "- (Free Entry)"}</strong>
                                        </p>
                                        {p.rejectionReason && (
                                          <p className="text-rose-400 text-xs">
                                            Alasan Penolakan: <em>{p.rejectionReason}</em>
                                          </p>
                                        )}

                                        {p.paymentProof ? (
                                          <div className="pt-1">
                                            <span className="text-[11px] font-semibold text-gray-400 block mb-1">
                                              Bukti Transfer (Klik untuk perbesar):
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => setAdminProofLightbox(p.paymentProof)}
                                              className="group relative inline-block rounded-none overflow-hidden border border-purple-500/30 hover:border-purple-500 transition"
                                            >
                                              <img
                                                src={p.paymentProof}
                                                alt="Bukti Transfer"
                                                className="w-32 h-24 object-cover group-hover:scale-105 transition-transform"
                                              />
                                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Eye size={18} className="text-white" />
                                              </div>
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-[11px] text-gray-400 italic block">
                                            Tidak ada bukti transfer (Turnamen Free Entry)
                                          </span>
                                        )}
                                      </div>

                                      {/* Data Roster Pemain */}
                                      <div className="p-3 rounded-none bg-gray-50 dark:bg-[#181324] border border-gray-200 dark:border-white/5 space-y-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                          SUSUNAN PEMAIN TIM ({mains.length} Inti {subs.length ? `+ ${subs.length} Cad` : ""})
                                        </span>
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                          {mains.map((m: any, idx: number) => (
                                            <RosterPlayerRow
                                              key={`main-${idx}`}
                                              index={idx + 1}
                                              name={m.name || m.inGameId}
                                              inGameId={m.inGameId || m.name}
                                              isCaptain={idx === 0}
                                              isSub={false}
                                            />
                                          ))}
                                          {subs.map((s: any, idx: number) => (
                                            <RosterPlayerRow
                                              key={`sub-${idx}`}
                                              index={idx + 1}
                                              name={s.name || s.inGameId}
                                              inGameId={s.inGameId || s.name}
                                              isCaptain={false}
                                              isSub={true}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </section>
            )}

            {/* ========================================================================= */}
            {/* TAB: KELOLA HALL OF WINNERS (AULA PARA JUARA) */}
            {/* ========================================================================= */}
            {tab === "hall_of_winners" && (
              <section className="space-y-6" role="tabpanel">
                <div className="p-5 sm:p-6 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <Crown size={20} className="text-amber-400" />
                      <span>Kelola Hall of Winners (Aula Para Juara)</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Catatan sejarah juara season turnamen. Turnamen dengan Grand Final selesai otomatis masuk ke sini, atau Admin bisa mencatat arsip season lama secara manual.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHowModalOpen(true)}
                      className="button button-primary text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      <span>Tambah Arsip Season Manual</span>
                    </button>
                    <Link
                      href="/hall-of-winners"
                      target="_blank"
                      className="button button-quiet text-xs font-bold inline-flex items-center gap-1"
                    >
                      <span>Lihat Halaman Publik</span>
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                </div>

                {/* MODAL TAMBAH ARSIP MANUAL */}
                {howModalOpen && (
                  <div
                    className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                    onClick={() => setHowModalOpen(false)}
                  >
                    <div
                      className="bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2A1B42] rounded-xl w-[calc(100vw-1.5rem)] sm:max-w-lg p-4 sm:p-6 shadow-2xl relative space-y-4 my-auto max-h-[85vh] overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setHowModalOpen(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white"
                      >
                        <X size={18} />
                      </button>

                      <div className="pb-2 border-b border-gray-200 dark:border-[#2E1E45]">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <Crown size={18} className="text-amber-400" />
                          <span>Catat Arsip Juara Season Manual</span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Masukkan data pemenang season lama untuk diabadikan di Hall of Winners.
                        </p>
                      </div>

                      <form onSubmit={handleCreateHow} className="space-y-3.5 text-xs">
                        <div>
                          <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                            Judul Turnamen *
                          </label>
                          <input
                            type="text"
                            required
                            value={howForm.tournamentTitle}
                            onChange={(e) => setHowForm((prev) => ({ ...prev, tournamentTitle: e.target.value }))}
                            placeholder="Contoh: LogHorizon Community Invitational S1"
                            className="w-full px-3 py-2 rounded-none border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-black/30 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                              Nama Game *
                            </label>
                            <input
                              type="text"
                              required
                              value={howForm.game}
                              onChange={(e) => setHowForm((prev) => ({ ...prev, game: e.target.value }))}
                              placeholder="Mobile Legends / Valorant / dll"
                              className="w-full px-3 py-2 rounded-none border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-black/30 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                              Season / Kategori
                            </label>
                            <input
                              type="text"
                              value={howForm.season}
                              onChange={(e) => setHowForm((prev) => ({ ...prev, season: e.target.value }))}
                              placeholder="Season 1 / New Year Cup"
                              className="w-full px-3 py-2 rounded-none border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-black/30 text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                              Total Hadiah
                            </label>
                            <input
                              type="text"
                              value={howForm.prizePool}
                              onChange={(e) => setHowForm((prev) => ({ ...prev, prizePool: e.target.value }))}
                              placeholder="Contoh: Rp 1.500.000"
                              className="w-full px-3 py-2 rounded-none border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-black/30 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                              Tanggal Turnamen
                            </label>
                            <input
                              type="date"
                              value={howForm.eventDate}
                              onChange={(e) => setHowForm((prev) => ({ ...prev, eventDate: e.target.value }))}
                              className="w-full px-3 py-2 rounded-none border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-black/30 text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="p-3 rounded-none bg-amber-500/10 border border-amber-500/30 space-y-2">
                          <label className="block text-amber-300 font-bold flex items-center gap-1">
                            <Crown size={14} />
                            <span>Tim Juara 1 (Grand Champion) *</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={howForm.championTeam}
                            onChange={(e) => setHowForm((prev) => ({ ...prev, championTeam: e.target.value }))}
                            placeholder="Nama Tim Pemenang Juara 1"
                            className="w-full px-3 py-2 rounded-none border border-amber-500/30 bg-black/40 text-white font-bold"
                          />
                          <div>
                            <label className="block text-gray-300 text-[11px] mb-1">
                              Daftar Nama Pemain Juara 1 (pisahkan dengan koma):
                            </label>
                            <input
                              type="text"
                              value={howForm.championRosterStr}
                              onChange={(e) => setHowForm((prev) => ({ ...prev, championRosterStr: e.target.value }))}
                              placeholder="Contoh: Vyn, R7, Lemon, Alberttt, Skylar"
                              className="w-full px-3 py-1.5 rounded-none border border-white/10 bg-black/30 text-white text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                              Tim Juara 2 (Runner-Up)
                            </label>
                            <input
                              type="text"
                              value={howForm.runnerUpTeam}
                              onChange={(e) => setHowForm((prev) => ({ ...prev, runnerUpTeam: e.target.value }))}
                              placeholder="Nama Tim Runner-Up"
                              className="w-full px-3 py-2 rounded-none border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-black/30 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                              Tim Juara 3 (Bronze)
                            </label>
                            <input
                              type="text"
                              value={howForm.thirdPlaceTeam}
                              onChange={(e) => setHowForm((prev) => ({ ...prev, thirdPlaceTeam: e.target.value }))}
                              placeholder="Nama Tim Juara 3"
                              className="w-full px-3 py-2 rounded-none border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-black/30 text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setHowModalOpen(false)}
                            className="px-4 py-2 rounded-none bg-gray-200 dark:bg-white/10 font-bold"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="button button-primary px-5 py-2 text-xs font-bold"
                          >
                            Simpan Arsip Juara
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* TABLE ARSIP HALL OF WINNERS */}
                <div className="rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] overflow-hidden">
                  <DragScrollContainer>
                    <table className="w-full text-left text-xs min-w-[750px]">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-[#2E1E45] text-gray-400 bg-gray-50/50 dark:bg-black/20">
                          <th className="p-3.5 font-bold">Turnamen &amp; Season</th>
                          <th className="p-3.5 font-bold">Game</th>
                          <th className="p-3.5 font-bold">Tanggal</th>
                          <th className="p-3.5 font-bold text-amber-400">👑 Juara 1</th>
                          <th className="p-3.5 font-bold text-slate-300">🥈 Juara 2</th>
                          <th className="p-3.5 font-bold text-amber-600">🥉 Juara 3</th>
                          <th className="p-3.5 font-bold">Tipe</th>
                          <th className="p-3.5 font-bold text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#2E1E45]/80 font-mono">
                        {hallOfWinnersList.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-gray-400 font-sans">
                              {loadingHow ? "Memuat arsip Hall of Winners…" : "Belum ada arsip turnamen yang tercatat."}
                            </td>
                          </tr>
                        ) : (
                          hallOfWinnersList.map((how) => (
                            <tr key={how.id} className="hover:bg-gray-50 dark:hover:bg-[#171322] transition">
                              <td className="p-3.5 font-sans font-bold text-gray-900 dark:text-white">
                                {how.tournamentTitle}
                                <span className="block text-[10px] text-gray-500 font-mono">{how.season}</span>
                              </td>
                              <td className="p-3.5 font-sans">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#9D4EDD]/15 text-[#C77DFF] border border-[#9D4EDD]/30">
                                  {how.game}
                                </span>
                              </td>
                              <td className="p-3.5 text-gray-400 text-[11px]">
                                {new Date(how.eventDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              </td>
                              <td className="p-3.5 font-bold text-amber-300 font-sans">
                                {how.championTeam}
                              </td>
                              <td className="p-3.5 text-slate-300 font-sans">
                                {how.runnerUpTeam || "-"}
                              </td>
                              <td className="p-3.5 text-amber-600/90 font-sans">
                                {how.thirdPlaceTeam || "-"}
                              </td>
                              <td className="p-3.5">
                                {how.isAutomated ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                    Sistem Otomatis
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                    Arsip Manual
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 text-right font-sans">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Link
                                    href="/hall-of-winners"
                                    target="_blank"
                                    className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition"
                                    title="Lihat di Hall of Winners"
                                  >
                                    <ExternalLink size={14} />
                                  </Link>
                                  {!how.isAutomated && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteHow(how.id)}
                                      className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition"
                                      title="Hapus arsip manual ini"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </DragScrollContainer>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: VERIFIKASI DONASI & TRANSAKSI REKBER (KHUSUS ADMIN) */}
            {/* ========================================================================= */}
            {tab === "treasury" && isAdmin && (
              <section className="space-y-8" role="tabpanel">
                {/* TOOLBAR & RESET DATA SIMULASI */}
                <div className="p-5 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Coins size={18} className="text-[#9D4EDD]" /> Verifikasi Donasi &amp; Kas Perbendaharaan
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      ACC atau tolak antrean donasi. Lencana kasta donatur otomatis aktif saat donasi disetujui.
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      disabled={busyId === "reset-donations"}
                      onClick={() => void handleResetDonations()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-none text-xs font-bold text-red-600 dark:text-red-400 border border-red-300 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                    >
                      <RotateCcw size={14} className={busyId === "reset-donations" ? "animate-spin" : ""} />
                      <span>Reset Data Simulasi (Kembali Rp 0)</span>
                    </button>
                  )}
                </div>

                {/* 1. ANTREAN DONASI PENDING */}
                <div className="p-5 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        Antrean Donasi Menunggu Verifikasi ({pendingDonationsList.length})
                      </h3>
                      <p className="text-xs text-gray-500">Periksa bukti transfer dan klik ACC untuk mengaktifkan kasta donatur.</p>
                    </div>
                  </div>

                  {/* MOBILE CARD VIEW (< md) */}
                  <div className="block md:hidden space-y-3">
                    {pendingDonationsList.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-gray-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#130921]"
                      >
                        <div className="space-y-1.5 text-xs text-left">
                          <div className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2">
                              <DiscordAvatar src={item.user?.avatar ?? null} username={item.user?.username ?? "Member"} size={22} />
                              <span className="font-bold text-gray-900 dark:text-white">
                                {item.user?.username ?? "Member"}
                              </span>
                            </div>
                            <span className="font-extrabold text-purple-600 dark:text-purple-300">
                              {formatMoney.format(item.amount)}
                            </span>
                          </div>

                          <p className="text-[11px] text-gray-500">
                            Pengirim: <strong className="text-gray-700 dark:text-gray-300">{item.senderName || "-"}</strong>
                          </p>

                          {item.notes && (
                            <p className="text-[11px] text-gray-500 italic">
                              &ldquo;{item.notes}&rdquo;
                            </p>
                          )}

                          <div className="flex items-center gap-3 pt-1 text-[11px]">
                            {item.proofUrl ? (
                              <a
                                href={item.proofUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#9D4EDD] hover:underline font-bold inline-flex items-center gap-1"
                              >
                                <span>Lihat Bukti Transfer</span>
                                <ExternalLink size={12} />
                              </a>
                            ) : (
                              <span className="text-gray-400">Tanpa link bukti</span>
                            )}
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-400">
                              {new Date(item.createdAt).toLocaleDateString("id-ID")}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200 dark:border-[#2E1E45]">
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => void verifyDonation(item.id, "APPROVED")}
                            className="h-9 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md flex items-center justify-center gap-1 shadow-sm transition disabled:opacity-50"
                          >
                            <span>✅ ACC</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => void verifyDonation(item.id, "REJECTED")}
                            className="h-9 px-3 text-xs font-bold bg-rose-600/80 hover:bg-rose-600 text-white rounded-md flex items-center justify-center gap-1 shadow-sm transition disabled:opacity-50"
                          >
                            <span>❌ Tolak</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    {pendingDonationsList.length === 0 && (
                      <p className="p-4 text-center text-xs text-gray-400">
                        Tidak ada antrean donasi pending saat ini.
                      </p>
                    )}
                  </div>

                  {/* DESKTOP TABLE VIEW (>= md) */}
                  <div className="hidden md:block">
                    <DragScrollContainer
                      buttonPosition="top"
                      label="🖱️ Drag mouse / tombol ◀ ▶ untuk melihat detail antrean donasi"
                    >
                      <table className="w-full text-left text-xs min-w-[700px]">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-[#2E1E45] text-gray-400">
                            <th className="py-2.5">Pengirim Rekening</th>
                            <th className="py-2.5">Akun Member</th>
                            <th className="py-2.5">Nominal</th>
                            <th className="py-2.5">Catatan / Ref</th>
                            <th className="py-2.5">Bukti Transfer</th>
                            <th className="py-2.5">Waktu</th>
                            <th className="py-2.5 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#2E1E45]">
                          {pendingDonationsList.map((item) => (
                            <tr key={item.id}>
                              <td className="py-3 font-bold text-gray-900 dark:text-white">
                                {item.senderName || "-"}
                              </td>
                              <td className="py-3">
                                <div className="flex items-center gap-2">
                                  <DiscordAvatar src={item.user?.avatar ?? null} username={item.user?.username ?? "Member"} size={22} />
                                  <span className="font-semibold text-gray-800 dark:text-gray-200">{item.user?.username ?? "Member"}</span>
                                </div>
                              </td>
                              <td className="py-3 font-extrabold text-purple-600 dark:text-purple-300">
                                {formatMoney.format(item.amount)}
                              </td>
                              <td className="py-3 text-gray-500 max-w-[150px] truncate">{item.notes || "-"}</td>
                              <td className="py-3">
                                {item.proofUrl ? (
                                  <a
                                    href={item.proofUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-[#9D4EDD] hover:underline font-bold inline-flex items-center gap-1"
                                  >
                                    <span>Lihat Bukti</span>
                                    <ExternalLink size={12} />
                                  </a>
                                ) : (
                                  <span className="text-gray-400 text-[11px]">Tanpa bukti link</span>
                                )}
                              </td>
                              <td className="py-3 text-gray-500 text-[11px]">
                                {new Date(item.createdAt).toLocaleDateString("id-ID")}
                              </td>
                              <td className="py-3 text-right space-x-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  disabled={busyId === item.id}
                                  onClick={() => void verifyDonation(item.id, "APPROVED")}
                                  className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/25"
                                >
                                  ACC / Verifikasi
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === item.id}
                                  onClick={() => void verifyDonation(item.id, "REJECTED")}
                                  className="px-2.5 py-1 rounded text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                >
                                  Tolak
                                </button>
                              </td>
                            </tr>
                          ))}
                          {pendingDonationsList.length === 0 && (
                            <tr>
                              <td className="py-6 text-center text-gray-400" colSpan={7}>
                                Tidak ada antrean donasi pending saat ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </DragScrollContainer>
                  </div>
                </div>

                {/* 2. RIWAYAT DONASI TERVERIFIKASI */}
                <div className="p-5 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">
                    Riwayat Donasi Selesai / Terverifikasi
                  </h3>
                  <DragScrollContainer
                    buttonPosition="top"
                    label="🖱️ Drag mouse / tombol ◀ ▶ untuk melihat riwayat donasi"
                  >
                    <table className="w-full text-left text-xs min-w-[650px]">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-[#2E1E45] text-gray-400">
                          <th className="py-2.5">User</th>
                          <th className="py-2.5">Pengirim</th>
                          <th className="py-2.5">Nominal</th>
                          <th className="py-2.5">Tanggal</th>
                          <th className="py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#2E1E45]">
                        {processedDonationsList.map((item) => (
                          <tr key={item.id}>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <DiscordAvatar src={item.user?.avatar ?? null} username={item.user?.username ?? "Member"} size={22} />
                                <span className="font-semibold text-gray-900 dark:text-white">{item.user?.username ?? "Member"}</span>
                              </div>
                            </td>
                            <td className="py-3 text-gray-600 dark:text-gray-300">{item.senderName || "-"}</td>
                            <td className="py-3 font-bold text-purple-600 dark:text-purple-300">
                              {formatMoney.format(item.amount)}
                            </td>
                            <td className="py-3 text-gray-500">
                              {new Date(item.createdAt).toLocaleDateString("id-ID")}
                            </td>
                            <td className="py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.status === "APPROVED" || item.status === "SUCCEEDED"
                                    ? "bg-emerald-500/15 text-emerald-500"
                                    : "bg-red-500/15 text-red-500"
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {processedDonationsList.length === 0 && (
                          <tr>
                            <td className="py-6 text-center text-gray-400" colSpan={5}>
                              Belum ada catatan donasi terverifikasi.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </DragScrollContainer>
                </div>

                {/* 3. TIKET REKBER 3-PIHAK (CLAIM & RUANG CHAT) */}
                <div className="p-5 rounded-none border border-purple-500/30 bg-white dark:bg-[#130921] shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ShieldAlert className="text-purple-400" size={18} />
                        Tiket Transaksi Rekber 3-Pihak
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Klaim tiket rekber yang diajukan member, masuk ke ruang obrolan privat 3-pihak (Buyer, Seller, Admin), dan pantau transaksi.
                      </p>
                    </div>
                  </div>

                  {/* MOBILE CARD VIEW (< md) */}
                  <div className="block md:hidden space-y-3">
                    {data?.escrowTransactions?.map((escrow) => {
                      const isUnclaimed = !escrow.claimedById;
                      return (
                        <div
                          key={escrow.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-gray-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#130921]"
                        >
                          <div className="space-y-1.5 text-xs text-left">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-bold text-gray-900 dark:text-white truncate max-w-[220px]">
                                {escrow.post.title}
                              </h4>
                              <span className="font-extrabold text-emerald-400 shrink-0">
                                {formatMoney.format(escrow.amount)}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500">
                              🛒 Buyer: <strong className="text-gray-700 dark:text-gray-300">@{escrow.buyer.username ?? "Buyer"}</strong> • 🏷️ Seller: <strong className="text-gray-700 dark:text-gray-300">@{escrow.seller.username ?? "Seller"}</strong>
                            </p>
                            <div className="flex items-center gap-2 pt-0.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  escrow.status === "COMPLETED"
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : escrow.status === "CANCELLED"
                                      ? "bg-red-500/15 text-red-400"
                                      : "bg-purple-500/15 text-purple-400"
                                }`}
                              >
                                {escrow.status}
                              </span>
                              {escrow.claimedBy ? (
                                <span className="text-[10px] font-semibold text-emerald-500">
                                  🛡️ {escrow.claimedBy.username}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-500 animate-pulse">
                                  ⏳ Menunggu Claim
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200 dark:border-[#2E1E45]">
                            {isUnclaimed && escrow.status === "IN_ESCROW" ? (
                              <button
                                type="button"
                                disabled={busyId === escrow.id}
                                onClick={() => void claimEscrow(escrow.id)}
                                className="h-9 px-3 text-xs bg-[#9D4EDD] hover:bg-[#8338EC] text-white font-bold rounded-md flex items-center justify-center gap-1 transition shadow-sm disabled:opacity-50"
                              >
                                <span>Ambil Tiket</span>
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => setSelectedEscrowId(escrow.id)}
                              className={`h-9 px-3 text-xs border border-purple-500/40 text-purple-400 hover:bg-purple-500/10 font-medium rounded-md flex items-center justify-center gap-1 transition shadow-sm ${
                                isUnclaimed && escrow.status === "IN_ESCROW" ? "" : "col-span-2 sm:col-span-1"
                              }`}
                            >
                              <span>💬 Buka Chat</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {!data?.escrowTransactions?.length && (
                      <p className="p-4 text-center text-xs text-gray-400">
                        Belum ada transaksi rekber 3-pihak yang aktif.
                      </p>
                    )}
                  </div>

                  {/* DESKTOP TABLE VIEW (>= md) */}
                  <div className="hidden md:block">
                    <DragScrollContainer
                      buttonPosition="top"
                      label="🖱️ Drag mouse / tombol ◀ ▶ untuk melihat tiket rekber 3-pihak"
                    >
                      <table className="w-full text-left text-xs min-w-[700px]">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-[#2E1E45] text-gray-400">
                            <th className="py-2.5">Lapak Transaksi</th>
                            <th className="py-2.5">Buyer &amp; Seller</th>
                            <th className="py-2.5">Nominal</th>
                            <th className="py-2.5">Penengah Rekber</th>
                            <th className="py-2.5">Status</th>
                            <th className="py-2.5 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#2E1E45]">
                          {data?.escrowTransactions?.map((escrow) => {
                            const isClaimedByMe = escrow.claimedById === data.currentUserId;
                            const isUnclaimed = !escrow.claimedById;

                            return (
                              <tr key={escrow.id} className="hover:bg-purple-950/10">
                                <td className="py-3 font-semibold text-gray-900 dark:text-white max-w-xs truncate">
                                  {escrow.post.title}
                                </td>
                                <td className="py-3 text-gray-400">
                                  <div>🛒 {escrow.buyer.username ?? "Buyer"}</div>
                                  <div>🏷️ {escrow.seller.username ?? "Seller"}</div>
                                </td>
                                <td className="py-3 font-bold text-emerald-400">
                                  {formatMoney.format(escrow.amount)}
                                </td>
                                <td className="py-3">
                                  {escrow.claimedBy ? (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                      🛡️ {escrow.claimedBy.username}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 animate-pulse">
                                      Menunggu Claim
                                    </span>
                                  )}
                                </td>
                                <td className="py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      escrow.status === "COMPLETED"
                                        ? "bg-emerald-500/15 text-emerald-400"
                                        : escrow.status === "CANCELLED"
                                          ? "bg-red-500/15 text-red-400"
                                          : "bg-purple-500/15 text-purple-400"
                                    }`}
                                  >
                                    {escrow.status}
                                  </span>
                                </td>
                                <td className="py-3 text-right space-x-1.5 whitespace-nowrap">
                                  {isUnclaimed && escrow.status === "IN_ESCROW" && (
                                    <button
                                      type="button"
                                      disabled={busyId === escrow.id}
                                      onClick={() => void claimEscrow(escrow.id)}
                                      className="px-2.5 py-1 rounded text-xs bg-[#9D4EDD] hover:bg-[#8338EC] text-white font-bold transition-all"
                                    >
                                      Ambil Tiket Rekber (Claim)
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedEscrowId(escrow.id)}
                                    className="px-2.5 py-1 rounded text-xs border border-purple-500/40 text-purple-400 hover:bg-purple-500/10 font-medium transition-all"
                                  >
                                    💬 Buka Ruang Chat
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {!data?.escrowTransactions?.length && (
                            <tr>
                              <td className="py-6 text-center text-gray-400" colSpan={6}>
                                Belum ada transaksi rekber 3-pihak yang aktif.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </DragScrollContainer>
                  </div>
                </div>

                {/* 4. PANTAUAN REKBER MARKETPLACE */}
                <div className="p-5 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                    Pantauan Transaksi Lapak &amp; Rekber Marketplace
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Selesaikan transaksi rekber (*SOLD*), batalkan (*AVAILABLE*), atau hapus lapak bermasalah.
                  </p>
                  <DragScrollContainer
                    buttonPosition="top"
                    label="🖱️ Drag mouse / tombol ◀ ▶ untuk melihat daftar lapak marketplace"
                  >
                    <table className="w-full text-left text-xs min-w-[650px]">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-[#2E1E45] text-gray-400">
                          <th className="py-2.5">Judul Lapak</th>
                          <th className="py-2.5">Penjual</th>
                          <th className="py-2.5">Harga</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5 text-right">Aksi Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#2E1E45]">
                        {data?.marketplaceListings?.map((listing) => {
                          const mData = (listing.marketData && typeof listing.marketData === "object" ? listing.marketData : {}) as Record<string, unknown>;
                          const statusStr = String(mData.status ?? "AVAILABLE");
                          const priceNum = Number(mData.price ?? 0);

                          return (
                            <tr key={listing.id}>
                              <td className="py-3 font-semibold text-gray-900 dark:text-white max-w-xs truncate">
                                {listing.title}
                              </td>
                              <td className="py-3 text-gray-500">{listing.author.username ?? "Gamer"}</td>
                              <td className="py-3 font-bold text-gray-800 dark:text-gray-200">{formatMoney.format(priceNum)}</td>
                              <td className="py-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    statusStr === "AVAILABLE"
                                      ? "bg-emerald-500/15 text-emerald-500"
                                      : statusStr === "IN_ESCROW"
                                        ? "bg-amber-500/15 text-amber-500"
                                        : "bg-gray-500/15 text-gray-400"
                                  }`}
                                >
                                  {statusStr}
                                </span>
                              </td>
                              <td className="py-3 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  disabled={busyId === listing.id}
                                  onClick={() => void updateListingStatus(listing.id, statusStr === "SOLD" ? "AVAILABLE" : "SOLD")}
                                  className="px-2.5 py-1 rounded text-xs border border-gray-200 dark:border-[#2E1E45] hover:border-[#9D4EDD]"
                                >
                                  {statusStr === "SOLD" ? "Batalkan Rekber (Tersedia)" : "Selesaikan Rekber (Terjual)"}
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === listing.id}
                                  onClick={() => void deletePostDirect(listing.id, listing.title)}
                                  className="px-2 py-1 rounded text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {!data?.marketplaceListings?.length && (
                          <tr>
                            <td className="py-6 text-center text-gray-400" colSpan={5}>
                              Belum ada lapak terbuka.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </DragScrollContainer>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: MANAJEMEN MEMBER & KASTA ROLE */}
            {/* ========================================================================= */}
            {tab === "members" && (
              <section className="space-y-6" role="tabpanel">
                <div className="p-5 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users size={18} className="text-[#9D4EDD]" /> Manajemen Member &amp; Kasta Role
                      </h2>
                      <p className="text-xs text-gray-500">
                        Atur role web, sesuaikan Level &amp; XP, berikan status Premium, dan berikan sanksi Ban.
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 px-3 h-9 w-full sm:w-64 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] focus-within:border-[#9D4EDD] transition-colors">
                      <Search size={14} className="shrink-0 text-gray-400 pointer-events-none" />
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        placeholder="Cari username / discordId…"
                        className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 p-0"
                      />
                    </div>
                  </div>

                  {/* MOBILE CARD VIEW (< md) */}
                  <div className="block md:hidden space-y-3">
                    {data?.users.map((member) => {
                      const isSelf = member.id === data.currentUserId;
                      const isOwnerMember =
                        member.username?.toLowerCase() === ".odyssia" ||
                        member.username?.toLowerCase() === "odyssia" ||
                        member.discordId === "706661230835925042";
                      return (
                        <div
                          key={member.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-gray-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#130921]"
                        >
                          <div className="space-y-2 text-xs text-left">
                            <div className="flex items-center gap-2.5">
                              <DiscordAvatar src={member.avatar} username={member.username ?? "Member"} size={28} />
                              <div>
                                <span className="font-bold text-gray-900 dark:text-white block">
                                  {member.username ?? "Gamer"}
                                </span>
                                <span className="text-[10px] text-gray-400">ID: {member.discordId || member.id}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {isOwnerMember ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  👑 Emperor
                                </span>
                              ) : (
                                <select
                                  disabled={!isAdmin || isSelf || busyId === member.id}
                                  value={member.role}
                                  onChange={(e) => void updateMember(member, { role: e.target.value as Role })}
                                  className="px-2 py-1 rounded text-xs border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-gray-900 dark:text-white focus:outline-none"
                                >
                                  <option value="MEMBER">MEMBER</option>
                                  <option value="MODERATOR">⚔️ MODERATOR</option>
                                  <option value="ADMIN">✨ ADMIN</option>
                                </select>
                              )}

                              <span className="font-bold text-[#9D4EDD] text-xs">
                                Lv. {member.level ?? 1}
                              </span>

                              <button
                                type="button"
                                disabled={busyId === member.id}
                                onClick={() => void updateMember(member, { isPremium: !member.isPremium })}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  member.isPremium
                                    ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 border-transparent"
                                }`}
                              >
                                {member.isPremium ? "★ Premium" : "Standar"}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200 dark:border-[#2E1E45]">
                            {isAdmin && !isOwnerMember && (
                              <button
                                type="button"
                                disabled={busyId === member.id}
                                onClick={() => void handleEditXpLevel(member)}
                                className="h-9 px-3 text-xs font-bold border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 rounded-md flex items-center justify-center gap-1 transition shadow-sm"
                              >
                                <Edit3 size={13} className="text-purple-400" />
                                <span>Edit XP</span>
                              </button>
                            )}
                            {isOwnerMember ? (
                              <span className="h-9 px-3 text-xs font-bold text-amber-400 bg-amber-500/10 rounded-md border border-amber-500/20 flex items-center justify-center col-span-2 sm:col-span-1">
                                👑 Owner
                              </span>
                            ) : !isSelf ? (
                              <button
                                type="button"
                                disabled={busyId === member.id}
                                onClick={() => void updateMember(member, { isBanned: !member.isBanned })}
                                className={`h-9 px-3 text-xs font-bold rounded-md flex items-center justify-center gap-1 shadow-sm transition ${
                                  member.isBanned
                                    ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                                    : "bg-rose-500/15 text-rose-500 border border-rose-500/30 hover:bg-rose-500/25"
                                } ${!isAdmin ? "col-span-2 sm:col-span-1" : ""}`}
                              >
                                <span>{member.isBanned ? "Buka Ban" : "Ban Member"}</span>
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* DESKTOP TABLE VIEW (>= md) */}
                  <div className="hidden md:block">
                    <DragScrollContainer
                      buttonPosition="top"
                      label="🖱️ Drag mouse / tombol ◀ ▶ untuk mengelola akun member & kasta"
                    >
                      <table className="w-full text-left text-xs min-w-[700px]">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-[#2E1E45] text-gray-400">
                            <th className="py-2.5">Member</th>
                            <th className="py-2.5">Role Web</th>
                            <th className="py-2.5">Level / XP</th>
                            <th className="py-2.5">Status Premium</th>
                            <th className="py-2.5 text-right">Aksi Akun</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#2E1E45]">
                          {data?.users.map((member) => {
                            const isSelf = member.id === data.currentUserId;
                            const isOwnerMember =
                              member.username?.toLowerCase() === ".odyssia" ||
                              member.username?.toLowerCase() === "odyssia" ||
                              member.discordId === "706661230835925042";
                            return (
                              <tr key={member.id}>
                                <td className="py-3">
                                  <div className="flex items-center gap-2.5">
                                    <DiscordAvatar src={member.avatar} username={member.username ?? "Member"} size={28} />
                                    <div>
                                      <span className="font-bold text-gray-900 dark:text-white block">
                                        {member.username ?? "Gamer"}
                                      </span>
                                      <span className="text-[10px] text-gray-400">ID: {member.discordId || member.id}</span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3">
                                  {isOwnerMember ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                      👑 Emperor (Owner)
                                    </span>
                                  ) : (
                                    <select
                                      disabled={!isAdmin || isSelf || busyId === member.id}
                                      value={member.role}
                                      onChange={(e) => void updateMember(member, { role: e.target.value as Role })}
                                      className="px-2 py-1 rounded text-xs border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-gray-900 dark:text-white focus:outline-none"
                                    >
                                      <option value="MEMBER">MEMBER (Adventurer)</option>
                                      <option value="MODERATOR">MODERATOR (⚔️ Lord Commander)</option>
                                      <option value="ADMIN">ADMIN (✨ Prince / Princess)</option>
                                    </select>
                                  )}
                                </td>

                                <td className="py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-[#9D4EDD]">Lv. {member.level ?? 1}</span>
                                    <span className="text-gray-400">({(member.xp ?? 0).toLocaleString("id-ID")} XP)</span>
                                    {isAdmin && !isOwnerMember && (
                                      <button
                                        type="button"
                                        disabled={busyId === member.id}
                                        onClick={() => void handleEditXpLevel(member)}
                                        className="px-1.5 py-0.5 text-[10px] font-bold border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 rounded-none ml-1 transition"
                                        title="Edit Level & XP Manual"
                                      >
                                        ✏️ Edit
                                      </button>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3">
                                  <button
                                    type="button"
                                    disabled={busyId === member.id}
                                    onClick={() => void updateMember(member, { isPremium: !member.isPremium })}
                                    className={`px-2.5 py-1 rounded text-[11px] font-bold border ${
                                      member.isPremium
                                        ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 border-transparent"
                                    }`}
                                  >
                                    {member.isPremium ? "★ Premium Aktif" : "Standar"}
                                  </button>
                                </td>

                                <td className="py-3 text-right">
                                  {isOwnerMember ? (
                                    <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                                      👑 Owner Mutlak
                                    </span>
                                  ) : !isSelf ? (
                                    <button
                                      type="button"
                                      disabled={busyId === member.id}
                                      onClick={() => void updateMember(member, { isBanned: !member.isBanned })}
                                      className={`px-2.5 py-1 rounded text-xs font-bold ${
                                        member.isBanned
                                          ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                                          : "bg-rose-500/15 text-rose-500 border border-rose-500/30 hover:bg-rose-500/25"
                                      }`}
                                    >
                                      {member.isBanned ? "Buka Ban (Unban)" : "Ban Member"}
                                    </button>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </DragScrollContainer>
                  </div>

                  {/* Pagination */}
                  {Boolean(data?.pagination && data.pagination.totalPages > 1) && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-[#2E1E45] mt-4">
                      <span className="text-xs text-gray-500">
                        Halaman {data?.pagination.page} dari {data?.pagination.totalPages}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => setPage(page - 1)}
                          className="px-2.5 py-1 rounded border border-gray-200 dark:border-[#2E1E45] text-xs disabled:opacity-50"
                        >
                          Sebelumnya
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(data?.pagination && page >= data.pagination.totalPages)}
                          onClick={() => setPage(page + 1)}
                          className="px-2.5 py-1 rounded border border-gray-200 dark:border-[#2E1E45] text-xs disabled:opacity-50"
                        >
                          Selanjutnya
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: MODERASI KONTEN & LOG KEAMANAN SATPAM AI */}
            {/* ========================================================================= */}
            {(tab === "moderation" || tab === "security_logs") && (
              <section className="space-y-8" role="tabpanel">
                {/* 1. LAPORAN PELANGGARAN FORUM */}
                <div className="p-6 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                    <Flag size={18} className="text-amber-500" /> Moderasi Laporan Forum ({data?.reports.length ?? 0})
                  </h2>
                  <p className="text-xs text-gray-500 mb-4">Postingan atau aktivitas yang dilaporkan oleh member.</p>

                  <div className="space-y-3">
                    {data?.reports.map((report) => (
                      <article
                        className="p-4 rounded-none border border-amber-200 dark:border-amber-900/40 bg-white dark:bg-[#130921] flex flex-col md:flex-row md:items-center justify-between gap-4"
                        key={report.id}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 uppercase tracking-wider inline-flex items-center gap-1">
                              <AlertTriangle size={11} /> PENDING
                            </span>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {report.post.title}
                            </h3>
                          </div>
                          <p className="text-xs text-gray-500">
                            Penulis: <strong>{report.post.author.username ?? "Gamer"}</strong> • Pelapor: <strong>{report.reporter.username ?? "Gamer"}</strong>
                          </p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-[#1A1526] p-2 rounded border border-gray-200 dark:border-[#2E1E45]">
                            <strong>Alasan:</strong> {report.reason}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={busyId === report.id}
                            onClick={() => void handleReport(report, "dismiss")}
                            className="px-2.5 py-1 rounded text-xs border border-gray-200 dark:border-[#2E1E45] hover:border-[#9D4EDD]"
                          >
                            Abaikan
                          </button>
                          <button
                            type="button"
                            disabled={busyId === report.id}
                            onClick={() => void handleReport(report, "delete-post")}
                            className="px-2.5 py-1 rounded text-xs font-bold text-red-600 bg-red-500/10 hover:bg-red-500/20"
                          >
                            Hapus Post
                          </button>
                        </div>
                      </article>
                    ))}
                    {!data?.reports.length && (
                      <p className="text-xs text-gray-400 py-3 text-center">
                        Semua bersih! Tidak ada laporan pending saat ini.
                      </p>
                    )}
                  </div>

                  {/* DAFTAR POST TERKINI + PIN / UNPIN */}
                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-[#2E1E45]">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                      Daftar Thread Terkini (Pin &amp; Hapus Konten)
                    </h3>
                    <div className="space-y-2">
                      {data?.recentPosts?.slice(0, 10).map((post) => (
                        <div
                          key={post.id}
                          className="p-3 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {post.isPinned && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#9D4EDD]/15 text-[#9D4EDD] shrink-0">
                                PINNED
                              </span>
                            )}
                            <span className="font-bold text-gray-900 dark:text-white truncate">
                              {post.title}
                            </span>
                            <span className="text-gray-400 shrink-0">
                              oleh {post.author.username ?? "Gamer"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={busyId === post.id}
                              onClick={() => void togglePinPost(post.id, post.isPinned)}
                              className={`p-1.5 rounded border ${
                                post.isPinned
                                  ? "text-[#9D4EDD] border-[#9D4EDD]/40 bg-[#9D4EDD]/10"
                                  : "text-gray-500 border-gray-200 dark:border-[#2E1E45] hover:border-[#9D4EDD]"
                              }`}
                              title={post.isPinned ? "Lepas Pin" : "Sematkan (Pin)"}
                            >
                              {post.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                            </button>
                            <button
                              type="button"
                              disabled={busyId === post.id}
                              onClick={() => void deletePostDirect(post.id, post.title)}
                              className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                              title="Hapus Thread"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. LOG KEAMANAN SATPAM AI */}
                <div className="p-6 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck size={18} className="text-[#9D4EDD]" />
                        <span>Log Keamanan Satpam AI ({data?.securityLogs?.length ?? 0} Kejadian)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-none bg-purple-500/20 text-[#A78BFA] font-mono font-bold">
                          LIVE SHIELD
                        </span>
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Audit jejak digital otomatis terhadap percobaan phishing, judi online, kata-kata kasar, dan anomali Rekber yang diblokir oleh AI.
                      </p>
                    </div>
                  </div>

                  <DragScrollContainer className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap min-w-[650px]">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-[#2E1E45] text-gray-400 uppercase text-[10px] tracking-wider">
                          <th className="pb-2.5">Waktu</th>
                          <th className="pb-2.5">Tingkat Risiko</th>
                          <th className="pb-2.5">User</th>
                          <th className="pb-2.5">Aksi / Trigger</th>
                          <th className="pb-2.5">Alasan Pemblokiran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#2E1E45]/60">
                        {data?.securityLogs?.slice(0, 30).map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                            <td className="py-2.5 font-mono text-gray-500">
                              {new Date(log.createdAt).toLocaleString("id-ID")}
                            </td>
                            <td className="py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-none text-[10px] font-mono font-bold ${
                                  log.severity === "CRITICAL"
                                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                    : log.severity === "HIGH"
                                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                      : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                }`}
                              >
                                {log.severity}
                              </span>
                            </td>
                            <td className="py-2.5 font-bold text-gray-900 dark:text-white">
                              @{log.username}
                            </td>
                            <td className="py-2.5 font-mono text-[#A78BFA]">
                              {log.action}
                            </td>
                            <td className="py-2.5 text-gray-700 dark:text-gray-300 max-w-xs truncate" title={log.reason}>
                              {log.reason}
                            </td>
                          </tr>
                        ))}
                        {!data?.securityLogs?.length && (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-gray-400">
                              🛡️ Sistem aman! Belum ada insiden keamanan atau pelanggaran yang diblokir Satpam AI.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </DragScrollContainer>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* TAB 7: LOG KEAMANAN SATPAM AI */}
            {/* ========================================================================= */}
            {tab === "security_logs" && (
              <section className="space-y-6" role="tabpanel">
                {/* Header Banner */}
                <div className="p-6 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-none bg-purple-500/10 border border-purple-500/30 text-[#9D4EDD]">
                          <ShieldCheck size={20} />
                        </span>
                        <div>
                          <h2 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            Log Keamanan Satpam AI
                            <span className="text-[10px] px-2 py-0.5 rounded-none bg-purple-500/20 text-[#A78BFA] font-mono font-bold">
                              LIVE SHIELD
                            </span>
                          </h2>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Audit jejak digital otomatis terhadap percobaan phishing, judi online, kata-kata kasar, dan anomali Rekber.
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={loadDashboard}
                      className="px-3 py-1.5 rounded-none border border-gray-200 dark:border-[#2E1E45] hover:border-[#9D4EDD] text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 self-start sm:self-auto transition"
                    >
                      <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                      Segarkan Data
                    </button>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-[#231738]">
                    <div className="p-3 bg-gray-50 dark:bg-[#1A0F2E] border border-gray-200 dark:border-[#2E1E45]">
                      <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400">TOTAL INSIDEN</div>
                      <div className="text-lg font-mono font-bold text-gray-900 dark:text-white mt-0.5">
                        {data?.securityLogs?.length ?? 0}
                      </div>
                    </div>
                    <div className="p-3 bg-red-500/5 dark:bg-red-950/20 border border-red-500/20">
                      <div className="text-[11px] font-mono text-red-500 dark:text-red-400">PHISHING / SCAM</div>
                      <div className="text-lg font-mono font-bold text-red-600 dark:text-red-400 mt-0.5">
                        {data?.securityLogs?.filter((l) => l.action.includes("PHISHING") || l.severity === "CRITICAL").length ?? 0}
                      </div>
                    </div>
                    <div className="p-3 bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20">
                      <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400">JUDI ONLINE / SLOT</div>
                      <div className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        {data?.securityLogs?.filter((l) => l.action.includes("JUDOL")).length ?? 0}
                      </div>
                    </div>
                    <div className="p-3 bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/20">
                      <div className="text-[11px] font-mono text-purple-600 dark:text-purple-400">REKBER ESCROW WARNING</div>
                      <div className="text-lg font-mono font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                        {data?.securityLogs?.filter((l) => l.action.includes("ESCROW")).length ?? 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Log Entries Table */}
                <div className="p-6 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921]">
                  <h3 className="text-xs font-bold font-mono tracking-wider text-gray-700 dark:text-gray-300 uppercase mb-4 flex items-center gap-2">
                    <Shield size={14} className="text-[#9D4EDD]" />
                    Catatan Pelanggaran Terakhir (Maks. 50 Insiden)
                  </h3>

                  {!data?.securityLogs || data.securityLogs.length === 0 ? (
                    <div className="py-12 px-4 text-center border border-dashed border-gray-200 dark:border-[#2E1E45] bg-gray-50/50 dark:bg-[#180E2B]/50">
                      <div className="w-12 h-12 mx-auto rounded-none bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-3">
                        <CheckCircle size={22} />
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Pertahanan Guild Aman</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
                        Belum ada insiden atau upaya pelanggaran keamanan yang terdeteksi. Satpam Horizon AI aktif mengawasi komunitas 24/7.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-[#2E1E45] text-gray-400 font-mono text-[11px]">
                            <th className="py-2.5 px-3">WAKTU</th>
                            <th className="py-2.5 px-3">TINGKAT</th>
                            <th className="py-2.5 px-3">PENGGUNA</th>
                            <th className="py-2.5 px-3">AKSI & ALASAN</th>
                            <th className="py-2.5 px-3">TRIGGER TERDETEKSI</th>
                            <th className="py-2.5 px-3">CUPLIKAN KONTEN</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#1F1435]">
                          {data.securityLogs.map((log) => {
                            const isCritical = log.severity === "CRITICAL";
                            const isHigh = log.severity === "HIGH";
                            const isMedium = log.severity === "MEDIUM";

                            const badgeColor = isCritical
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : isHigh
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                              : isMedium
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                              : "bg-purple-500/20 text-purple-300 border-purple-500/30";

                            return (
                              <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1A0F2E]/50 transition-colors">
                                <td className="py-3 px-3 font-mono text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                  {new Date(log.createdAt).toLocaleString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <span className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${badgeColor}`}>
                                    {log.severity}
                                  </span>
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <div className="font-semibold text-gray-900 dark:text-gray-200">
                                    @{log.username}
                                  </div>
                                  {log.userId && (
                                    <div className="text-[10px] font-mono text-gray-400">
                                      ID: {log.userId.slice(0, 10)}...
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 max-w-[240px]">
                                  <div className="font-mono text-[11px] font-bold text-[#A78BFA]">
                                    {log.action}
                                  </div>
                                  <div className="text-gray-600 dark:text-gray-400 text-[11px] line-clamp-2 mt-0.5">
                                    {log.reason}
                                  </div>
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  {log.flagged ? (
                                    <span className="font-mono text-[11px] px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                                      "{log.flagged}"
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 text-[11px] font-mono">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 max-w-[280px]">
                                  <div className="p-1.5 bg-gray-100 dark:bg-[#0D0717] border border-gray-200 dark:border-[#2A1B42] font-mono text-[10px] text-gray-700 dark:text-gray-300 break-words line-clamp-2 max-h-12 overflow-hidden">
                                    {log.content}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* MODAL RUANG REKBER 3-PIHAK */}
      {selectedEscrowId && (
        <EscrowChatModal
          escrowId={selectedEscrowId}
          onClose={() => setSelectedEscrowId(null)}
          onStatusChange={loadDashboard}
        />
      )}

      {/* LIGHTBOX BUKTI TRANSFER QRIS ADMIN */}
      {adminProofLightbox && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setAdminProofLightbox(null)}
        >
          <div
            className="relative max-w-xl max-h-[90vh] bg-white dark:bg-[#130921] border border-gray-300 dark:border-white/20 rounded-none p-4 shadow-2xl flex flex-col items-center my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setAdminProofLightbox(null)}
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
                src={adminProofLightbox}
                alt="Bukti Transfer QRIS"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* GACHA / RANDOMIZE BRACKET VISUAL DRAW MODAL */}
      <GachaBracketModal
        isOpen={adminGachaModalState.isOpen}
        tournamentTitle={adminGachaModalState.tournamentTitle}
        isRolling={adminGachaModalState.isRolling}
        teamsList={adminGachaModalState.teamsList}
        onFinish={() => setAdminGachaModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* TOURNAMENT RULES PREVIEW MODAL FOR ADMIN */}
      {adminRulesViewModal && (
        <TournamentRulesModal
          isOpen={Boolean(adminRulesViewModal)}
          tournamentTitle={adminRulesViewModal.title}
          game={adminRulesViewModal.game}
          rules={adminRulesViewModal.rules}
          onClose={() => setAdminRulesViewModal(null)}
          onAgree={() => setAdminRulesViewModal(null)}
        />
      )}

      {/* DEDICATED EDIT TOURNAMENT MODAL FOR ADMIN */}
      <EditTournamentModal
        isOpen={Boolean(editTournamentModal)}
        tournament={editTournamentModal}
        onClose={() => setEditTournamentModal(null)}
        onSuccess={(updated) => {
          setTournamentsList((prev) =>
            prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
          );
          setEditTournamentModal(null);
          setNotice("Informasi turnamen berhasil diperbarui!");
          fetchTournaments();
        }}
      />

      {/* MODAL BUAT TURNAMEN BARU DARI ADMIN */}
      {createTournamentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-[calc(100vw-1.5rem)] max-w-2xl bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2A1B42] rounded-xl p-4 sm:p-6 shadow-2xl my-auto max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-[#2E1E45]">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-[#9D4EDD]" />
                <h3 className="font-bold text-base text-gray-900 dark:text-white">Buat Turnamen Baru (Bagan Otomatis)</h3>
              </div>
              <button type="button" onClick={() => setCreateTournamentOpen(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreateTournament(e)} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Judul Turnamen *</label>
                  <input
                    type="text"
                    required
                    value={newTourneyForm.title}
                    onChange={(e) => setNewTourneyForm({ ...newTourneyForm, title: e.target.value })}
                    placeholder="Contoh: LogHorizon Mobile Legends S1"
                    className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-gray-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Game Divisi *</label>
                  <input
                    type="text"
                    required
                    value={newTourneyForm.game}
                    onChange={(e) => setNewTourneyForm({ ...newTourneyForm, game: e.target.value })}
                    placeholder="Valorant, Mobile Legends, CS2, dll"
                    className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-gray-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Kapasitas Slot Tim *</label>
                  <select
                    value={newTourneyForm.teamCount}
                    onChange={(e) => setNewTourneyForm({ ...newTourneyForm, teamCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-gray-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                  >
                    <option value={4}>4 Tim (Semifinal)</option>
                    <option value={8}>8 Tim (Quarterfinal)</option>
                    <option value={16}>16 Tim (Round of 16)</option>
                    <option value={32}>32 Tim (Round of 32)</option>
                    <option value={64}>64 Tim (Round of 64)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Pemain Inti (Main)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newTourneyForm.mainPlayersCount}
                    onChange={(e) => setNewTourneyForm({ ...newTourneyForm, mainPlayersCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-gray-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Pemain Cadangan (Sub)</label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={newTourneyForm.subPlayersCount}
                    onChange={(e) => setNewTourneyForm({ ...newTourneyForm, subPlayersCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-gray-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Total Prize Pool</label>
                  <input
                    type="text"
                    value={newTourneyForm.prizePool}
                    onChange={(e) => setNewTourneyForm({ ...newTourneyForm, prizePool: e.target.value })}
                    placeholder="Contoh: Rp 1.500.000 / Medali Emas"
                    className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-gray-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Tanggal Mulai Tanding</label>
                  <input
                    type="datetime-local"
                    value={newTourneyForm.eventDate}
                    onChange={(e) => setNewTourneyForm({ ...newTourneyForm, eventDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-gray-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>

              {/* Biaya Registrasi */}
              <div className="p-3 bg-gray-50 dark:bg-[#09040F] border border-gray-200 dark:border-[#2E1E45] space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTourneyForm.isFreeEntry}
                    onChange={(e) => setNewTourneyForm({ ...newTourneyForm, isFreeEntry: e.target.checked })}
                    className="rounded-none border-gray-300 dark:border-[#2E1E45] text-[#7C3AED] focus:ring-0"
                  />
                  <span className="font-bold text-gray-800 dark:text-gray-200">Turnamen Gratis (Free Entry)</span>
                </label>
                {!newTourneyForm.isFreeEntry && (
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Biaya Pendaftaran per Tim (IDR)</label>
                    <input
                      type="number"
                      min={1000}
                      step={5000}
                      value={newTourneyForm.entryFee}
                      onChange={(e) => setNewTourneyForm({ ...newTourneyForm, entryFee: Number(e.target.value) })}
                      placeholder="50000"
                      className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-gray-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Pendaftar wajib mengunggah bukti transfer QRIS dan nama rekening pengirim.</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Peraturan Khusus Turnamen (Opsional)</label>
                <textarea
                  rows={2}
                  value={newTourneyForm.rules}
                  onChange={(e) => setNewTourneyForm({ ...newTourneyForm, rules: e.target.value })}
                  placeholder="Ketik peraturan khusus atau biarkan kosong untuk menggunakan aturan default guild..."
                  className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-gray-900 dark:text-white focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-[#2E1E45]">
                <button
                  type="button"
                  onClick={() => setCreateTournamentOpen(false)}
                  className="px-4 py-2 rounded-none border border-gray-300 dark:border-[#2E1E45] text-gray-600 dark:text-gray-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingTournament}
                  className="px-5 py-2 rounded-none bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold inline-flex items-center gap-2"
                >
                  <Plus size={14} />
                  <span>{creatingTournament ? "Membuat Bagan..." : "Terbitkan Turnamen"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function BroadcastSection({
  announcements,
  onNotice,
  onError,
  onRefresh,
}: {
  announcements: AnnouncementRecord[];
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  onRefresh: () => void;
}) {
  const [targetChannel, setTargetChannel] = useState<"mod_logs" | "announcements">("mod_logs");
  const [category, setCategory] = useState("✨ Fitur Baru Ditambahkan");
  const [affectedModules, setAffectedModules] = useState("Turnamen, Forum, Satpam AI");
  const [publishToWeb, setPublishToWeb] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const MODULE_SUGGESTIONS = [
    "Turnamen & Bracket",
    "Forum Diskusi",
    "Marketplace & Rekber",
    "Pesan & Obrolan",
    "Profil & Armory",
    "Admin Command Center",
    "Squad / Guild Party",
    "Satpam Horizon AI",
    "Multi-Bahasa & Mata Uang",
    "Beranda & Navigasi",
  ];

  function toggleModule(mod: string) {
    const current = affectedModules
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    let next: string[];
    if (current.includes(mod)) {
      next = current.filter((m) => m !== mod);
    } else {
      next = [...current, mod];
    }
    setAffectedModules(next.join(", "));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    onError("");
    try {
      const response = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          imageUrl: imageUrl.trim() || undefined,
          targetChannel,
          category,
          affectedModules,
          publishToWeb: targetChannel === "announcements" ? true : publishToWeb,
        }),
      });
      const result = await readApiResponse<{ notificationSent: boolean; warning?: string }>(response, "Broadcast gagal.");
      setTitle("");
      setContent("");
      setImageUrl("");
      onNotice(
        result.notificationSent
          ? targetChannel === "mod_logs"
            ? "Laporan rincian update berhasil dikirim ke #🛡️・mod-logs."
            : "Warta berhasil disiarkan ke Beranda dan Discord."
          : result.warning ?? "Laporan/warta berhasil diproses."
      );
      onRefresh();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "Broadcast gagal.");
    } finally {
      setSaving(false);
    }
  }

  const now = new Date();
  const activeAnnouncements = announcements.filter((a) => new Date(a.expiresAt) > now);

  return (
    <div className="p-6 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone size={18} className="text-[#9D4EDD]" /> Broadcast &amp; Laporan Update Sistem Discord
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Kirimkan warta publik guild atau laporan teknis rincian perubahan fitur &amp; maintenance ke Discord secara terpusat.
          </p>
        </div>

        {/* Channel Selector Tab */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-[#08060B] border border-gray-200 dark:border-[#2E1E45]">
          <button
            type="button"
            onClick={() => {
              setTargetChannel("mod_logs");
              setPublishToWeb(false);
            }}
            className={`px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
              targetChannel === "mod_logs"
                ? "bg-[#7C3AED] text-white shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Shield size={13} />
            <span>🛡️ Laporan #mod-logs</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTargetChannel("announcements");
              setPublishToWeb(true);
            }}
            className={`px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
              targetChannel === "announcements"
                ? "bg-[#7C3AED] text-white shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Megaphone size={13} />
            <span>📢 Warta #announcements</span>
          </button>
        </div>
      </div>

      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        {/* Mod Logs Specific Fields */}
        {targetChannel === "mod_logs" ? (
          <div className="p-4 bg-purple-500/5 border border-purple-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider flex items-center gap-1.5">
                <Shield size={14} /> Detail Audit #mod-logs (1547552557868777552)
              </span>
              <span className="text-[11px] font-mono text-gray-400">Target: Bot REST API v10</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Kategori Pembaruan <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                >
                  <option value="✨ Fitur Baru Ditambahkan">✨ Fitur Baru Ditambahkan</option>
                  <option value="🐛 Perbaikan Bug &amp; Tampilan">🐛 Perbaikan Bug &amp; Tampilan</option>
                  <option value="🛡️ Peningkatan Keamanan">🛡️ Peningkatan Keamanan</option>
                  <option value="⚡ Peningkatan UI/UX &amp; Kecepatan">⚡ Peningkatan UI/UX &amp; Kecepatan</option>
                  <option value="🔧 Maintenance &amp; Pembersihan Sistem">🔧 Maintenance &amp; Pembersihan Sistem</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Modul Terdampak (Pisahkan Koma) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={affectedModules}
                  onChange={(e) => setAffectedModules(e.target.value)}
                  className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
                  placeholder="Contoh: Turnamen, Forum, Satpam AI"
                />
              </div>
            </div>

            {/* Quick Chips for Modules */}
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Pilih Cepat Modul:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MODULE_SUGGESTIONS.map((mod) => {
                  const isSelected = affectedModules.includes(mod);
                  return (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => toggleModule(mod)}
                      className={`px-2 py-0.5 text-[10px] font-medium border transition ${
                        isSelected
                          ? "bg-[#7C3AED]/20 border-[#7C3AED] text-[#7C3AED] dark:text-[#A78BFA] font-bold"
                          : "bg-white dark:bg-[#08060B] border-gray-200 dark:border-[#2E1E45] text-gray-500 hover:border-gray-400"
                      }`}
                    >
                      {isSelected ? `✓ ${mod}` : `+ ${mod}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="publishWebCheckbox"
                type="checkbox"
                checked={publishToWeb}
                onChange={(e) => setPublishToWeb(e.target.checked)}
                className="w-4 h-4 rounded-none accent-[#7C3AED]"
              />
              <label htmlFor="publishWebCheckbox" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                Tayangkan juga sebagai banner warta 24 jam di Beranda website (Opsional)
              </label>
            </div>
          </div>
        ) : null}

        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
            {targetChannel === "mod_logs" ? "Judul Laporan Update / Perubahan" : "Judul Warta / Pengumuman"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
            placeholder={
              targetChannel === "mod_logs"
                ? "Contoh: Pembaruan Sistem v1.4.0 & Perbaikan Rules Turnamen"
                : "Contoh: Maintenance Server Guild & Pendaftaran Turnamen"
            }
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
            {targetChannel === "mod_logs" ? "Rincian Poin-Poin Perubahan (Changelog)" : "Isi Pengumuman Lengkap"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={targetChannel === "mod_logs" ? 5 : 3}
            maxLength={2000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD] font-mono"
            placeholder={
              targetChannel === "mod_logs"
                ? "• Menambahkan parser teks bersih pada Catatan Aturan Khusus Turnamen\n• Memperbaiki responsivitas modal bagan bracket\n• Mengoptimalkan query database untuk leaderboard XP"
                : "Tuliskan instruksi, detail jadwal, atau pengumuman penting untuk seluruh anggota…"
            }
          />
        </div>

        {targetChannel === "announcements" && (
          <div>
            <ImageUploader
              value={imageUrl}
              onChange={setImageUrl}
              label="Upload Gambar / Banner Pengumuman (Opsional)"
              description="Pilih banner atau poster dari galeri HP atau PC. Otomatis dikompresi."
            />
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="button button-primary px-5 py-2.5 rounded-none text-xs font-bold inline-flex items-center gap-2"
        >
          {saving ? (
            "Memproses pengiriman…"
          ) : targetChannel === "mod_logs" ? (
            <>
              <Shield size={14} />
              <span>📢 Kirim Rincian Update ke #mod-logs</span>
            </>
          ) : (
            <>
              <Megaphone size={14} />
              <span>Siarkan Pengumuman (Web + Discord)</span>
            </>
          )}
        </button>
      </form>

      {/* Daftar Pengumuman Aktif */}
      <div className="pt-4 border-t border-gray-200 dark:border-[#2E1E45]">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Pengumuman Sedang Tayang ({activeAnnouncements.length})
        </h3>
        <div className="space-y-2">
          {activeAnnouncements.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-none bg-gray-50 dark:bg-[#08060B] border border-gray-200 dark:border-[#2E1E45] flex items-center justify-between text-xs"
            >
              <div>
                <strong className="block font-bold text-gray-900 dark:text-white">{item.title}</strong>
                <span className="text-[10px] text-gray-400">
                  Dibuat {new Date(item.createdAt).toLocaleString("id-ID")} • Berakhir {new Date(item.expiresAt).toLocaleString("id-ID")}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
                AKTIF (24H)
              </span>
            </div>
          ))}
          {!activeAnnouncements.length && (
            <p className="text-xs text-gray-400 text-center py-2">Tidak ada pengumuman yang sedang tayang.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SystemUpdateReportSection({
  onNotice,
  onError,
}: {
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [updateType, setUpdateType] = useState<"feat" | "fix" | "security" | "ui" | "maintenance">("feat");
  const [versionTag, setVersionTag] = useState("v1.4.0");
  const [targetChannel, setTargetChannel] = useState<"mod_logs" | "announcements">("mod_logs");
  const [selectedModules, setSelectedModules] = useState<string[]>([
    "Turnamen & Bracket",
    "Satpam Horizon AI",
  ]);
  const [summary, setSummary] = useState("");
  const [sending, setSending] = useState(false);

  const availableModules = [
    "Turnamen & Bracket",
    "Forum Diskusi",
    "Marketplace & Rekber",
    "Pesan Pribadi & Obrolan",
    "Profil, Lencana & Armory",
    "Admin Command Center",
    "Guild Party / Squad",
    "Satpam Horizon AI",
    "Database PostgreSQL",
    "Multi-Bahasa & Mata Uang",
    "Beranda & Navigasi",
  ];

  const toggleModule = (mod: string) => {
    setSelectedModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) {
      onError("Judul dan rincian update wajib diisi.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/system-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          updateType,
          versionTag,
          targetChannel,
          affectedModules: selectedModules,
          summary,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyiarkan laporan update.");
      }

      onNotice(
        `Laporan update "${title}" berhasil disiarkan ke Discord #${
          targetChannel === "mod_logs" ? "🛡️・mod-logs" : "📢・announcements"
        }!`
      );
      setTitle("");
      setSummary("");
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card space-y-5 p-6 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#120B1E]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 dark:border-[#2E1E45] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#A78BFA] uppercase tracking-wider">
              🚀 DISCORD DEPLOY & SYSTEM UPDATE
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#A78BFA]/15 text-[#A78BFA]">
              AUTO CHANGELOG
            </span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
            Kirim Laporan Update, Changelog & Maintenance
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
            Publikasikan rincian pembaruan sistem dan modul terdampak secara otomatis dengan Embed kaya ke channel Discord resmi.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Judul Pembaruan / Rilis *
            </label>
            <input
              type="text"
              required
              maxLength={180}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
              placeholder="Contoh: Pembaruan Sistem v1.4.0 & Perbaikan Parser Aturan Turnamen"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Versi / Tag Rilis
            </label>
            <input
              type="text"
              maxLength={30}
              value={versionTag}
              onChange={(e) => setVersionTag(e.target.value)}
              className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
              placeholder="v1.4.0"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Kategori Update
            </label>
            <select
              value={updateType}
              onChange={(e) => setUpdateType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
            >
              <option value="feat">✨ Fitur Baru Ditambahkan (feat)</option>
              <option value="fix">🐛 Perbaikan Bug & Tampilan (fix)</option>
              <option value="security">🛡️ Peningkatan Keamanan & Proteksi (security)</option>
              <option value="ui">⚡ Peningkatan UI/UX & Kecepatan (ui/perf)</option>
              <option value="maintenance">🔧 Maintenance & Pembersihan Sistem (chore)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Channel Discord Tujuan
            </label>
            <select
              value={targetChannel}
              onChange={(e) => setTargetChannel(e.target.value as any)}
              className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
            >
              <option value="mod_logs">🛡️ #🛡️・mod-logs (Internal Staf & Audit)</option>
              <option value="announcements">📢 #📢・announcements (Publik / @everyone)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">
            Pilih Modul Terdampak ({selectedModules.length} dipilih)
          </label>
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-[#08060B] border border-gray-200 dark:border-[#2E1E45]">
            {availableModules.map((mod) => {
              const active = selectedModules.includes(mod);
              return (
                <button
                  key={mod}
                  type="button"
                  onClick={() => toggleModule(mod)}
                  className={`px-2.5 py-1 text-xs font-medium border transition-colors ${
                    active
                      ? "border-[#9D4EDD] bg-[#9D4EDD]/20 text-[#A78BFA] font-bold"
                      : "border-gray-200 dark:border-[#2E1E45] bg-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {active ? "✓ " : "+ "}
                  {mod}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">
            Rincian Perubahan / Changelog * (Mendukung poin markdown / bullet)
          </label>
          <textarea
            required
            rows={5}
            maxLength={4000}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-[#2E1E45] bg-white dark:bg-[#08060B] text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:border-[#9D4EDD]"
            placeholder="• Memperbaiki parser teks markdown pada aturan turnamen&#10;• Menambahkan visual card kustom&#10;• Mempercepat respon database queries"
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="button button-primary px-5 py-2.5 rounded-none text-xs font-bold inline-flex items-center gap-2"
        >
          {sending ? (
            "Menyiarkan Laporan ke Discord..."
          ) : (
            <>
              <Megaphone className="w-4 h-4" />
              Siarkan Laporan Update ({targetChannel === "mod_logs" ? "#mod-logs" : "#announcements"})
            </>
          )}
        </button>
      </form>
    </div>
  );
}
