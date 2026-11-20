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
 * Send an arbitrary webhook payload to Discord.
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
    {
      name: "🎮 Divisi Game",
      value: `\`${data.game}\``,
      inline: true,
    },
    {
      name: "🏆 Status",
      value: "COMPLETED / RESMI SELESAI",
      inline: true,
    },
    {
      name: "🎁 Total Hadiah",
      value: data.prizePool || "Prizepool Komunitas",
      inline: true,
    },
    {
      name: "🥇 JUARA 1 (CHAMPION)",
      value: `👑 **${data.championName}**`,
      inline: false,
    },
  ];

  if (data.runnerUpName) {
    fields.push({
      name: "🥈 JUARA 2 (RUNNER UP)",
      value: `⚔️ **${data.runnerUpName}**`,
      inline: true,
    });
  }

  if (data.thirdPlaceName) {
    fields.push({
      name: "🥉 JUARA 3",
      value: `🎖️ **${data.thirdPlaceName}**`,
      inline: true,
    });
  }

  fields.push({
    name: "📜 Hall of Winners Resmi",
    value: `Semua susunan bracket dan nama punggawa pemenang telah diabadikan secara permanen di database kerajaan LogHorizon.\n[Klik Di Sini untuk Buka Hall of Winners](${hallUrl})`,
    inline: false,
  });

  const embed: DiscordEmbed = {
    title: `🏆 PENGUMUMAN JUARA: ${data.tournamentTitle}`,
    description: `Turnamen resmi **${data.tournamentTitle}** telah selesai! Selamat kepada sang juara yang telah menorehkan sejarah di LogHorizon!`,
    color: 0xf59e0b, // Gold/Amber
    url: hallUrl,
    fields,
    footer: {
      text: "LogHorizon Tournament Engine • Hall of Winners Official Broadcast",
    },
    timestamp: new Date().toISOString(),
  };

  if (data.certificateUrl) {
    embed.image = { url: data.certificateUrl };
  }

  await sendDiscordChannelMessage("announcements", {
    content: "📢 **PENGUMUMAN JUARA TURNAMEN LOGHORIZON TELAH TIBA!**",
    embeds: [embed],
  }).catch((err) => console.warn("[Discord Bot Dispatcher] notifyTournamentChampion error:", err));
}

/**
 * 2. Channel #🎮・gaming-lounge (LFG)
 * Event: Ajakan Mabar Baru Dibuat
 */
export async function notifyNewLfgParty(data: {
  game: string;
  authorUsername?: string;
  hostName?: string | null;
  partyTitle?: string | null;
  title?: string | null;
  authorRank?: string | null;
  targetRank?: string | null;
  modeOrRank?: string | null;
  roleNeeded?: string | null;
  playGoal?: string | null;
  maxSlots?: number;
  requiredSlots?: number;
  description?: string;
  scheduledAt?: string | null;
  directUrl?: string | null;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const partyUrl = data.directUrl || `${baseUrl}/events?view=mabar`;
  const username = data.authorUsername || data.hostName || "Member";
  const titleText = data.partyTitle || data.title || `AJAKAN MABAR: ${data.game.toUpperCase()}`;
  const totalSlots =
    data.maxSlots !== undefined
      ? data.maxSlots
      : data.requiredSlots !== undefined
      ? data.requiredSlots + 1
      : 5;

  const fields: DiscordEmbedField[] = [
    {
      name: "🎮 Game",
      value: `\`${data.game}\``,
      inline: true,
    },
    {
      name: "👑 Kapten Party",
      value: `@${username}${data.authorRank ? ` (${data.authorRank})` : ""}`,
      inline: true,
    },
    {
      name: "👥 Kuota Pemain",
      value: `1 / ${totalSlots} Slot`,
      inline: true,
    },
  ];

  const rankInfo = data.targetRank || data.modeOrRank || data.authorRank;
  if (rankInfo) {
    fields.push({
      name: "🎖️ Target Rank / Mode",
      value: rankInfo,
      inline: true,
    });
  }

  if (data.roleNeeded) {
    fields.push({
      name: "🎯 Role Dicari",
      value: data.roleNeeded,
      inline: true,
    });
  }

  if (data.playGoal) {
    fields.push({
      name: "🔥 Tujuan Main",
      value: data.playGoal,
      inline: true,
    });
  }

  fields.push({
    name: "💬 Catatan & Pesan",
    value: data.description || (data.modeOrRank ? `Mode: ${data.modeOrRank}` : "Ayo mabar push rank sekarang!"),
    inline: false,
  });

  fields.push({
    name: "🔗 Gabung Party di Website",
    value: `[Klik di sini untuk Join Party Mabar](${partyUrl})`,
    inline: false,
  });

  const embed: DiscordEmbed = {
    title: `⚔️ ${titleText}`,
    description: `Petualang **@${username}** sedang mencari kawan seperjuangan untuk mabar! Segera gabung sebelum slot penuh.`,
    color: 0x9d4edd, // Purple LogHorizon
    url: partyUrl,
    fields,
    footer: {
      text: "LogHorizon Party Finder • #gaming-lounge",
    },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("lfg", {
    content: `🎮 **AJAKAN MABAR BARU // @${username} mencari teman mabar ${data.game}!**`,
    embeds: [embed],
  }).catch((err) => console.warn("[Discord Bot Dispatcher] notifyNewLfgParty error:", err));
}

/**
 * 3. Channel #🛡️・mod-logs
 * Event: Laporan Keamanan, Transaksi Rekber, atau Alert Admin
 */
export async function notifyStaffAlert(data: {
  title: string;
  description?: string;
  details?: string;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  type?: string;
  actorName?: string | null;
  amountOrTarget?: string | null;
  fields?: DiscordEmbedField[];
  url?: string;
}): Promise<void> {
  const severity = data.severity || (data.type === "CRITICAL" ? "CRITICAL" : "INFO");
  const colorMap = {
    INFO: 0x3b82f6,
    WARNING: 0xf59e0b,
    CRITICAL: 0xef4444,
  };

  const fields: DiscordEmbedField[] = [...(data.fields || [])];
  if (data.actorName && !fields.some((f) => f.name.includes("Pengguna") || f.name.includes("Pelaku") || f.name.includes("Actor"))) {
    fields.unshift({ name: "👤 Pengguna / Aktor", value: `@${data.actorName}`, inline: true });
  }
  if (data.amountOrTarget && !fields.some((f) => f.name.includes("Target") || f.name.includes("Nominal"))) {
    fields.push({ name: "🎯 Target / Nominal", value: data.amountOrTarget, inline: true });
  }

  const embed: DiscordEmbed = {
    title: `🛡️ [STAFF ALERT // ${data.type || severity}] ${data.title}`,
    description: data.description || data.details || `Peringatan staf terkait: ${data.title}`,
    color: colorMap[severity] || 0x7c3aed,
    fields,
    url: data.url,
    footer: {
      text: "LogHorizon Security & Moderation Hub • #mod-logs",
    },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("mod_logs", {
    content: severity === "CRITICAL" ? "🚨 **PERINGATAN KRITIS UNTUK STAF / MODERATOR!**" : undefined,
    embeds: [embed],
  }).catch((err) => console.warn("[Discord Bot Dispatcher] notifyStaffAlert error:", err));
}

/**
 * 4. Channel #🏆・live-info-tournament
 * Event: Pertandingan Turnamen Berstatus LIVE
 */
export async function notifyTournamentMatchLive(data: {
  tournamentTitle: string;
  game?: string;
  matchId: string;
  roundName: string;
  teamAName: string;
  teamBName: string;
  tournamentId: string;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const matchUrl = `${baseUrl}/events/turnamen/${data.tournamentId}#bracket-section`;
  const gameName = data.game || "Tournament Match";

  const embed: DiscordEmbed = {
    title: `🔴 PERTANDINGAN LIVE: ${data.teamAName} vs ${data.teamBName}`,
    description: `Pertandingan babak **${data.roundName}** di turnamen **${data.tournamentTitle}** (${gameName}) resmi **DIMULAI SEKARANG**!`,
    color: 0xef4444, // Red Live
    url: matchUrl,
    fields: [
      { name: "🎮 Game", value: `\`${gameName}\``, inline: true },
      { name: "⚔️ Babak", value: data.roundName, inline: true },
      { name: "🆔 Match ID", value: `\`${data.matchId}\``, inline: true },
      {
        name: "📊 Bagan Pertandingan",
        value: `Pantau skor live, room code, dan koordinasi antar kapten di [Bagan Turnamen](${matchUrl}).`,
        inline: false,
      },
    ],
    footer: {
      text: "LogHorizon Tournament Engine • #live-info-tournament",
    },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("tournament_live", {
    content: `🔴 **MATCH LIVE SEKARANG:** ${data.teamAName} VS ${data.teamBName} (${data.tournamentTitle})!`,
    embeds: [embed],
  }).catch((err) => console.warn("[Discord Bot Dispatcher] notifyTournamentMatchLive error:", err));
}

/**
 * Event: Hasil Skor Match Selesai
 */
export async function notifyTournamentMatchResult(data: {
  tournamentTitle: string;
  game: string;
  matchId: string;
  roundName: string;
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  winnerName: string;
  tournamentId: string;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const matchUrl = `${baseUrl}/events/turnamen/${data.tournamentId}#bracket-section`;

  const embed: DiscordEmbed = {
    title: `🏁 HASIL PERTANDINGAN: ${data.winnerName} MENANG!`,
    description: `Pertandingan babak **${data.roundName}** di **${data.tournamentTitle}** (${data.game}) telah selesai.`,
    color: 0x10b981, // Emerald green
    url: matchUrl,
    fields: [
      { name: "🎮 Game", value: `\`${data.game}\``, inline: true },
      { name: "⚔️ Babak", value: data.roundName, inline: true },
      { name: "🏆 Pemenang", value: `👑 **${data.winnerName}**`, inline: true },
      {
        name: "📊 Skor Akhir",
        value: `**${data.teamAName}** \`${data.scoreA}\` - \`${data.scoreB}\` **${data.teamBName}**`,
        inline: false,
      },
      {
        name: "🔍 Bagan Turnamen Terkini",
        value: `Pemenang otomatis maju ke babak berikutnya. Cek bagan lengkap di [Bagan Turnamen Website](${matchUrl}).`,
        inline: false,
      },
    ],
    footer: {
      text: "LogHorizon Tournament Engine • #live-info-tournament",
    },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("tournament_live", {
    content: `🏁 **HASIL MATCH SELESAI:** ${data.winnerName} menundukkan lawannya dengan skor ${data.scoreA}-${data.scoreB}!`,
    embeds: [embed],
  }).catch((err) => console.warn("[Discord Bot Dispatcher] notifyTournamentMatchResult error:", err));
}

/**
 * Event: Keputusan Panitia WO / DQ
 */
export async function notifyTournamentMatchDecision(data: {
  tournamentTitle: string;
  game: string;
  matchId: string;
  roundName: string;
  winnerName: string;
  loserName: string;
  decisionType: "WO" | "DQ";
  reason?: string;
  tournamentId: string;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const matchUrl = `${baseUrl}/events/turnamen/${data.tournamentId}#bracket-section`;
  const isWO = data.decisionType === "WO";

  const embed: DiscordEmbed = {
    title: `⚖️ KEPUTUSAN PANITIA: MENANG ${data.decisionType}`,
    description: `Keputusan resmi panitia turnamen untuk babak **${data.roundName}** pada **${data.tournamentTitle}** (${data.game}).`,
    color: 0xf59e0b, // Amber
    url: matchUrl,
    fields: [
      { name: "🎮 Game", value: `\`${data.game}\``, inline: true },
      { name: "⚔️ Babak", value: data.roundName, inline: true },
      { name: "👑 Pemenang", value: `**${data.winnerName}** (Menang ${data.decisionType})`, inline: true },
      {
        name: isWO ? "⚠️ Alasan Walkover (WO)" : "🚨 Alasan Diskualifikasi (DQ)",
        value: `Tim **${data.loserName}** dinyatakan ${isWO ? "Walkover (tidak hadir tepat waktu)" : "Didiskualifikasi (pelanggaran regulasi)"}.${data.reason ? ` Catatan: "${data.reason}"` : ""}`,
        inline: false,
      },
      {
        name: "🔍 Update Bagan",
        value: `Bagan turnamen telah disesuaikan. Cek selengkapnya di [Bagan Turnamen Website](${matchUrl}).`,
        inline: false,
      },
    ],
    footer: {
      text: "LogHorizon Tournament Engine • #live-info-tournament",
    },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("tournament_live", {
    content: `⚖️ **KEPUTUSAN PANITIA (${data.decisionType}):** Tim ${data.winnerName} dinyatakan menang atas ${data.loserName}!`,
    embeds: [embed],
  }).catch((err) => console.warn("[Discord Bot Dispatcher] notifyTournamentMatchDecision error:", err));
}

/**
 * Event: Bagan Turnamen Diacak (Gacha Bracket)
 */
export async function notifyTournamentBracketShuffle(data: {
  tournamentTitle: string;
  game: string;
  totalTeams: number;
  tournamentId: string;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const bracketUrl = `${baseUrl}/events/turnamen/${data.tournamentId}#bracket-section`;

  const embed: DiscordEmbed = {
    title: `🎲 BAGAN RESMI TELAH DIACAK: ${data.tournamentTitle}`,
    description: `Susunan bagan dan lawan pertandingan resmi untuk turnamen **${data.tournamentTitle}** (${data.game}) telah diacak secara fair play menggunakan algoritma Fisher-Yates!`,
    color: 0x8b5cf6, // Violet
    url: bracketUrl,
    fields: [
      { name: "🎮 Game", value: `\`${data.game}\``, inline: true },
      { name: "👥 Total Tim Masuk Bagan", value: `${data.totalTeams} Tim`, inline: true },
      {
        name: "⚔️ Cek Lawan Timmu Sekarang",
        value: `Seluruh kapten dan pemain dipersilakan melihat susunan lawan dan jadwal pertandingan di [Bagan Pertandingan](${bracketUrl}).`,
        inline: false,
      },
    ],
    footer: {
      text: "LogHorizon Tournament Engine • #live-info-tournament",
    },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("tournament_live", {
    content: `🎲 **BAGAN TURNAMEN TELAH DIACAK // ${data.tournamentTitle}!** Cek susunan lawan timmu sekarang!`,
    embeds: [embed],
  }).catch((err) => console.warn("[Discord Bot Dispatcher] notifyTournamentBracketShuffle error:", err));
}

/**
 * Event: Live Streaming Broadcast (#📡・info-live)
 */
export async function notifyLiveStreamBroadcast(data: {
  title: string;
  streamUrl: string;
  channelName: string;
  game?: string;
  description?: string;
}): Promise<void> {
  const embed: DiscordEmbed = {
    title: `📡 LIVE STREAM SEKARANG: ${data.title}`,
    description: data.description || `Siaran langsung sedang berlangsung di channel **${data.channelName}**! Jangan lewatkan keseruannya!`,
    color: 0xef4444, // Red
    url: data.streamUrl,
    fields: [
      { name: "📺 Channel / Caster", value: data.channelName, inline: true },
      ...(data.game ? [{ name: "🎮 Game", value: `\`${data.game}\``, inline: true }] : []),
      {
        name: "🔴 Tonton Siaran Langsung",
        value: `[Klik di sini untuk Membuka Live Stream](${data.streamUrl})`,
        inline: false,
      },
    ],
    footer: {
      text: "LogHorizon Live Stream Broadcast • #info-live",
    },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("info_live", {
    content: `📡 **SIARAN LANGSUNG (LIVE STREAM) DIMULAI!** Tonton di: ${data.streamUrl}`,
    embeds: [embed],
  }).catch((err) => console.warn("[Discord Bot Dispatcher] notifyLiveStreamBroadcast error:", err));
}

/**
 * 5. Channel #🤝・partnership
 * Event: Member Donatur Baru atau Sponsor Resmi
 */
export async function notifyPartnership(data: {
  partnerName?: string;
  sponsorOrMemberName?: string;
  type?: "DONATUR" | "SPONSOR" | "COMMUNITY" | string;
  title?: string;
  tier?: string;
  tierOrBadge?: string;
  amount?: number;
  message?: string;
  description?: string;
  linkUrl?: string;
  logoUrl?: string;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const donateUrl = data.linkUrl || `${baseUrl}/donate`;
  const partnerName = data.partnerName || data.sponsorOrMemberName || "Partner";
  const partnerType = data.type || "SPONSOR";
  const tier = data.tier || data.tierOrBadge || "Official Partner";

  const embed: DiscordEmbed = {
    title: data.title || `🤝 APRESIASI PARTNERSHIP // ${partnerType}`,
    description:
      data.description ||
      `Terima kasih kepada **${partnerName}** yang telah mendukung kemajuan guild dan ekosistem LogHorizon!`,
    color: 0x10b981, // Emerald Green
    url: donateUrl,
    fields: [
      { name: "💎 Kategori", value: partnerType, inline: true },
      { name: "🎖️ Tier / Gelar", value: tier, inline: true },
      ...(data.amount
        ? [{ name: "💰 Kontribusi", value: `Rp ${data.amount.toLocaleString("id-ID")}`, inline: true }]
        : []),
      ...(data.message ? [{ name: "💬 Pesan", value: data.message, inline: false }] : []),
    ],
    footer: {
      text: "LogHorizon Partnership Guild • #partnership",
    },
    timestamp: new Date().toISOString(),
  };

  if (data.logoUrl) {
    embed.thumbnail = { url: data.logoUrl };
  }

  await sendDiscordChannelMessage("partnership", {
    content: `🤝 **SELAMAT DATANG & TERIMA KASIH KEPADA PARTNER BARU: ${partnerName}!**`,
    embeds: [embed],
  }).catch((err) => console.warn("[Discord Bot Dispatcher] notifyPartnership error:", err));
}

/**
 * 6. Channel #🎁・events-giveaway
 * Event: Pengumuman Giveaway Komunitas
 */
export async function notifyGiveaway(data: {
  title: string;
  prize: string;
  deadline: string;
  requirements?: string;
  url?: string;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const eventUrl = data.url || `${baseUrl}/events`;

  const embed: DiscordEmbed = {
    title: `🎁 GIVEAWAY KOMUNITAS: ${data.title}`,
    description: `Kesempatan memenangkan **${data.prize}** untuk seluruh petualang LogHorizon!`,
    color: 0xec4899, // Pink Giveaway
    url: eventUrl,
    fields: [
      { name: "🎁 Hadiah", value: data.prize, inline: true },
      { name: "⏳ Batas Waktu", value: data.deadline, inline: true },
      ...(data.requirements ? [{ name: "📋 Syarat & Ketentuan", value: data.requirements, inline: false }] : []),
      { name: "🔗 Ikuti Sekarang", value: `[Buka Info Event di Website](${eventUrl})`, inline: false },
    ],
    footer: {
      text: "LogHorizon Event Guild • #events-giveaway",
    },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("giveaway", {
    content: "🎁 **GIVEAWAY BARU DIBUKA UNTUK ANGGOTA GUILD!**",
    embeds: [embed],
  }).catch((err) => console.warn("[Discord Bot Dispatcher] notifyGiveaway error:", err));
}

/**
 * 7. Channel #🛒・server-shop
 * Event: Lapak Baru di Marketplace
 */
export async function notifyMarketplaceListing(data: {
  title: string;
  category?: string;
  type?: string;
  price: number;
  sellerUsername?: string;
  sellerName?: string | null;
  game?: string;
  gameServer?: string;
  listingId?: string;
  postId?: string;
  imageUrl?: string | null;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const itemId = data.listingId || data.postId;
  const itemUrl = itemId ? `${baseUrl}/marketplace?id=${itemId}` : `${baseUrl}/marketplace`;
  const seller = data.sellerUsername || data.sellerName || "Member";
  const category = data.category || data.type || "Marketplace";
  const game = data.game || data.gameServer;

  const embed: DiscordEmbed = {
    title: `🛒 LAPAK BARU // ${category}: ${data.title}`,
    description: `Petualang **@${seller}** baru saja membuka lapak dagang di marketplace resmi!`,
    color: 0x3b82f6, // Blue Shop
    url: itemUrl,
    fields: [
      { name: "🏷️ Kategori", value: category, inline: true },
      { name: "💰 Harga", value: `Rp ${data.price.toLocaleString("id-ID")}`, inline: true },
      { name: "👤 Penjual", value: `@${seller}`, inline: true },
      ...(game ? [{ name: "🌐 Game / Server", value: game, inline: true }] : []),
      {
        name: "🛡️ Keamanan Transaksi Rekber",
        value: `Seluruh transaksi dilindungi sistem Rekber resmi LogHorizon. Cek lapak selengkapnya di [Marketplace Website](${itemUrl}).`,
        inline: false,
      },
    ],
    footer: {
      text: "LogHorizon Marketplace • #server-shop",
    },
    timestamp: new Date().toISOString(),
  };

  if (data.imageUrl) {
    embed.image = { url: data.imageUrl };
  }

  await sendDiscordChannelMessage("shop", {
    content: `🛒 **LAPAK BARU DI MARKETPLACE:** ${data.title} seharga Rp ${data.price.toLocaleString("id-ID")}!`,
    embeds: [embed],
  }).catch((err) => console.warn("[Discord Bot Dispatcher] notifyMarketplaceListing error:", err));
}

/**
 * Universal notice dispatcher (backward compatible helper)
 */
export async function sendDiscordNotice(
  channel: string,
  title: string,
  description: string,
  urlOrFields?: string | DiscordEmbedField[] | null,
  imageUrl?: string | null
): Promise<boolean> {
  const targetChannelKey = resolveDiscordChannelKey(channel);
  const fields = Array.isArray(urlOrFields) ? urlOrFields : [];
  const url = typeof urlOrFields === "string" ? urlOrFields : undefined;

  const embed: DiscordEmbed = {
    title: title.slice(0, 256),
    description: description.slice(0, 4000),
    color: 0x7c3aed,
    fields,
    timestamp: new Date().toISOString(),
    footer: {
      text: "LogHorizon Notification Dispatcher",
    },
  };
  if (url) embed.url = url;
  if (imageUrl) embed.image = { url: imageUrl };

  const result = await sendDiscordChannelMessage(targetChannelKey, {
    embeds: [embed],
  }).catch((err) => {
    console.warn(`[Discord Bot Dispatcher] sendDiscordNotice (${targetChannelKey}) error:`, err);
    return { success: false, channelKey: targetChannelKey, channelName: targetChannelKey, via: "NONE" as const };
  });

  return result.success;
}

/**
 * 8. Channel #🛡️・mod-logs (Dedicated Mod & Security Audit Functions)
 */

/**
 * Log Antrean Donasi QRIS Baru
 */
export async function notifyDonationQueue(data: {
  donationId: string;
  senderName: string;
  username: string;
  amount: number;
  tierLabel: string;
  notes?: string;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const embed: DiscordEmbed = {
    title: "💰 ANTREAN DONASI QRIS BARU",
    description: `Ada petualang yang mengajukan donasi kas guild dan mengunggah bukti transfer via QRIS. Segera verifikasi mutasi di panel admin.`,
    color: 0xeab308, // Kuning amber
    fields: [
      { name: "👤 Pengirim Transfer (Rekening/E-Wallet)", value: `\`${data.senderName}\``, inline: true },
      { name: "🎮 Akun Guild Petualang", value: `@${data.username}`, inline: true },
      { name: "💎 Nominal & Kasta Role", value: `**Rp ${data.amount.toLocaleString("id-ID")}**\n${data.tierLabel}`, inline: false },
      { name: "📝 Catatan Petualang", value: data.notes || "-", inline: true },
      { name: "🔗 Tindakan Staf", value: `[Buka Panel Admin untuk ACC / Tolak](${baseUrl}/admin)`, inline: false },
    ],
    footer: { text: "LogHorizon Treasury Audit • #mod-logs" },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("mod_logs", {
    content: "📢 **ANTREAN KAS DONASI BARU MENUNGGU VERIFIKASI ADMIN!**",
    embeds: [embed],
  }).catch((err) => console.warn("[Discord Bot] notifyDonationQueue error:", err));
}

/**
 * Log Keputusan Donasi (ACC / Ditolak)
 */
export async function notifyDonationDecision(data: {
  adminName: string;
  senderName: string;
  username: string;
  amount: number;
  isApproved: boolean;
  tierLabel?: string;
}): Promise<void> {
  const isAcc = data.isApproved;
  const embed: DiscordEmbed = {
    title: isAcc ? "✅ DONASI QRIS DI-ACC OLEH ADMIN" : "❌ DONASI QRIS DITOLAK OLEH ADMIN",
    description: isAcc
      ? `Donasi sebesar **Rp ${data.amount.toLocaleString("id-ID")}** telah diverifikasi dan disetujui. Badge kasta role guild otomatis aktif di profil petualang.`
      : `Pengajuan bukti transfer donasi sebesar **Rp ${data.amount.toLocaleString("id-ID")}** ditolak oleh staf.`,
    color: isAcc ? 0x10b981 : 0xef4444,
    fields: [
      { name: "🛡️ Admin Pengeksekusi", value: `@${data.adminName}`, inline: true },
      { name: "👤 Donatur (Pengirim)", value: `${data.senderName} (@${data.username})`, inline: true },
      { name: "💵 Nominal", value: `Rp ${data.amount.toLocaleString("id-ID")}`, inline: true },
      { name: "🎖️ Status Akhir", value: isAcc ? `DISETUJUI (${data.tierLabel || "Role Aktif"})` : "DITOLAK (Bukti Tidak Sesuai)", inline: false },
    ],
    footer: { text: "LogHorizon Treasury Audit • #mod-logs" },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("mod_logs", {
    embeds: [embed],
  }).catch((err) => console.warn("[Discord Bot] notifyDonationDecision error:", err));
}

/**
 * Log Pendaftaran Turnamen Berbayar
 */
export async function notifyPaidTournamentRegistration(data: {
  tournamentId: string;
  tournamentTitle: string;
  teamName: string;
  senderName: string;
  contactPhone: string;
  entryFee: number;
  captainUsername: string;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const embed: DiscordEmbed = {
    title: "🏆 PENDAFTARAN TURNAMEN BERBAYAR",
    description: `Tim baru telah mendaftar ke turnamen berbayar dan mengunggah bukti pembayaran. Harap panitia memeriksa kesesuaian mutasi rekening/QRIS sebelum memasukkan tim ke bagan bracket.`,
    color: 0x8b5cf6, // Ungu
    fields: [
      { name: "⚔️ Nama Tim / Party", value: `**${data.teamName}**`, inline: true },
      { name: "🎮 Turnamen", value: data.tournamentTitle, inline: true },
      { name: "💰 Biaya Pendaftaran", value: `Rp ${data.entryFee.toLocaleString("id-ID")}`, inline: true },
      { name: "👤 Nama Pengirim Transfer", value: `\`${data.senderName}\``, inline: true },
      { name: "👑 Kapten Tim", value: `@${data.captainUsername}`, inline: true },
      { name: "📱 Kontak WhatsApp", value: data.contactPhone ? `\`${data.contactPhone}\`` : "-", inline: true },
      { name: "🔗 Panel Panitia", value: `[Review & ACC Tim di Panel Admin](${baseUrl}/admin)`, inline: false },
    ],
    footer: { text: "LogHorizon Tournament Audit • #mod-logs" },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("mod_logs", {
    content: "📢 **PENDAFTARAN TIM TURNAMEN BERBAYAR MASUK!**",
    embeds: [embed],
  }).catch((err) => console.warn("[Discord Bot] notifyPaidTournamentRegistration error:", err));
}

/**
 * Log Keputusan Tim Turnamen (ACC / Ditolak)
 */
export async function notifyTournamentTeamDecision(data: {
  adminName: string;
  tournamentTitle: string;
  teamName: string;
  isApproved: boolean;
  reason?: string;
}): Promise<void> {
  const isAcc = data.isApproved;
  const embed: DiscordEmbed = {
    title: isAcc ? "✅ TIM TURNAMEN DI-ACC MASUK BAGAN" : "❌ TIM TURNAMEN DITOLAK OLEH WASIT",
    description: isAcc
      ? `Tim **${data.teamName}** resmi disetujui untuk bertanding di turnamen **"${data.tournamentTitle}"** dan telah ditempatkan pada bagan bracket.`
      : `Pendaftaran tim **${data.teamName}** di turnamen **"${data.tournamentTitle}"** telah ditolak oleh panitia/wasit. Kuota slot dikembalikan.`,
    color: isAcc ? 0x10b981 : 0xef4444,
    fields: [
      { name: "🛡️ Wasit / Panitia", value: `@${data.adminName}`, inline: true },
      { name: "⚔️ Nama Tim", value: data.teamName, inline: true },
      { name: "🎮 Turnamen", value: data.tournamentTitle, inline: true },
      { name: "📝 Keterangan / Alasan", value: isAcc ? "Lolos Verifikasi Administrasi" : (data.reason || "Bukti pembayaran tidak sesuai"), inline: false },
    ],
    footer: { text: "LogHorizon Tournament Audit • #mod-logs" },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("mod_logs", {
    embeds: [embed],
  }).catch((err) => console.warn("[Discord Bot] notifyTournamentTeamDecision error:", err));
}

/**
 * Log Siklus Transaksi Rekber 3-Pihak Marketplace
 */
export async function notifyEscrowStage(data: {
  stage: "NEW_TICKET" | "HANDLER_CLAIMED" | "COMPLETED" | "CANCELLED" | "DISPUTE_OR_SCAM";
  escrowId: string;
  postTitle: string;
  amount: number;
  buyerName: string;
  sellerName: string;
  handlerName?: string | null;
  details?: string;
}): Promise<void> {
  const baseUrl = getBaseAppUrl();
  const stageMeta = {
    NEW_TICKET: {
      title: "🤝 TIKET REKBER 3-PIHAK DIBUAT",
      desc: "Pembeli telah mengajukan transaksi aman via Rekber Guild. Menunggu admin/moderator mengklaim tiket sebagai wasit penengah.",
      color: 0x3b82f6,
      alert: "📢 **TIKET REKBER BARU MENUNGGU CLAIM WASIT DI #mod-logs!**",
    },
    HANDLER_CLAIMED: {
      title: "🛡️ REKBER RESMI DIKLAIM WASIT",
      desc: "Staf guild telah mengambil alih ruang transaksi rekber untuk memandu pembeli dan penjual secara langsung.",
      color: 0x8b5cf6,
      alert: undefined,
    },
    COMPLETED: {
      title: "💰 REKBER SELESAI (DANA DICAIRKAN)",
      desc: "Transaksi sukses tuntas 100%! Barang/akun telah diterima pembeli dan dana telah dicairkan ke penjual.",
      color: 0x10b981,
      alert: undefined,
    },
    CANCELLED: {
      title: "❌ REKBER DIBATALKAN / DANA DIREFUND",
      desc: "Transaksi rekber telah dibatalkan secara aman. Lapak marketplace dikembalikan ke status tersedia.",
      color: 0xef4444,
      alert: undefined,
    },
    DISPUTE_OR_SCAM: {
      title: "🚨 PERINGATAN REKBER / SENGKETA TERDETEKSI",
      desc: "Terdeteksi indikasi ajakan transaksi di luar sistem rekber atau sengketa dalam ruang chat.",
      color: 0xd97706,
      alert: "⚠️ **PERHATIAN STAF: SENGKETA / INDIKASI TRANSAKSI LUAR SISTEM DI REKBER!**",
    },
  }[data.stage];

  const embed: DiscordEmbed = {
    title: stageMeta.title,
    description: stageMeta.desc,
    color: stageMeta.color,
    fields: [
      { name: "🛒 Lapak Marketplace", value: `**${data.postTitle}**`, inline: false },
      { name: "💵 Nilai Transaksi", value: `**Rp ${data.amount.toLocaleString("id-ID")}**`, inline: true },
      { name: "🛡️ Wasit Penengah", value: data.handlerName ? `@${data.handlerName}` : "*Menunggu Claim Staf*", inline: true },
      { name: "👤 Pembeli (Buyer)", value: `@${data.buyerName}`, inline: true },
      { name: "🏪 Penjual (Seller)", value: `@${data.sellerName}`, inline: true },
      { name: "ℹ️ Keterangan", value: data.details || "-", inline: false },
      { name: "🔗 Ruang Chat Rekber", value: `[Buka Tiket Rekber di Website](${baseUrl}/marketplace)`, inline: false },
    ],
    footer: { text: "LogHorizon Escrow Audit • #mod-logs" },
    timestamp: new Date().toISOString(),
  };

  await sendDiscordChannelMessage("mod_logs", {
    content: stageMeta.alert,
    embeds: [embed],
  }).catch((err) => console.warn("[Discord Bot] notifyEscrowStage error:", err));
}

/**
 * Log Eksekusi AI Admin Command & Aksi Sensitif
 */
export async function notifyAdminCommandAudit(data: {
  adminName: string;
  toolName: string;
  summary: string;
  details?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}): Promise<void> {
  const embed: DiscordEmbed = {
    title: "⚡ AUDIT AI ADMIN COMMAND EXECUTED",
    description: `Perintah administratif telah berhasil dieksekusi melalui **LogHorizon Admin Command Bot** oleh **@${data.adminName}**.`,
    color: 0x6366f1, // Indigo
    fields: [
      { name: "👑 Admin Pengeksekusi", value: `@${data.adminName}`, inline: true },
      { name: "🛠️ Tool / Modul", value: `\`${data.toolName}\``, inline: true },
      { name: "📋 Ringkasan Aksi", value: data.summary, inline: false },
    ],
    footer: { text: "LogHorizon Admin Command Audit • #mod-logs" },
    timestamp: new Date().toISOString(),
  };

  if (data.details) {
    embed.fields?.push({ name: "🔍 Detail Perubahan", value: data.details, inline: false });
  }

  await sendDiscordChannelMessage("mod_logs", {
    embeds: [embed],
  }).catch((err) => console.warn("[Discord Bot] notifyAdminCommandAudit error:", err));
}
