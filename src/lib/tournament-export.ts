import { TournamentMatch, TournamentTeam } from "./tournament";

export type ExportableTournament = {
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
  status: string;
  eventDate?: string | Date;
  teams?: TournamentTeam[];
  participants?: any[];
  matches?: TournamentMatch[];
  rules?: string | null;
  [key: string]: any;
};

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates and downloads a complete Tournament CSV report with UTF-8 BOM
 * Section 1: Tournament Info & Champions
 * Section 2: Teams & Complete Rosters
 * Section 3: Bracket Matches Recap
 */
export function exportTournamentToCsv(t: ExportableTournament): void {
  const lines: string[] = [];

  // Helper to add lines
  const pushRow = (...fields: unknown[]) => {
    lines.push(fields.map(escapeCsvField).join(","));
  };

  // Determine winners if any
  const matches: TournamentMatch[] = t.matches || [];
  const gfMatch = matches.find((m) =>
    (m.roundName && m.roundName.toLowerCase().includes("grand final")) ||
    (m.matchId && m.matchId.toLowerCase().includes("gf"))
  );
  const bronzeMatch = matches.find((m) =>
    (m.roundName && (m.roundName.toLowerCase().includes("bronze") || m.roundName.toLowerCase().includes("juara 3"))) ||
    (m.matchId && m.matchId.toLowerCase().includes("bronze"))
  );

  const champion = gfMatch?.winner || "-";
  const runnerUp = gfMatch?.winner
    ? gfMatch.winner === gfMatch.teamA.name
      ? gfMatch.teamB.name
      : gfMatch.teamA.name
    : "-";
  const thirdPlace = bronzeMatch?.winner || "-";

  // === BAGIAN 1: INFO TURNAMEN ===
  pushRow("=== BAGIAN 1: INFORMASI TURNAMEN ===");
  pushRow("Parameter", "Keterangan");
  pushRow("ID Turnamen", t.id);
  pushRow("Judul Turnamen", t.title);
  pushRow("Divisi Game", t.game);
  pushRow("Format Turnamen", t.format || `${t.maxSlots} Tim`);
  pushRow("Total Kuota Slot", `${t.maxSlots} Tim`);
  pushRow("Biaya Registrasi", t.isFreeEntry || !t.entryFee ? "FREE ENTRY (GRATIS)" : `Rp ${Number(t.entryFee).toLocaleString("id-ID")}`);
  pushRow("Total Hadiah (Prize Pool)", t.prizePool || "Prizepool Resmi Guild");
  pushRow("Status Turnamen", t.status);
  pushRow("Jadwal Pelaksanaan", t.eventDate ? new Date(t.eventDate).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB" : "-");
  pushRow("Aturan Pemain", `${t.mainPlayersCount ?? 5} Pemain Inti + ${t.subPlayersCount ?? 2} Cadangan`);
  pushRow("Juara 1 (Champion 🏆)", champion);
  pushRow("Juara 2 (Runner-Up 🥈)", runnerUp);
  pushRow("Juara 3 (Third Place 🥉)", thirdPlace);
  lines.push(""); // empty row

  // === BAGIAN 2: DAFTAR TIM & ROSTER LENGKAP ===
  pushRow("=== BAGIAN 2: DAFTAR SELURUH TIM & ROSTER LENGKAP ===");
  pushRow(
    "No",
    "Nama Tim",
    "Status Pendaftaran",
    "Nama Pengirim (Transfer)",
    "Kontak WA Perwakilan",
    "Pemain 1 (Kapten) [IGN - ID]",
    "Pemain 2 [IGN - ID]",
    "Pemain 3 [IGN - ID]",
    "Pemain 4 [IGN - ID]",
    "Pemain 5 [IGN - ID]",
    "Cadangan 1 [IGN - ID]",
    "Cadangan 2 [IGN - ID]",
    "Waktu Daftar"
  );

  const participantsList = Array.isArray(t.participants) && t.participants.length > 0 ? t.participants : [];
  const teamsList: TournamentTeam[] = Array.isArray(t.teams) ? t.teams : [];

  const formatPlayer = (player?: any) => {
    if (!player) return "-";
    const ign = player.name || player.nickname || "-";
    const id = player.inGameId || player.gameId || "-";
    return `${ign} (${id})`;
  };

  if (participantsList.length > 0) {
    participantsList.forEach((p, idx) => {
      const roster = Array.isArray(p.roster) ? p.roster : [];
      const mains = roster.filter((r: any) => r.role === "MAIN" || !r.role);
      const subs = roster.filter((r: any) => r.role === "SUB");

      pushRow(
        idx + 1,
        p.teamName || `Tim #${idx + 1}`,
        p.paymentStatus || p.status || "APPROVED",
        p.senderName || "-",
        p.phone || "-",
        formatPlayer(mains[0]),
        formatPlayer(mains[1]),
        formatPlayer(mains[2]),
        formatPlayer(mains[3]),
        formatPlayer(mains[4]),
        formatPlayer(subs[0]),
        formatPlayer(subs[1]),
        p.createdAt ? new Date(p.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "-"
      );
    });
  } else if (teamsList.length > 0) {
    teamsList.forEach((tm, idx) => {
      const roster = Array.isArray(tm.roster)
        ? tm.roster
        : Array.isArray(tm.mainPlayers)
        ? [...tm.mainPlayers, ...(tm.subPlayers || [])]
        : [];
      const mains = roster.filter((r: any) => r.role === "MAIN" || !r.role);
      const subs = roster.filter((r: any) => r.role === "SUB");

      pushRow(
        idx + 1,
        tm.teamName || (tm as any).name || `Tim #${idx + 1}`,
        tm.paymentStatus || "APPROVED",
        tm.senderName || "-",
        tm.representativePhone || "-",
        formatPlayer(mains[0]),
        formatPlayer(mains[1]),
        formatPlayer(mains[2]),
        formatPlayer(mains[3]),
        formatPlayer(mains[4]),
        formatPlayer(subs[0]),
        formatPlayer(subs[1]),
        "-"
      );
    });
  } else {
    pushRow("Tidak ada data tim yang terdaftar saat ini.");
  }

  lines.push(""); // empty row

  // === BAGIAN 3: REKAP SELURUH PERTANDINGAN (BAGAN) ===
  pushRow("=== BAGIAN 3: REKAP SELURUH PERTANDINGAN (BAGAN) ===");
  pushRow(
    "Kode Match",
    "Babak / Round",
    "Tipe Pertandingan",
    "Tim A",
    "Skor A",
    "Skor B",
    "Tim B",
    "Pemenang",
    "Status Match",
    "Keterangan (WO / DQ / Normal)",
    "Jadwal Tanding (WIB)"
  );

  if (matches.length > 0) {
    matches.forEach((m) => {
      const isGrandFinal = (m.roundName && m.roundName.toLowerCase().includes("grand final")) ||
        (m.matchId && m.matchId.toLowerCase().includes("gf"));
      const isBronzeMatch = (m.roundName && (m.roundName.toLowerCase().includes("bronze") || m.roundName.toLowerCase().includes("juara 3"))) ||
        (m.matchId && m.matchId.toLowerCase().includes("bronze"));

      const matchType = isGrandFinal
        ? "🏆 GRAND FINAL"
        : isBronzeMatch
        ? "🥉 3rd Place Match"
        : m.roundName || `Round ${m.round}`;

      pushRow(
        m.matchId || (m as any).id || "#MATCH",
        m.roundName || `Ronde ${m.round}`,
        matchType,
        m.teamA?.name || "TBD",
        m.teamA?.score ?? (m as any).scoreA ?? 0,
        m.teamB?.score ?? (m as any).scoreB ?? 0,
        m.teamB?.name || "TBD",
        m.winner || "-",
        m.matchStatus || (m as any).status || "UPCOMING",
        m.lossReason || "NORMAL",
        m.scheduledAt ? new Date(m.scheduledAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB" : "-"
      );
    });
  } else {
    pushRow("Bagan pertandingan belum digenerate.");
  }

  // Prepend UTF-8 BOM so Microsoft Excel & Google Sheets open seamlessly with correct encoding
  const csvContent = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanTitle = (t.title || "turnamen").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

  const a = document.createElement("a");
  a.href = url;
  a.download = `laporan-turnamen-${cleanTitle}-${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a full raw JSON backup of the tournament
 */
export function exportTournamentToJson(t: ExportableTournament): void {
  const fullBackup = {
    exportedAt: new Date().toISOString(),
    system: "LogHorizon Guild Platform",
    tournament: t,
  };

  const jsonStr = JSON.stringify(fullBackup, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanTitle = (t.title || "turnamen").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

  const a = document.createElement("a");
  a.href = url;
  a.download = `tournament-${cleanTitle}-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
