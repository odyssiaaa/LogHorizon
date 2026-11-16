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
  nextMatchId?: string;
  nextSlot?: "teamA" | "teamB";
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
  const current = updatedMatches.find((m) => m.matchId === matchId);
  if (!current) return matches;

  current.winner = winnerName;
  current.winnerId = winnerId;
  current.matchStatus = "FINISHED";
  current.lossReason = lossReason;
  if (scoreA !== undefined) current.teamA = { ...current.teamA, score: scoreA };
  if (scoreB !== undefined) current.teamB = { ...current.teamB, score: scoreB };

  if (current.nextMatchId && current.nextSlot) {
    const nextMatch = updatedMatches.find((m) => m.matchId === current.nextMatchId);
    if (nextMatch) {
      if (current.nextSlot === "teamA") {
        nextMatch.teamA = { ...nextMatch.teamA, id: winnerId, name: winnerName };
      } else {
        nextMatch.teamB = { ...nextMatch.teamB, id: winnerId, name: winnerName };
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
  const current = updatedMatches.find((m) => m.matchId === matchId);
  if (!current) return matches;

  const previousWinner = current.winner;
  current.winner = null;
  current.winnerId = null;
  current.matchStatus = "UPCOMING";
  current.lossReason = "NORMAL";

  // If this winner was advanced to next round, reset the next match's slot
  if (current.nextMatchId && current.nextSlot && previousWinner) {
    const nextMatch = updatedMatches.find((m) => m.matchId === current.nextMatchId);
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

  return updatedMatches;
}

export function updateMatchStatus(
  matches: TournamentMatch[],
  matchId: string,
  status: "UPCOMING" | "LIVE" | "FINISHED"
): TournamentMatch[] {
  return matches.map((m) => (m.matchId === matchId ? { ...m, matchStatus: status } : m));
}
