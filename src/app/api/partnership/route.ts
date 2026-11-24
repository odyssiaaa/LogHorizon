import { NextResponse } from "next/server";
import { sendDiscordChannelMessage, DiscordEmbed, getBaseAppUrl } from "@/lib/discord-bot";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`partnership:${ip}`, 5, 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan pengajuan kemitraan. Mohon tunggu beberapa saat sebelum mencoba lagi." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      companyName,
      picName,
      phone,
      email,
      tier,
      estimatedValue,
      proposalDescription,
    } = body;

    // Validations
    if (!companyName || typeof companyName !== "string" || companyName.trim().length < 2) {
      return NextResponse.json({ error: "Nama Brand / Perusahaan wajib diisi (minimal 2 karakter)." }, { status: 400 });
    }
    if (!picName || typeof picName !== "string" || picName.trim().length < 2) {
      return NextResponse.json({ error: "Nama PIC / Narahubung wajib diisi (minimal 2 karakter)." }, { status: 400 });
    }
    if (!phone || typeof phone !== "string" || phone.replace(/\D/g, "").length < 9) {
      return NextResponse.json({ error: "Nomor WhatsApp / telepon wajib valid (minimal 9 digit)." }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !email.includes("@") || !email.includes(".")) {
      return NextResponse.json({ error: "Alamat email resmi wajib valid." }, { status: 400 });
    }
    if (!proposalDescription || typeof proposalDescription !== "string" || proposalDescription.trim().length < 10) {
      return NextResponse.json({ error: "Deskripsi proposal / bentuk kolaborasi wajib diisi (minimal 10 karakter)." }, { status: 400 });
    }

    let tierLabel = "Paket Kemitraan Kustom";
    if (tier === "TIER_1_COMMUNITY") {
      tierLabel = "Tier 1: Community & Media Partner";
    } else if (tier === "TIER_2_TOURNAMENT") {
      tierLabel = "Tier 2: Tournament Title & Prize Sponsor";
    } else if (tier === "TIER_3_BENEFACTOR") {
      tierLabel = "Tier 3: Official Guild Benefactor & Strategic Sponsor";
    }

    const baseAppUrl = getBaseAppUrl();

    // Prepare Discord Embed
    const embed: DiscordEmbed = {
      title: "🤝 PENGAJUAN KEMITRAAN & SPONSORSHIP RESMI [B2B DECK]",
      description: `Proposal kemitraan baru telah masuk melalui formulir resmi sponsorship LogHorizon.`,
      color: 0x7c3aed, // Purple brand color
      fields: [
        {
          name: "🏢 Brand / Perusahaan",
          value: `**${companyName.trim()}**`,
          inline: true,
        },
        {
          name: "👤 PIC Narahubung",
          value: picName.trim(),
          inline: true,
        },
        {
          name: "📞 WhatsApp & Telepon",
          value: `[${phone.trim()}](https://wa.me/${phone.replace(/\D/g, "")})`,
          inline: true,
        },
        {
          name: "✉️ Email Resmi",
          value: email.trim(),
          inline: true,
        },
        {
          name: "🎯 Paket Kemitraan Dipilih",
          value: `**${tierLabel}**`,
          inline: true,
        },
        {
          name: "💰 Estimasi / Bentuk Dukungan",
          value: estimatedValue ? String(estimatedValue).trim() : "Didiskusikan lebih lanjut",
          inline: true,
        },
        {
          name: "📝 Deskripsi Proposal & Rencana Kolaborasi",
          value: proposalDescription.trim().slice(0, 1024),
          inline: false,
        },
      ],
      footer: {
        text: `LogHorizon Partnership Deck • IP: ${ip}`,
      },
      timestamp: new Date().toISOString(),
    };

    // Send async message to #🤝・partnership and #🛡️・mod-logs
    void Promise.allSettled([
      sendDiscordChannelMessage("partnership", {
        content: `🤝 **[PROPOSAL MASUK]** Penawaran kemitraan dari **${companyName.trim()}** telah diterima:`,
        embeds: [embed],
      }),
      sendDiscordChannelMessage("mod_logs", {
        content: `🤝 **[B2B LEAD]** Proposal kemitraan baru masuk dari **${companyName.trim()}** (${picName.trim()} - ${phone.trim()}):`,
        embeds: [embed],
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Proposal kemitraan Anda telah berhasil dikirim ke Manajemen LogHorizon! Tim eksekutif kami akan segera menghubungi nomor WhatsApp / Email Anda dalam waktu 1x24 jam kerja.",
    });
  } catch (error) {
    console.error("[partnership_api_error]", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem saat memproses proposal kemitraan." },
      { status: 500 }
    );
  }
}
