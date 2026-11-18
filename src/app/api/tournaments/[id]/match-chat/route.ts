import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { TournamentMatch, TournamentTeam } from "@/lib/tournament";
import { NotificationType, Prisma } from "@prisma/client";
import { createNotification } from "@/lib/notifications";
import { sendDiscordNotice, notifyTournamentMatchLive } from "@/lib/discord-webhook";
import { checkSatpamCooldown, handleMatchLobbyMention } from "@/lib/satpam-guardian";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  // 1. Auto-cleanup pesan chat kedaluwarsa (> 24 jam setelah match selesai)
  await prisma.matchMessage.deleteMany({
    where: {
      expiresAt: {
        lte: new Date(),
      },
    },
  }).catch(() => {});

  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk mengakses ruang koordinasi match.", 401);

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");
  if (!matchId) return jsonError("Parameter matchId wajib disertakan.", 400);

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          leader: {
            select: { id: true, username: true, discordId: true, name: true },
          },
        },
      },
    },
  });
  if (!tournament) return jsonError("Turnamen tidak ditemukan.", 404);

  const matches = (tournament.matches as unknown as TournamentMatch[]) || [];
  const match = matches.find((m) => m.matchId === matchId);
  if (!match) return jsonError("Pertandingan tidak ditemukan.", 404);

  // Cocokkan data Tim A dan Tim B dari participants dan teams JSON
  const pA = tournament.participants.find(
    (p) => (match.teamA.id && p.id === match.teamA.id) || (match.teamA.name && p.teamName.toLowerCase() === match.teamA.name.toLowerCase())
  );
  const pB = tournament.participants.find(
    (p) => (match.teamB.id && p.id === match.teamB.id) || (match.teamB.name && p.teamName.toLowerCase() === match.teamB.name.toLowerCase())
  );

  const teamsJson = (tournament.teams as unknown as TournamentTeam[]) || [];
  const teamAFromTeams = teamsJson.find(
    (t) => (match.teamA.id && t.id === match.teamA.id) || (match.teamA.name && t.teamName.toLowerCase() === match.teamA.name.toLowerCase())
  );
  const teamBFromTeams = teamsJson.find(
    (t) => (match.teamB.id && t.id === match.teamB.id) || (match.teamB.name && t.teamName.toLowerCase() === match.teamB.name.toLowerCase())
  );

  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";

  const isCapA = Boolean(
    (pA && (
      user.id === pA.leaderId ||
      (user.username && pA.leader?.username && user.username.toLowerCase() === pA.leader.username.toLowerCase()) ||
      (user.discordId && pA.leader?.discordId && user.discordId === pA.leader.discordId)
    )) ||
    (teamAFromTeams && (
      user.id === teamAFromTeams.id ||
      (user.discordId && teamAFromTeams.representativeDiscordId && user.discordId === teamAFromTeams.representativeDiscordId) ||
      (user.username && teamAFromTeams.captainName && user.username.toLowerCase() === teamAFromTeams.captainName.toLowerCase()) ||
      (user.username && teamAFromTeams.representativeDiscord && user.username.toLowerCase() === teamAFromTeams.representativeDiscord.toLowerCase())
    ))
  );

  const isCapB = Boolean(
    (pB && (
      user.id === pB.leaderId ||
      (user.username && pB.leader?.username && user.username.toLowerCase() === pB.leader.username.toLowerCase()) ||
      (user.discordId && pB.leader?.discordId && user.discordId === pB.leader.discordId)
    )) ||
    (teamBFromTeams && (
      user.id === teamBFromTeams.id ||
      (user.discordId && teamBFromTeams.representativeDiscordId && user.discordId === teamBFromTeams.representativeDiscordId) ||
      (user.username && teamBFromTeams.captainName && user.username.toLowerCase() === teamBFromTeams.captainName.toLowerCase()) ||
      (user.username && teamBFromTeams.representativeDiscord && user.username.toLowerCase() === teamBFromTeams.representativeDiscord.toLowerCase())
    ))
  );

  if (!isStaff && !isCapA && !isCapB) {
    return jsonError("Akses ditolak. Ruang koordinasi ini khusus untuk Kapten Tim A, Kapten Tim B, dan Panitia/Wasit pada match ini.", 403);
  }

  const roleLabel = isStaff
    ? "[PANITIA / WASIT]"
    : isCapA
    ? `[KAPTEN ${match.teamA.name || "TIM A"}]`
    : `[KAPTEN ${match.teamB.name || "TIM B"}]`;

  const isFinished = match.matchStatus === "FINISHED" || Boolean(match.winner);

  // Jika match telah selesai, tetapkan expiresAt 24 jam untuk pesan-pesan yang belum memiliki batas kedaluwarsa
  if (isFinished) {
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

  const messages = await prisma.matchMessage.findMany({
    where: { tournamentId: id, matchId },
    orderBy: { createdAt: "asc" },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          avatar: true,
          role: true,
          isPremium: true,
        },
      },
    },
  });

  return Response.json({
    success: true,
    matchId,
    tournamentTitle: tournament.title,
    roundName: match.roundName,
    teamA: match.teamA,
    teamB: match.teamB,
    captainAName: pA?.leader.username || teamAFromTeams?.captainName || match.teamA.name,
    captainBName: pB?.leader.username || teamBFromTeams?.captainName || match.teamB.name,
    roleLabel,
    isStaff,
    isCapA,
    isCapB,
    isFinished,
    teamAReady: Boolean(match.teamAReady),
    teamBReady: Boolean(match.teamBReady),
    matchStatus: match.matchStatus || "UPCOMING",
    messages,
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  // 1. Auto-cleanup pesan chat kedaluwarsa (> 24 jam setelah match selesai)
  await prisma.matchMessage.deleteMany({
    where: {
      expiresAt: {
        lte: new Date(),
      },
    },
  }).catch(() => {});

  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk mengirim pesan di ruang koordinasi.", 401);

  const { id } = await params;
  const payload: unknown = await request.json().catch(() => ({}));
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const matchId = typeof data.matchId === "string" ? data.matchId : "";
  if (!matchId) return jsonError("matchId wajib diisi.", 400);

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          leader: {
            select: { id: true, username: true, discordId: true, name: true },
          },
        },
      },
    },
  });
  if (!tournament) return jsonError("Turnamen tidak ditemukan.", 404);

  const matches = (tournament.matches as unknown as TournamentMatch[]) || [];
  const match = matches.find((m) => m.matchId === matchId);
  if (!match) return jsonError("Pertandingan tidak ditemukan.", 404);

  // Cocokkan data Tim A dan Tim B dari participants dan teams JSON
  const pA = tournament.participants.find(
    (p) => (match.teamA.id && p.id === match.teamA.id) || (match.teamA.name && p.teamName.toLowerCase() === match.teamA.name.toLowerCase())
  );
  const pB = tournament.participants.find(
    (p) => (match.teamB.id && p.id === match.teamB.id) || (match.teamB.name && p.teamName.toLowerCase() === match.teamB.name.toLowerCase())
  );

  const teamsJson = (tournament.teams as unknown as TournamentTeam[]) || [];
  const teamAFromTeams = teamsJson.find(
    (t) => (match.teamA.id && t.id === match.teamA.id) || (match.teamA.name && t.teamName.toLowerCase() === match.teamA.name.toLowerCase())
  );
  const teamBFromTeams = teamsJson.find(
    (t) => (match.teamB.id && t.id === match.teamB.id) || (match.teamB.name && t.teamName.toLowerCase() === match.teamB.name.toLowerCase())
  );

  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";

  const isCapA = Boolean(
    (pA && (
      user.id === pA.leaderId ||
      (user.username && pA.leader?.username && user.username.toLowerCase() === pA.leader.username.toLowerCase()) ||
      (user.discordId && pA.leader?.discordId && user.discordId === pA.leader.discordId)
    )) ||
    (teamAFromTeams && (
      user.id === teamAFromTeams.id ||
      (user.discordId && teamAFromTeams.representativeDiscordId && user.discordId === teamAFromTeams.representativeDiscordId) ||
      (user.username && teamAFromTeams.captainName && user.username.toLowerCase() === teamAFromTeams.captainName.toLowerCase()) ||
      (user.username && teamAFromTeams.representativeDiscord && user.username.toLowerCase() === teamAFromTeams.representativeDiscord.toLowerCase())
    ))
  );

  const isCapB = Boolean(
    (pB && (
      user.id === pB.leaderId ||
      (user.username && pB.leader?.username && user.username.toLowerCase() === pB.leader.username.toLowerCase()) ||
      (user.discordId && pB.leader?.discordId && user.discordId === pB.leader.discordId)
    )) ||
    (teamBFromTeams && (
      user.id === teamBFromTeams.id ||
      (user.discordId && teamBFromTeams.representativeDiscordId && user.discordId === teamBFromTeams.representativeDiscordId) ||
      (user.username && teamBFromTeams.captainName && user.username.toLowerCase() === teamBFromTeams.captainName.toLowerCase()) ||
      (user.username && teamBFromTeams.representativeDiscord && user.username.toLowerCase() === teamBFromTeams.representativeDiscord.toLowerCase())
    ))
  );

  if (!isStaff && !isCapA && !isCapB) {
    return jsonError("Akses ditolak. Anda bukan kapten atau panitia dalam pertandingan ini.", 403);
  }

  const isFinished = match.matchStatus === "FINISHED" || Boolean(match.winner);
  if (isFinished) {
    return jsonError("Pertandingan ini telah selesai. Ruang chat dalam mode arsip read-only untuk audit panitia.", 400);
  }

  const roleLabel = isStaff
    ? "[PANITIA / WASIT]"
    : isCapA
    ? `[KAPTEN ${match.teamA.name || "TIM A"}]`
    : `[KAPTEN ${match.teamB.name || "TIM B"}]`;

  // ACTION: TOGGLE READY CHECK FOR CAPTAINS (OR PANITIA)
  if (data.action === "TOGGLE_READY") {
    if (!isCapA && !isCapB && !isStaff) {
      return jsonError("Hanya Kapten Tim atau Panitia yang dapat menyatakan kesiapan tim.", 403);
    }

    const teamToUpdate = isCapA ? "A" : isCapB ? "B" : (data.team === "B" ? "B" : "A");
    const captainTeamName = teamToUpdate === "A" ? match.teamA.name : match.teamB.name;
    const newReady = teamToUpdate === "A" ? !match.teamAReady : !match.teamBReady;

    const updatedMatches = matches.map((m) => {
      if (m.matchId === matchId) {
        const teamAReady = teamToUpdate === "A" ? newReady : Boolean(m.teamAReady);
        const teamBReady = teamToUpdate === "B" ? newReady : Boolean(m.teamBReady);
        const bothReady = teamAReady && teamBReady;
        return {
          ...m,
          teamAReady,
          teamBReady,
          teamAReadyAt: teamAReady ? (m.teamAReadyAt || new Date().toISOString()) : null,
          teamBReadyAt: teamBReady ? (m.teamBReadyAt || new Date().toISOString()) : null,
          matchStatus: bothReady ? ("LIVE" as const) : m.matchStatus,
        };
      }
      return m;
    });

    const targetMatch = updatedMatches.find((m) => m.matchId === matchId);
    const bothReadyNow = Boolean(targetMatch?.teamAReady && targetMatch?.teamBReady);

    // Save updated tournament matches
    await prisma.tournament.update({
      where: { id },
      data: { matches: updatedMatches as unknown as Prisma.InputJsonValue },
    });

    // Create system log message in match chat
    const alertContent = newReady
      ? `✅ [READY CHECK] Kapten ${captainTeamName} (@${user.username}) menyatakan timnya SIAP TANDING!`
      : `⏸ [READY CHECK] Kapten ${captainTeamName} (@${user.username}) membatalkan status kesiapan.`;

    const readyMsg = await prisma.matchMessage.create({
      data: {
        tournamentId: id,
        matchId,
        senderId: user.id,
        content: alertContent,
        roleLabel: "[SISTEM LOBBY]",
      },
      include: {
        sender: {
          select: { id: true, username: true, avatar: true, role: true, isPremium: true },
        },
      },
    });

    // If both ready now, announce match start!
    if (bothReadyNow) {
      await prisma.matchMessage.create({
        data: {
          tournamentId: id,
          matchId,
          senderId: user.id,
          content: `🔥 [PERTANDINGAN DIMULAI] Kedua tim telah siap! Pertandingan ${match.roundName} resmi berstatus 🔴 SEDANG BERMAIN (LIVE). Selamat bertanding dan junjung tinggi sportivitas!`,
          roleLabel: "[SISTEM LOBBY]",
        },
      });

      notifyTournamentMatchLive({
        tournamentTitle: tournament.title,
        tournamentId: id,
        matchId,
        roundName: match.roundName || `Ronde ${match.round}`,
        teamAName: match.teamA?.name || "Tim A",
        teamBName: match.teamB?.name || "Tim B",
      }).catch((err) => console.warn("[Discord Bot] Gagal kirim info live match:", err));
    }

    return Response.json({
      success: true,
      teamAReady: targetMatch?.teamAReady,
      teamBReady: targetMatch?.teamBReady,
      matchStatus: targetMatch?.matchStatus,
      bothReady: bothReadyNow,
      message: readyMsg,
    });
  }

  // ACTION: EMERGENCY REFEREE ALERT (🚨 PANGGIL PANITIA)
  if (data.action === "CALL_REFEREE") {
    const callerTeam = isCapA ? match.teamA.name : isCapB ? match.teamB.name : user.username ?? "Kapten";

    const alertContent = `🚨 [PANGGILAN WASIT] Kapten ${callerTeam} (@${user.username}) telah membunyikan alarm memanggil Panitia/Wasit ke ruang koordinasi ini!`;
    const sysMsg = await prisma.matchMessage.create({
      data: {
        tournamentId: id,
        matchId,
        senderId: user.id,
        content: alertContent,
        roleLabel: "[ALARM PANITIA]",
      },
      include: {
        sender: {
          select: { id: true, username: true, avatar: true, role: true, isPremium: true },
        },
      },
    });

    // Notify all staff in DB
    const staffMembers = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "MODERATOR"] } },
      select: { id: true },
    });

    const notifPromises = staffMembers.map((staff) =>
      createNotification({
        userId: staff.id,
        type: NotificationType.SYSTEM,
        message: `🚨 Panggilan Wasit Turnamen: Kapten ${callerTeam} membutuhkan bantuan di Match #${matchId} (${tournament.title})!`,
        link: `/events/turnamen/${tournament.id}?match=${matchId}`,
      })
    );
    await Promise.allSettled(notifPromises);

    // Discord Webhook Dispatch
    void sendDiscordNotice(
      "events",
      `🚨 PANGGILAN WASIT TURNAMEN: ${tournament.title}`,
      `Kapten **${callerTeam}** (@${user.username}) memanggil panitia di Match **#${matchId}** (${match.roundName}: ${match.teamA.name} vs ${match.teamB.name}). Segera masuk ke ruang koordinasi!`
    );

    return Response.json({ success: true, message: sysMsg });
  }

  // REGULAR MESSAGE OR IMAGE ATTACHMENT
  const rawContent = typeof data.content === "string" ? data.content.trim() : "";
  const imageUrl = typeof data.imageUrl === "string" ? data.imageUrl.trim() : null;

  if (!rawContent && !imageUrl) {
    return jsonError("Pesan tidak boleh kosong.", 400);
  }

  let fullContent = rawContent;
  if (imageUrl) {
    fullContent = fullContent ? `${fullContent}\n\n![Bukti Pertandingan](${imageUrl})` : `![Bukti Pertandingan](${imageUrl})`;
  }

  const created = await prisma.matchMessage.create({
    data: {
      tournamentId: id,
      matchId,
      senderId: user.id,
      content: fullContent,
      roleLabel,
      expiresAt: null,
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          avatar: true,
          role: true,
          isPremium: true,
        },
      },
    },
  });

  // Pemicu Otomatis @satpam Asisten Wasit di Match Lobby Chat
  if (/@satpam\b/i.test(fullContent)) {
    const isOwnerOrStaff = user.role === "ADMIN" || user.role === "MODERATOR" || user.username === ".odyssia";
    const cooldown = checkSatpamCooldown(user.id, isOwnerOrStaff);
    if (cooldown.allowed) {
      void handleMatchLobbyMention({
        tournamentId: id,
        matchId,
        userMessage: fullContent,
        senderUsername: user.username ?? "Kapten",
      });
    }
  }

  return Response.json({ success: true, message: created }, { status: 201 });
}
