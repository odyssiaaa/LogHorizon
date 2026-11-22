import { Prisma } from "@prisma/client";
import { activeUser, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sanitizePlainText } from "@/lib/sanitize";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim();
    const game = url.searchParams.get("game")?.trim();

    const where: Prisma.GuildPartyWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { tag: { contains: search, mode: "insensitive" } },
        { primaryGame: { contains: search, mode: "insensitive" } },
      ];
    }
    if (game && game !== "ALL") {
      where.primaryGame = { contains: game, mode: "insensitive" };
    }

    const parties = await prisma.guildParty.findMany({
      where,
      orderBy: [{ totalPartyXp: "desc" }, { createdAt: "desc" }],
      include: {
        leader: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
            level: true,
            equippedAvatarFrame: true,
            equippedCustomTitle: true,
          },
        },
        members: {
          select: {
            id: true,
            role: true,
            inGameNickname: true,
            inGameId: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                level: true,
                xp: true,
                equippedAvatarFrame: true,
                equippedCustomTitle: true,
              },
            },
          },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    // Compute updated totalPartyXp for each party dynamically from its current members
    const formatted = parties.map((party, index) => {
      const computedXp = party.members.reduce((sum, m) => sum + (m.user.xp || 0), 0);
      return {
        id: party.id,
        name: party.name,
        tag: party.tag,
        description: party.description,
        primaryGame: party.primaryGame,
        emblemColor: party.emblemColor,
        maxMembers: party.maxMembers,
        totalPartyXp: Math.max(party.totalPartyXp, computedXp),
        leader: party.leader,
        membersCount: party._count.members,
        members: party.members,
        createdAt: party.createdAt,
        rank: index + 1,
      };
    });

    return Response.json({
      success: true,
      parties: formatted,
      totalParties: formatted.length,
    });
  } catch (error) {
    console.error("[api/parties] Error loading parties:", error);
    return jsonError("Gagal memuat direktori guild party.", 500);
  }
}

export async function POST(request: Request) {
  const user = await activeUser();
  if (!user) return jsonError("Login diperlukan untuk membuat party.", 401);

  const body = await request.json().catch(() => ({}));
  const rawName = typeof body.name === "string" ? body.name.trim() : "";
  const rawTag = typeof body.tag === "string" ? body.tag.trim() : "";
  const rawGame = typeof body.primaryGame === "string" ? body.primaryGame.trim() : "";
  const description = typeof body.description === "string" ? sanitizePlainText(body.description.trim()) : "";
  const emblemColor = typeof body.emblemColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(body.emblemColor)
    ? body.emblemColor
    : "#8B5CF6";

  const name = sanitizePlainText(rawName);
  const tag = sanitizePlainText(rawTag).toUpperCase();
  const primaryGame = sanitizePlainText(rawGame);

  if (!name || name.length < 3 || name.length > 30) {
    return jsonError("Nama party harus antara 3 - 30 karakter.", 400);
  }

  if (!tag || tag.length < 2 || tag.length > 5 || !/^[A-Z0-9]{2,5}$/.test(tag)) {
    return jsonError("Tag party harus 2 - 5 karakter alfanumerik (huruf/angka, contoh: NVG, KNT).", 400);
  }

  if (!primaryGame || primaryGame.length > 40) {
    return jsonError("Game utama wajib dipilih / diisi (maksimal 40 karakter).", 400);
  }

  // Check if user is already in any active party (anti-spam rule: 1 active party per member)
  const existingMembership = await prisma.guildPartyMember.findUnique({
    where: { userId: user.id },
    include: { party: { select: { name: true, tag: true } } },
  });

  if (existingMembership) {
    return jsonError(
      `Kamu sudah menjadi anggota party [${existingMembership.party.tag}] ${existingMembership.party.name}. Kamu harus keluar terlebih dahulu untuk membuat party baru.`,
      400
    );
  }

  // Check if party name or tag is already taken
  const duplicate = await prisma.guildParty.findFirst({
    where: {
      OR: [
        { name: { equals: name, mode: "insensitive" } },
        { tag: { equals: tag, mode: "insensitive" } },
      ],
    },
    select: { name: true, tag: true },
  });

  if (duplicate) {
    if (duplicate.tag.toUpperCase() === tag) {
      return jsonError(`Tag party [${tag}] sudah digunakan oleh kelompok lain. Silakan pilih tag lain.`, 409);
    }
    return jsonError(`Nama party "${name}" sudah terdaftar. Silakan pilih nama lain.`, 409);
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Create Party Group Chat in Conversation model
        const conversation = await tx.conversation.create({
          data: {
            name: `Party [${tag}] ${name}`,
            isGroup: true,
            creatorId: user.id,
          },
        });

        // Add creator as conversation participant
        await tx.conversationParticipant.create({
          data: {
            conversationId: conversation.id,
            userId: user.id,
          },
        });

        // Add initial system announcement inside party chat
        await tx.directMessage.create({
          data: {
            conversationId: conversation.id,
            senderId: user.id,
            content: `🛡️ Markas obrolan resmi party [${tag}] ${name} telah resmi didirikan! Gunakan ruang ini untuk berkoordinasi, mabar, dan menyusun strategi turnamen.`,
          },
        });

        // 2. Create GuildParty
        const party = await tx.guildParty.create({
          data: {
            name,
            tag,
            description,
            primaryGame,
            emblemColor,
            leaderId: user.id,
            maxMembers: 10,
            totalPartyXp: user.xp || 0,
            conversationId: conversation.id,
          },
        });

        // 3. Create GuildPartyMember as LEADER
        const member = await tx.guildPartyMember.create({
          data: {
            partyId: party.id,
            userId: user.id,
            role: "LEADER",
            inGameNickname: user.inGameName || user.username || "Leader",
            inGameId: "",
          },
        });

        return { party, member, conversationId: conversation.id };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return Response.json(
      {
        success: true,
        message: `Party [${tag}] ${name} berhasil dibentuk!`,
        party: result.party,
        conversationId: result.conversationId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[api/parties] Error creating party:", error);
    return jsonError("Gagal membentuk party. Silakan coba kembali.", 500);
  }
}
