export type BracketSlot = { participantId: string; teamName: string };
export type BracketMatch = {
  round: number;
  match: number;
  team1: BracketSlot | null;
  team2: BracketSlot | null;
  winner: BracketSlot | null;
};

export type TournamentTeam = {
  id: string;
  teamName: string;
  captainName: string;
  players: string[];
};

export type TournamentMatch = {
  matchId: string;
  round: number;
  roundName: string;
  teamA: { id?: string; name: string; score: number };
  teamB: { id?: string; name: string; score: number };
  winner: string | null;
  winnerId?: string | null;
  schedule?: string;
  nextMatchId?: string;
  nextSlot?: "teamA" | "teamB";
};

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

// Generate template bracket for 4 Teams (Semifinals -> Grand Final) or 8 Teams (Quarterfinals -> Semifinals -> Grand Final)
export function generateTemplateBracket(
  format: "4 Tim" | "8 Tim" | "16 Tim",
  inputTeams: TournamentTeam[] = []
): { teams: TournamentTeam[]; matches: TournamentMatch[] } {
  const maxTeams = format === "4 Tim" ? 4 : format === "16 Tim" ? 16 : 8;

  // Ensure teams list has slots populated with names
  const teams: TournamentTeam[] = [];
  for (let i = 0; i < maxTeams; i++) {
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

  const matches: TournamentMatch[] = [];

  if (format === "4 Tim") {
    // Round 1: Semifinals
    matches.push({
      matchId: "sf1",
      round: 1,
      roundName: "Semifinal 1",
      teamA: { id: teams[0].id, name: teams[0].teamName, score: 0 },
      teamB: { id: teams[3].id, name: teams[3].teamName, score: 0 },
      winner: null,
      nextMatchId: "gf",
      nextSlot: "teamA",
    });
    matches.push({
      matchId: "sf2",
      round: 1,
      roundName: "Semifinal 2",
      teamA: { id: teams[1].id, name: teams[1].teamName, score: 0 },
      teamB: { id: teams[2].id, name: teams[2].teamName, score: 0 },
      winner: null,
      nextMatchId: "gf",
      nextSlot: "teamB",
    });
    // Round 2: Grand Final
    matches.push({
      matchId: "gf",
      round: 2,
      roundName: "Grand Final",
      teamA: { name: "Pemenang SF1", score: 0 },
      teamB: { name: "Pemenang SF2", score: 0 },
      winner: null,
    });
  } else {
    // 8 Teams format (Default)
    // Round 1: Quarterfinals
    matches.push({
      matchId: "qf1",
      round: 1,
      roundName: "Quarterfinal 1",
      teamA: { id: teams[0].id, name: teams[0].teamName, score: 0 },
      teamB: { id: teams[7].id, name: teams[7].teamName, score: 0 },
      winner: null,
      nextMatchId: "sf1",
      nextSlot: "teamA",
    });
    matches.push({
      matchId: "qf2",
      round: 1,
      roundName: "Quarterfinal 2",
      teamA: { id: teams[3].id, name: teams[3].teamName, score: 0 },
      teamB: { id: teams[4].id, name: teams[4].teamName, score: 0 },
      winner: null,
      nextMatchId: "sf1",
      nextSlot: "teamB",
    });
    matches.push({
      matchId: "qf3",
      round: 1,
      roundName: "Quarterfinal 3",
      teamA: { id: teams[1].id, name: teams[1].teamName, score: 0 },
      teamB: { id: teams[6].id, name: teams[6].teamName, score: 0 },
      winner: null,
      nextMatchId: "sf2",
      nextSlot: "teamA",
    });
    matches.push({
      matchId: "qf4",
      round: 1,
      roundName: "Quarterfinal 4",
      teamA: { id: teams[2].id, name: teams[2].teamName, score: 0 },
      teamB: { id: teams[5].id, name: teams[5].teamName, score: 0 },
      winner: null,
      nextMatchId: "sf2",
      nextSlot: "teamB",
    });

    // Round 2: Semifinals
    matches.push({
      matchId: "sf1",
      round: 2,
      roundName: "Semifinal 1",
      teamA: { name: "Pemenang QF1", score: 0 },
      teamB: { name: "Pemenang QF2", score: 0 },
      winner: null,
      nextMatchId: "gf",
      nextSlot: "teamA",
    });
    matches.push({
      matchId: "sf2",
      round: 2,
      roundName: "Semifinal 2",
      teamA: { name: "Pemenang QF3", score: 0 },
      teamB: { name: "Pemenang QF4", score: 0 },
      winner: null,
      nextMatchId: "gf",
      nextSlot: "teamB",
    });

    // Round 3: Grand Final
    matches.push({
      matchId: "gf",
      round: 3,
      roundName: "Grand Final",
      teamA: { name: "Pemenang SF1", score: 0 },
      teamB: { name: "Pemenang SF2", score: 0 },
      winner: null,
    });
  }

  return { teams, matches };
}

// Auto-advance helper: when a match winner is decided, update that match and propagate the winner to the next round!
export function advanceMatchWinner(
  matches: TournamentMatch[],
  matchId: string,
  winnerName: string,
  winnerId?: string,
  scoreA?: number,
  scoreB?: number
): TournamentMatch[] {
  const updatedMatches = matches.map((match) => ({ ...match }));
  const current = updatedMatches.find((m) => m.matchId === matchId);
  if (!current) return matches;

  current.winner = winnerName;
  current.winnerId = winnerId;
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
