"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  Dices,
  Edit3,
  ExternalLink,
  FileText,
  Flame,
  Gamepad2,
  Info,
  Medal,
  Plus,
  QrCode,
  RefreshCw,
  Scale,
  Search,
  Settings,
  Shield,
  Swords,
  Trash2,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { advanceMatchWinner, resetMatchResult, updateMatchStatus, TournamentMatch, TournamentTeam, TournamentRosterPlayer, TournamentLossReason, evaluateAutoLiveMatches, formatMatchScheduleDisplay, isoToDateTimeLocal, dateTimeLocalToIso, formatWibDateTime, extractTournamentPodium } from "@/lib/tournament";
import { DragScrollContainer } from "@/components/drag-scroll-container";
import { ShareButton } from "@/components/share-button";
import { DualWingBracketView } from "@/components/events-board";
import { GachaBracketModal } from "@/components/gacha-bracket-modal";
import { TournamentRulesModal } from "@/components/tournament-rules-modal";
import { RosterPlayerRow } from "@/components/roster-player-row";
import { QuickMatchScoreModal } from "@/components/quick-match-score-modal";
import { ChampionCertificateModal } from "@/components/champion-certificate-modal";
import { ImageUploader } from "@/components/ui/image-uploader";
import { MatchLobbyModal } from "@/components/match-lobby-modal";
import { BracketZoomControl } from "@/components/bracket-zoom-control";
import { EditTournamentModal } from "@/components/edit-tournament-modal";
import { TournamentBackupDropdown } from "@/components/tournament-backup-dropdown";
import { useLiveSync } from "@/hooks/use-live-sync";

type TournamentData = {
  id: string;
  title: string;
  game: string;
  prizePool?: string | null;
  prize1st?: string | null;
  prize2nd?: string | null;
  prize3rd?: string | null;
  format?: string | null;
  maxSlots: number;
  mainPlayersCount?: number;
  subPlayersCount?: number;
  entryFee?: number;
  isFreeEntry?: boolean;
  rules?: string | null;
  status: string;
  eventDate?: string | Date;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  teams?: TournamentTeam[];
  participants?: any[];
  matches?: TournamentMatch[];
  creator?: {
    id: string;
    name?: string | null;
    username?: string | null;
    role: string;
    image?: string | null;
  } | null;
};

export function TournamentDetailView({ tournamentId }: { tournamentId: string }) {
  const { data: session } = useSession();
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [viewingRoster, setViewingRoster] = useState<TournamentTeam | null>(null);

  // Tournament Rules Gate Modal state
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showEditTournamentModal, setShowEditTournamentModal] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<"summary" | "rules" | "bracket" | "teams">("summary");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#bracket-section") {
      setActiveDetailTab("bracket");
    }
  }, []);

  // Registration modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerTeamName, setRegisterTeamName] = useState("");
  const [registerCaptainIgn, setRegisterCaptainIgn] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerSenderName, setRegisterSenderName] = useState("");
  const [registerPaymentProof, setRegisterPaymentProof] = useState<string>("");
  const [compressingProof, setCompressingProof] = useState(false);
  const [selectedProofModal, setSelectedProofModal] = useState<string | null>(null);
  const [registerMainPlayers, setRegisterMainPlayers] = useState<{ nickname: string; gameId: string }[]>([]);
  const [registerSubPlayers, setRegisterSubPlayers] = useState<{ nickname: string; gameId: string }[]>([]);
  const [registering, setRegistering] = useState(false);

  // Inisialisasi Otomatis Roster Pemain saat Modal Registrasi Terbuka
  useEffect(() => {
    if (showRegisterModal && tournament) {
      const mainC = tournament.mainPlayersCount ?? 5;
      const subC = tournament.subPlayersCount ?? 2;
      setRegisterMainPlayers((prev) => {
        if (prev.length === mainC && prev.some((p) => p.nickname || p.gameId)) return prev;
        const mains: { nickname: string; gameId: string }[] = [];
        for (let i = 0; i < mainC; i++) {
          mains.push({
            nickname: i === 0 ? (session?.user?.username ?? session?.user?.name ?? "") : (prev[i]?.nickname ?? ""),
            gameId: prev[i]?.gameId ?? "",
          });
        }
        return mains;
      });
      setRegisterSubPlayers((prev) => {
        if (prev.length === subC && prev.some((p) => p.nickname || p.gameId)) return prev;
        const subs: { nickname: string; gameId: string }[] = [];
        for (let i = 0; i < subC; i++) {
          subs.push({
            nickname: prev[i]?.nickname ?? "",
            gameId: prev[i]?.gameId ?? "",
          });
        }
        return subs;
      });
    }
  }, [showRegisterModal, tournament, session]);

  // Detail Gacha Bracket Modal State
  const [detailGachaModalState, setDetailGachaModalState] = useState<{
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

  const [showCertificate, setShowCertificate] = useState(false);
  const [activeLobbyMatch, setActiveLobbyMatch] = useState<TournamentMatch | null>(null);
  const [deletingTournament, setDeletingTournament] = useState(false);

  async function handleDeleteTournament() {
    if (!tournament) return;
    const confirmed = window.confirm(
      `Apakah kamu yakin ingin menghapus turnamen "${tournament.title}" secara permanen?\n\nSemua data pendaftar, bagan pertandingan, dan skor akan dihapus.`
    );
    if (!confirmed) return;

    setDeletingTournament(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus turnamen.");
      window.location.href = "/events?view=turnamen";
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus turnamen.");
    } finally {
      setDeletingTournament(false);
    }
  }

  async function handleQuickStatusChange(newStatus: string) {
    if (!tournament) return;
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status turnamen.");
      if (data.tournament) {
        setTournament(data.tournament);
      } else {
        setTournament((prev: any) => ({ ...prev, status: newStatus }));
      }
      setNotice(`Status turnamen berhasil diubah menjadi ${newStatus}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status.");
    }
  }

  async function handleDetailGachaBracket() {
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
      .map((t) => t.teamName)
      .filter((n) => n && !n.startsWith("Tim ") && n !== "BYE" && n !== "TBD");

    setDetailGachaModalState({
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
        tournament: TournamentData;
      }>(response, "Gagal mengacak bagan.");

      const elapsed = Date.now() - startTime;
      if (elapsed < 750) {
        await new Promise((r) => setTimeout(r, 750 - elapsed));
      }

      if (data.tournament) {
        setTournament(data.tournament);
      }
      setDetailGachaModalState((prev) => ({ ...prev, isRolling: false }));
      setNotice("🎲 Bagan berhasil diacak! Susunan pertandingan baru telah disimpan.");
    } catch (err) {
      setDetailGachaModalState({ isOpen: false, isRolling: false, tournamentTitle: "", teamsList: [] });
      setError(err instanceof Error ? err.message : "Gagal mengacak bagan turnamen.");
    }
  }

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

  useEffect(() => {
    let active = true;
    fetch(`/api/tournaments/${tournamentId}`)
      .then((res) => readApiResponse<{ tournament: TournamentData }>(res, "Gagal memuat turnamen."))
      .then((data) => {
        if (!active) return;
        setTournament(data.tournament);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Turnamen tidak dapat dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tournamentId]);

  // Live Auto-Refresh & Real-Time Sync State
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  const [syncSecondsAgo, setSyncSecondsAgo] = useState<number>(0);
  const [quickScoreModalMatch, setQuickScoreModalMatch] = useState<TournamentMatch | null>(null);

  // Search State for Public Bracket Tree
  const [bracketSearchQuery, setBracketSearchQuery] = useState("");
  // Zoom State for Bracket Tree (default 1.0 = 100%)
  const [bracketZoomLevel, setBracketZoomLevel] = useState<number>(1.0);
  const pausePollingUntilRef = useRef<number>(0);

  // Pinch-to-Zoom Touch Gestures on Bracket Tree
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1.0);

  const handleBracketTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      pinchStartDistanceRef.current = dist;
      pinchStartZoomRef.current = bracketZoomLevel;
    } else {
      pinchStartDistanceRef.current = null;
    }
  };

  const handleBracketTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistanceRef.current !== null && pinchStartDistanceRef.current > 0) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      if (dist > 0) {
        const factor = dist / pinchStartDistanceRef.current;
        const newZoom = Math.min(1.5, Math.max(0.5, Math.round(pinchStartZoomRef.current * factor * 100) / 100));
        setBracketZoomLevel(newZoom);
      }
    }
  };

  const handleBracketTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      pinchStartDistanceRef.current = null;
    }
  };

  // Live sync countdown tick
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setSyncSecondsAgo(Math.max(0, Math.floor((Date.now() - lastSyncTime) / 1000)));
      setTournament((prev) => {
        if (!prev || prev.status !== "ONGOING" || !prev.matches) return prev;
        const { updatedMatches, hasChanges } = evaluateAutoLiveMatches(prev.matches);
        if (!hasChanges) return prev;
        return { ...prev, matches: updatedMatches };
      });
    }, 1000);
    return () => clearInterval(tickInterval);
  }, [lastSyncTime]);

  // SMART AUTO-POLLING (useLiveSync berbasis Silent JSON Diffing)
  useLiveSync(
    async () => {
      if (Date.now() < pausePollingUntilRef.current) return;
      if (!tournament || (tournament.status !== "ONGOING" && tournament.status !== "REGISTRATION")) return;

      try {
        const res = await fetch(`/api/tournaments/${tournamentId}?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) return;
        const fresh = await res.json();
        if (fresh?.tournament) {
          setTournament((prev) => {
            if (!prev) return fresh.tournament;
            if (JSON.stringify(prev) === JSON.stringify(fresh.tournament)) return prev;
            return fresh.tournament;
          });
          setLastSyncTime(Date.now());
          setSyncSecondsAgo(0);
        }
      } catch {
        // Silently skip transient network failure during background polling
      }
    },
    { intervalMs: 4000, revalidateOnFocus: true }
  );

  // Optimistic Quick Update handler for bracket cards
  function handleAdminQuickUpdate(
    matchId: string,
    action: "SET_LIVE" | "CANCEL_LIVE" | "RESET_MATCH" | "FINISH_MATCH"
  ) {
    if (!tournament) return;
    const match = tournament.matches?.find((m) => m.matchId === matchId);
    if (!match) return;

    if (action === "SET_LIVE") {
      // 0ms Optimistic UI update
      const updatedMatches = updateMatchStatus(tournament.matches || [], matchId, "LIVE");
      setTournament((prev) => (prev ? { ...prev, matches: updatedMatches } : prev));
      setNotice(`Match ${match.roundName} #${match.matchId} diset ke status LIVE!`);

      // Background DB Sync
      fetch(`/api/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, matchStatus: "LIVE" }),
      }).catch((err) => {
        console.error("Gagal sync match status LIVE:", err);
      });
    } else if (action === "CANCEL_LIVE") {
      // 0ms Optimistic UI update
      const updatedMatches = updateMatchStatus(tournament.matches || [], matchId, "UPCOMING", true);
      setTournament((prev) => (prev ? { ...prev, matches: updatedMatches } : prev));
      setNotice(`Status LIVE Match #${match.matchId} dibatalkan (kembali menunggu).`);

      // Background DB Sync
      fetch(`/api/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, matchStatus: "UPCOMING", manualOverride: true }),
      }).catch((err) => {
        console.error("Gagal batalkan match status LIVE:", err);
      });
    } else if (action === "RESET_MATCH") {
      // 0ms Optimistic UI rollback
      const updatedMatches = resetMatchResult(tournament.matches || [], matchId);
      setTournament((prev) => (prev ? { ...prev, matches: updatedMatches } : prev));
      setNotice(`Match #${match.matchId} direset & kunci pertandingan dibuka kembali.`);

      // Background DB Sync
      fetch(`/api/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, resetMatch: true }),
      }).catch((err) => {
        console.error("Gagal reset match:", err);
      });
    } else if (action === "FINISH_MATCH") {
      setQuickScoreModalMatch(match);
    }
  }

  function handleUpdateMatchSchedule(matchId: string, scheduledAt: string | null) {
    if (!tournament) return;

    // Pause polling for 3 seconds to protect optimistic state
    pausePollingUntilRef.current = Date.now() + 3000;

    const updatedMatches = (tournament.matches || []).map((m) =>
      m.matchId?.toLowerCase() === matchId.toLowerCase() ? { ...m, scheduledAt, manualOverride: false } : m
    );
    setTournament((prev) => (prev ? { ...prev, matches: updatedMatches } : prev));

    setQuickScoreModalMatch((prev) =>
      prev
        ? {
            ...prev,
            scheduledAt,
            manualOverride: false,
          }
        : null
    );

    const wibText = scheduledAt ? formatWibDateTime(scheduledAt) : "-";
    setNotice(
      scheduledAt
        ? `🕒 Jadwal pertandingan #${matchId.toUpperCase()} berhasil diperbarui menjadi ${wibText}.`
        : `🕒 Jadwal pertandingan #${matchId.toUpperCase()} berhasil dihapus.`
    );

    fetch(`/api/tournaments/${tournament.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, scheduledAt, manualOverride: false }),
    }).catch((err) => {
      console.error("Gagal sync jadwal match:", err);
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
    if (!quickScoreModalMatch || !tournament) return;

    // 0ms Optimistic local update
    const updatedMatches = advanceMatchWinner(
      tournament.matches || [],
      matchId,
      winnerName,
      winnerId,
      scoreA,
      scoreB,
      lossReason
    );

    setTournament((prev) => (prev ? { ...prev, matches: updatedMatches } : prev));
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
      await fetch(`/api/tournaments/${tournament.id}`, {
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

  const mainCount = tournament?.mainPlayersCount ?? 5;
  const subCount = tournament?.subPlayersCount ?? 2;

  function handleOpenRegister() {
    if (!session?.user) {
      void signIn("discord");
      return;
    }
    // Show mandatory tournament rules agreement first
    setShowRulesModal(true);
  }

  function handleProceedToRegistration() {
    setShowRulesModal(false);
    // Initialize roster inputs based on tournament settings
    setRegisterTeamName("");
    setRegisterCaptainIgn(session?.user?.username ?? session?.user?.name ?? "");
    setRegisterPhone("");
    setRegisterSenderName("");
    setRegisterPaymentProof("");

    const mains: { nickname: string; gameId: string }[] = [];
    for (let i = 0; i < mainCount; i++) {
      mains.push({
        nickname: i === 0 ? (session?.user?.username ?? session?.user?.name ?? "") : "",
        gameId: "",
      });
    }
    setRegisterMainPlayers(mains);

    const subs: { nickname: string; gameId: string }[] = [];
    for (let i = 0; i < subCount; i++) {
      subs.push({ nickname: "", gameId: "" });
    }
    setRegisterSubPlayers(subs);

    setShowRegisterModal(true);
  }

  async function handleAutofillFromParty() {
    try {
      const res = await fetch("/api/parties/my-party");
      if (!res.ok) throw new Error("Gagal memeriksa data party");
      const data = await res.json();
      if (!data.inParty || !data.party) {
        setError("Kamu belum memiliki atau bergabung dalam party resmi. Buat atau gabung party di menu Events > Party Skuad!");
        return;
      }

      const party = data.party;
      setRegisterTeamName(party.name);

      const members = party.members || [];
      const mainC = tournament?.mainPlayersCount ?? 5;
      const subC = tournament?.subPlayersCount ?? 2;

      // Fill main players from party roster
      const newMains: { nickname: string; gameId: string }[] = [];
      for (let i = 0; i < mainC; i++) {
        const mem = members[i];
        newMains.push({
          nickname: mem?.inGameNickname || mem?.user?.username || "",
          gameId: mem?.inGameId || "",
        });
      }
      setRegisterMainPlayers(newMains);

      // Fill sub players from party roster
      const newSubs: { nickname: string; gameId: string }[] = [];
      for (let i = 0; i < subC; i++) {
        const mem = members[mainC + i];
        newSubs.push({
          nickname: mem?.inGameNickname || mem?.user?.username || "",
          gameId: mem?.inGameId || "",
        });
      }
      setRegisterSubPlayers(newSubs);

      if (members[0]?.inGameNickname) {
        setRegisterCaptainIgn(members[0].inGameNickname);
      }
      setNotice(`✅ Data tim & roster berhasil diisi otomatis dari party [${party.tag}] ${party.name}!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengisi data party");
    }
  }

  async function handleSubmitRegistration(e: FormEvent) {
    e.preventDefault();
    if (!tournament) return;

    if (!registerTeamName.trim()) {
      setError("Nama tim wajib diisi.");
      return;
    }

    const isPaid = !tournament.isFreeEntry && (tournament.entryFee ?? 0) > 0;
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

    // Validasi Seluruh Pemain Inti Wajib Terisi Lengkap
    for (let i = 0; i < registerMainPlayers.length; i++) {
      const p = registerMainPlayers[i];
      if (!p.nickname.trim() || !p.gameId.trim()) {
        setError(`Pemain Inti #${i + 1} wajib diisi lengkap (Nickname dan ID / Tag Game).`);
        return;
      }
    }

    setRegistering(true);
    setError("");

    // Prepare roster array
    const roster: TournamentRosterPlayer[] = [
      ...registerMainPlayers.map((p) => ({
        name: p.nickname.trim(),
        inGameId: p.gameId.trim(),
        role: "MAIN" as const,
      })),
      ...registerSubPlayers
        .filter((p) => p.nickname.trim() && p.gameId.trim())
        .map((p) => ({
          name: p.nickname.trim(),
          inGameId: p.gameId.trim(),
          role: "SUB" as const,
        })),
    ];

    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: registerTeamName.trim(),
          phone: registerPhone.trim(),
          captainIgn: registerMainPlayers[0]?.nickname.trim() || registerCaptainIgn.trim(),
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
          roster,
        }),
      });

      const result = await readApiResponse<{ message: string; tournament?: TournamentData }>(
        res,
        "Pendaftaran turnamen gagal."
      );

      setNotice(result.message || "Tim berhasil didaftarkan ke turnamen!");
      setShowRegisterModal(false);

      // Refresh tournament data
      const refreshed = await fetch(`/api/tournaments/${tournament.id}`).then((r) =>
        readApiResponse<{ tournament: TournamentData }>(r, "Gagal memuat ulang data turnamen.")
      );
      if (refreshed.tournament) setTournament(refreshed.tournament);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pendaftaran gagal.");
    } finally {
      setRegistering(false);
    }
  }

  if (loading) {
    return (
      <main className="py-12 px-4 text-center max-w-5xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 text-sm text-gray-400">
          <RefreshCw size={16} className="animate-spin text-[#9D4EDD]" />
          <span>Memuat data turnamen...</span>
        </div>
      </main>
    );
  }

  if (!tournament || error) {
    return (
      <main className="py-12 px-4 max-w-4xl mx-auto w-full text-center">
        <div className="p-6 rounded-none border border-red-500/30 bg-red-950/20 text-red-300 mb-6">
          <p className="font-bold">{error || "Turnamen tidak ditemukan."}</p>
        </div>
        <Link
          href="/events?view=turnamen"
          className="button button-primary inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          <span>Kembali ke Daftar Turnamen</span>
        </Link>
      </main>
    );
  }

  const teams = (tournament.teams as TournamentTeam[]) || [];
  const matches = (tournament.matches as TournamentMatch[]) || [];

  // Active participants (filter out REJECTED)
  const activeParticipants = (tournament.participants || []).filter(
    (p: any) => p.paymentStatus !== "REJECTED" && p.status !== "REJECTED"
  );
  const rejectedTeamNames = new Set(
    (tournament.participants || [])
      .filter((p: any) => p.paymentStatus === "REJECTED" || p.status === "REJECTED")
      .map((p: any) => (p.teamName || "").trim().toLowerCase())
  );

  // Registered teams (exclude pure empty slots and rejected teams)
  const realTeams = teams.filter((t: any) => {
    if (t.paymentStatus === "REJECTED" || t.status === "REJECTED") return false;
    const name = (t.teamName || "").trim().toLowerCase();
    if (name && rejectedTeamNames.has(name)) return false;

    return (
      Boolean(t.captainName && t.captainName !== "TBD") ||
      (t.teamName &&
        !t.teamName.startsWith("Slot ") &&
        !t.teamName.startsWith("Tim ") &&
        t.teamName !== "TBD" &&
        t.teamName !== "BYE")
    );
  });

  const registeredSlotsCount =
    tournament.participants && tournament.participants.length > 0
      ? activeParticipants.length
      : realTeams.length;

  // Group matches by round
  const roundsMap = new Map<number, TournamentMatch[]>();
  for (const m of matches) {
    const list = roundsMap.get(m.round) || [];
    list.push(m);
    roundsMap.set(m.round, list);
  }
  const sortedRoundNumbers = Array.from(roundsMap.keys()).sort((a, b) => a - b);

  const maxRound = Math.max(...matches.map((m) => m.round || 1), 1);
  const gfMatch = matches.find(
    (m) =>
      m.round === maxRound ||
      m.roundName?.toLowerCase().includes("grand final") ||
      m.roundName?.toLowerCase() === "final"
  );
  const gfWinner = gfMatch?.winner || null;
  const winningTeam = gfWinner
    ? (tournament.teams || []).find(
        (t) => t.teamName?.toLowerCase() === gfWinner.toLowerCase() || t.id === gfWinner
      ) ||
      (tournament.participants || []).find(
        (p: any) => p.teamName?.toLowerCase() === gfWinner.toLowerCase() || p.id === gfWinner
      )
    : null;

  const podium = extractTournamentPodium(tournament);

  const isRegistrationOpen = tournament.status === "OPEN" || tournament.status === "REGISTRATION";
  const shareUrl = `/events/turnamen/${tournament.id}`;
  const shareTitle = `🏆 ${tournament.title} - Turnamen LogHorizon`;
  const shareText = `Ikuti turnamen ${tournament.game}! Hadiah: ${tournament.prizePool || "Prizepool Resmi"}. Cek bagan pertandingan dan daftar timmu sekarang di LogHorizon:`;

  return (
    <main className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-12 text-left">
      {/* Back button & top bar */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap border-b border-slate-200 dark:border-[#2E1E45] pb-4">
        <Link
          href="/events?view=turnamen"
          className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-[#A78BFA] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
        >
          <ArrowLeft size={16} />
          <span>KEMBALI KE SEMUA TURNAMEN</span>
        </Link>

        <div className="flex items-center gap-2">
          <ShareButton
            url={shareUrl}
            title={shareTitle}
            text={shareText}
            label="Bagikan Turnamen"
            variant="secondary"
          />
        </div>
      </div>

      {notice && (
        <div className="mb-6 p-4 rounded-none border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 text-xs font-mono flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice("")}><X size={16} /></button>
        </div>
      )}

      {/* Tournament Header Banner */}
      <div className="relative overflow-hidden rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] p-6 sm:p-8 shadow-xl mb-8">
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-none text-[10px] font-mono font-extrabold uppercase tracking-wider bg-[#7C3AED] text-white">
                {tournament.game}
              </span>
              <span className="px-2.5 py-1 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 dark:bg-[#1A0E2E] text-slate-700 dark:text-[#A78BFA] border border-slate-200 dark:border-[#2E1E45]">
                {tournament.format || `${tournament.maxSlots} TIM`}
              </span>
              <span
                className={`px-2.5 py-1 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider ${
                  tournament.status === "COMPLETED"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : tournament.status === "ONGOING"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "bg-purple-500/10 dark:bg-[#7C3AED]/20 text-purple-700 dark:text-[#A78BFA] border border-purple-500/20 dark:border-[#7C3AED]/30"
                }`}
              >
                ● {tournament.status}
              </span>
              {tournament.isFreeEntry || !tournament.entryFee ? (
                <span className="px-2.5 py-1 rounded-none text-[10px] font-mono font-extrabold uppercase tracking-wider bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                  FREE ENTRY
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-none text-[10px] font-mono font-extrabold uppercase tracking-wider bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                  BIAYA REGIST: RP {tournament.entryFee.toLocaleString("id-ID")}
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-[#F8FAFC] uppercase tracking-tight leading-tight">
              {tournament.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600 dark:text-[#A78BFA]">
              <span className="font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-1.5">
                <Trophy size={16} className="text-[#F59E0B]" /> Hadiah: {tournament.prizePool || "Prizepool Resmi Guild"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Users size={16} /> Slot Terdaftar: <strong className="text-slate-900 dark:text-[#F8FAFC]">{registeredSlotsCount} / {tournament.maxSlots} TIM</strong>
              </span>
              <span>•</span>
              <span className="text-slate-500 dark:text-[#A78BFA]/80">
                Format: {mainCount} Inti + Maks {subCount} Cadangan
              </span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto font-mono">
            {gfWinner && (
              <button
                type="button"
                onClick={() => setShowCertificate(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-none text-xs font-bold uppercase tracking-wider bg-[#F59E0B] text-black hover:bg-amber-400 transition"
              >
                <span>Lihat &amp; Unduh Kartu Juara</span>
              </button>
            )}

            {isRegistrationOpen && (
              <button
                id="daftar"
                type="button"
                onClick={handleOpenRegister}
                className="px-6 py-2.5 rounded-none font-bold text-xs uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-white border border-[#7C3AED] inline-flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                <span>Daftar Tim / Party Sekarang</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <ShareButton
                url={shareUrl}
                title={shareTitle}
                text={shareText}
                label="Bagikan Turnamen"
                variant="secondary"
                className="w-full sm:w-auto justify-center"
              />
            </div>
          </div>
        </div>
      </div>

      {/* BANNER PODIUM KEJUARAAN (KHUSUS TURNAMEN SELESAI / COMPLETED) */}
      {(tournament.status === "COMPLETED" || podium?.championTeam) && (
        <div className="mb-8 p-6 sm:p-8 rounded-none border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-purple-950/30 to-[#130921] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 opacity-10 pointer-events-none">
            <Trophy size={200} className="text-amber-400" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-amber-500/20">
            <div>
              <span className="font-mono text-xs font-extrabold uppercase tracking-widest text-amber-500 flex items-center gap-2 mb-1">
                <Trophy size={16} className="text-amber-400" />
                <span>OFFICIAL PODIUM // ARSIP KEJUARAAN RESMI</span>
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                Podium Pemenang Turnamen
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-1">
                Turnamen ini telah resmi selesai. Snapshot juara dan roster telah diabadikan di Hall of Winners.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/hall-of-winners"
                className="px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-400 border border-amber-500/40 inline-flex items-center gap-2 transition"
              >
                <Medal size={14} />
                <span>Buka Hall of Winners</span>
              </Link>
              {gfWinner && (
                <button
                  type="button"
                  onClick={() => setShowCertificate(true)}
                  className="px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-black inline-flex items-center gap-2 transition cursor-pointer"
                >
                  <Trophy size={14} />
                  <span>Unduh E-Sertifikat Juara</span>
                </button>
              )}
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 🥇 JUARA 1 */}
            <div className="p-4 sm:p-5 rounded-none bg-amber-500/15 border-2 border-amber-500/50 relative flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2 py-0.5 text-[10px] font-mono font-extrabold uppercase bg-amber-500 text-black">
                  JUARA 1 (CHAMPION)
                </span>
                <Crown size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="font-display text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {podium?.championTeam || "TBD"}
                </p>
                {podium?.championRoster && podium.championRoster.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-amber-500/30 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wider block">
                      Roster Juara ({podium.championRoster.length} Pemain):
                    </span>
                    <p className="text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed">
                      {podium.championRoster.map((p) => p.name).join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 🥈 JUARA 2 */}
            <div className="p-4 sm:p-5 rounded-none bg-slate-500/10 border border-slate-400/40 relative flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2 py-0.5 text-[10px] font-mono font-extrabold uppercase bg-slate-400 text-black">
                  JUARA 2 (RUNNER-UP)
                </span>
                <Medal size={18} className="text-slate-400" />
              </div>
              <div>
                <p className="font-display text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {podium?.runnerUpTeam || "TBD"}
                </p>
                {podium?.runnerUpRoster && podium.runnerUpRoster.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-400/30 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                      Roster Runner-Up ({podium.runnerUpRoster.length} Pemain):
                    </span>
                    <p className="text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed">
                      {podium.runnerUpRoster.map((p) => p.name).join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 🥉 JUARA 3 */}
            <div className="p-4 sm:p-5 rounded-none bg-amber-700/10 border border-amber-700/40 relative flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2 py-0.5 text-[10px] font-mono font-extrabold uppercase bg-amber-700 text-white">
                  JUARA 3 (BRONZE PLACE)
                </span>
                <Medal size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="font-display text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {podium?.thirdPlaceTeam || "TBD"}
                </p>
                {podium?.thirdPlaceRoster && podium.thirdPlaceRoster.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-amber-700/30 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                      Roster Juara 3 ({podium.thirdPlaceRoster.length} Pemain):
                    </span>
                    <p className="text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed">
                      {podium.thirdPlaceRoster.map((p) => p.name).join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2-COLUMN FASTUR-INSPIRED LAYOUT: LEFT COLUMN TABS (8 cols) + RIGHT STICKY SIDEBAR (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-12">
        {/* KOLOM KIRI (lg:col-span-8): SUB-TABS (Ringkasan, Aturan, Bagan, Tim) */}
        <div className="lg:col-span-8 space-y-6">
          {/* TAB BAR NAVIGATION */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200 dark:border-[#2A1B42]">
            <button
              type="button"
              onClick={() => setActiveDetailTab("summary")}
              className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 shrink-0 ${
                activeDetailTab === "summary"
                  ? "border-[#7C3AED] text-[#7C3AED] dark:text-[#A78BFA] bg-purple-500/5 dark:bg-[#7C3AED]/10"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText size={15} />
              <span>Ringkasan</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDetailTab("rules")}
              className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 shrink-0 ${
                activeDetailTab === "rules"
                  ? "border-[#7C3AED] text-[#7C3AED] dark:text-[#A78BFA] bg-purple-500/5 dark:bg-[#7C3AED]/10"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Scale size={15} />
              <span>Aturan &amp; Sanksi</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDetailTab("bracket")}
              className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 shrink-0 ${
                activeDetailTab === "bracket"
                  ? "border-[#7C3AED] text-[#7C3AED] dark:text-[#A78BFA] bg-purple-500/5 dark:bg-[#7C3AED]/10"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Trophy size={15} />
              <span>Bagan (Bracket)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDetailTab("teams")}
              className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 shrink-0 ${
                activeDetailTab === "teams"
                  ? "border-[#7C3AED] text-[#7C3AED] dark:text-[#A78BFA] bg-purple-500/5 dark:bg-[#7C3AED]/10"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Users size={15} />
              <span>Tim Terdaftar ({registeredSlotsCount})</span>
            </button>
          </div>

          {/* TAB 1: 📋 RINGKASAN */}
          {activeDetailTab === "summary" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* GRID INFO UTAMA */}
              <div className="p-6 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-xl space-y-6">
                <div>
                  <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                    <Info size={18} className="text-[#7C3AED]" />
                    <span>Informasi &amp; Format Turnamen</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-[#A78BFA] mt-1 font-sans">
                    Detail teknis pelaksanaan turnamen resmi yang diselenggarakan oleh LogHorizon Guild.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-none bg-slate-50 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-[#A78BFA] block mb-1">
                      🎮 Cabang Game
                    </span>
                    <span className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">
                      {tournament.game}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-none bg-slate-50 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-[#A78BFA] block mb-1">
                      📅 Jadwal Mulai (WIB)
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {tournament.eventDate
                        ? formatWibDateTime(
                            typeof tournament.eventDate === "string"
                              ? tournament.eventDate
                              : tournament.eventDate.toISOString()
                          )
                        : "Belum dijadwalkan"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-none bg-slate-50 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-[#A78BFA] block mb-1">
                      ⚔️ Format Kompetisi
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {tournament.format || `${tournament.maxSlots} Tim Single Elimination`}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-none bg-slate-50 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-[#A78BFA] block mb-1">
                      👥 Kuota &amp; Roster Pemain
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {registeredSlotsCount}/{tournament.maxSlots} Tim ({mainCount} Inti + {subCount} Cadangan)
                    </span>
                  </div>
                </div>

                {/* SKEMA PEMBAGIAN HADIAH (PRIZE BREAKDOWN) */}
                <div className="p-4 sm:p-5 rounded-none bg-slate-50 dark:bg-[#1A0E2E] border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                      <Award size={15} />
                      <span>Skema Alokasi Hadiah (Prize Pool)</span>
                    </span>
                    <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
                      {tournament.prizePool || "Prizepool Resmi"}
                    </span>
                  </div>

                  {tournament.prize1st || tournament.prize2nd || tournament.prize3rd ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className="p-3 rounded-none bg-amber-500/10 border border-amber-500/40">
                        <span className="text-[10px] font-mono font-bold text-amber-500 block uppercase">
                          🥇 Juara 1 (Champion)
                        </span>
                        <p className="font-mono font-black text-sm text-amber-400 mt-1">
                          {tournament.prize1st || "-"}
                        </p>
                      </div>

                      <div className="p-3 rounded-none bg-slate-400/10 border border-slate-400/30">
                        <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                          🥈 Juara 2 (Runner-Up)
                        </span>
                        <p className="font-mono font-black text-sm text-slate-300 mt-1">
                          {tournament.prize2nd || "-"}
                        </p>
                      </div>

                      <div className="p-3 rounded-none bg-amber-700/10 border border-amber-700/30">
                        <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 block uppercase">
                          🥉 Juara 3 (Bronze)
                        </span>
                        <p className="font-mono font-black text-sm text-amber-600 dark:text-amber-400 mt-1">
                          {tournament.prize3rd || "-"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs font-mono text-slate-600 dark:text-[#A78BFA] leading-relaxed">
                      Total hadiah turnamen sebesar <strong>{tournament.prizePool || "Prizepool Resmi Guild"}</strong> akan didistribusikan kepada para pemenang podium setelah babak Grand Final selesai diverifikasi oleh High Council.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ⚖️ ATURAN & SANKSI */}
          {activeDetailTab === "rules" && (
            <div className="p-6 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-xl space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                  <Scale size={18} className="text-[#7C3AED]" />
                  <span>Aturan Resmi, Sanksi &amp; Prosedur Sengketa</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-[#A78BFA] mt-1 font-sans">
                  Seluruh kapten dan pemain yang terdaftar dianggap telah membaca, memahami, dan menyetujui pakta integritas kompetisi berikut:
                </p>
              </div>

              {/* 3 PILAR KEBIJAKAN */}
              <div className="space-y-4">
                <div className="p-4 rounded-none border border-rose-500/30 bg-rose-500/5 space-y-1.5">
                  <h4 className="text-xs font-mono font-bold text-rose-500 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle size={15} />
                    <span>1. Pelanggaran Fatal &amp; Cheat (Permanent DQ)</span>
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    Penggunaan program ilegal, script, cheat engine, map hack, joki akun luar, maupun perilaku bug abuse yang disengaja akan mengakibatkan <strong>Diskualifikasi (DQ) permanen</strong> untuk seluruh anggota tim, pembatalan seluruh kemenangan/hadiah, dan sanksi blacklist permanen dari turnamen LogHorizon Guild.
                  </p>
                </div>

                <div className="p-4 rounded-none border border-amber-500/30 bg-amber-500/5 space-y-1.5">
                  <h4 className="text-xs font-mono font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
                    <Shield size={15} />
                    <span>2. Tata Tertib, Etika &amp; Sportivitas</span>
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    Taunting dan recall wajar in-game diperbolehkan sebagai dinamika pertandingan mental. Namun ujaran kebencian, pelecehan, rasisme, provokasi berlebihan, atau SARA di chat all/voice room akan dikenakan kartu kuning, pengurangan skor, atau diskualifikasi langsung sesuai keputusan juri.
                  </p>
                </div>

                <div className="p-4 rounded-none border border-indigo-500/30 bg-indigo-500/5 space-y-1.5">
                  <h4 className="text-xs font-mono font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                    <Clock size={15} />
                    <span>3. Kehadiran, Waktu Tunggu &amp; WO (12 Menit)</span>
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    Seluruh anggota tim wajib masuk ke lobby custom room maksimal <strong>12 menit</strong> setelah jadwal pertandingan atau panggilan wasit. Keterlambatan melebihi 12 menit tanpa konfirmasi resmi berakibat <strong>Kalah Walk Out (WO)</strong> dan lawan otomatis melaju ke babak berikutnya.
                  </p>
                </div>
              </div>

              {/* KETENTUAN SENGKETA & BUKTI */}
              <div className="p-4 rounded-none border border-purple-500/30 bg-purple-500/5 space-y-2">
                <h4 className="text-xs font-mono font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>Batas Lapor Sengketa (Dispute Window: 10 Menit)</span>
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                  Laporan sengketa hasil pertandingan (perbedaan skor, dugaan pelanggaran aturan, atau ketidaksesuaian roster) wajib diajukan maksimal <strong>10 menit</strong> setelah pertandingan berakhir dengan melampirkan screenshot papan skor lobby dan rekaman layar yang valid. Lewat dari 10 menit, hasil skor dianggap sah dan final.
                </p>
              </div>

              {/* ATURAN KHUSUS TAMBAHAN PENYELENGGARA */}
              {tournament.rules ? (
                <div className="p-4 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-[#A78BFA]">
                    Catatan Aturan Khusus Penyelenggara:
                  </span>
                  <div className="text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {tournament.rules}
                  </div>
                </div>
              ) : (
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 italic">
                  ℹ️ Tidak ada aturan khusus tambahan dari penyelenggara. Aturan standar kompetisi LogHorizon di atas berlaku penuh.
                </p>
              )}
            </div>
          )}

          {/* TAB 3: 🏆 BAGAN (BRACKET) */}
          {activeDetailTab === "bracket" && (
            <div id="bracket-section" className="p-5 sm:p-7 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-xl animate-in fade-in duration-200 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 dark:border-[#2E1E45] pb-4">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Flame size={20} className="text-[#7C3AED]" />
                  <h2 className="font-display text-base sm:text-lg font-extrabold uppercase tracking-tight text-slate-900 dark:text-[#F8FAFC]">
                    Pohon Bagan Pertandingan (Bracket Tree Simetris)
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none text-[10px] font-mono font-bold bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-none bg-[#10B981] opacity-75"></span>
                      <span className="relative inline-flex rounded-none h-2 w-2 bg-[#10B981]"></span>
                    </span>
                    LIVE SYNC AKTIF
                    <span className="text-[#10B981]/70 font-normal">
                      ({syncSecondsAgo <= 1 ? "baru saja" : `${syncSecondsAgo}d lalu`})
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <div className="flex items-center gap-2 px-3 h-9 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] focus-within:border-[#7C3AED] transition-all">
                      <Search size={13} className="text-slate-400 dark:text-[#A78BFA] shrink-0" />
                      <input
                        type="text"
                        value={bracketSearchQuery}
                        onChange={(e) => setBracketSearchQuery(e.target.value)}
                        placeholder="Cari nama tim..."
                        className="w-full bg-transparent text-xs text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#A78BFA]/50 focus:outline-none font-sans"
                      />
                      {bracketSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setBracketSearchQuery("")}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[10px] font-mono font-medium text-slate-600 dark:text-[#A78BFA] bg-slate-200 dark:bg-[#2E1E45] hover:text-slate-900 dark:hover:text-[#F8FAFC] transition shrink-0"
                          title="Reset pencarian"
                        >
                          <X size={11} />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <BracketZoomControl
                    zoom={bracketZoomLevel}
                    onZoomChange={setBracketZoomLevel}
                  />
                </div>
              </div>

              {matches.length > 0 ? (
                <div
                  onTouchStart={handleBracketTouchStart}
                  onTouchMove={handleBracketTouchMove}
                  onTouchEnd={handleBracketTouchEnd}
                  style={{ touchAction: "pan-x pan-y" }}
                >
                  <DragScrollContainer
                    buttonPosition="top"
                    label={
                      <>
                        <span className="sm:hidden">👆 Usap 1 jari / Cubit 2 jari untuk zoom</span>
                        <span className="hidden sm:inline">🖱️ Drag mouse / tombol ◀ ▶: Sayap Kiri ➔ GRAND FINAL 🏆 ⬅ Sayap Kanan</span>
                      </>
                    }
                    className="pt-2 pb-4"
                  >
                    <div
                      style={{
                        transform: `scale(${bracketZoomLevel})`,
                        transformOrigin: "top center",
                        transition: pinchStartDistanceRef.current ? "none" : "transform 0.15s ease-out",
                      }}
                      className="w-fit min-w-full"
                    >
                      <DualWingBracketView
                        sortedRoundNumbers={sortedRoundNumbers}
                        roundsMap={roundsMap}
                        teams={teams}
                        onTeamClick={(team) => setViewingRoster(team)}
                        isAdminOrMod={session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR"}
                        onAdminQuickUpdate={handleAdminQuickUpdate}
                        searchQuery={bracketSearchQuery}
                        onOpenLobby={(m) => setActiveLobbyMatch(m)}
                        currentUserId={session?.user?.id}
                        currentUsername={session?.user?.username || session?.user?.name || undefined}
                        tournamentEventDate={tournament.eventDate}
                      />
                    </div>
                  </DragScrollContainer>
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-10 font-mono">
                  Bagan pertandingan belum dibuat atau sedang dipersiapkan oleh panitia.
                </p>
              )}
            </div>
          )}

          {/* TAB 4: 👥 TIM TERDAFTAR */}
          {activeDetailTab === "teams" && (
            <div className="p-5 sm:p-7 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-xl space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 dark:border-[#2E1E45] pb-4">
                <div>
                  <h2 className="font-display text-base sm:text-lg font-extrabold uppercase tracking-tight text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                    <Shield size={18} className="text-[#7C3AED]" />
                    <span>Daftar Tim Terdaftar ({registeredSlotsCount} TIM)</span>
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-[#A78BFA] mt-0.5 font-sans">
                    Klik kartu tim untuk memeriksa komposisi roster pemain inti dan cadangan.
                  </p>
                </div>

                {isRegistrationOpen && (
                  <button
                    type="button"
                    onClick={handleOpenRegister}
                    className="px-4 py-2 rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-white border border-[#7C3AED] inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Tambah Tim</span>
                  </button>
                )}
              </div>

              {realTeams.length === 0 ? (
                <div className="text-center py-12 text-xs font-mono text-slate-500 dark:text-[#A78BFA] border border-dashed border-slate-200 dark:border-[#2E1E45] rounded-none bg-slate-50 dark:bg-[#1A0E2E]">
                  Belum ada tim yang mendaftar. Jadilah tim pertama yang mendaftar dan rebut gelarnya!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {realTeams.map((team, idx) => {
                    const roster = (team.roster as TournamentRosterPlayer[]) || [];
                    const mainPlayers = roster.filter((r) => r.role !== "SUB");
                    const subPlayers = roster.filter((r) => r.role === "SUB");

                    return (
                      <div
                        key={team.id || idx}
                        onClick={() => setViewingRoster(team)}
                        className="p-4 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#1A0E2E] hover:border-[#7C3AED] transition cursor-pointer space-y-3 text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="w-6 h-6 rounded-none bg-white dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45] text-purple-600 dark:text-[#A78BFA] text-xs font-mono font-bold flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A78BFA]">
                            {mainPlayers.length} INTI {subPlayers.length > 0 ? `+ ${subPlayers.length} CAD` : ""}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-display font-bold text-sm text-slate-900 dark:text-[#F8FAFC] uppercase tracking-tight truncate">
                            {team.teamName}
                          </h3>
                          {team.captainName && (
                            <p className="text-xs font-mono text-slate-600 dark:text-[#A78BFA] truncate mt-0.5">
                              👑 Kapten: {team.captainName}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-[#2E1E45] flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-[#A78BFA]">
                          <span>Lihat Susunan Roster</span>
                          <span className="text-[#7C3AED] font-bold">➔</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* KOLOM KANAN (lg:col-span-4 lg:sticky lg:top-24 h-fit): STICKY REGISTRATION & ACTIONS CARD */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit space-y-6">
          <div className="p-6 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-2xl space-y-5">
            {/* SISA KUOTA SLOT PROGRESS BAR */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="font-bold text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                  <Users size={14} className="text-[#7C3AED]" />
                  <span>Kuota Peserta</span>
                </span>
                <span className="font-extrabold text-[#7C3AED] dark:text-[#A78BFA]">
                  {registeredSlotsCount} / {tournament.maxSlots} Tim
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-[#1A0E2E] overflow-hidden border border-slate-200 dark:border-[#2E1E45]">
                <div
                  className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round((registeredSlotsCount / tournament.maxSlots) * 100))}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-[#A78BFA]/80 mt-1.5">
                <span>{Math.max(0, tournament.maxSlots - registeredSlotsCount)} slot tersisa</span>
                <span>{Math.min(100, Math.round((registeredSlotsCount / tournament.maxSlots) * 100))}% terisi</span>
              </div>
            </div>

            {/* RINGKASAN BIAYA & PRIZE POOL */}
            <div className="space-y-2.5 p-3.5 rounded-none bg-slate-50 dark:bg-[#0A0512] border border-slate-200 dark:border-[#2A1B42]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-[#A78BFA]">
                  BIAYA DAFTAR
                </span>
                <span className="font-mono font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                  {tournament.isFreeEntry || !tournament.entryFee
                    ? "GRATIS"
                    : `Rp ${tournament.entryFee.toLocaleString("id-ID")}`}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200/60 dark:border-[#2A1B42]/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 shrink-0">
                  PRIZE POOL
                </span>
                <span className="font-mono font-black text-xs sm:text-sm text-amber-400 break-words text-left sm:text-right">
                  {tournament.prizePool || "Resmi Guild"}
                </span>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="space-y-2.5">
              {isRegistrationOpen ? (
                <button
                  type="button"
                  onClick={handleOpenRegister}
                  className="w-full py-3 px-4 rounded-none font-mono font-bold text-xs uppercase tracking-wider bg-[#7C3AED] hover:bg-[#6D28D9] text-white border border-[#7C3AED] inline-flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/25 transition cursor-pointer"
                >
                  <Plus size={16} />
                  <span>DAFTAR TIM SEKARANG</span>
                </button>
              ) : (
                <div className="w-full py-3 px-4 text-center rounded-none font-mono font-bold text-xs uppercase tracking-wider bg-slate-100 dark:bg-[#1A0E2E] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2E1E45]">
                  {tournament.status === "COMPLETED" ? "Turnamen Telah Selesai" : "Pendaftaran Telah Ditutup"}
                </div>
              )}

              <ShareButton
                url={shareUrl}
                title={shareTitle}
                text={shareText}
                label="Bagikan Link Turnamen"
                variant="secondary"
                className="w-full justify-center text-xs py-2.5"
              />

              {gfWinner && (
                <button
                  type="button"
                  onClick={() => setShowCertificate(true)}
                  className="w-full py-2.5 px-4 rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-amber-500 text-black hover:bg-amber-400 transition inline-flex items-center justify-center gap-2"
                >
                  <Trophy size={14} />
                  <span>Unduh Kartu Juara</span>
                </button>
              )}
            </div>

            {/* TRUST BADGE GUILD */}
            <div className="pt-3 border-t border-slate-200 dark:border-[#2A1B42] flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-[#A78BFA]">
              <Shield size={14} className="text-[#10B981] shrink-0" />
              <span>Garansi Fairplay &amp; Pengawalan Hadiah oleh High Council</span>
            </div>
          </div>

          {/* PANEL OPERASIONAL STAF (ADMIN & MODERATOR) */}
          {(session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR") && (
            <div className="p-4 sm:p-5 rounded-none border border-[#7C3AED]/40 bg-slate-100 dark:bg-[#11091D] shadow-xl space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-[#7C3AED]/20 pb-2.5">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#7C3AED] dark:text-[#A78BFA] flex items-center gap-1.5">
                  <Shield size={14} className="text-[#7C3AED]" />
                  <span>Panel Operasional Staf</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/30">
                  {session?.user?.role}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditTournamentModal(true)}
                  className="w-full h-9 px-3 text-xs whitespace-nowrap rounded font-mono font-bold inline-flex items-center justify-center gap-1.5 border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#1A0E2E] hover:border-[#7C3AED] text-slate-800 dark:text-[#F8FAFC] transition cursor-pointer shadow-sm"
                  title="Edit Judul, Tanggal, Hadiah, dan Info Turnamen"
                >
                  <Edit3 size={14} className="text-slate-500 dark:text-[#A78BFA]" />
                  <span>Edit Info Turnamen</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDetailTab("bracket");
                    setTimeout(() => {
                      document.getElementById("bracket-section")?.scrollIntoView({ behavior: "smooth" });
                    }, 50);
                  }}
                  className="w-full h-9 px-3 text-xs whitespace-nowrap rounded font-mono font-bold inline-flex items-center justify-center gap-1.5 border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition cursor-pointer shadow-sm"
                  title="Langsung kelola tim & skor di bagan pertandingan"
                >
                  <Settings size={14} className="text-indigo-500" />
                  <span>Kelola Tim &amp; Skor</span>
                </button>

                {tournament.status !== "COMPLETED" && (
                  <button
                    type="button"
                    onClick={handleDetailGachaBracket}
                    className="w-full h-9 px-3 text-xs whitespace-nowrap rounded font-mono font-bold inline-flex items-center justify-center gap-1.5 border border-[#F59E0B]/50 bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#F59E0B] transition cursor-pointer shadow-sm"
                    title="Gacha / Acak Susunan Lawan Bagan (Fisher-Yates)"
                  >
                    <Dices size={14} className="text-[#F59E0B]" />
                    <span>Gacha / Acak Bagan</span>
                  </button>
                )}

                <TournamentBackupDropdown
                  tournament={tournament}
                  triggerClassName="w-full h-9 px-3 text-xs whitespace-nowrap rounded font-mono font-bold inline-flex items-center justify-center gap-1.5 border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition cursor-pointer shadow-sm"
                />

                <button
                  type="button"
                  disabled={deletingTournament}
                  onClick={handleDeleteTournament}
                  className="w-full h-9 px-3 text-xs whitespace-nowrap rounded font-mono font-bold inline-flex items-center justify-center gap-1.5 border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition cursor-pointer disabled:opacity-50 shadow-sm"
                  title="Hapus turnamen ini secara permanen"
                >
                  <Trash2 size={14} className="text-rose-500" />
                  <span>{deletingTournament ? "Menghapus..." : "Hapus Turnamen"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: VIEW ROSTER */}
      {viewingRoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-[calc(100vw-1.5rem)] max-w-md max-h-[85vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] p-4 sm:p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2A1B42] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#A78BFA] font-bold block">
                  INFORMASI TIM &amp; ROSTER
                </span>
                <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-[#F8FAFC]">
                  {viewingRoster.teamName}
                </h3>
              </div>
              <button
                onClick={() => setViewingRoster(null)}
                className="p-1 rounded-none text-[#A78BFA] hover:text-[#F8FAFC]"
              >
                <X size={18} />
              </button>
            </div>

            {viewingRoster.captainName && (
              <div className="p-3 rounded-none bg-[#1A0E2E] border border-[#2E1E45] text-xs font-mono">
                <span className="font-bold text-[#A78BFA]">👑 Kapten Tim:</span>{" "}
                <span className="text-[#F8FAFC] font-medium">{viewingRoster.captainName}</span>
              </div>
            )}

            {(() => {
              const mainList: TournamentRosterPlayer[] =
                viewingRoster.mainPlayers && viewingRoster.mainPlayers.length > 0
                  ? viewingRoster.mainPlayers
                  : viewingRoster.roster && viewingRoster.roster.length > 0
                  ? viewingRoster.roster.filter((p) => p.role !== "SUB")
                  : (viewingRoster.players || []).map((name) => ({ name, inGameId: "-", role: "MAIN" }));

              const subList: TournamentRosterPlayer[] =
                viewingRoster.subPlayers && viewingRoster.subPlayers.length > 0
                  ? viewingRoster.subPlayers
                  : viewingRoster.roster && viewingRoster.roster.length > 0
                  ? viewingRoster.roster.filter((p) => p.role === "SUB")
                  : [];

              return (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {/* Pemain Inti */}
                  <div>
                    <h4 className="text-xs font-mono font-bold text-[#A78BFA] uppercase tracking-wider mb-2">
                      ⚔️ Pemain Inti ({mainCount} Wajib)
                    </h4>
                    <div className="space-y-2">
                      {mainList.map((p, i) => (
                        <RosterPlayerRow
                          key={i}
                          index={i + 1}
                          name={p.name || p.inGameId}
                          inGameId={p.inGameId || p.name}
                          isCaptain={i === 0}
                          isSub={false}
                        />
                      ))}
                      {mainList.length === 0 && (
                        <p className="text-xs text-[#A78BFA] italic font-mono">Belum ada pemain inti terdaftar.</p>
                      )}
                    </div>
                  </div>

                  {/* Pemain Cadangan */}
                  <div>
                    <h4 className="text-xs font-mono font-bold text-[#A78BFA] uppercase tracking-wider mb-2">
                      🛡️ Pemain Cadangan (Maks {subCount})
                    </h4>
                    <div className="space-y-2">
                      {subList.map((p, i) => (
                        <RosterPlayerRow
                          key={i}
                          index={i + 1}
                          name={p.name || p.inGameId}
                          inGameId={p.inGameId || p.name}
                          isCaptain={false}
                          isSub={true}
                        />
                      ))}
                      {subList.length === 0 && (
                        <p className="text-xs text-[#A78BFA] italic font-mono">Tidak ada pemain cadangan.</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <button
              onClick={() => setViewingRoster(null)}
              className="w-full py-2.5 rounded-none font-mono text-xs font-bold uppercase tracking-wider bg-[#1A0E2E] text-[#A78BFA] border border-[#2E1E45] hover:border-[#7C3AED] hover:text-[#F8FAFC]"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* MODAL: FORM PENDAFTARAN TIM */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-[calc(100vw-1.5rem)] max-w-lg rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] p-4 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2A1B42] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#9D4EDD] font-bold block">
                  Formulir Pendaftaran
                </span>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                  Daftarkan Tim ke {tournament.title}
                </h3>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-1 rounded text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitRegistration} className="space-y-4 text-xs">
              {/* Shortcut Autofill from Party */}
              <button
                type="button"
                onClick={handleAutofillFromParty}
                className="w-full py-2.5 px-3 rounded-lg border border-purple-500/40 bg-purple-950/30 hover:bg-purple-900/40 text-purple-200 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Zap size={15} className="text-amber-400" />
                <span>⚡ Isi Otomatis dari Anggota Party Saya</span>
              </button>

              <div>
                <label className="font-bold text-gray-800 dark:text-gray-200 block mb-1">
                  Nama Tim / Clan *
                </label>
                <input
                  required
                  type="text"
                  value={registerTeamName}
                  onChange={(e) => setRegisterTeamName(e.target.value)}
                  placeholder="Contoh: LogHorizon Esports"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16121E] text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-800 dark:text-gray-200 block mb-1">
                    IGN Kapten Tim
                  </label>
                  <input
                    type="text"
                    value={registerCaptainIgn}
                    onChange={(e) => setRegisterCaptainIgn(e.target.value)}
                    placeholder="Contoh: Shiroe"
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16121E] text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-800 dark:text-gray-200 block mb-1">
                    No. WA / Kontak Kapten
                  </label>
                  <input
                    type="text"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16121E] text-xs"
                  />
                </div>
              </div>

              {/* Roster Inti */}
              <div className="pt-2 border-t border-gray-100 dark:border-[#2E1E45]">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-xs text-gray-800 dark:text-gray-200 flex items-center gap-1.5 uppercase tracking-wider">
                    <Users size={14} className="text-[#9D4EDD]" />
                    <span>⚔️ Pemain Inti (Wajib Diisi {mainCount} Pemain):</span>
                  </label>
                  <span className="text-[10px] font-mono text-purple-400">Slot Wajib</span>
                </div>
                <div className="space-y-2.5">
                  {registerMainPlayers.map((player, idx) => (
                    <div
                      key={`main-${idx}`}
                      className="p-3 rounded-lg bg-gray-50 dark:bg-[#130921] border border-gray-200 dark:border-white/5 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-purple-500/20 text-[#9D4EDD] inline-flex items-center justify-center text-[10px] font-mono font-bold">
                            {idx + 1}
                          </span>
                          <span>{idx === 0 ? "Pemain #1 (Kapten Tim) *" : `Pemain Inti #${idx + 1} *`}</span>
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">Wajib Diisi</span>
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

              {/* Roster Cadangan */}
              {subCount > 0 && (
                <div className="pt-2 border-t border-gray-100 dark:border-[#2E1E45]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-xs text-amber-500 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <Shield size={14} className="text-amber-400" />
                      <span>Pemain Cadangan (Opsional, Maks {subCount} Pemain):</span>
                    </label>
                    <span className="text-[10px] font-mono text-amber-400">Substitute</span>
                  </div>
                  <div className="space-y-2.5">
                    {registerSubPlayers.map((player, idx) => (
                      <div
                        key={`sub-${idx}`}
                        className="p-3 rounded-lg bg-gray-50 dark:bg-[#130921] border border-gray-200 dark:border-white/5 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 inline-flex items-center justify-center text-[10px] font-mono font-bold">
                              C{idx + 1}
                            </span>
                            <span>Cadangan #{idx + 1} (Opsional)</span>
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">Cadangan</span>
                        </div>

                        <div className="grid grid-cols-12 gap-2">
                          {/* Kotak Kiri (col-span-7): Nickname In-Game */}
                          <div className="col-span-7">
                            <input
                              type="text"
                              value={player.nickname}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRegisterSubPlayers((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, nickname: val } : p))
                                );
                              }}
                              placeholder={`Nickname Cadangan #${idx + 1}`}
                              className="w-full px-3 py-2 rounded-md bg-white/[0.03] border border-[#2E1E45] text-xs text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          {/* Kotak Kanan (col-span-5): ID / Tag Game */}
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={player.gameId}
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

              {/* BAGIAN PEMBAYARAN QRIS (KHUSUS TURNAMEN BERBAYAR) */}
              {!tournament.isFreeEntry && (tournament.entryFee ?? 0) > 0 && (
                <div className="space-y-4 p-4 rounded-none border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/15">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <QrCode size={15} />
                      <span>Pembayaran Biaya Pendaftaran (QRIS)</span>
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400 text-black">
                      Rp {tournament.entryFee?.toLocaleString("id-ID")}
                    </span>
                  </div>

                  {/* QRIS Official Box */}
                  <div className="p-4 rounded-none bg-white dark:bg-[#130921] border border-amber-500/20 text-center flex flex-col items-center">
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                      Scan QRIS Resmi Kas Guild LogHorizon
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3 max-w-sm">
                      Transfer tepat sejumlah <strong>Rp {tournament.entryFee?.toLocaleString("id-ID")}</strong> melalui e-wallet atau m-banking.
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
                      <label className="font-bold text-gray-800 dark:text-gray-200 block mb-1">
                        1. Nama Pengirim / Pemilik Rekening *
                      </label>
                      <input
                        required
                        type="text"
                        value={registerSenderName}
                        onChange={(e) => setRegisterSenderName(e.target.value)}
                        placeholder="Contoh: Budi Santoso / Akun Dana"
                        className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16121E] text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-amber-400"
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

              <div className="pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="button button-quiet"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={registering || compressingProof}
                  className="button button-primary font-bold"
                >
                  {registering
                    ? "Mendaftarkan..."
                    : tournament.isFreeEntry || !tournament.entryFee
                      ? "Konfirmasi & Daftar Tim"
                      : "Kirim Pendaftaran & Bukti Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        isOpen={detailGachaModalState.isOpen}
        tournamentTitle={detailGachaModalState.tournamentTitle}
        isRolling={detailGachaModalState.isRolling}
        teamsList={detailGachaModalState.teamsList}
        onFinish={() => setDetailGachaModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* DEDICATED EDIT TOURNAMENT INFO MODAL */}
      <EditTournamentModal
        isOpen={showEditTournamentModal}
        tournament={tournament}
        onClose={() => setShowEditTournamentModal(false)}
        onSuccess={(updated) => {
          setTournament((prev) => (prev ? { ...prev, ...updated } : updated));
          setShowEditTournamentModal(false);
          setNotice("Informasi turnamen berhasil diperbarui!");
        }}
      />

      {/* MANDATORY TOURNAMENT RULES AGREEMENT MODAL */}
      {tournament && (
        <TournamentRulesModal
          isOpen={showRulesModal}
          tournamentTitle={tournament.title}
          game={tournament.game}
          rules={tournament.rules}
          onClose={() => setShowRulesModal(false)}
          onAgree={handleProceedToRegistration}
        />
      )}
      {/* QUICK MATCH SCORE & FINISH MODAL */}
      <QuickMatchScoreModal
        isOpen={Boolean(quickScoreModalMatch)}
        match={quickScoreModalMatch}
        onClose={() => setQuickScoreModalMatch(null)}
        onSave={handleSaveQuickScore}
        onReset={(matchId) => handleAdminQuickUpdate(matchId, "RESET_MATCH")}
        onToggleStatus={(matchId, st) =>
          handleAdminQuickUpdate(matchId, st === "LIVE" ? "SET_LIVE" : "CANCEL_LIVE")
        }
        onUpdateSchedule={handleUpdateMatchSchedule}
      />
      {/* CHAMPION DIGITAL CERTIFICATE MODAL */}
      {showCertificate && gfWinner && (
        <ChampionCertificateModal
          isOpen={showCertificate}
          onClose={() => setShowCertificate(false)}
          tournamentTitle={tournament.title}
          game={tournament.game}
          season={tournament.format || "Season 1"}
          eventDate={tournament.eventDate}
          prizePool={tournament.prizePool || undefined}
          teamName={gfWinner}
          roster={
            (winningTeam?.roster as unknown as any[]) ||
            (winningTeam?.mainPlayers as unknown as any[]) ||
            (winningTeam?.players?.map((p: string) => ({ name: p, inGameId: "VERIFIED" })) ?? [])
          }
        />
      )}
      {/* MATCH LOBBY & CUSTOM ROOM COORDINATION MODAL */}
      {tournament && (
        <MatchLobbyModal
          isOpen={Boolean(activeLobbyMatch)}
          tournamentId={tournament.id}
          match={activeLobbyMatch}
          onClose={() => setActiveLobbyMatch(null)}
        />
      )}
    </main>
  );
}
