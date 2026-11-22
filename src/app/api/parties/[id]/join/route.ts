import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sanitizePlainText } from "@/lib/sanitize";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk mengajukan bergabung.", 401);

  const { id: partyId } = await params;
  const body = await request.json().catch(() => ({}));
  const rawMessage = typeof body.message === "string" ? body.message.trim() : "";
  const message = sanitizePlainText(rawMessage);

  // Check if user is already in a party
  const existingMembership = await prisma.guildPartyMember.findUnique({
    where: { userId: user.id },
    include: { party: { select: { name: true, tag: true } } },
  });

  if (existingMembership) {
    return jsonError(
      `Kamu sudah menjadi anggota party [${existingMembership.party.tag}] ${existingMembership.party.name}. Keluar dari party saat ini jika ingin berpindah.`,
      400
    );
  }

  // Check party
  const party = await prisma.guildParty.findUnique({
    where: { id: partyId },
    include: {
      _count: { select: { members: true } },
    },
  });

  if (!party) return jsonError("Party tidak ditemukan.", 404);

  if (party._count.members >= party.maxMembers) {
    return jsonError("Kapasitas anggota party ini sudah penuh (maksimal 10 petualang).", 400);
  }

  // Check if pending request already exists
  const existingRequest = await prisma.guildPartyJoinRequest.findFirst({
    where: {
      partyId,
      userId: user.id,
      status: "PENDING",
    },
  });

  if (existingRequest) {
    return jsonError("Pengajuan bergabungmu ke party ini sedang menunggu persetujuan Ketua Party.", 400);
  }

  // Create or update join request
  const joinRequest = await prisma.guildPartyJoinRequest.create({
    data: {
      partyId,
      userId: user.id,
      message: message || "Halo! Saya ingin bergabung berjuang bersama di party ini.",
      status: "PENDING",
    },
  });

  // Notify Party Leader
  void createNotification({
    userId: party.leaderId,
    type: "SYSTEM",
    message: `🛡️ Petualang @${user.username ?? "Gamer"} mengajukan permohonan bergabung ke party [${party.tag}] ${party.name}!`,
    link: `/events?view=party`,
  });

  return Response.json({
    success: true,
    message: `Permohonan bergabung ke party [${party.tag}] ${party.name} berhasil dikirim! Tunggu konfirmasi Ketua Party.`,
    request: joinRequest,
  });
}
