import {
  DiscordEmbed,
  DiscordEmbedField,
  DiscordChannelKey,
  sendDiscordChannelMessage,
  resolveDiscordChannelKey,
  getBaseAppUrl,
  getDiscordWebhookUrl,
  DISCORD_CHANNELS,
} from "@/lib/discord-bot";

export type {
  DiscordEmbed,
  DiscordEmbedField,
  DiscordChannelKey,
};

export {
  sendDiscordChannelMessage,
  resolveDiscordChannelKey,
  getBaseAppUrl,
  getDiscordWebhookUrl,
  DISCORD_CHANNELS,
};

export type DiscordWebhookPayload = {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
};

/**
 * Send an arbitrary webhook payload to Discord (backward compatible wrapper).
 * Routes to announcements by default via Bot REST API or webhook fallback.
 */
export async function sendDiscordWebhook(payload: DiscordWebhookPayload): Promise<boolean> {
  const result = await sendDiscordChannelMessage("announcements", {
    content: payload.content,
    embeds: payload.embeds,
  });
  return result.success;
}

/**
 * 1. Channel #📢・announcements
 * Event: Turnamen Selesai / Juara Baru (Hall of Winners)
 */
export async function notifyTournamentChampion(data: {
  tournamentTitle: string;
  game: string;
  championName: string;
  runnerUpName?: string | null;
  thirdPlaceName?: string | null;
  prizePool?: string | null;
  certificateUrl?: string | null;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const hallUrl = `${baseUrl}/hall-of-winners`;

  const fields: DiscordEmbedField[] = [
    { name: "🎮 Game", value: data.game || "Kompetisi Guild", inline: true },
    { name: "👑 JUARA 1 (CHAMPION)", value: `**${data.championName}**`, inline: true },
  ];

  if (data.runnerUpName) {
    fields.push({ name: "🥈 JUARA 2 (RUNNER-UP)", value: data.runnerUpName, inline: true });
  }

  if (data.thirdPlaceName) {
    fields.push({ name: "🥉 JUARA 3", value: data.thirdPlaceName, inline: true });
  }

  if (data.prizePool) {
    fields.push({ name: "💰 Total Hadiah", value: data.prizePool, inline: true });
  }

  fields.push({
    name: "📜 Hall of Winners & Sertifikat",
    value: `[Lihat Arsip Juara Resmi di Website](${hallUrl})`,
    inline: false,
  });

  const embed: DiscordEmbed = {
    title: `🏆 PENGUMUMAN JUARA RESMI: ${data.tournamentTitle}`,
    description: `Selamat kepada para pemenang turnamen guild **LogHorizon**! Peringkat dan sertifikat digital telah diarsipkan di Hall of Winners.`,
    url: hallUrl,
    color: 0xF59E0B, // Gold / Amber
    fields,
    footer: {
      text: "LogHorizon Esports League • Hall of Winners",
    },
    timestamp: new Date().toISOString(),
  };

  if (data.certificateUrl) {
    embed.image = { url: data.certificateUrl };
  }

  await sendDiscordChannelMessage("announcements", {
    content: "📢 **PENGUMUMAN KEJUARAAN TURNAMEN GUILD LOGHORIZON!** @everyone",
    embeds: [embed],
  });
}

/**
 * 2. Channel #🎮・gaming-lounge
 * Event: Party Mabar (LFG) Baru Dibuat
 */
export async function notifyNewLfgParty(data: {
  partyTitle: string;
  game: string;
  hostName?: string | null;
  requiredSlots: number;
  modeOrRank?: string | null;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const mabarUrl = `${baseUrl}/events?view=mabar`;
  const host = data.hostName || "Petualang Guild";

  const fields: DiscordEmbedField[] = [
    { name: "🎮 Game", value: data.game, inline: true },
    { name: "👑 Host Party", value: host, inline: true },
    { name: "👥 Slot Kosong", value: `${data.requiredSlots} Pemain`, inline: true },
  ];

  if (data.modeOrRank) {
    fields.push({ name: "🎯 Mode / Target Rank", value: data.modeOrRank, inline: true });
  }

  fields.push({
    name: "🚀 Gabung Party",
    value: `[Klik di sini untuk join lobby mabar di website](${mabarUrl})`,
    inline: false,
  });

  const embed: DiscordEmbed = {
    title: `⚔️ AJAKAN MABAR BARU: ${data.partyTitle}`,
    description: `Petualang **${host}** sedang mencari kawan mabar untuk **${data.game}**! Slot terbatas, segera bergabung.`,
    url: mabarUrl,
    color: 0x7C3AED, // Cyber Purple
    fields,
    footer: {
      text: "LogHorizon Gaming Lounge & LFG Matchmaking",
    },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("lfg", {
    embeds: [embed],
  });
}

/**
 * 3. Channel #🛡️・mod-logs
 * Event: Tiket Rekber Baru / Laporan Konten / Security Alert
 */
export async function notifyStaffAlert(data: {
  type: "ESCROW" | "REPORT" | "SECURITY";
  title: string;
  actorName?: string | null;
  details: string;
  amountOrTarget?: string | null;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const adminUrl = `${baseUrl}/admin`;
  const actor = data.actorName || "Member";

  const isEscrow = data.type === "ESCROW";
  const isSecurity = data.type === "SECURITY";
  const categoryLabel = isEscrow
    ? "🛡️ Rekber Marketplace"
    : isSecurity
    ? "🚨 Log Keamanan Satpam AI"
    : "⚠️ Laporan Konten / Member";

  const fields: DiscordEmbedField[] = [
    { name: "👤 Pembuat / Pelapor", value: actor, inline: true },
    { name: "📌 Kategori", value: categoryLabel, inline: true },
  ];

  if (data.amountOrTarget) {
    fields.push({
      name: isEscrow ? "💵 Nilai Transaksi" : "🎯 Objek Terkait",
      value: data.amountOrTarget,
      inline: true,
    });
  }

  fields.push(
    { name: "📝 Detail Insiden / Transaksi", value: data.details.slice(0, 500), inline: false },
    { name: "🛡️ Tindakan Cepat Pengurus", value: `[Buka Admin Command Center (${adminUrl})](${adminUrl})`, inline: false }
  );

  const embed: DiscordEmbed = {
    title: isEscrow
      ? `🛡️ TIKET REKBER BARU: ${data.title}`
      : isSecurity
      ? `🚨 ALERT KEAMANAN: ${data.title}`
      : `⚠️ LAPORAN KONTEN MASUK: ${data.title}`,
    description: isEscrow
      ? `Transaksi rekber resmi guild baru saja dibuat dan menunggu penanganan pengurus kas.`
      : isSecurity
      ? `Percobaan eksploitasi atau pelanggaran keamanan dicegah oleh Satpam AI.`
      : `Member melaporkan konten atau pelanggaran aturan komunitas yang memerlukan review moderator.`,
    url: adminUrl,
    color: isEscrow ? 0x10B981 : isSecurity ? 0xEF4444 : 0xF59E0B,
    fields,
    footer: {
      text: "LogHorizon Security Guard • Mod Logs Alert",
    },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("mod_logs", {
    content: "🚨 **PANGGILAN KEAMANAN STAFF GUILD** (Attention: **.odyssia** & Staff Council)",
    embeds: [embed],
  });
}

/**
 * 4. Channel #📡・info-live
 * Event: Pertandingan Turnamen Mulai (Status LIVE) / Siaran Langsung
 */
export async function notifyTournamentMatchLive(data: {
  tournamentTitle: string;
  tournamentId: string;
  matchId: string;
  roundName: string;
  teamAName: string;
  teamBName: string;
  liveUrl?: string | null;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const matchUrl = data.liveUrl || `${baseUrl}/events/turnamen/${data.tournamentId}`;

  const embed: DiscordEmbed = {
    title: `🔴 PERTANDINGAN SEDANG BERMAIN (LIVE): #${data.matchId.toUpperCase()} • ${data.roundName}`,
    description: `Pertandingan turnamen **${data.tournamentTitle}** resmi dimulai!\n\n⚔️ **${data.teamAName}** vs **${data.teamBName}**`,
    url: matchUrl,
    color: 0xEF4444, // Red Live
    fields: [
      { name: "🏆 Turnamen", value: data.tournamentTitle, inline: true },
      { name: "⚡ Status", value: "🔴 SEDANG BERMAIN", inline: true },
      { name: "📺 Tonton Bagan & Live Match", value: `[Buka Bagan Turnamen di Website](${matchUrl})`, inline: false },
    ],
    footer: {
      text: "LogHorizon Esports League • Live Arena",
    },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("info_live", {
    content: `📡 **MATCH LIVE UPDATE!** Pertandingan **#${data.matchId.toUpperCase()}** sedang bertanding di server LogHorizon! @here`,
    embeds: [embed],
  });
}

/**
 * 5. Channel #🤝・partnership
 * Event: Promosi Donatur / VIP & Mitra Sponsor Baru
 */
export async function notifyPartnership(data: {
  title: string;
  sponsorOrMemberName: string;
  tierOrBadge?: string | null;
  linkUrl?: string | null;
  description: string;
  logoUrl?: string | null;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const targetUrl = data.linkUrl || baseUrl;

  const embed: DiscordEmbed = {
    title: `🤝 OFFICIAL PARTNERSHIP & VIP SPOTLIGHT: ${data.title}`,
    description: data.description,
    url: targetUrl,
    color: 0x8B5CF6, // Purple
    fields: [
      { name: "✨ Mitra / Donatur", value: data.sponsorOrMemberName, inline: true },
      { name: "👑 Tier / Pangkat", value: data.tierOrBadge || "Official Guild Partner", inline: true },
      { name: "🔗 Laman Profil / Website", value: `[Kunjungi Tautan](${targetUrl})`, inline: false },
    ],
    footer: {
      text: "LogHorizon Guild Partnership & Benefactor Network",
    },
    timestamp: new Date().toISOString(),
  };

  if (data.logoUrl) {
    embed.thumbnail = { url: data.logoUrl };
  }

  await sendDiscordChannelMessage("partnership", {
    embeds: [embed],
  });
}

/**
 * 6. Channel #🎁・events-giveaway
 * Event: Giveaway / Undian Berhadiah Komunitas
 */
export async function notifyGiveaway(data: {
  title: string;
  prize: string;
  description: string;
  eventUrl?: string | null;
  endDateText?: string | null;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const eventUrl = data.eventUrl || `${baseUrl}/events`;

  const embed: DiscordEmbed = {
    title: `🎁 COMMUNITY GIVEAWAY RESMI: ${data.title}`,
    description: data.description,
    url: eventUrl,
    color: 0xEC4899, // Pink
    fields: [
      { name: "🏆 Hadiah Undian", value: data.prize, inline: true },
      { name: "⏳ Periode Berakhir", value: data.endDateText || "Lihat di Website", inline: true },
      { name: "🎟️ Cara Ikut & Syarat", value: `[Buka Event di Website LogHorizon](${eventUrl})`, inline: false },
    ],
    footer: {
      text: "LogHorizon Community Events & Giveaways",
    },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("giveaway", {
    content: "🎁 **COMMUNITY GIVEAWAY ALERT!** Jangan lewatkan undian berhadiah resmi guild! @everyone",
    embeds: [embed],
  });
}

/**
 * 7. Channel #🛒・server-shop
 * Event: Lapak Marketplace Baru (WTS / WTB / Jasa)
 */
export async function notifyMarketplaceListing(data: {
  postId: string;
  title: string;
  type: string;
  game: string;
  price: number;
  sellerName?: string | null;
  imageUrl?: string | null;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const listingUrl = `${baseUrl}/marketplace?id=${data.postId}`;
  const seller = data.sellerName || "Member";

  const typeBadge = data.type === "WTS" ? "🏷️ WTS (Dijual)" : data.type === "WTB" ? "🔍 WTB (Dicari)" : "🛠️ Jasa / Joki";
  const formattedPrice = `Rp ${data.price.toLocaleString("id-ID")}`;

  const fields: DiscordEmbedField[] = [
    { name: "📌 Tipe Lapak", value: typeBadge, inline: true },
    { name: "🎮 Game", value: data.game, inline: true },
    { name: "💰 Harga", value: formattedPrice, inline: true },
    { name: "👤 Penjual / Pembeli", value: seller, inline: true },
    { name: "🛡️ Keamanan", value: "Tersedia Rekber Resmi Guild", inline: true },
    {
      name: "🛒 Buka Lapak di Website",
      value: `[Klik di sini untuk melihat rincian & kontak lapak](${listingUrl})`,
      inline: false,
    },
  ];

  const embed: DiscordEmbed = {
    title: `🛒 LAPAK BARU DI SERVER SHOP: ${data.title}`,
    description: `Member **${seller}** baru saja membuka listing **${data.type}** untuk game **${data.game}** seharga **${formattedPrice}**!`,
    url: listingUrl,
    color: data.type === "WTS" ? 0x10B981 : data.type === "WTB" ? 0x3B82F6 : 0x8B5CF6,
    fields,
    footer: {
      text: "LogHorizon Gamer Marketplace • Server Shop",
    },
    timestamp: new Date().toISOString(),
  };

  if (data.imageUrl) {
    embed.image = { url: data.imageUrl };
  }

  await sendDiscordChannelMessage("shop", {
    content: `🛒 **LAPAK BARU DI MARKETPLACE GUILD!** Silakan cek listing terbaru di #🛒・server-shop:`,
    embeds: [embed],
  });
}

/**
 * Legacy compatibility helper for simple channel/title notices.
 * Intelligently routes to the correct Discord channel based on topic or channel name parameter!
 */
export async function sendDiscordNotice(
  channel: string,
  title: string,
  detail: string,
  url?: string | null,
  imageUrl?: string | null
): Promise<boolean> {
  const targetChannelKey = resolveDiscordChannelKey(channel);

  const embed: DiscordEmbed = {
    title: title.slice(0, 256),
    description: detail.slice(0, 4000),
    color: 0x7C3AED,
    timestamp: new Date().toISOString(),
    footer: {
      text: "LogHorizon Guild Dispatch",
    },
  };
  if (url) embed.url = url;
  if (imageUrl) embed.image = { url: imageUrl };

  const result = await sendDiscordChannelMessage(targetChannelKey, {
    embeds: [embed],
  });

  return result.success;
}
