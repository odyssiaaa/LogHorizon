"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { CalendarDays, Clock, ExternalLink, Headphones, LogOut, MessageSquare, Plus, Search, Trash2, Users } from "lucide-react";
import { readApiResponse } from "@/lib/api-response";

type Participant = { id: string; teamName: string; leader: { username: string | null } };
type Tournament = {
  id: string;
  game: string;
  maxSlots: number;
  eventDate: string;
  status: string;
  bracket: { round: number; match: number; team1: { teamName: string } | null; team2: { teamName: string } | null; winner: { teamName: string } | null }[][] | null;
  participants: Participant[];
};
type LfgPost = {
  id: string;
  game: string;
  description: string;
  scheduledAt: string;
  expiresAt?: string;
  createdAt?: string;
  maxSlots: number;
  status: "OPEN" | "FULL" | "CLOSED";
  isOwner: boolean;
  canManage?: boolean;
  joinedByViewer: boolean;
  author: { username: string | null };
  joins: { username: string | null }[];
};

function formatRemainingTime(expiresAtStr?: string) {
  if (!expiresAtStr) return "Aktif";
  const diffMs = new Date(expiresAtStr).getTime() - Date.now();
  if (diffMs <= 0) return "Kedaluwarsa";
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours > 0) {
    return `${hours}j ${minutes}m`;
  }
  return `${minutes}m`;
}

export function EventsBoard() {
  const { data: session } = useSession();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [lfgPosts, setLfgPosts] = useState<LfgPost[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [game, setGame] = useState("");
  const [maxSlots, setMaxSlots] = useState("8");
  const [eventDate, setEventDate] = useState("");
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [lfgGame, setLfgGame] = useState("Valorant");
  const [description, setDescription] = useState("Butuh 2 orang untuk push rank jam 8 malam.");
  const [scheduledAt, setScheduledAt] = useState("");
  const [partySlots, setPartySlots] = useState("5");
  const [durationHours, setDurationHours] = useState("24");
  const [activePartyChat, setActivePartyChat] = useState<string | null>(null);
  const [partyChatMessages, setPartyChatMessages] = useState<Record<string, { sender: string; text: string; time: string }[]>>({});
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/tournaments").then((response) => readApiResponse<Tournament[]>(response, "Gagal memuat turnamen.")),
      fetch("/api/lfg").then((response) => readApiResponse<LfgPost[]>(response, "Gagal memuat jadwal party.")),
    ]).then(([events, parties]) => {
      if (!active) return;
      setTournaments(events);
      setLfgPosts(parties);
      setError("");
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Data event gagal dimuat.");
    });
    return () => { active = false; };
  }, [refreshKey]);

  async function createTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game, maxSlots: Number(maxSlots), eventDate: new Date(eventDate).toISOString() }),
      });
      await readApiResponse(response, "Turnamen gagal dibuat.");
      setGame("");
      setEventDate("");
      setNotice("Turnamen berhasil dibuat.");
      setRefreshKey((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Turnamen gagal dibuat."); }
  }

  async function registerParty(tournamentId: string) {
    if (!session?.user) { await signIn("discord"); return; }
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName: teamNames[tournamentId] ?? "" }),
      });
      await readApiResponse(response, "Party gagal didaftarkan.");
      setNotice("Party berhasil didaftarkan.");
      setRefreshKey((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Party gagal didaftarkan."); }
  }

  async function createLfg(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.user) { await signIn("discord"); return; }
    try {
      const response = await fetch("/api/lfg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: lfgGame,
          description,
          scheduledAt: new Date(scheduledAt).toISOString(),
          maxSlots: Number(partySlots),
          durationHours: Number(durationHours),
        }),
      });
      await readApiResponse(response, "Jadwal party gagal dibuat.");
      setNotice("Jadwal party dipublikasikan! Kamu dapat mengobrol di Chat Party Sementara atau berpindah ke Voice Channel Discord.");
      setRefreshKey((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Jadwal party gagal dibuat."); }
  }

  async function deleteParty(id: string, gameTitle: string) {
    if (!confirm(`Tutup dan bubarkan party "${gameTitle}" sekarang?`)) return;
    try {
      const response = await fetch(`/api/lfg/${id}`, { method: "DELETE" });
      await readApiResponse(response, "Gagal menutup party.");
      setNotice(`Party "${gameTitle}" berhasil ditutup.`);
      if (activePartyChat === id) setActivePartyChat(null);
      setRefreshKey((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal menutup party.");
    }
  }

  async function joinParty(id: string) {
    if (!session?.user) { await signIn("discord"); return; }
    try {
      const response = await fetch(`/api/lfg/${id}/join`, { method: "POST" });
      await readApiResponse(response, "Tidak dapat bergabung ke party.");
      setNotice("Kamu berhasil bergabung ke party! Ruang chat dan voice Discord telah terbuka.");
      setRefreshKey((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Tidak dapat bergabung ke party."); }
  }

  async function leaveParty(id: string) {
    if (!confirm("Kamu yakin ingin keluar dari party ini?")) return;
    try {
      const response = await fetch(`/api/lfg/${id}/join`, { method: "DELETE" });
      await readApiResponse(response, "Gagal keluar dari party.");
      setNotice("Kamu telah keluar dari party.");
      if (activePartyChat === id) setActivePartyChat(null);
      setRefreshKey((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Gagal keluar dari party."); }
  }

  function sendPartyChat(partyId: string, e: FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !session?.user) return;
    const sender = session.user.username ?? session.user.name ?? "Petualang";
    const newMsg = {
      sender,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };
    setPartyChatMessages((prev) => ({
      ...prev,
      [partyId]: [...(prev[partyId] ?? []), newMsg],
    }));
    setChatInput("");
  }

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleTournaments = tournaments.filter((tournament) =>
    [tournament.game, tournament.status, ...tournament.participants.map((participant) => participant.teamName), ...tournament.participants.map((participant) => participant.leader.username ?? "")]
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch)),
  );
  const visibleLfgPosts = lfgPosts.filter((post) =>
    [post.game, post.description, post.author.username ?? "", ...post.joins.map((join) => join.username ?? "")]
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch)),
  );
  const isAdminOrMod = session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR";

  return (
    <main className="page-shell events-page py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full max-w-full overflow-x-hidden">
      <header className="events-heading mb-6">
        <p className="section-kicker text-xs font-bold text-[#9D4EDD] dark:text-[#C77DFF] uppercase tracking-wider mb-1">GUILD OPERATIONS</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white break-words">Events & <span>Party Finder</span></h1>
        <p className="muted-copy text-base md:text-lg text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">Daftarkan tim ke turnamen resmi atau koordinasikan jadwal mabar guild.</p>
      </header>
      {error && <p className="inline-error mb-4" role="alert">{error}</p>}
      {notice && <p className="inline-notice mb-4" role="status">{notice}</p>}
      <div className="relative flex items-center mb-6" role="search">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari game, party, atau anggota…"
          aria-label="Cari turnamen dan jadwal party"
          className="w-full pl-11 pr-4 py-2.5 rounded-md border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#9D4EDD]"
        />
      </div>

      {/* TOURNAMENT SECTION */}
      <section className="events-section">
        <div className="events-section-heading">
          <div>
            <p className="section-kicker">BRACKET / SINGLE ELIMINATION</p>
            <h2>Turnamen Resmi</h2>
          </div>
          <CalendarDays size={18} />
        </div>

        {/* PROPOSAL & CONTACT PERSON BANNER FOR MEMBERS */}
        <div className="mb-4 rounded-md border border-purple-500/20 bg-purple-950/20 p-4 text-xs leading-relaxed text-gray-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-bold text-sm text-purple-300 mb-1">
                🏆 Penyelenggaraan Turnamen &amp; Hadiah (Prizepool)
              </p>
              <p className="text-gray-400">
                Turnamen resmi LogHorizon hanya dapat dibuat dan divalidasi oleh <strong>Admin / Moderator</strong> untuk menjamin transparansi prizepool dan kelancaran braket. Mau bikin turnamen komunitasmu?
              </p>
            </div>
            <a
              href="https://discord.com/users/706661230835925042"
              target="_blank"
              rel="noreferrer"
              className="button button-discord text-xs font-semibold whitespace-nowrap self-start sm:self-center flex items-center gap-1.5"
              title="Hubungi Narahubung / CP .odyssia (Owner)"
            >
              <span>Hubungi CP Owner (.odyssia)</span> <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {isAdminOrMod && (
          <form className="stack-form event-create-form" onSubmit={createTournament}>
            <label>Nama game<input required maxLength={80} value={game} onChange={(event) => setGame(event.target.value)} placeholder="Valorant" /></label>
            <label>Slot tim<input required type="number" min={2} max={64} value={maxSlots} onChange={(event) => setMaxSlots(event.target.value)} /></label>
            <label>Tanggal<input required type="datetime-local" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></label>
            <button className="button button-primary"><Plus size={15} /> Buat turnamen</button>
          </form>
        )}
        <div className="event-list">
          {visibleTournaments.length === 0 && <p className="empty-state">{search ? "Tidak ada turnamen yang cocok dengan pencarian." : "Belum ada turnamen terjadwal."}</p>}
          {visibleTournaments.map((tournament) => (
            <article className="event-card" key={tournament.id}>
              <div className="event-card-heading"><div><span className="event-game">{tournament.game}</span><p>{new Date(tournament.eventDate).toLocaleString("id-ID")}</p></div><span className="event-status">{tournament.status}</span></div>
              <p className="event-slots"><Users size={14} /> {tournament.participants.length}/{tournament.maxSlots} tim terdaftar</p>
              {tournament.status === "OPEN" && session?.user && <div className="event-register-row"><input aria-label={`Nama party untuk ${tournament.game}`} value={teamNames[tournament.id] ?? ""} onChange={(event) => setTeamNames((current) => ({ ...current, [tournament.id]: event.target.value }))} placeholder="Nama party" /><button className="button button-quiet" onClick={() => void registerParty(tournament.id)}>Daftar party</button></div>}
              <div className="event-team-list">{tournament.participants.map((participant) => <span key={participant.id}>{participant.teamName}<small> · {participant.leader.username ?? "Gamer"}</small></span>)}</div>
              {tournament.bracket && <div className="tournament-bracket">{tournament.bracket.map((round, roundIndex) => <div className="bracket-round" key={roundIndex}><strong>Round {roundIndex + 1}</strong>{round.map((match) => <div className="bracket-match" key={match.match}><span>{match.team1?.teamName ?? "BYE"}</span><span>{match.team2?.teamName ?? "BYE"}</span></div>)}</div>)}</div>}
            </article>
          ))}
        </div>
      </section>

      {/* LOOKING FOR GROUP SECTION */}
      <section className="events-section">
        <div className="events-section-heading"><div><p className="section-kicker">LOOKING FOR GROUP</p><h2>Jadwal Mabar</h2></div><Users size={18} /></div>
        <form className="stack-form lfg-create-form" onSubmit={createLfg}>
          <label>Nama game<input required maxLength={80} value={lfgGame} onChange={(event) => setLfgGame(event.target.value)} placeholder="Valorant" /></label>
          <label>Jadwal<input required type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label>
          <label>Jumlah pemain total<input required type="number" min={2} max={20} value={partySlots} onChange={(event) => setPartySlots(event.target.value)} /></label>
          <label>
            Durasi aktif party
            <select
              value={durationHours}
              onChange={(event) => setDurationHours(event.target.value)}
              className="w-full bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] rounded px-3 py-2 text-xs sm:text-sm text-gray-900 dark:text-white"
            >
              <option value="1">1 Jam (Mabar Kilat)</option>
              <option value="3">3 Jam (Push Rank)</option>
              <option value="6">6 Jam (Sesi Santai)</option>
              <option value="12">12 Jam</option>
              <option value="24">24 Jam (Default)</option>
            </select>
          </label>
          <label className="form-wide">Deskripsi<textarea required maxLength={500} rows={2} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Butuh 2 orang untuk push rank jam 8 malam." /></label>
          <button className="button button-primary"><Plus size={15} /> Posting jadwal</button>
        </form>
        <div className="event-list">
          {visibleLfgPosts.length === 0 && <p className="empty-state">{search ? "Tidak ada jadwal party yang cocok dengan pencarian." : "Belum ada party yang mencari anggota."}</p>}
          {visibleLfgPosts.map((post) => {
            const occupied = post.joins.length + 1;
            const isMember = post.isOwner || post.joinedByViewer;
            const messages = partyChatMessages[post.id] ?? [];
            const isChatOpen = activePartyChat === post.id;

            return (
              <article className="event-card lfg-card" key={post.id}>
                <div className="event-card-heading">
                  <div>
                    <span className="event-game">{post.game}</span>
                    <p>{new Date(post.scheduledAt).toLocaleString("id-ID")}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`event-status ${post.status === "FULL" ? "border-amber-500 text-amber-500" : ""}`}>
                      {occupied}/{post.maxSlots} · {post.status}
                    </span>
                    {post.expiresAt && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25" title={`Kedaluwarsa otomatis pada ${new Date(post.expiresAt).toLocaleString("id-ID")}`}>
                        <Clock size={11} /> Expire: {formatRemainingTime(post.expiresAt)}
                      </span>
                    )}
                  </div>
                </div>
                <p className="event-description">{post.description}</p>
                
                <div className="lfg-footer">
                  <span>Host: <strong>{post.author.username ?? "Gamer"}</strong></span>
                  <div className="lfg-actions">
                    <div className="flex flex-wrap gap-1.5 items-center mr-2">
                      <span className="px-2 py-0.5 rounded bg-purple-900/30 text-purple-300 text-xs font-semibold">👑 {post.author.username ?? "Host"}</span>
                      {post.joins.map((join, index) => (
                        <span key={`${join.username ?? "member"}-${index}`} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs">
                          {join.username ?? "Gamer"}
                        </span>
                      ))}
                    </div>

                    {/* ACTION BUTTONS */}
                    {post.status === "OPEN" && !isMember && (
                      <button className="button button-quiet" onClick={() => void joinParty(post.id)}>
                        Join Party
                      </button>
                    )}

                    {post.joinedByViewer && !post.isOwner && (
                      <button className="button button-sold text-xs" onClick={() => void leaveParty(post.id)} title="Keluar jika berhalangan hadir">
                        <LogOut size={13} className="mr-1 inline" /> Keluar Party
                      </button>
                    )}

                    {(post.isOwner || post.canManage || isAdminOrMod) && (
                      <button
                        className="button button-sold text-xs text-red-500 hover:text-red-400 border-red-500/30 hover:border-red-500"
                        onClick={() => void deleteParty(post.id, post.game)}
                        title="Tutup dan bubarkan party ini lebih awal"
                      >
                        <Trash2 size={13} className="mr-1 inline" /> Tutup Party
                      </button>
                    )}

                    {isMember && (
                      <button
                        className={`button ${isChatOpen ? "button-primary" : "button-quiet"} text-xs`}
                        onClick={() => setActivePartyChat(isChatOpen ? null : post.id)}
                      >
                        <MessageSquare size={13} className="mr-1 inline" /> {isChatOpen ? "Tutup Chat Party" : "Chat Party Sementara"}
                      </button>
                    )}

                    {isMember && (
                      <a
                        href="https://discord.gg/aJvbVyTxNb"
                        target="_blank"
                        rel="noreferrer"
                        className="button button-discord text-xs flex items-center gap-1.5"
                        title="Buka Voice Channel di Discord LogHorizon"
                      >
                        <Headphones size={13} /> Masuk Voice Discord <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>

                {/* TEMPORARY PARTY CHAT ROOM */}
                {isChatOpen && isMember && (
                  <div className="party-chat-box mt-3 p-3 rounded border border-purple-500/30 bg-[#0e0a16]">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                      <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                        <MessageSquare size={14} /> Ruang Chat Party Sementara ({post.game})
                      </span>
                      <a href="https://discord.gg/aJvbVyTxNb" target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                        <Headphones size={12} /> Voice Discord
                      </a>
                    </div>

                    <div className="party-messages-list max-h-40 overflow-y-auto space-y-1.5 text-xs pr-1">
                      {messages.length === 0 ? (
                        <p className="text-gray-400 italic py-2">Belum ada obrolan party. Sapa kawan-kawanmu dan atur strategi sebelum jam main!</p>
                      ) : (
                        messages.map((msg, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="text-purple-300 font-bold">{msg.sender}:</span>
                            <span className="text-gray-200 flex-1">{msg.text}</span>
                            <span className="text-[10px] text-gray-500">{msg.time}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={(e) => sendPartyChat(post.id, e)} className="flex gap-2 mt-2 pt-2 border-t border-white/10">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ketik pesan party (misal: 'Gas room 2 jam 8 tepat ya')..."
                        className="flex-1 bg-[#161224] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                        maxLength={200}
                      />
                      <button type="submit" className="button button-primary text-xs py-1.5 px-3">
                        Kirim
                      </button>
                    </form>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
