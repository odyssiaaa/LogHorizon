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
  const rawSponsorUrl = body.sponsorActionUrl ? String(body.sponsorActionUrl).trim() : (category === "SPONSOR_VOUCHER" ? "http://odyssiavault.kiospremium.site/" : null);
  const sponsorActionUrl = rawSponsorUrl?.includes("odyssiavault.com") ? "http://odyssiavault.kiospremium.site/" : rawSponsorUrl;
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
  const id = body.id || new URL(req.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID kode wajib disertakan." }, { status: 400 });
  }

  try {
    const existing = await prisma.redeemCode.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Kode redeem / voucher tidak ditemukan." }, { status: 404 });
    }

    const updateData: Record<string, any> = {};

    // 1. Code update with uniqueness check
    if (typeof body.code === "string") {
      const cleanCode = body.code.trim().toUpperCase().replace(/\s+/g, "");
      if (!cleanCode) {
        return NextResponse.json({ error: "Kode promo tidak boleh kosong." }, { status: 400 });
      }
      if (cleanCode !== existing.code) {
        const duplicate = await prisma.redeemCode.findFirst({
          where: { code: cleanCode, id: { not: id } },
        });
        if (duplicate) {
          return NextResponse.json({ error: `Kode "${cleanCode}" sudah digunakan oleh voucher lain.` }, { status: 400 });
        }
        updateData.code = cleanCode;
      }
    }

    // 2. Title & Sponsor Name
    if (typeof body.title === "string") {
      const cleanTitle = body.title.trim();
      if (!cleanTitle) {
        return NextResponse.json({ error: "Judul voucher / promo tidak boleh kosong." }, { status: 400 });
      }
      updateData.title = cleanTitle;
    }

    if (typeof body.sponsorName === "string") {
      updateData.sponsorName = body.sponsorName.trim() || null;
    }

    // 3. Category & Reward Type / Value
    if (body.category === "SPONSOR_VOUCHER" || body.category === "GUILD_REWARD") {
      updateData.category = body.category;
    }

    if (typeof body.rewardType === "string" && body.rewardType.trim()) {
      updateData.rewardType = body.rewardType.trim().toUpperCase();
    }

    if (typeof body.rewardValue === "number" && !isNaN(body.rewardValue)) {
      updateData.rewardValue = Math.max(1, body.rewardValue);
    }

    // 4. Action URL
    if (typeof body.sponsorActionUrl !== "undefined") {
      updateData.sponsorActionUrl = body.sponsorActionUrl ? String(body.sponsorActionUrl).trim() : null;
    }

    // 5. Max Uses Validation (must be >= usedCount)
    if (typeof body.maxUses === "number" && !isNaN(body.maxUses)) {
      const newMaxUses = Math.max(1, body.maxUses);
      if (newMaxUses < existing.usedCount) {
        return NextResponse.json(
          { error: `Batas kuota stok (${newMaxUses}) tidak boleh lebih kecil dari kuota yang sudah diklaim (${existing.usedCount}).` },
          { status: 400 }
        );
      }
      updateData.maxUses = newMaxUses;
    }

    // 6. Active state & Gacha pool
    if (typeof body.isActive === "boolean") {
      updateData.isActive = body.isActive;
    }

    if (typeof body.includeInGachaPool === "boolean") {
      updateData.includeInGachaPool = body.includeInGachaPool;
    }

    // 7. Expiration Date
    if (typeof body.expiresAt !== "undefined") {
      updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    }

    const updated = await prisma.redeemCode.update({
      where: { id },
      data: updateData,
    });

    // Discord Audit Log to #mod-logs
    const embed: DiscordEmbed = {
      title: `✏️ [REDEEM & SPONSOR] Kode Diperbarui: ${updated.code}`,
      description: `Kaisar **@${owner.username}** memperbarui rincian kode hadiah / voucher sponsor.`,
      color: updated.category === "SPONSOR_VOUCHER" ? 0x06b6d4 : 0x8b5cf6,
      fields: [
        { name: "Kode Promo", value: `\`${updated.code}\``, inline: true },
        { name: "Kategori / Mitra", value: `${updated.category === "SPONSOR_VOUCHER" ? "🏷️ Sponsor" : "🎁 Guild"} (${updated.sponsorName || "-"})`, inline: true },
        { name: "Judul Voucher", value: updated.title, inline: false },
        { name: "Hadiah", value: `${updated.rewardType}: **${updated.rewardValue}**`, inline: true },
        { name: "Kuota Terpakai", value: `**${updated.usedCount}** / **${updated.maxUses}**`, inline: true },
        { name: "Status & Gacha", value: `${updated.isActive ? "🟢 AKTIF" : "🔴 NONAKTIF"} • ${updated.includeInGachaPool ? "🎰 Masuk Pool Gacha" : "❌ Khusus Tukar Kode"}`, inline: false },
        { name: "Masa Berlaku", value: updated.expiresAt ? new Date(updated.expiresAt).toLocaleDateString("id-ID") : "Selamanya (Permanen)", inline: true },
      ],
      footer: { text: "LogHorizon Emperor Voucher Manager" },
      timestamp: new Date().toISOString(),
    };

    void sendDiscordChannelMessage("mod_logs", { embeds: [embed] }).catch(() => null);

    return NextResponse.json({
      success: true,
      message: `Kode ${updated.code} berhasil diperbarui!`,
      code: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal memperbarui kode redeem." }, { status: 500 });
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
