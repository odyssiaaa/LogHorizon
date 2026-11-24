import { NextResponse } from "next/server";
import { requireOwnerOdyssia } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { sendDiscordChannelMessage, DiscordEmbed, getBaseAppUrl } from "@/lib/discord-bot";

export const instant = false;

export async function GET(req: Request) {
  const { user: owner, response } = await requireOwnerOdyssia();
  if (response || !owner) return response;

  try {
    const codes = await prisma.redeemCode.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        claims: {
          select: {
            id: true,
            userId: true,
            uniqueClaimSerial: true,
            source: true,
            claimedAt: true,
            user: {
              select: {
                username: true,
                name: true,
                avatar: true,
              },
            },
          },
          take: 10,
          orderBy: { claimedAt: "desc" },
        },
      },
    });

    return NextResponse.json({ codes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal memuat kode redeem." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user: owner, response } = await requireOwnerOdyssia();
  if (response || !owner) return response;

  const body = await req.json().catch(() => ({}));
  const rawCode = String(body.code || "").trim().toUpperCase().replace(/\s+/g, "");
  const category = body.category === "SPONSOR_VOUCHER" ? "SPONSOR_VOUCHER" : "GUILD_REWARD";
  const sponsorName = String(body.sponsorName || (category === "SPONSOR_VOUCHER" ? "OdyssiaVault" : "LogHorizon")).trim();
  const title = String(body.title || "").trim();
  const rewardType = String(body.rewardType || (category === "SPONSOR_VOUCHER" ? "SPONSOR_DISCOUNT" : "GACHA_TICKETS")).toUpperCase();
  const rewardValue = Math.max(1, Number(body.rewardValue) || 1);
  const sponsorActionUrl = body.sponsorActionUrl ? String(body.sponsorActionUrl).trim() : null;
  const includeInGachaPool = Boolean(body.includeInGachaPool);
  const maxUses = Math.max(1, Number(body.maxUses) || 50);
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  if (!rawCode) {
    return NextResponse.json({ error: "Kode wajib diisi (tanpa spasi)." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Judul hadiah / promo wajib diisi." }, { status: 400 });
  }

  try {
    const existing = await prisma.redeemCode.findUnique({
      where: { code: rawCode },
    });
    if (existing) {
      return NextResponse.json({ error: `Kode "${rawCode}" sudah terdaftar sebelumnya.` }, { status: 400 });
    }

    const created = await prisma.redeemCode.create({
      data: {
        code: rawCode,
        category,
        sponsorName,
        title,
        rewardType,
        rewardValue,
        sponsorActionUrl,
        includeInGachaPool,
        maxUses,
        expiresAt,
      },
    });

    // Send Discord Audit to #mod-logs
    const appUrl = getBaseAppUrl();
    const embed: DiscordEmbed = {
      title: `🎟️ [REDEEM & SPONSOR] Kode Baru Diterbitkan: ${rawCode}`,
      description: `Kaisar **@${owner.username}** menerbitkan kode hadiah/voucher baru untuk komunitas.`,
      color: category === "SPONSOR_VOUCHER" ? 0x06b6d4 : 0xf59e0b,
      fields: [
        { name: "Kode Promo", value: `\`${rawCode}\``, inline: true },
        { name: "Kategori", value: category === "SPONSOR_VOUCHER" ? `🏷️ Sponsor (${sponsorName})` : "🎁 Hadiah Guild", inline: true },
        { name: "Judul / Promo", value: title, inline: false },
        { name: "Hadiah", value: `${rewardType}: **${rewardValue}**`, inline: true },
        { name: "Kuota Stok", value: `${maxUses} Pengguna`, inline: true },
        { name: "Pool Royal Gacha", value: includeInGachaPool ? "✅ AKTIF (Legendary Drop)" : "❌ Khusus Tukar Kode", inline: true },
        { name: "Masa Berlaku", value: expiresAt ? expiresAt.toLocaleDateString("id-ID") : "Selamanya (Permanen)", inline: true },
      ],
      footer: { text: "LogHorizon Redeem & Sponsor Vault Gate" },
      timestamp: new Date().toISOString(),
    };

    void sendDiscordChannelMessage("mod_logs", { embeds: [embed] }).catch(() => null);

    return NextResponse.json({
      success: true,
      message: `Kode ${rawCode} berhasil diterbitkan!`,
      code: created,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal membuat kode redeem." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { user: owner, response } = await requireOwnerOdyssia();
  if (response || !owner) return response;

  const body = await req.json().catch(() => ({}));
  const { id, isActive, maxUses, includeInGachaPool } = body;

  if (!id) {
    return NextResponse.json({ error: "ID kode wajib disertakan." }, { status: 400 });
  }

  const updateData: Record<string, any> = {};
  if (typeof isActive === "boolean") updateData.isActive = isActive;
  if (typeof includeInGachaPool === "boolean") updateData.includeInGachaPool = includeInGachaPool;
  if (typeof maxUses === "number" && maxUses > 0) updateData.maxUses = maxUses;

  try {
    const updated = await prisma.redeemCode.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Status kode ${updated.code} berhasil diperbarui!`,
      code: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal memperbarui status kode." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { user: owner, response } = await requireOwnerOdyssia();
  if (response || !owner) return response;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID kode wajib disertakan." }, { status: 400 });
  }

  try {
    const deleted = await prisma.redeemCode.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Kode ${deleted.code} berhasil dihapus dari sistem.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal menghapus kode." }, { status: 500 });
  }
}
