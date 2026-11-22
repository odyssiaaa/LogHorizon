import { Prisma } from "@prisma/client";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sanitizePlainText } from "@/lib/sanitize";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan.", 401);

  const { id: partyId } = await params;
  const body = await request.json().catch(() => ({}));
  const { action, targetUserId, requestId, inGameNickname, inGameId, role } = body;

  const party = await prisma.guildParty.findUnique({
    where: { id: partyId },
    include: {
      members: true,
    },
  });

  if (!party) return jsonError("Party tidak ditemukan.", 404);

  const viewerMembership = party.members.find((m) => m.userId === user.id);
  const isLeader = viewerMembership?.role === "LEADER";
  const isCoLeader = viewerMembership?.role === "CO_LEADER";
  const isOfficer = isLeader || isCoLeader;

  // 1. APPROVE JOIN REQUEST
  if (action === "APPROVE_REQUEST") {
    if (!isOfficer) {
      return jsonError("Hanya Ketua atau Wakil Ketua Party yang dapat menyetujui anggota baru.", 403);
    }

    if (party.members.length >= party.maxMembers) {
      return jsonError("Kapasitas anggota party sudah mencapai batas maksimal (10).", 400);
    }

    const joinReq = await prisma.guildPartyJoinRequest.findFirst({
      where: {
        partyId,
        ...(requestId ? { id: requestId } : { userId: targetUserId }),
        status: "PENDING",
      },
    });

    if (!joinReq) return jsonError("Permohonan bergabung tidak ditemukan atau sudah diproses.", 404);

    // Check if target user is already in another party
    const alreadyInParty = await prisma.guildPartyMember.findUnique({
      where: { userId: joinReq.userId },
    });

    if (alreadyInParty) {
      await prisma.guildPartyJoinRequest.update({
        where: { id: joinReq.id },
        data: { status: "REJECTED" },
      });
      return jsonError("Petualang ini sudah bergabung dengan party lain.", 400);
    }

    await prisma.$transaction(async (tx) => {
      // Mark request approved
      await tx.guildPartyJoinRequest.update({
        where: { id: joinReq.id },
        data: { status: "APPROVED" },
      });

      // Add to party members
      await tx.guildPartyMember.create({
        data: {
          partyId,
          userId: joinReq.userId,
          role: "MEMBER",
        },
      });

      // Add to party group chat if conversation exists
      if (party.conversationId) {
        await tx.conversationParticipant.upsert({
          where: {
            conversationId_userId: {
              conversationId: party.conversationId,
              userId: joinReq.userId,
            },
          },
          create: {
            conversationId: party.conversationId,
            userId: joinReq.userId,
          },
          update: {},
        });
      }
    });

    void createNotification({
      userId: joinReq.userId,
      type: "SYSTEM",
      message: `🎉 Selamat! Permohonan bergabungmu ke party [${party.tag}] ${party.name} telah disetujui!`,
      link: `/events?view=party`,
    });

    return Response.json({ success: true, message: "Anggota baru berhasil diterima ke dalam party!" });
  }

  // 2. REJECT JOIN REQUEST
  if (action === "REJECT_REQUEST") {
    if (!isOfficer) {
      return jsonError("Hanya Ketua atau Wakil Ketua Party yang dapat menolak anggota.", 403);
    }

    const joinReq = await prisma.guildPartyJoinRequest.findFirst({
      where: {
        partyId,
        ...(requestId ? { id: requestId } : { userId: targetUserId }),
        status: "PENDING",
      },
    });

    if (!joinReq) return jsonError("Permohonan bergabung tidak ditemukan.", 404);

    await prisma.guildPartyJoinRequest.update({
      where: { id: joinReq.id },
      data: { status: "REJECTED" },
    });

    return Response.json({ success: true, message: "Permohonan bergabung telah ditolak." });
  }

  // 3. KICK MEMBER
  if (action === "KICK_MEMBER") {
    if (!isOfficer) {
      return jsonError("Hanya Ketua atau Wakil Ketua Party yang dapat mengeluarkan anggota.", 403);
    }
    if (!targetUserId || typeof targetUserId !== "string") {
      return jsonError("Target anggota tidak valid.", 400);
    }
    if (targetUserId === user.id) {
      return jsonError("Gunakan opsi 'Keluar Party' untuk meninggalkan party.", 400);
    }

    const targetMember = party.members.find((m) => m.userId === targetUserId);
    if (!targetMember) return jsonError("Anggota tidak ditemukan di party ini.", 404);

    if (targetMember.role === "LEADER") {
      return jsonError("Ketua Party tidak dapat dikeluarkan.", 403);
    }
    if (targetMember.role === "CO_LEADER" && !isLeader) {
      return jsonError("Hanya Ketua Utama yang dapat mengeluarkan Wakil Ketua Party.", 403);
    }

    await prisma.$transaction(async (tx) => {
      await tx.guildPartyMember.delete({
        where: { id: targetMember.id },
      });

      if (party.conversationId) {
        await tx.conversationParticipant.deleteMany({
          where: {
            conversationId: party.conversationId,
            userId: targetUserId,
          },
        });
      }
    });

    void createNotification({
      userId: targetUserId,
      type: "SYSTEM",
      message: `Kamu telah dikeluarkan dari party [${party.tag}] ${party.name}.`,
      link: `/events?view=party`,
    });

    return Response.json({ success: true, message: "Anggota telah berhasil dikeluarkan dari party." });
  }

  // 4. PROMOTE / DEMOTE
  if (action === "PROMOTE_CO_LEADER" || action === "DEMOTE_MEMBER") {
    if (!isLeader) {
      return jsonError("Hanya Ketua Utama yang dapat mengubah jabatan anggota party.", 403);
    }
    if (!targetUserId || targetUserId === user.id) {
      return jsonError("Target anggota tidak valid.", 400);
    }

    const newRole = action === "PROMOTE_CO_LEADER" ? "CO_LEADER" : "MEMBER";
    await prisma.guildPartyMember.update({
      where: { userId: targetUserId },
      data: { role: newRole },
    });

    void createNotification({
      userId: targetUserId,
      type: "SYSTEM",
      message: `Jabatanmu di party [${party.tag}] ${party.name} telah diubah menjadi ${newRole === "CO_LEADER" ? "Wakil Ketua" : "Anggota"}.`,
      link: `/events?view=party`,
    });

    return Response.json({ success: true, message: `Jabatan anggota berhasil diperbarui menjadi ${newRole}.` });
  }

  // 5. UPDATE IN-GAME NICKNAME & ID
  if (action === "UPDATE_NICKNAME") {
    const targetId = targetUserId || user.id;
    // User can update their own or officer can update for them
    if (targetId !== user.id && !isOfficer) {
      return jsonError("Kamu hanya dapat mengubah ID game milikmu sendiri.", 403);
    }

    const cleanNick = typeof inGameNickname === "string" ? sanitizePlainText(inGameNickname.trim()) : "";
    const cleanId = typeof inGameId === "string" ? sanitizePlainText(inGameId.trim()) : "";

    await prisma.guildPartyMember.update({
      where: { userId: targetId },
      data: {
        inGameNickname: cleanNick || null,
        inGameId: cleanId || null,
      },
    });

    return Response.json({ success: true, message: "Nickname dan ID Game berhasil disimpan!" });
  }

  // 6. LEAVE PARTY
  if (action === "LEAVE_PARTY") {
    if (!viewerMembership) return jsonError("Kamu bukan anggota party ini.", 400);

    if (isLeader) {
      const otherMembers = party.members.filter((m) => m.userId !== user.id);
      if (otherMembers.length > 0) {
        return jsonError(
          "Sebagai Ketua, tunjuk anggota lain menjadi Ketua sebelum meninggalkan party, atau bubarkan jika ingin menghapus party.",
          400
        );
      } else {
        // Sole member: delete party
        await prisma.guildParty.delete({ where: { id: partyId } });
        return Response.json({ success: true, message: "Party berhasil dibubarkan karena tidak ada anggota tersisa." });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.guildPartyMember.delete({ where: { id: viewerMembership.id } });
      if (party.conversationId) {
        await tx.conversationParticipant.deleteMany({
          where: { conversationId: party.conversationId, userId: user.id },
        });
      }
    });

    return Response.json({ success: true, message: `Kamu telah keluar dari party [${party.tag}] ${party.name}.` });
  }

  return jsonError("Aksi manajemen tidak dikenal.", 400);
}
