"use client";

import { useEffect, useState, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Crown,
  Dices,
  Edit3,
  ExternalLink,
  Flame,
  Gamepad2,
  Medal,
  Plus,
  QrCode,
  RefreshCw,
  Shield,
  Swords,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { readApiResponse } from "@/lib/api-response";
import { TournamentMatch, TournamentTeam, TournamentRosterPlayer } from "@/lib/tournament";
import { DragScrollContainer } from "@/components/drag-scroll-container";
import { ShareButton } from "@/components/share-button";
import { DualWingBracketView } from "@/components/events-board";
import { GachaBracketModal } from "@/components/gacha-bracket-modal";
import { TournamentRulesModal } from "@/components/tournament-rules-modal";
import { RosterPlayerRow } from "@/components/roster-player-row";

type TournamentData = {
  id: string;
  title: string;
  game: string;
  prizePool?: string | null;
  format?: string | null;
  maxSlots: number;
  mainPlayersCount?: number;
  subPlayersCount?: number;
  entryFee?: number;
  isFreeEntry?: boolean;
  rules?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  teams?: TournamentTeam[];
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

  // Registration modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerTeamName, setRegisterTeamName] = useState("");
  const [registerCaptainIgn, setRegisterCaptainIgn] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerSenderName, setRegisterSenderName] = useState("");
  const [registerPaymentProof, setRegisterPaymentProof] = useState<string>("");
  const [compressingProof, setCompressingProof] = useState(false);
  const [selectedProofModal, setSelectedProofModal] = useState<string | null>(null);
  const [registerMainPlayers, setRegisterMainPlayers] = useState<string[]>([]);
  const [registerSubPlayers, setRegisterSubPlayers] = useState<string[]>([]);
  const [registering, setRegistering] = useState(false);

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
    setRegisterCaptainIgn("");
    setRegisterPhone("");
    setRegisterSenderName("");
    setRegisterPaymentProof("");
    setRegisterMainPlayers(Array(mainCount).fill(""));
    setRegisterSubPlayers(Array(subCount).fill(""));
    setShowRegisterModal(true);
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

    setRegistering(true);
    setError("");

    // Prepare roster array
    const roster: TournamentRosterPlayer[] = [];
    registerMainPlayers.forEach((ign) => {
      if (ign.trim()) {
        roster.push({
          name: ign.trim(),
          inGameId: ign.trim(),
          role: "MAIN",
        });
      }
    });

    registerSubPlayers.forEach((ign) => {
      if (ign.trim()) {
        roster.push({
          name: ign.trim(),
          inGameId: ign.trim(),
          role: "SUB",
        });
      }
    });

    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: registerTeamName.trim(),
          phone: registerPhone.trim(),
          captainIgn: registerCaptainIgn.trim(),
          senderName: isPaid ? registerSenderName.trim() : undefined,
          paymentProof: isPaid ? registerPaymentProof : undefined,
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
        <div className="p-6 rounded-xl border border-red-500/30 bg-red-950/20 text-red-300 mb-6">
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

  // Registered teams (exclude pure empty slots)
  const realTeams = teams.filter(
    (t) =>
      Boolean(t.captainName && t.captainName !== "TBD") ||
      (t.teamName &&
        !t.teamName.startsWith("Slot ") &&
        !t.teamName.startsWith("Tim ") &&
        t.teamName !== "TBD" &&
        t.teamName !== "BYE")
  );

  // Group matches by round
  const roundsMap = new Map<number, TournamentMatch[]>();
  for (const m of matches) {
    const list = roundsMap.get(m.round) || [];
    list.push(m);
    roundsMap.set(m.round, list);
  }
  const sortedRoundNumbers = Array.from(roundsMap.keys()).sort((a, b) => a - b);

  const isRegistrationOpen = tournament.status === "OPEN" || tournament.status === "REGISTRATION";
  const shareUrl = `/events/turnamen/${tournament.id}`;
  const shareTitle = `🏆 ${tournament.title} - Turnamen LogHorizon`;
  const shareText = `Ikuti turnamen ${tournament.game}! Hadiah: ${tournament.prizePool || "Prizepool Resmi"}. Cek bagan pertandingan dan daftar timmu sekarang di LogHorizon:`;

  return (
    <main className="py-6 sm:py-10 px-4 sm:px-6 lg:px-10 max-w-[1400px] mx-auto w-full">
      {/* Back button & top bar */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <Link
          href="/events?view=turnamen"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#9D4EDD] hover:underline"
        >
          <ArrowLeft size={16} />
          <span>Kembali ke Semua Turnamen</span>
        </Link>

        <div className="flex items-center gap-2">
          <ShareButton
            url={shareUrl}
            title={shareTitle}
            text={shareText}
            label="Bagikan Turnamen 🔗"
            variant="secondary"
          />
          <ShareButton
            url={`${shareUrl}#daftar`}
            title={`Daftar Turnamen ${tournament.title}`}
            text={`Link Pendaftaran Turnamen ${tournament.title}:`}
            label="Salin Link Pendaftaran"
            variant="outline"
          />
        </div>
      </div>

      {notice && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 text-sm flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice("")}><X size={16} /></button>
        </div>
      )}

      {/* Tournament Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-[#211C2B] bg-gradient-to-br from-white via-white to-purple-50/30 dark:from-[#120F17] dark:via-[#130F1A] dark:to-[#1B112B] p-6 sm:p-8 shadow-xl mb-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#9D4EDD]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded text-[11px] font-black uppercase tracking-wider bg-[#9D4EDD] text-white">
                {tournament.game}
              </span>
              <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {tournament.format || `${tournament.maxSlots} Tim`}
              </span>
              <span
                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider ${
                  tournament.status === "COMPLETED"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : tournament.status === "ONGOING"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                }`}
              >
                ● {tournament.status}
              </span>
              {tournament.isFreeEntry || !tournament.entryFee ? (
                <span className="px-2.5 py-1 rounded text-[11px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  FREE ENTRY
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded text-[11px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/40">
                  BIAYA REGIST: Rp {tournament.entryFee.toLocaleString("id-ID")}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white leading-tight">
              {tournament.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold text-[#9D4EDD] dark:text-[#C77DFF] flex items-center gap-1.5">
                <Trophy size={16} /> Hadiah: {tournament.prizePool || "Prizepool Resmi Guild"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Users size={16} /> Slot Terdaftar: <strong>{realTeams.length} / {tournament.maxSlots} Tim</strong>
              </span>
              <span>•</span>
              <span className="text-gray-400">
                Format Roster: {mainCount} Pemain Inti + Maks {subCount} Cadangan
              </span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto">
            {isRegistrationOpen && (
              <button
                id="daftar"
                type="button"
                onClick={handleOpenRegister}
                className="button button-primary font-bold text-sm px-6 py-3 shadow-lg shadow-[#9D4EDD]/20 inline-flex items-center justify-center gap-2"
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
                label="Bagikan Turnamen 🔗"
                variant="secondary"
                className="w-full sm:w-auto justify-center"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bracket Tree Section */}
      <section className="p-5 sm:p-7 rounded-2xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] shadow-xl mb-10">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Flame size={20} className="text-[#9D4EDD]" />
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Pohon Bagan Pertandingan (Bracket Tree Simetris)
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR") && tournament.status !== "COMPLETED" && (
              <button
                type="button"
                onClick={handleDetailGachaBracket}
                className="button button-quiet text-xs font-bold inline-flex items-center gap-1.5 border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 shadow-xs hover:scale-105 transition-all"
                title="Gacha / Acak Susunan Lawan Bagan (Fisher-Yates)"
              >
                <Dices size={14} className="text-amber-400" />
                <span>🎲 Gacha Bagan (Acak Lawan)</span>
              </button>
            )}
            <span className="text-xs text-gray-400">
              💡 Geser ke samping (Drag) atau gunakan tombol navigasi
            </span>
          </div>
        </div>

        {matches.length > 0 ? (
          <DragScrollContainer
            buttonPosition="top"
            label="🖱️ Drag mouse / tombol ◀ ▶: Sayap Kiri ➔ GRAND FINAL 🏆 ⬅ Sayap Kanan"
            className="pt-2 pb-4"
          >
            <DualWingBracketView
              sortedRoundNumbers={sortedRoundNumbers}
              roundsMap={roundsMap}
              teams={teams}
              onTeamClick={(team) => setViewingRoster(team)}
            />
          </DragScrollContainer>
        ) : (
          <p className="text-xs text-gray-500 text-center py-10">
            Bagan pertandingan belum dibuat atau sedang dipersiapkan oleh panitia.
          </p>
        )}
      </section>

      {/* Teams & Roster Section */}
      <section className="p-5 sm:p-7 rounded-2xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] shadow-xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield size={18} className="text-[#9D4EDD]" />
              <span>Daftar Tim Terdaftar ({realTeams.length} Tim)</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Klik kartu tim untuk memeriksa komposisi roster pemain inti dan cadangan.
            </p>
          </div>

          {isRegistrationOpen && (
            <button
              type="button"
              onClick={handleOpenRegister}
              className="button button-primary text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Tambah Tim</span>
            </button>
          )}
        </div>

        {realTeams.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500 border border-dashed border-gray-200 dark:border-[#211C2B] rounded-xl">
            Belum ada tim yang mendaftar. Jadilah tim pertama yang mendaftar dan rebut gelarnya!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {realTeams.map((team, idx) => {
              const roster = (team.roster as TournamentRosterPlayer[]) || [];
              const mainPlayers = roster.filter((r) => r.role !== "SUB");
              const subPlayers = roster.filter((r) => r.role === "SUB");

              return (
                <div
                  key={team.id || idx}
                  onClick={() => setViewingRoster(team)}
                  className="p-4 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-[#16121E] hover:border-[#9D4EDD]/50 transition cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="w-6 h-6 rounded-md bg-[#9D4EDD]/15 text-[#9D4EDD] text-xs font-mono font-bold flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="text-[10px] font-mono uppercase text-gray-400">
                      {mainPlayers.length} Inti {subPlayers.length > 0 ? `+ ${subPlayers.length} Cad` : ""}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                      {team.teamName}
                    </h3>
                    {team.captainName && (
                      <p className="text-xs text-[#9D4EDD] truncate mt-0.5">
                        👑 Kapten: {team.captainName}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-200 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                    <span>Lihat Susunan Roster</span>
                    <span className="text-[#9D4EDD] font-bold">➔</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL: VIEW ROSTER */}
      {viewingRoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#211C2B] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#9D4EDD] font-bold block">
                  Informasi Tim & Roster
                </span>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                  {viewingRoster.teamName}
                </h3>
              </div>
              <button
                onClick={() => setViewingRoster(null)}
                className="p-1 rounded text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {viewingRoster.captainName && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
                <span className="font-bold text-purple-400">👑 Kapten Tim:</span>{" "}
                <span className="text-white font-medium">{viewingRoster.captainName}</span>
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
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
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
                        <p className="text-xs text-gray-500 italic">Belum ada pemain inti terdaftar.</p>
                      )}
                    </div>
                  </div>

                  {/* Pemain Cadangan */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
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
                        <p className="text-xs text-gray-500 italic">Tidak ada pemain cadangan.</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <button
              onClick={() => setViewingRoster(null)}
              className="button button-quiet w-full text-xs font-bold"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* MODAL: FORM PENDAFTARAN TIM */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#211C2B] pb-3">
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
              <div className="pt-2 border-t border-gray-100 dark:border-[#211C2B]">
                <label className="font-bold text-gray-800 dark:text-gray-200 block mb-2">
                  ⚔️ Pemain Inti (Wajib Diisi {mainCount} Pemain):
                </label>
                <div className="space-y-2">
                  {registerMainPlayers.map((val, idx) => (
                    <div key={`main-${idx}`} className="flex items-center gap-2">
                      <span className="w-6 text-gray-400 font-mono text-[11px] shrink-0">
                        #{idx + 1}
                      </span>
                      <input
                        required={idx < mainCount}
                        type="text"
                        value={val}
                        onChange={(e) => {
                          const updated = [...registerMainPlayers];
                          updated[idx] = e.target.value;
                          setRegisterMainPlayers(updated);
                        }}
                        placeholder={`IGN Pemain Inti ${idx + 1}`}
                        className="flex-1 h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16121E] text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Roster Cadangan */}
              {subCount > 0 && (
                <div className="pt-2 border-t border-gray-100 dark:border-[#211C2B]">
                  <label className="font-bold text-gray-800 dark:text-gray-200 block mb-2">
                    🛡️ Pemain Cadangan (Opsional, Maks {subCount} Pemain):
                  </label>
                  <div className="space-y-2">
                    {registerSubPlayers.map((val, idx) => (
                      <div key={`sub-${idx}`} className="flex items-center gap-2">
                        <span className="w-6 text-gray-400 font-mono text-[11px] shrink-0">
                          Sub {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => {
                            const updated = [...registerSubPlayers];
                            updated[idx] = e.target.value;
                            setRegisterSubPlayers(updated);
                          }}
                          placeholder={`IGN Cadangan ${idx + 1} (opsional)`}
                          className="flex-1 h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16121E] text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BAGIAN PEMBAYARAN QRIS (KHUSUS TURNAMEN BERBAYAR) */}
              {!tournament.isFreeEntry && (tournament.entryFee ?? 0) > 0 && (
                <div className="space-y-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/15">
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
                  <div className="p-4 rounded-xl bg-white dark:bg-[#120F17] border border-amber-500/20 text-center flex flex-col items-center">
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
                      <label className="font-bold text-gray-800 dark:text-gray-200 block mb-1">
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
        isOpen={detailGachaModalState.isOpen}
        tournamentTitle={detailGachaModalState.tournamentTitle}
        isRolling={detailGachaModalState.isRolling}
        teamsList={detailGachaModalState.teamsList}
        onFinish={() => setDetailGachaModalState((prev) => ({ ...prev, isOpen: false }))}
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
    </main>
  );
}
