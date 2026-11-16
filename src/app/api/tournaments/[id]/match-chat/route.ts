import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { TournamentMatch } from "@/lib/tournament";
import { NotificationType, Prisma } from "@prisma/client";
import { createNotification } from "@/lib/notifications";
import { sendDiscordNotice } from "@/lib/discord-webhook";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk mengakses ruang lobby match.", 401);

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

  // Determine participant captain A and captain B
  const pA = tournament.participants.find(
    (p) => (match.teamA.id && p.id === match.teamA.id) || p.teamName.toLowerCase() === match.teamA.name.toLowerCase()
  );
  const pB = tournament.participants.find(
    (p) => (match.teamB.id && p.id === match.teamB.id) || p.teamName.toLowerCase() === match.teamB.name.toLowerCase()
  );

  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";
  const isCapA = Boolean(pA && (user.id === pA.leaderId || (user.username && pA.leader.username && user.username.toLowerCase() === pA.leader.username.toLowerCase())));
  const isCapB = Boolean(pB && (user.id === pB.leaderId || (user.username && pB.leader.username && user.username.toLowerCase() === pB.leader.username.toLowerCase())));

  if (!isStaff && !isCapA && !isCapB) {
    return jsonError("Akses ditolak. Ruang koordinasi ini khusus untuk Kapten Tim A, Kapten Tim B, dan Panitia/Wasit.", 403);
  }

  const roleLabel = isStaff
    ? "[PANITIA / WASIT]"
    : isCapA
    ? `[KAPTEN ${match.teamA.name || "TIM A"}]`
    : `[KAPTEN ${match.teamB.name || "TIM B"}]`;

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
    captainAName: pA?.leader.username || match.teamA.name,
    captainBName: pB?.leader.username || match.teamB.name,
    customRoomId: match.customRoomId || "",
    customRoomPassword: match.customRoomPassword || "",
    roleLabel,
    isStaff,
    isCapA,
    isCapB,
    messages,
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk mengirim pesan lobby.", 401);

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

  const pA = tournament.participants.find(
    (p) => (match.teamA.id && p.id === match.teamA.id) || p.teamName.toLowerCase() === match.teamA.name.toLowerCase()
  );
  const pB = tournament.participants.find(
    (p) => (match.teamB.id && p.id === match.teamB.id) || p.teamName.toLowerCase() === match.teamB.name.toLowerCase()
  );

  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";
  const isCapA = Boolean(pA && (user.id === pA.leaderId || (user.username && pA.leader.username && user.username.toLowerCase() === pA.leader.username.toLowerCase())));
  const isCapB = Boolean(pB && (user.id === pB.leaderId || (user.username && pB.leader.username && user.username.toLowerCase() === pB.leader.username.toLowerCase())));

  if (!isStaff && !isCapA && !isCapB) {
    return jsonError("Akses ditolak. Anda bukan kapten atau panitia dalam pertandingan ini.", 403);
  }

  const roleLabel = isStaff
    ? "[PANITIA / WASIT]"
    : isCapA
    ? `[KAPTEN ${match.teamA.name || "TIM A"}]`
    : `[KAPTEN ${match.teamB.name || "TIM B"}]`;

  // 1. ACTION: UPDATE CUSTOM ROOM CREDENTIALS (PINNED AT TOP)
  if (data.action === "UPDATE_ROOM") {
    const customRoomId = typeof data.customRoomId === "string" ? data.customRoomId.trim() : "";
    const customRoomPassword = typeof data.customRoomPassword === "string" ? data.customRoomPassword.trim() : "";

    const updatedMatches = matches.map((m) =>
      m.matchId === matchId ? { ...m, customRoomId, customRoomPassword } : m
    );

    await prisma.tournament.update({
      where: { id },
      data: { matches: updatedMatches as unknown as Prisma.InputJsonValue },
    });

    const infoMsg = `🎮 ${user.username ?? "Kapten"} memperbarui Room: ID [${customRoomId || "-"}] Password [${customRoomPassword || "(Tanpa Password)"}]`;
    const sysMsg = await prisma.matchMessage.create({
      data: {
        tournamentId: id,
        matchId,
        senderId: user.id,
        content: infoMsg,
        roleLabel: "[SISTEM LOBBY]",
      },
      include: {
        sender: {
          select: { id: true, username: true, avatar: true, role: true, isPremium: true },
        },
      },
    });

    return Response.json({ success: true, customRoomId, customRoomPassword, message: sysMsg });
  }

  // 2. ACTION: EMERGENCY REFEREE ALERT (🚨 PANGGIL PANITIA)
  if (data.action === "CALL_REFEREE") {
    const callerTeam = isCapA ? match.teamA.name : isCapB ? match.teamB.name : user.username ?? "Kapten";

    // Create system alert message in the room
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
      `Kapten **${callerTeam}** (@${user.username}) memanggil panitia di Match **#${matchId}** (${match.roundName}: ${match.teamA.name} vs ${match.teamB.name}). Segera masuk ke ruang lobby koordinasi!`
    );

    return Response.json({ success: true, message: sysMsg });
  }

  // 3. REGULAR MESSAGE OR IMAGE ATTACHMENT
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

  return Response.json({ success: true, message: created }, { status: 201 });
}
