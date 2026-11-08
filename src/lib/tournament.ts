export type BracketSlot = { participantId: string; teamName: string };
export type BracketMatch = {
  round: number;
  match: number;
  team1: BracketSlot | null;
  team2: BracketSlot | null;
  winner: BracketSlot | null;
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
