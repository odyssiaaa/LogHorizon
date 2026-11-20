import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { HallOfWinnersBoard } from "@/components/hall-of-winners-board";
import { HallOfWinnerItem } from "@/app/api/hall-of-winners/route";
import { TournamentMatch, TournamentTeam, TournamentRosterPlayer } from "@/lib/tournament";

export const metadata: Metadata = {
  title: "Hall of Winners 🏆 | LogHorizon",
  description: "Aula Kehormatan dan Catatan Sejarah Para Juara Turnamen Esports Komunitas LogHorizon.",
};

export const instant = false;

export default async function HallOfWinnersPage() {
  // 1 & 2. Fetch manual records and completed tournaments in parallel
  const [manualRecords, tournaments] = await Promise.all([
    prisma.hallOfWinner.findMany({
      orderBy: { eventDate: "desc" },
      take: 20,
    }),
    prisma.tournament.findMany({
      orderBy: { eventDate: "desc" },
      take: 20,
      include: {
        participants: {
          include: {
            leader: { select: { id: true, username: true } },
          },
        },
      },
    }),
  ]);

  const manualTournamentIds = new Set(
    manualRecords.map((r) => r.tournamentId).filter(Boolean) as string[]
  );

  const automatedRecords: HallOfWinnerItem[] = [];

  for (const t of tournaments) {
    if (manualTournamentIds.has(t.id)) continue;

    const matches = (t.matches as unknown as TournamentMatch[]) || [];
    if (!Array.isArray(matches) || matches.length === 0) continue;

    const maxRound = Math.max(...matches.map((m) => m.round || 1));
    const gfMatch = matches.find(
      (m) =>
        m.round === maxRound ||
        m.roundName?.toLowerCase().includes("grand final") ||
        m.roundName?.toLowerCase() === "final"
    );

    if (!gfMatch || !gfMatch.winner) {
      if (t.status !== "COMPLETED") continue;
    }

    const championTeamName = gfMatch?.winner || "Juara TBD";
    const runnerUpTeamName = gfMatch
      ? gfMatch.teamA.name === gfMatch.winner
        ? gfMatch.teamB.name
        : gfMatch.teamA.name
      : null;

    const bronzeMatch = matches.find(
      (m) =>
        m.roundName?.toLowerCase().includes("juara 3") ||
        m.roundName?.toLowerCase().includes("bronze")
    );
    const thirdPlaceTeamName = bronzeMatch?.winner || null;

    const teams = (t.teams as unknown as TournamentTeam[]) || [];

    function getRosterForTeam(teamName: string | null | undefined): TournamentRosterPlayer[] {
      if (!teamName || teamName === "TBD" || teamName === "BYE") return [];
      const foundTeam = teams.find((tm) => tm.teamName?.toLowerCase() === teamName.toLowerCase());
      if (foundTeam?.roster && foundTeam.roster.length > 0) return foundTeam.roster;

      const foundPart = t.participants.find(
        (p) => p.teamName?.toLowerCase() === teamName.toLowerCase()
      );
      if (foundPart?.roster && Array.isArray(foundPart.roster)) {
        return foundPart.roster as unknown as TournamentRosterPlayer[];
      }
      return [];
    }

    automatedRecords.push({
      id: `auto-${t.id}`,
      tournamentId: t.id,
      tournamentTitle: t.title,
      game: t.game,
      season: t.format || "Season Komunitas",
      eventDate: t.eventDate.toISOString(),
      prizePool: t.prizePool,
      championTeam: championTeamName,
      championRoster: getRosterForTeam(championTeamName),
      runnerUpTeam: runnerUpTeamName,
      runnerUpRoster: getRosterForTeam(runnerUpTeamName),
      thirdPlaceTeam: thirdPlaceTeamName,
      thirdPlaceRoster: getRosterForTeam(thirdPlaceTeamName),
      notes: "Turnamen resmi LogHorizon selesai.",
      isAutomated: true,
    });
  }

  const combined: HallOfWinnerItem[] = [
    ...manualRecords.map((m) => ({
      id: m.id,
      tournamentId: m.tournamentId,
      tournamentTitle: m.tournamentTitle,
      game: m.game,
      season: m.season || "Season 1",
      eventDate: m.eventDate.toISOString(),
      prizePool: m.prizePool,
      championTeam: m.championTeam,
      championRoster: (m.championRoster as unknown as TournamentRosterPlayer[]) || [],
      runnerUpTeam: m.runnerUpTeam,
      runnerUpRoster: (m.runnerUpRoster as unknown as TournamentRosterPlayer[]) || [],
      thirdPlaceTeam: m.thirdPlaceTeam,
      thirdPlaceRoster: (m.thirdPlaceRoster as unknown as TournamentRosterPlayer[]) || [],
      notes: m.notes,
      isAutomated: false,
    })),
    ...automatedRecords,
  ];

  combined.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

  return (
    <main className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-12 overflow-x-hidden min-h-screen">
      {/* HERO SECTION */}
      <header className="mb-8 text-left space-y-2 border-b border-slate-200 dark:border-[#2E1E45] pb-6">
        <p className="text-xs font-mono font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[#7C3AED]" />
          <span>AULA PARA JUARA // HALL OF FAME</span>
        </p>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-[#F8FAFC]">
          HALL OF <span className="text-[#7C3AED] dark:text-[#A78BFA]">WINNERS</span>
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-[#A78BFA] max-w-3xl leading-relaxed font-sans">
          Catatan sejarah abadi dan penghargaan tertinggi bagi seluruh skuad yang sukses menjuarai turnamen resmi guild LogHorizon.
        </p>
      </header>

      {/* WINNERS BOARD */}
      <HallOfWinnersBoard initialItems={combined} />
    </main>
  );
}
