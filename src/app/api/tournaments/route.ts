import { TournamentStatus, Prisma } from "@prisma/client";
import { authenticatedUser, jsonError, requireStaff } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { generateTemplateBracket, TournamentTeam, TournamentMatch, DEFAULT_TOURNAMENT_RULES, evaluateAutoLiveMatches, checkAllFinalsFinished, extractTournamentPodium } from "@/lib/tournament";
import { sanitizePlainText } from "@/lib/sanitize";

export async function GET() {
  const viewer = await authenticatedUser().catch(() => null);
  const isStaff = viewer?.role === "ADMIN" || viewer?.role === "MODERATOR";

  const tournaments = await prisma.tournament.findMany({
    orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
    take: 20,
    include: {
      participants: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          teamName: true,
          roster: true,
          paymentStatus: true,
          createdAt: true,
          leader: {
            select: { id: true, username: true, discordId: true, name: true, image: true },
          },
        },
      },
    },
  });

  const now = Date.now();
  const processedTournaments = await Promise.all(
    tournaments.map(async (tournament) => {
      let currentStatus = tournament.status;
      let matches = (tournament.matches as unknown as TournamentMatch[]) || [];
      const eventTime = new Date(tournament.eventDate).getTime();
      const isEventDue = !isNaN(eventTime) && now >= eventTime;

      let shouldPersist = false;

      // 1. Auto-close registration & transition to ONGOING when eventDate arrives
      if (isEventDue && (currentStatus === "REGISTRATION" || currentStatus === "OPEN")) {
        currentStatus = TournamentStatus.ONGOING;
        shouldPersist = true;
      }

      // 2. Evaluate auto-live matches (Round 1 auto-start and Ready Checks)
      const { updatedMatches, hasChanges } = evaluateAutoLiveMatches(matches, now, tournament.eventDate);
      if (hasChanges) {
        matches = updatedMatches;
        shouldPersist = true;
      }

      // 3. Auto-finish if all finals finished
      const finalsCheck = checkAllFinalsFinished(matches);
      if (currentStatus === "ONGOING" && finalsCheck.isFinished) {
        currentStatus = TournamentStatus.COMPLETED;
        shouldPersist = true;
      }

      const isCompletedNow = currentStatus === TournamentStatus.COMPLETED;
      const completedAtDate = isCompletedNow ? (tournament.completedAt || new Date()) : tournament.completedAt;

      if (shouldPersist) {
        void prisma.tournament
          .update({
            where: { id: tournament.id },
            data: {
              status: currentStatus,
              matches: matches as unknown as Prisma.InputJsonValue,
              ...(isCompletedNow && !tournament.completedAt ? { completedAt: completedAtDate } : {}),
            },
          })
          .catch((err) => console.error("[api/tournaments] Sync error:", err));
      }

      // Auto-sync completed tournament into HallOfWinner
      if (isCompletedNow) {
        const podium = extractTournamentPodium({
          matches,
          teams: tournament.teams,
          participants: tournament.participants,
        });
        if (podium && podium.championTeam) {
          void prisma.hallOfWinner
            .upsert({
              where: { tournamentId: tournament.id },
              create: {
                tournamentId: tournament.id,
                tournamentTitle: tournament.title,
                game: tournament.game,
                eventDate: tournament.eventDate,
                prizePool: tournament.prizePool,
                championTeam: podium.championTeam,
                championRoster: (podium.championRoster || []) as unknown as Prisma.InputJsonValue,
                runnerUpTeam: podium.runnerUpTeam || null,
                runnerUpRoster: (podium.runnerUpRoster || []) as unknown as Prisma.InputJsonValue,
                thirdPlaceTeam: podium.thirdPlaceTeam || null,
                thirdPlaceRoster: (podium.thirdPlaceRoster || []) as unknown as Prisma.InputJsonValue,
              },
              update: {
                tournamentTitle: tournament.title,
                game: tournament.game,
                prizePool: tournament.prizePool,
                championTeam: podium.championTeam,
                championRoster: (podium.championRoster || []) as unknown as Prisma.InputJsonValue,
                runnerUpTeam: podium.runnerUpTeam || null,
                runnerUpRoster: (podium.runnerUpRoster || []) as unknown as Prisma.InputJsonValue,
                thirdPlaceTeam: podium.thirdPlaceTeam || null,
                thirdPlaceRoster: (podium.thirdPlaceRoster || []) as unknown as Prisma.InputJsonValue,
              },
            })
            .catch((err) => console.error("[api/tournaments] HallOfWinner sync error:", err));
        }
      }

      const rawTeams = (tournament.teams as unknown as TournamentTeam[]) || [];
      // Sanitize team representative phone numbers for non-staff
      const sanitizedTeams = isStaff
        ? rawTeams
        : rawTeams.map((team) => ({
            ...team,
            representativePhone: undefined,
          }));

      return {
        ...tournament,
        completedAt: completedAtDate ? completedAtDate.toISOString() : null,
        status: currentStatus,
        rules: tournament.rules || DEFAULT_TOURNAMENT_RULES,
        mainPlayersCount: tournament.mainPlayersCount ?? 5,
        subPlayersCount: tournament.subPlayersCount ?? 2,
        entryFee: tournament.entryFee ?? 0,
        isFreeEntry: tournament.isFreeEntry ?? (tournament.entryFee === 0),
        participants: tournament.participants.map((participant) => ({
          id: participant.id,
          teamName: participant.teamName,
          phone: null,
          roster: participant.roster ?? [],
          paymentStatus: participant.paymentStatus ?? "APPROVED",
          senderName: null,
          paymentProof: null,
          rejectionReason: null,
          createdAt: participant.createdAt.toISOString(),
          leader: {
            id: participant.leader.id,
            username: participant.leader.username,
            discordId: participant.leader.discordId ?? null,
            name: participant.leader.name,
          },
        })),
        bracket: tournament.bracket,
        teams: sanitizedTeams,
        matches,
      };
    })
  );

  return Response.json(processedTournaments);
}

export async function POST(request: Request) {
  const access = await requireStaff(["ADMIN", "MODERATOR"]);
  if (access.response) return access.response;

  const payload: unknown = await request.json();
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const rawTitle = typeof data.title === "string" ? data.title.trim() : "";
  const title = sanitizePlainText(rawTitle || "LogHorizon Tournament Cup");
  if (!title || title.length > 150) {
    return jsonError("Judul turnamen wajib diisi (maksimal 150 karakter).", 400);
  }
  const game = sanitizePlainText(typeof data.game === "string" ? data.game.trim() : "");
  const prizePool = sanitizePlainText(typeof data.prizePool === "string" && data.prizePool.trim() ? data.prizePool.trim() : "Prizepool Komunitas");
  const prize1st = typeof data.prize1st === "string" && data.prize1st.trim() ? sanitizePlainText(data.prize1st.trim()) : null;
  const prize2nd = typeof data.prize2nd === "string" && data.prize2nd.trim() ? sanitizePlainText(data.prize2nd.trim()) : null;
  const prize3rd = typeof data.prize3rd === "string" && data.prize3rd.trim() ? sanitizePlainText(data.prize3rd.trim()) : null;

  let teamCount = typeof data.teamCount === "number" ? data.teamCount : parseInt(String(data.format || "8").replace(/\D/g, ""), 10);
  if (isNaN(teamCount) || teamCount < 2) teamCount = 8;
  if (teamCount > 128) teamCount = 128;
  const format = `${teamCount} Tim`;
  const maxSlots = teamCount;

  const mainPlayersCount = typeof data.mainPlayersCount === "number" ? Math.max(1, Math.min(10, data.mainPlayersCount)) : 5;
  const subPlayersCount = typeof data.subPlayersCount === "number" ? Math.max(0, Math.min(5, data.subPlayersCount)) : 2;

  const rawFee = Number(data.entryFee ?? 0);
  if (!Number.isSafeInteger(rawFee) || rawFee < 0 || rawFee > 100_000_000) {
    return jsonError("Biaya pendaftaran tidak valid (harus berupa bilangan bulat antara Rp 0 - Rp 100.000.000).", 400);
  }
  const isFreeEntry = typeof data.isFreeEntry === "boolean" ? data.isFreeEntry : (rawFee === 0);
  const entryFee = isFreeEntry ? 0 : rawFee;
  const rules = typeof data.rules === "string" && data.rules.trim() ? data.rules.trim() : DEFAULT_TOURNAMENT_RULES;

  const eventDate = typeof data.eventDate === "string" ? new Date(data.eventDate) : new Date(Date.now() + 86400000 * 3);
  if (!game || game.length > 80 || Number.isNaN(eventDate.getTime())) {
    return jsonError("Nama game dan tanggal turnamen wajib diisi.", 400);
  }

  const rawTeams = Array.isArray(data.teams) ? (data.teams as TournamentTeam[]) : [];
  const rawMatches = Array.isArray(data.matches) ? (data.matches as TournamentMatch[]) : [];

  // Generate template bracket if not supplied
  const template = (rawTeams.length > 0 && rawMatches.length > 0)
    ? { teams: rawTeams, matches: rawMatches }
    : generateTemplateBracket(teamCount, rawTeams);

  const status = data.status === "REGISTRATION"
    ? TournamentStatus.REGISTRATION
    : data.status === "ONGOING"
      ? TournamentStatus.ONGOING
      : data.status === "COMPLETED"
        ? TournamentStatus.COMPLETED
        : TournamentStatus.OPEN;

  const tournament = await prisma.tournament.create({
    data: {
      title,
      game,
      prizePool,
      prize1st,
      prize2nd,
      prize3rd,
      format,
      maxSlots,
      mainPlayersCount,
      subPlayersCount,
      entryFee,
      isFreeEntry,
      rules,
      eventDate,
      status,
      teams: template.teams as unknown as Prisma.InputJsonValue,
      matches: template.matches as unknown as Prisma.InputJsonValue,
    },
  });

  return Response.json(tournament, { status: 201 });
}
