import { Prisma, TournamentStatus } from "@prisma/client";
import { authenticatedUser, jsonError, requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { advanceMatchWinner, resetMatchResult, generateTemplateBracket, shuffleArray, TournamentMatch, TournamentRosterPlayer, TournamentTeam, DEFAULT_TOURNAMENT_RULES, updateMatchStatus, TournamentLossReason, evaluateAutoLiveMatches } from "@/lib/tournament";
import { sanitizePlainText } from "@/lib/sanitize";
import { notifyTournamentChampion } from "@/lib/discord-webhook";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  // Auto-cleanup pesan chat kedaluwarsa (> 24 jam setelah match selesai)
  await prisma.matchMessage.deleteMany({
    where: {
      expiresAt: {
        lte: new Date(),
      },
    },
  }).catch(() => {});

  const viewer = await authenticatedUser().catch(() => null);
  const isStaff = viewer?.role === "ADMIN" || viewer?.role === "MODERATOR";
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      participants: {
        orderBy: { createdAt: "asc" },
        include: {
          leader: {
            select: { id: true, username: true, discordId: true, name: true, image: true },
          },
        },
      },
    },
  });
  if (!tournament) return jsonError("Turnamen tidak ditemukan.", 404);

  const rawTeams = (tournament.teams as unknown as TournamentTeam[]) || [];
  const sanitizedTeams = isStaff
    ? rawTeams
    : rawTeams.map((team) => ({
        ...team,
        representativePhone: undefined,
      }));

  let matches = (tournament.matches as unknown as TournamentMatch[]) || [];
  if (tournament.status === "ONGOING") {
    const { updatedMatches, hasChanges } = evaluateAutoLiveMatches(matches);
    if (hasChanges) {
      matches = updatedMatches;
      void prisma.tournament
        .update({
          where: { id },
          data: { matches: updatedMatches as unknown as Prisma.InputJsonValue },
        })
        .catch((err) => console.error("[api/tournaments] Failed to persist auto-live matches:", err));
    }
  }

  return Response.json({
    success: true,
    tournament: {
      ...tournament,
      matches,
      rules: tournament.rules || DEFAULT_TOURNAMENT_RULES,
      entryFee: tournament.entryFee ?? 0,
      isFreeEntry: tournament.isFreeEntry ?? (tournament.entryFee === 0),
      mainPlayersCount: tournament.mainPlayersCount ?? 5,
      subPlayersCount: tournament.subPlayersCount ?? 2,
      participants: tournament.participants.map((p) => ({
        id: p.id,
        teamName: p.teamName,
        phone: isStaff || (viewer && viewer.id === p.leader.id) ? p.phone ?? null : null,
        roster: p.roster ?? [],
        paymentStatus: p.paymentStatus ?? "APPROVED",
        senderName: isStaff || (viewer && viewer.id === p.leader.id) ? p.senderName ?? null : null,
        paymentProof: isStaff || (viewer && viewer.id === p.leader.id) ? p.paymentProof ?? null : null,
        rejectionReason: p.rejectionReason ?? null,
        createdAt: p.createdAt.toISOString(),
        leader: {
          id: p.leader.id,
          username: p.leader.username,
          discordId: p.leader.discordId ?? null,
          name: p.leader.name,
        },
      })),
      teams: sanitizedTeams,
    },
  });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await requireStaff(["ADMIN", "MODERATOR"]);
  if (access.response) return access.response;

  // Auto-cleanup pesan chat kedaluwarsa (> 24 jam setelah match selesai)
  await prisma.matchMessage.deleteMany({
    where: {
      expiresAt: {
        lte: new Date(),
      },
    },
  }).catch(() => {});

  const { id } = await params;
  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) return jsonError("Turnamen tidak ditemukan.", 404);

  // Wrap the entire bracket and tournament update in an atomic transaction to prevent race conditions
  return await prisma.$transaction(async (tx) => {
    const liveTournament = await tx.tournament.findUnique({ where: { id } });
    if (!liveTournament) return jsonError("Turnamen tidak ditemukan.", 404);

    let updatedMatches = (liveTournament.matches as unknown as TournamentMatch[]) || [];
    let updatedTeams = (liveTournament.teams as unknown as TournamentTeam[]) || [];

  // Update teams list if provided
  if (Array.isArray(data.teams)) {
    updatedTeams = data.teams as TournamentTeam[];
  }

  // Mass schedule per round (Admin mass scheduling)
  if (data.roundSchedule && typeof data.roundSchedule === "object") {
    const rs = data.roundSchedule as { round?: number; scheduledAt?: string | null };
    if (typeof rs.round === "number") {
      let newSched: string | null = null;
      if (typeof rs.scheduledAt === "string" && rs.scheduledAt.trim()) {
        const trimmed = rs.scheduledAt.trim();
        const dateObj = new Date(trimmed.includes("+") || trimmed.endsWith("Z") ? trimmed : `${trimmed}+07:00`);
        newSched = !isNaN(dateObj.getTime()) ? dateObj.toISOString() : trimmed;
      }
      updatedMatches = updatedMatches.map((m) => {
        if (m.round === rs.round) {
          return {
            ...m,
            scheduledAt: newSched,
            manualOverride: false, // Reset override when a new schedule is established so auto-live runs
          };
        }
        return m;
      });
    }
  }

  // Update a single match or whole matches list
  if (Array.isArray(data.matches)) {
    updatedMatches = data.matches as TournamentMatch[];
  } else if (typeof data.matchId === "string") {
    const matchId = data.matchId;
    if (data.resetMatch === true) {
      updatedMatches = resetMatchResult(updatedMatches, matchId);
      // Reset status arsip kedaluwarsa jika pertandingan dibuka kembali untuk diedit ulang
      await prisma.matchMessage.updateMany({
        where: {
          tournamentId: id,
          matchId,
        },
        data: {
          expiresAt: null,
        },
      }).catch(() => {});
    } else {
      if (typeof data.matchStatus === "string") {
        const manualOverride =
          typeof data.manualOverride === "boolean"
            ? data.manualOverride
            : data.matchStatus === "UPCOMING"
            ? true
            : undefined;
        updatedMatches = updateMatchStatus(
          updatedMatches,
          matchId,
          data.matchStatus as "UPCOMING" | "LIVE" | "FINISHED",
          manualOverride
        );
      }
      if (data.scheduledAt !== undefined) {
        let newSched: string | null = null;
        if (typeof data.scheduledAt === "string" && data.scheduledAt.trim()) {
          const trimmed = data.scheduledAt.trim();
          const dateObj = new Date(trimmed.includes("+") || trimmed.endsWith("Z") ? trimmed : `${trimmed}+07:00`);
          newSched = !isNaN(dateObj.getTime()) ? dateObj.toISOString() : trimmed;
        }
        updatedMatches = updatedMatches.map((m) =>
          m.matchId?.toLowerCase() === matchId.toLowerCase()
            ? {
                ...m,
                scheduledAt: newSched,
                manualOverride: false, // Reset override to false on schedule update so auto-live triggers
              }
            : m
        );
      }
      if (data.manualOverride !== undefined && data.matchStatus === undefined && data.scheduledAt === undefined) {
        updatedMatches = updatedMatches.map((m) =>
          m.matchId?.toLowerCase() === matchId.toLowerCase() ? { ...m, manualOverride: Boolean(data.manualOverride) } : m
        );
      }
      if (data.winner !== undefined) {
        const winnerName = typeof data.winner === "string" ? data.winner : "";
        const winnerId = typeof data.winnerId === "string" ? data.winnerId : undefined;
        const scoreA = typeof data.scoreA === "number" ? data.scoreA : undefined;
        const scoreB = typeof data.scoreB === "number" ? data.scoreB : undefined;
        const lossReason = (typeof data.lossReason === "string" ? data.lossReason : "NORMAL") as TournamentLossReason;
        updatedMatches = advanceMatchWinner(updatedMatches, matchId, winnerName, winnerId, scoreA, scoreB, lossReason);
      }

      // Jika pertandingan berstatus selesai atau pemenang ditentukan, tetapkan kedaluwarsa 24 jam untuk arsip audit panitia
      if (data.matchStatus === "FINISHED" || (typeof data.winner === "string" && data.winner.trim().length > 0)) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await prisma.matchMessage.updateMany({
          where: {
            tournamentId: id,
            matchId,
            expiresAt: null,
          },
          data: {
            expiresAt,
          },
        }).catch(() => {});
      }
    }
  }

  // Gacha / Fisher-Yates Random Bracket Seeding (with balanced Auto-BYE)
  if (data.shuffleBracket === true || data.randomizeBracket === true) {
    const approvedParticipants = await prisma.participant.findMany({
      where: { tournamentId: id, paymentStatus: "APPROVED" },
      include: {
        leader: {
          select: { id: true, username: true, discordId: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    let realTeams: TournamentTeam[] = [];

    if (approvedParticipants.length > 0) {
      realTeams = approvedParticipants.map((p) => {
        const roster = (p.roster as unknown as TournamentRosterPlayer[]) || [];
        const mainPlayers = roster.filter((r) => r.role === "MAIN");
        const subPlayers = roster.filter((r) => r.role === "SUB");
        const legacyPlayerStrings = roster.map((r) => `${r.name} (${r.inGameId})`);
        return {
          id: p.id,
          teamName: p.teamName,
          captainName: p.leader?.username ?? p.leader?.name ?? "Kapten Party",
          representativeDiscord: p.leader?.username ?? p.leader?.name ?? "Gamer",
          representativeDiscordId: p.leader?.discordId ?? undefined,
          representativePhone: p.phone ?? undefined,
          players: legacyPlayerStrings,
          mainPlayers,
          subPlayers,
          roster,
          paymentStatus: "APPROVED",
        };
      });
    } else {
      // Use existing non-placeholder teams in tournament.teams if any
      const rawTeams = (tournament.teams as unknown as TournamentTeam[]) || [];
      const nonPlaceholders = rawTeams.filter(
        (t) => t.teamName && !t.teamName.startsWith("Tim ") && t.teamName !== "BYE" && t.teamName !== "TBD"
      );
      realTeams = nonPlaceholders.length > 0 ? [...nonPlaceholders] : [...rawTeams];
    }

    // Apply Fisher-Yates (Knuth) Shuffle
    realTeams = shuffleArray(realTeams);

    // Determine target slot count:
    const effectiveCount = typeof data.totalSlots === "number"
      ? data.totalSlots
      : (approvedParticipants.length >= 2 ? approvedParticipants.length : tournament.maxSlots);
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(effectiveCount)));

    // Pad realTeams with placeholders up to effectiveCount so generateTemplateBracket has all items
    const seededTeams: TournamentTeam[] = [...realTeams];
    for (let i = seededTeams.length; i < effectiveCount; i++) {
      seededTeams.push({
        id: `team-${i + 1}`,
        teamName: `Tim ${i + 1}`,
        captainName: `Kapten ${i + 1}`,
        players: [`Pemain 1`, `Pemain 2`, `Pemain 3`, `Pemain 4`, `Pemain 5`],
      });
    }

    const template = generateTemplateBracket(effectiveCount, seededTeams);
    updatedTeams = template.teams;
    updatedMatches = template.matches;
  }

  // Slot resizing & regeneration
  let nextMaxSlots = tournament.maxSlots;
  let nextFormat = tournament.format;
  if (typeof data.teamCount === "number" || typeof data.maxSlots === "number") {
    const rawCount = typeof data.teamCount === "number" ? data.teamCount : (data.maxSlots as number);
    const newTeamCount = Math.min(128, Math.max(2, rawCount));
    nextMaxSlots = newTeamCount;
    nextFormat = `${newTeamCount} Tim`;

    if (data.regenerateBracket === true) {
      // Regenerate template bracket while preserving existing teams
      const template = generateTemplateBracket(newTeamCount, updatedTeams);
      updatedTeams = template.teams;
      updatedMatches = template.matches;
    }
  } else if (typeof data.format === "string") {
    nextFormat = data.format;
  }

  // Optional status update
  let nextStatus: TournamentStatus | undefined = undefined;
  if (typeof data.status === "string") {
    if (Object.values(TournamentStatus).includes(data.status as TournamentStatus)) {
      nextStatus = data.status as TournamentStatus;
    }
  }

    const updated = await tx.tournament.update({
      where: { id },
      data: {
        ...(typeof data.title === "string" ? { title: data.title.trim() } : {}),
        ...(typeof data.game === "string" ? { game: data.game.trim() } : {}),
        ...(typeof data.prizePool === "string" ? { prizePool: data.prizePool.trim() } : {}),
        ...(typeof data.rules === "string" ? { rules: data.rules.trim() } : {}),
        ...(typeof data.eventDate === "string" && !isNaN(new Date(data.eventDate).getTime())
          ? { eventDate: new Date(data.eventDate) }
          : {}),
        ...(typeof data.mainPlayersCount === "number" ? { mainPlayersCount: Math.max(1, Math.min(10, data.mainPlayersCount)) } : {}),
        ...(typeof data.subPlayersCount === "number" ? { subPlayersCount: Math.max(0, Math.min(5, data.subPlayersCount)) } : {}),
        ...(typeof data.isFreeEntry === "boolean"
          ? {
              isFreeEntry: data.isFreeEntry,
              ...(data.isFreeEntry ? { entryFee: 0 } : typeof data.entryFee === "number" ? { entryFee: Math.max(0, Math.min(100_000_000, data.entryFee)) } : {}),
            }
          : typeof data.entryFee === "number"
          ? { entryFee: Math.max(0, Math.min(100_000_000, data.entryFee)) }
          : {}),
        ...(nextMaxSlots !== liveTournament.maxSlots ? { maxSlots: nextMaxSlots } : {}),
        ...(nextFormat !== liveTournament.format ? { format: nextFormat } : {}),
        ...(nextStatus ? { status: nextStatus } : {}),
        teams: updatedTeams as unknown as Prisma.InputJsonValue,
        matches: updatedMatches as unknown as Prisma.InputJsonValue,
      },
    });

    if (nextStatus === TournamentStatus.COMPLETED && liveTournament.status !== TournamentStatus.COMPLETED) {
      const gfMatch = updatedMatches.find(
        (m) =>
          m.matchId !== "BRONZE-01" &&
          !m.roundName?.toLowerCase().includes("bronze") &&
          !m.roundName?.toLowerCase().includes("juara 3") &&
          (m.roundName?.toLowerCase().includes("grand final") ||
            m.roundName?.toLowerCase() === "final" ||
            m.round === Math.max(...updatedMatches.map((mx) => mx.round || 1)))
      );
      if (gfMatch && gfMatch.winner) {
        const champ = gfMatch.winner;
        const runnerUp = gfMatch.teamA.name === champ ? gfMatch.teamB.name : gfMatch.teamA.name;
        const bronzeMatch = updatedMatches.find(
          (m) =>
            m.matchId === "BRONZE-01" ||
            m.roundName?.toLowerCase().includes("juara 3") ||
            m.roundName?.toLowerCase().includes("bronze")
        );
        const thirdPlace = bronzeMatch?.winner || null;
        notifyTournamentChampion({
          tournamentTitle: updated.title,
          game: updated.game,
          championName: champ,
          runnerUpName: runnerUp,
          thirdPlaceName: thirdPlace,
          prizePool: updated.prizePool,
        }).catch((e) => console.warn("[Discord Webhook] Error:", e));
      }
    }

    return Response.json({
      success: true,
      tournament: {
        ...updated,
        teams: updatedTeams,
        matches: updatedMatches,
      },
      message: "Bagan dan tim turnamen berhasil diperbarui.",
    });
  });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const access = await requireStaff(["ADMIN", "MODERATOR"]);
  if (access.response) return access.response;

  const { id } = await params;
  const existing = await prisma.tournament.findUnique({ where: { id } });
  if (!existing) return jsonError("Turnamen tidak ditemukan.", 404);

  await prisma.tournament.delete({ where: { id } });
  return Response.json({ success: true, message: "Turnamen berhasil dihapus." });
}
