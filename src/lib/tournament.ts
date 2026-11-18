export type BracketSlot = { participantId: string; teamName: string };
export type BracketMatch = {
  round: number;
  match: number;
  team1: BracketSlot | null;
  team2: BracketSlot | null;
  winner: BracketSlot | null;
};

export type TournamentRosterPlayer = {
  name: string;
  inGameId: string;
  role?: "MAIN" | "SUB";
};

export type TournamentTeam = {
  id: string;
  teamName: string;
  captainName: string;
  representativeDiscord?: string;
  representativeDiscordId?: string;
  representativePhone?: string;
  players?: string[];
  mainPlayers?: TournamentRosterPlayer[];
  subPlayers?: TournamentRosterPlayer[];
  roster?: TournamentRosterPlayer[];
  paymentStatus?: "APPROVED" | "PENDING_PAYMENT" | "REJECTED";
  senderName?: string;
  paymentProof?: string;
};

export type TournamentLossReason = "NORMAL" | "WO" | "DQ";

export type TournamentMatch = {
  matchId: string;
  round: number;
  roundName: string;
  teamA: { id?: string; name: string; score: number };
  teamB: { id?: string; name: string; score: number };
  winner: string | null;
  winnerId?: string | null;
  matchStatus?: "UPCOMING" | "LIVE" | "FINISHED";
  lossReason?: TournamentLossReason;
  schedule?: string;
  scheduledAt?: string | null;
  manualOverride?: boolean;
  customRoomId?: string | null;
  customRoomPassword?: string | null;
  nextMatchId?: string;
  nextSlot?: "teamA" | "teamB";
  teamAReady?: boolean;
  teamBReady?: boolean;
  teamAReadyAt?: string | null;
  teamBReadyAt?: string | null;
};

export const DEFAULT_TOURNAMENT_RULES = `### 1. MASALAH RADIO & CHAT ALL
- Jika ada lawan yang melakukan *Radio All* atau *Chat All*, harap segera ambil *screenshot* dan langsung lakukan *surrender* (menyerah), kemudian lapor ke Admin saat itu juga. **(Laporan tidak diterima apabila match sudah selesai dimainkan).**
- *Contoh Kasus:* Tim A vs Tim B. Tim A melakukan *Radio All / Chat All* dan Tim B tidak langsung melapor (melanjutkan game hingga kalah), maka laporan setelah match selesai tidak diterima dan kemenangan tetap sah milik Tim A.

### 2. TENTANG JADWAL PERTANDINGAN
- Dilarang memainkan pertandingan di luar jadwal yang ditentukan (misal jadwal pukul 20:00 WIB, kedua tim sepakat mundur ke pukul 20:20 WIB tanpa izin panitia, maka **kedua tim didiskualifikasi**). *(Pertandingan boleh dipercepat asalkan kedua tim sepakat dan melapor ke panitia).*
- Toleransi keterlambatan maksimal **12 menit** dari jadwal resmi.
- Untuk tim yang mengalami *late game* pada pertandingan sebelumnya, Admin memberikan toleransi waktu setelah game sebelumnya selesai.

### 3. DETAIL PERATURAN TOURNAMENT LOGHORIZON
- Jaringan / koneksi internet dan kondisi *device* sepenuhnya menjadi tanggung jawab masing-masing pemain.
- Dilarang keras menggunakan *cheat* dalam bentuk apa pun (*maphack*, *drone view*, script ilegal, dll.).
- Dilarang melakukan *Radio All* (*GG*, *Well played*, *Mainnya hebat*, dsb.) maupun *Chat All* kepada lawan.
- *Emote* dan *recall-recall* **diperbolehkan**.
- Pelanggaran terhadap aturan di atas (dengan bukti valid ke Admin) berakibat **diskualifikasi mutlak** tanpa pengecualian. Pastikan aturan ini dibagikan ke seluruh anggota tim.

### 4. SISTEM MATCH TOURNAMENT LOGHORIZON
- **Kualifikasi:** BO1 (*Best of 1*: kalah langsung gugur)
- **Semifinal:** BO3 (*Best of 3*: kalah langsung gugur)
- **Bronze Match (Perebutan Juara 3):** BO3
- **Grand Final:** BO3`;

export function createSingleEliminationBracket(participants: BracketSlot[]) {
  let size = 1;
  while (size < participants.length) size *= 2;

  const rounds: BracketMatch[][] = [];
  let slots: (BracketSlot | null)[] = [...participants];
  while (slots.length < size) slots.push(null);

  let round = 1;
  while (slots.length > 1) {
    const matches: BracketMatch[] = [];
    const winners: (BracketSlot | null)[] = [];
    for (let index = 0; index < slots.length; index += 2) {
      const team1 = slots[index];
      const team2 = slots[index + 1];
      const winner = team1 && !team2 ? team1 : null;
      matches.push({ round, match: index / 2 + 1, team1, team2, winner });
      winners.push(winner);
    }
    rounds.push(matches);
    slots = winners;
    round += 1;
  }
  return rounds;
}

export function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate dynamic single-elimination tournament bracket from 2 up to 128 teams.
 * Supports arbitrary team count with dynamic, balanced Auto-BYE seeding across Left & Right wings.
 */
export function generateTemplateBracket(
  teamCountOrFormat: number | string = 8,
  inputTeams: TournamentTeam[] = []
): { teams: TournamentTeam[]; matches: TournamentMatch[] } {
  let teamCount = typeof teamCountOrFormat === "number"
    ? teamCountOrFormat
    : parseInt(String(teamCountOrFormat).replace(/\D/g, ""), 10);

  if (isNaN(teamCount) || teamCount < 2) teamCount = 8;
  if (teamCount > 128) teamCount = 128;

  // Bracket size is the smallest power of 2 >= teamCount
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(teamCount)));
  const totalRounds = Math.log2(bracketSize);

  function getRoundName(teamsRemaining: number, matchIdx?: number): string {
    let base = `Round of ${teamsRemaining}`;
    if (teamsRemaining === 2) base = "Grand Final";
    else if (teamsRemaining === 4) base = "Semifinal";
    else if (teamsRemaining === 8) base = "Quarterfinal";
    return matchIdx !== undefined && teamsRemaining > 2 ? `${base} ${matchIdx + 1}` : base;
  }

  // Populate list of actual teams
  const teams: TournamentTeam[] = [];
  for (let i = 0; i < teamCount; i++) {
    if (inputTeams[i]) {
      teams.push(inputTeams[i]);
    } else {
      teams.push({
        id: `team-${i + 1}`,
        teamName: `Tim ${i + 1}`,
        captainName: `Kapten ${i + 1}`,
        players: [`Pemain 1`, `Pemain 2`, `Pemain 3`, `Pemain 4`, `Pemain 5`],
      });
    }
  }

  // Pre-generate round matches skeleton
  const matchesByRound: TournamentMatch[][] = [];

  for (let r = 1; r <= totalRounds; r++) {
    const teamsInRound = bracketSize / Math.pow(2, r - 1);
    const matchesInRound = teamsInRound / 2;
    const roundList: TournamentMatch[] = [];

    for (let m = 0; m < matchesInRound; m++) {
      const matchId = `r${r}-m${m + 1}`;
      const roundName = getRoundName(teamsInRound, m);
      const nextMatchId = r < totalRounds ? `r${r + 1}-m${Math.floor(m / 2) + 1}` : undefined;
      const nextSlot: "teamA" | "teamB" | undefined = r < totalRounds ? (m % 2 === 0 ? "teamA" : "teamB") : undefined;

      roundList.push({
        matchId,
        round: r,
        roundName,
        teamA: { name: r === 1 ? "" : `Pemenang R${r - 1}-M${m * 2 + 1}`, score: 0 },
        teamB: { name: r === 1 ? "" : `Pemenang R${r - 1}-M${m * 2 + 2}`, score: 0 },
        winner: null,
        nextMatchId,
        nextSlot,
      });
    }
    matchesByRound.push(roundList);
  }

  // Populate Round 1 with teams and balanced Auto-BYE across Left & Right wings
  const round1Matches = matchesByRound[0];
  const numByes = Math.max(0, bracketSize - teamCount);
  const byeMatchIndices = new Set<number>();

  // Distribute BYE matches alternately between Left Wing (0..) and Right Wing (..matchesInRound-1)
  let leftByePtr = 0;
  let rightByePtr = round1Matches.length - 1;
  while (byeMatchIndices.size < numByes && leftByePtr <= rightByePtr) {
    if (byeMatchIndices.size < numByes) {
      byeMatchIndices.add(leftByePtr);
      leftByePtr++;
    }
    if (byeMatchIndices.size < numByes && rightByePtr >= leftByePtr) {
      byeMatchIndices.add(rightByePtr);
      rightByePtr--;
    }
  }

  let teamIdx = 0;
  for (let m = 0; m < round1Matches.length; m++) {
    const match = round1Matches[m];
    const isByeMatch = byeMatchIndices.has(m);

    const teamAObj = teams[teamIdx++];
    match.teamA = {
      id: teamAObj?.id,
      name: teamAObj?.teamName || `Tim ${teamIdx}`,
      score: 0,
    };

    if (isByeMatch) {
      // Auto-BYE slot!
      match.teamB = {
        id: undefined,
        name: "BYE",
        score: 0,
      };
      // Auto-advance Team A as winner to round 2
      match.winner = match.teamA.name;
      match.winnerId = match.teamA.id;

      if (match.nextMatchId && match.nextSlot && totalRounds > 1) {
        const round2Matches = matchesByRound[1];
        const nextMatch = round2Matches.find((nm) => nm.matchId === match.nextMatchId);
        if (nextMatch) {
          if (match.nextSlot === "teamA") {
            nextMatch.teamA = { id: match.teamA.id, name: match.teamA.name, score: 0 };
          } else {
            nextMatch.teamB = { id: match.teamA.id, name: match.teamA.name, score: 0 };
          }
        }
      }
    } else {
      // Real opponent team
      const teamBObj = teams[teamIdx++];
      match.teamB = {
        id: teamBObj?.id,
        name: teamBObj?.teamName || `Tim ${teamIdx}`,
        score: 0,
      };
      match.winner = null;
      match.winnerId = null;
    }
  }

  // Flatten matches in round order
  const allMatches: TournamentMatch[] = [];
  for (const rList of matchesByRound) {
    allMatches.push(...rList);
  }

  // 🥉 BABAK PEREBUTAN JUARA 3 (BRONZE MATCH) OTOMATIS
  // Jika turnamen memiliki minimal 4 tim (memiliki babak Semifinal), buat kotak match BRONZE-01
  if (bracketSize >= 4) {
    allMatches.push({
      matchId: "BRONZE-01",
      round: totalRounds,
      roundName: "🥉 BRONZE MATCH (PEREBUTAN JUARA 3)",
      teamA: { name: "Kalah Semifinal 1", score: 0 },
      teamB: { name: "Kalah Semifinal 2", score: 0 },
      winner: null,
      winnerId: null,
      matchStatus: "UPCOMING",
    });
  }

  return { teams, matches: allMatches };
}

// Auto-advance helper: when a match winner is decided, update that match and propagate the winner to the next round!
export function advanceMatchWinner(
  matches: TournamentMatch[],
  matchId: string,
  winnerName: string,
  winnerId?: string,
  scoreA?: number,
  scoreB?: number,
  lossReason: TournamentLossReason = "NORMAL"
): TournamentMatch[] {
  const updatedMatches = matches.map((match) => ({ ...match }));
  const current = updatedMatches.find((m) => m.matchId?.toLowerCase() === matchId.toLowerCase());
  if (!current) return matches;

  current.winner = winnerName;
  current.winnerId = winnerId;
  current.matchStatus = "FINISHED";
  current.lossReason = lossReason;
  if (scoreA !== undefined) current.teamA = { ...current.teamA, score: scoreA };
  if (scoreB !== undefined) current.teamB = { ...current.teamB, score: scoreB };

  // 1. Pemenang melaju ke babak berikutnya (Grand Final / Babak Lanjutan)
  if (current.nextMatchId && current.nextSlot) {
    const nextMatch = updatedMatches.find((m) => m.matchId?.toLowerCase() === current.nextMatchId?.toLowerCase());
    if (nextMatch) {
      if (current.nextSlot === "teamA") {
        nextMatch.teamA = { ...nextMatch.teamA, id: winnerId, name: winnerName };
      } else {
        nextMatch.teamB = { ...nextMatch.teamB, id: winnerId, name: winnerName };
      }
    }
  }

  // 2. Jika pertandingan yang selesai adalah SEMIFINAL, masukkan tim yang kalah ke BRONZE MATCH (BRONZE-01)
  const isSemi =
    current.roundName?.toLowerCase().includes("semifinal") ||
    (current.nextMatchId &&
      updatedMatches.find((m) => m.matchId?.toLowerCase() === current.nextMatchId?.toLowerCase())?.roundName?.toLowerCase().includes("final"));

  if (isSemi) {
    const isWinnerA = current.teamA?.name === winnerName;
    const loser = isWinnerA ? current.teamB : current.teamA;
    const loserName = loser?.name;
    const loserId = loser?.id;

    if (loserName && loserName !== "BYE" && loserName !== "TBD") {
      let bronzeMatch = updatedMatches.find(
        (m) => m.matchId === "BRONZE-01" || m.roundName?.toLowerCase().includes("bronze")
      );

      // Auto-buat BRONZE-01 jika belum ada pada data turnamen lama
      if (!bronzeMatch) {
        const maxRound = Math.max(...updatedMatches.map((m) => m.round || 1));
        bronzeMatch = {
          matchId: "BRONZE-01",
          round: maxRound,
          roundName: "🥉 BRONZE MATCH (PEREBUTAN JUARA 3)",
          teamA: { name: "Kalah Semifinal 1", score: 0 },
          teamB: { name: "Kalah Semifinal 2", score: 0 },
          winner: null,
          winnerId: null,
          matchStatus: "UPCOMING",
        };
        updatedMatches.push(bronzeMatch);
      }

      // Semifinal 1 (nextSlot teamA / m1) masuk ke teamA, Semifinal 2 (nextSlot teamB / m2) masuk ke teamB
      const isSlotA = current.nextSlot === "teamA" || current.matchId.toLowerCase().endsWith("-m1");
      if (isSlotA) {
        bronzeMatch.teamA = { ...bronzeMatch.teamA, id: loserId, name: loserName, score: 0 };
      } else {
        bronzeMatch.teamB = { ...bronzeMatch.teamB, id: loserId, name: loserName, score: 0 };
      }
    }
  }

  return updatedMatches;
}

export function resetMatchResult(
  matches: TournamentMatch[],
  matchId: string
): TournamentMatch[] {
  const updatedMatches = matches.map((match) => ({ ...match }));
  const current = updatedMatches.find((m) => m.matchId?.toLowerCase() === matchId.toLowerCase());
  if (!current) return matches;

  const previousWinner = current.winner;
  current.winner = null;
  current.winnerId = null;
  current.matchStatus = "UPCOMING";
  current.lossReason = "NORMAL";

  // If this winner was advanced to next round, reset the next match's slot
  if (current.nextMatchId && current.nextSlot && previousWinner) {
    const nextMatch = updatedMatches.find((m) => m.matchId?.toLowerCase() === current.nextMatchId?.toLowerCase());
    if (nextMatch) {
      if (current.nextSlot === "teamA" && nextMatch.teamA?.name === previousWinner) {
        nextMatch.teamA = { id: undefined, name: "TBD", score: 0 };
        if (nextMatch.winner === previousWinner) {
          nextMatch.winner = null;
          nextMatch.winnerId = null;
          nextMatch.matchStatus = "UPCOMING";
        }
      } else if (current.nextSlot === "teamB" && nextMatch.teamB?.name === previousWinner) {
        nextMatch.teamB = { id: undefined, name: "TBD", score: 0 };
        if (nextMatch.winner === previousWinner) {
          nextMatch.winner = null;
          nextMatch.winnerId = null;
          nextMatch.matchStatus = "UPCOMING";
        }
      }
    }
  }

  // Jika pertandingan yang direset adalah SEMIFINAL, reset juga tim di BRONZE-01
  const isSemi =
    current.roundName?.toLowerCase().includes("semifinal") ||
    (current.nextMatchId &&
      updatedMatches.find((m) => m.matchId?.toLowerCase() === current.nextMatchId?.toLowerCase())?.roundName?.toLowerCase().includes("final"));

  if (isSemi) {
    const bronzeMatch = updatedMatches.find(
      (m) => m.matchId === "BRONZE-01" || m.roundName?.toLowerCase().includes("bronze")
    );
    if (bronzeMatch) {
      const isSlotA = current.nextSlot === "teamA" || current.matchId.toLowerCase().endsWith("-m1");
      if (isSlotA) {
        const prevLoser = bronzeMatch.teamA?.name;
        bronzeMatch.teamA = { id: undefined, name: "Kalah Semifinal 1", score: 0 };
        if (bronzeMatch.winner === prevLoser) {
          bronzeMatch.winner = null;
          bronzeMatch.winnerId = null;
          bronzeMatch.matchStatus = "UPCOMING";
        }
      } else {
        const prevLoser = bronzeMatch.teamB?.name;
        bronzeMatch.teamB = { id: undefined, name: "Kalah Semifinal 2", score: 0 };
        if (bronzeMatch.winner === prevLoser) {
          bronzeMatch.winner = null;
          bronzeMatch.winnerId = null;
          bronzeMatch.matchStatus = "UPCOMING";
        }
      }
    }
  }

  return updatedMatches;
}

export function updateMatchStatus(
  matches: TournamentMatch[],
  matchId: string,
  status: "UPCOMING" | "LIVE" | "FINISHED",
  manualOverride?: boolean
): TournamentMatch[] {
  return matches.map((m) => {
    if (m.matchId?.toLowerCase() === matchId.toLowerCase()) {
      return {
        ...m,
        matchStatus: status,
        ...(manualOverride !== undefined
          ? { manualOverride }
          : status === "UPCOMING"
          ? { manualOverride: true }
          : status === "LIVE"
          ? { manualOverride: true }
          : {}),
      };
    }
    return m;
  });
}

/**
 * Evaluates and auto-transitions matches from UPCOMING to LIVE:
 * 1. Round 1 matches default to tournament eventDate unless overridden by match.scheduledAt,
 *    and auto-transition to LIVE when start time is reached if two valid teams are assigned.
 * 2. Subsequent rounds (Round > 1) auto-transition to LIVE if both captains marked Ready (teamAReady && teamBReady),
 *    or if committee set a scheduledAt time and that time has arrived.
 */
export function evaluateAutoLiveMatches(
  matches: TournamentMatch[],
  currentTimeMs: number = Date.now(),
  tournamentEventDate?: string | Date | null
): { updatedMatches: TournamentMatch[]; hasChanges: boolean } {
  let hasChanges = false;
  const eventDateTime = tournamentEventDate ? new Date(tournamentEventDate).getTime() : NaN;

  const updatedMatches = matches.map((match) => {
    // If match already has winner or is finished, leave it unchanged
    if (match.matchStatus === "FINISHED" || Boolean(match.winner)) {
      return match;
    }

    // 1. ROUND 1 MATCHES: Scheduled by default to tournament eventDate (unless custom scheduledAt is set)
    if (match.round === 1) {
      const matchSchedTime = match.scheduledAt
        ? new Date(match.scheduledAt).getTime()
        : !isNaN(eventDateTime)
        ? eventDateTime
        : NaN;

      const hasValidTwoTeams = Boolean(
        match.teamA?.name &&
        match.teamB?.name &&
        match.teamA.name !== "TBD" &&
        match.teamB.name !== "TBD" &&
        match.teamB.name !== "BYE" &&
        !match.teamA.name.startsWith("Tim ") &&
        !match.teamB.name.startsWith("Tim ")
      );

      if (
        match.matchStatus !== "LIVE" &&
        match.manualOverride !== true &&
        hasValidTwoTeams &&
        !isNaN(matchSchedTime) &&
        currentTimeMs >= matchSchedTime
      ) {
        hasChanges = true;
        return {
          ...match,
          matchStatus: "LIVE" as const,
        };
      }
    }

    // 2. SUBSEQUENT ROUNDS (Round > 1): Auto-live triggered IF both captains marked READY (teamAReady && teamBReady)
    // OR if scheduledAt is explicitly set and due
    if (match.round > 1) {
      if (
        match.matchStatus !== "LIVE" &&
        match.teamAReady === true &&
        match.teamBReady === true
      ) {
        hasChanges = true;
        return {
          ...match,
          matchStatus: "LIVE" as const,
        };
      }

      if (
        match.matchStatus === "UPCOMING" &&
        match.scheduledAt &&
        match.manualOverride !== true
      ) {
        const scheduledTime = new Date(match.scheduledAt).getTime();
        if (!isNaN(scheduledTime) && currentTimeMs >= scheduledTime) {
          hasChanges = true;
          return {
            ...match,
            matchStatus: "LIVE" as const,
          };
        }
      }
    }

    return match;
  });

  return { updatedMatches, hasChanges };
}

/**
 * Checks if all final matches (Grand Final, and Bronze match if present) are completed with winners.
 */
export function checkAllFinalsFinished(matches: TournamentMatch[]): {
  isFinished: boolean;
  championName?: string;
  runnerUpName?: string;
  thirdPlaceName?: string | null;
} {
  if (!matches || matches.length === 0) return { isFinished: false };

  const maxRound = Math.max(...matches.map((m) => m.round || 1));
  const gfMatch = matches.find(
    (m) =>
      m.matchId !== "BRONZE-01" &&
      !m.roundName?.toLowerCase().includes("bronze") &&
      !m.roundName?.toLowerCase().includes("juara 3") &&
      (m.roundName?.toLowerCase().includes("grand final") ||
        m.roundName?.toLowerCase() === "final" ||
        m.round === maxRound)
  );

  if (!gfMatch || !gfMatch.winner) return { isFinished: false };

  const bronzeMatch = matches.find(
    (m) =>
      m.matchId === "BRONZE-01" ||
      m.roundName?.toLowerCase().includes("juara 3") ||
      m.roundName?.toLowerCase().includes("bronze")
  );

  // If there's a bronze match with both teams assigned, it must also be finished
  if (bronzeMatch && bronzeMatch.teamA?.name && bronzeMatch.teamB?.name) {
    const isTeamReady = bronzeMatch.teamA.name !== "TBD" && bronzeMatch.teamB.name !== "TBD";
    if (isTeamReady && !bronzeMatch.winner) {
      return { isFinished: false };
    }
  }

  const championName = gfMatch.winner;
  const runnerUpName = gfMatch.teamA.name === championName ? gfMatch.teamB.name : gfMatch.teamA.name;
  const thirdPlaceName = bronzeMatch?.winner || null;

  return {
    isFinished: true,
    championName,
    runnerUpName,
    thirdPlaceName,
  };
}

/**
 * Calculate countdown string given target date (e.g. "02j 14m 35d").
 */
export function formatLiveCountdown(targetIsoDate?: string | Date | null, nowMs: number = Date.now()): {
  formatted: string;
  isDue: boolean;
  totalSeconds: number;
} {
  if (!targetIsoDate) {
    return { formatted: "Menunggu Jadwal", isDue: false, totalSeconds: 0 };
  }
  const targetTime = new Date(targetIsoDate).getTime();
  if (isNaN(targetTime)) {
    return { formatted: "Menunggu Jadwal", isDue: false, totalSeconds: 0 };
  }
  const diff = targetTime - nowMs;
  if (diff <= 0) {
    return { formatted: "00:00:00", isDue: true, totalSeconds: 0 };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  let formatted = "";
  if (days > 0) {
    formatted = `${days}h ${pad(hours)}j ${pad(minutes)}m ${pad(seconds)}d`;
  } else if (hours > 0) {
    formatted = `${pad(hours)}j ${pad(minutes)}m ${pad(seconds)}d`;
  } else {
    formatted = `${pad(minutes)}m ${pad(seconds)}d`;
  }

  return { formatted, isDue: false, totalSeconds };
}

/**
 * Format match schedule and countdown info for public UI display.
 */
export function formatMatchScheduleDisplay(
  scheduledAt?: string | null,
  fallbackSchedule?: string | null,
  manualOverride?: boolean,
  currentTimeMs: number = Date.now()
): {
  badgeText: string;
  isStartingSoon: boolean;
  isDue: boolean;
  rawDateText?: string;
} {
  if (!scheduledAt) {
    return {
      badgeText: fallbackSchedule ? `⏳ ${fallbackSchedule}` : "⏳ MENUNGGU JADWAL",
      isStartingSoon: false,
      isDue: false,
    };
  }

  const targetDate = new Date(scheduledAt);
  const targetTime = targetDate.getTime();
  if (isNaN(targetTime)) {
    return {
      badgeText: fallbackSchedule ? `⏳ ${fallbackSchedule}` : "⏳ MENUNGGU JADWAL",
      isStartingSoon: false,
      isDue: false,
    };
  }

  const diffMs = targetTime - currentTimeMs;

  // Format date in Indonesian WIB: e.g. "16 Nov • 20:00 WIB"
  const day = targetDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  });
  const time = targetDate.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
  const rawDateText = `🕒 ${day} • ${time} WIB`;

  // If time has arrived/passed
  if (diffMs <= 0) {
    return {
      badgeText: manualOverride ? `${rawDateText} (Menunggu)` : "🔴 SEDANG BERMAIN",
      isStartingSoon: false,
      isDue: true,
      rawDateText,
    };
  }

  // If starting in less than 1 hour (1 to 60 minutes)
  if (diffMs <= 60 * 60 * 1000) {
    const diffMins = Math.max(1, Math.ceil(diffMs / (60 * 1000)));
    return {
      badgeText: `⏳ Mulai dalam ${diffMins} menit`,
      isStartingSoon: true,
      isDue: false,
      rawDateText,
    };
  }

  return {
    badgeText: rawDateText,
    isStartingSoon: false,
    isDue: false,
    rawDateText,
  };
}

/**
 * Convert ISO string to YYYY-MM-DDTHH:mm string accurately in Asia/Jakarta (WIB) timezone for <input type="datetime-local" />.
 */
export function isoToDateTimeLocal(isoString?: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";
    const year = getPart("year");
    const month = getPart("month");
    const day = getPart("day");
    let hour = getPart("hour");
    if (hour === "24") hour = "00";
    const minute = getPart("minute");

    return `${year}-${month}-${day}T${hour}:${minute}`;
  } catch {
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}

/**
 * Convert YYYY-MM-DDTHH:mm string from <input type="datetime-local" /> to ISO timestamp string with accurate WIB (+07:00) offset.
 */
export function dateTimeLocalToIso(localString: string): string | null {
  if (!localString || !localString.trim()) return null;
  const trimmed = localString.trim();

  // If already contains timezone indicator Z or offset like +07:00 / -05:00
  if (trimmed.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // Treat input as Asia/Jakarta (WIB, UTC+07:00)
  const withSecs = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  const wibIsoString = `${withSecs}+07:00`;
  const date = new Date(wibIsoString);
  if (isNaN(date.getTime())) {
    const fallback = new Date(trimmed);
    return isNaN(fallback.getTime()) ? null : fallback.toISOString();
  }
  return date.toISOString();
}

/**
 * Format ISO timestamp into user-friendly Indonesian WIB string (e.g. "7 Des • 20.00 WIB" or "17 Nov • 14:30 WIB").
 */
export function formatWibDateTime(isoString?: string | null): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "-";
  const dayMonth = date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  });
  const time = date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
  return `${dayMonth} • ${time} WIB`;
}
