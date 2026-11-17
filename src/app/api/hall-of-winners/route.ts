import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { TournamentMatch, TournamentTeam, TournamentRosterPlayer } from "@/lib/tournament";
import { notifyTournamentChampion } from "@/lib/discord-webhook";

export type HallOfWinnerItem = {
  id: string;
  tournamentId?: string | null;
  tournamentTitle: string;
  game: string;
  season: string;
  eventDate: string | Date;
  prizePool?: string | null;
  championTeam: string;
  championRoster: TournamentRosterPlayer[];
  runnerUpTeam?: string | null;
  runnerUpRoster?: TournamentRosterPlayer[];
  thirdPlaceTeam?: string | null;
  thirdPlaceRoster?: TournamentRosterPlayer[];
  notes?: string | null;
  isAutomated?: boolean;
};

export async function GET() {
  try {
    // 1. Fetch manual HallOfWinner records
    const manualRecords = await prisma.hallOfWinner.findMany({
      orderBy: { eventDate: "desc" },
    });

    const manualTournamentIds = new Set(
      manualRecords.map((r) => r.tournamentId).filter(Boolean) as string[]
    );

    // 2. Fetch tournaments from DB that might be completed or have a finished Grand Final
    const tournaments = await prisma.tournament.findMany({
      orderBy: { eventDate: "desc" },
      include: {
        participants: {
          include: {
            leader: { select: { id: true, username: true } },
          },
        },
      },
    });

    const automatedRecords: HallOfWinnerItem[] = [];

    for (const t of tournaments) {
      if (manualTournamentIds.has(t.id)) continue;

      const matches = (t.matches as unknown as TournamentMatch[]) || [];
      if (!Array.isArray(matches) || matches.length === 0) continue;

      // Find Grand Final match (highest round or roundName containing 'Final'/'Grand Final', excluding Bronze Match)
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

      if (!gfMatch || !gfMatch.winner) {
        // If tournament status is not completed and no GF winner, skip
        if (t.status !== "COMPLETED") continue;
      }

      const championTeamName = gfMatch?.winner || "Juara TBD";
      const runnerUpTeamName = gfMatch
        ? gfMatch.teamA.name === gfMatch.winner
          ? gfMatch.teamB.name
          : gfMatch.teamA.name
        : null;

      // Find Bronze Match (Juara 3)
      const bronzeMatch = matches.find(
        (m) =>
          m.matchId === "BRONZE-01" ||
          m.roundName?.toLowerCase().includes("juara 3") ||
          m.roundName?.toLowerCase().includes("bronze")
      );
      const thirdPlaceTeamName = bronzeMatch?.winner || null;

      // Find Rosters from t.teams or t.participants
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
        eventDate: t.eventDate,
        prizePool: t.prizePool,
        championTeam: championTeamName,
        championRoster: getRosterForTeam(championTeamName),
        runnerUpTeam: runnerUpTeamName,
        runnerUpRoster: getRosterForTeam(runnerUpTeamName),
        thirdPlaceTeam: thirdPlaceTeamName,
        thirdPlaceRoster: getRosterForTeam(thirdPlaceTeamName),
        notes: `Turnamen resmi LogHorizon selesai.`,
        isAutomated: true,
      });
    }

    // Merge manual and automated records
    const combined: HallOfWinnerItem[] = [
      ...manualRecords.map((m) => ({
        id: m.id,
        tournamentId: m.tournamentId,
        tournamentTitle: m.tournamentTitle,
        game: m.game,
        season: m.season || "Season 1",
        eventDate: m.eventDate,
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

    return NextResponse.json(combined);
  } catch (error) {
    console.error("Gagal mengambil data Hall of Winners:", error);
    return jsonError("Gagal mengambil data Hall of Winners.", 500);
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) {
    return jsonError("Akses ditolak. Khusus Admin/Moderator.", 403);
  }

  try {
    const body = await req.json();
    const {
      tournamentId,
      tournamentTitle,
      game,
      season,
      eventDate,
      prizePool,
      championTeam,
      championRoster,
      runnerUpTeam,
      runnerUpRoster,
      thirdPlaceTeam,
      thirdPlaceRoster,
      notes,
    } = body;

    if (!tournamentTitle || !game || !championTeam) {
      return jsonError("Judul turnamen, game, dan nama tim Juara 1 wajib diisi.", 400);
    }

    const created = await prisma.hallOfWinner.create({
      data: {
        tournamentId: tournamentId || null,
        tournamentTitle,
        game,
        season: season || "Season 1",
        eventDate: eventDate ? new Date(eventDate) : new Date(),
        prizePool: prizePool || null,
        championTeam,
        championRoster: Array.isArray(championRoster) ? championRoster : [],
        runnerUpTeam: runnerUpTeam || null,
        runnerUpRoster: Array.isArray(runnerUpRoster) ? runnerUpRoster : [],
        thirdPlaceTeam: thirdPlaceTeam || null,
        thirdPlaceRoster: Array.isArray(thirdPlaceRoster) ? thirdPlaceRoster : [],
        notes: notes || null,
      },
    });

    notifyTournamentChampion({
      tournamentTitle,
      game,
      championName: championTeam,
      runnerUpName: runnerUpTeam,
      thirdPlaceName: thirdPlaceTeam,
      prizePool,
    }).catch((e) => console.warn("[Discord Webhook] Error:", e));

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("Gagal menyimpan Hall of Winner manual:", err);
    return jsonError("Gagal menyimpan arsip Hall of Winner.", 500);
  }
}
