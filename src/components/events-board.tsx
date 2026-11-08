"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { CalendarDays, Plus, Users } from "lucide-react";
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
  maxSlots: number;
  status: "OPEN" | "FULL" | "CLOSED";
  isOwner: boolean;
  joinedByViewer: boolean;
  author: { username: string | null };
  joins: { username: string | null }[];
};

export function EventsBoard() {
  const { data: session } = useSession();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [lfgPosts, setLfgPosts] = useState<LfgPost[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [game, setGame] = useState("");
  const [maxSlots, setMaxSlots] = useState("8");
  const [eventDate, setEventDate] = useState("");
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [lfgGame, setLfgGame] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [partySlots, setPartySlots] = useState("5");

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
        body: JSON.stringify({ game: lfgGame, description, scheduledAt: new Date(scheduledAt).toISOString(), maxSlots: Number(partySlots) }),
      });
      await readApiResponse(response, "Jadwal party gagal dibuat.");
      setLfgGame("");
      setDescription("");
      setScheduledAt("");
      setNotice("Jadwal party dipublikasikan.");
      setRefreshKey((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Jadwal party gagal dibuat."); }
  }

  async function joinParty(id: string) {
    if (!session?.user) { await signIn("discord"); return; }
    try {
      const response = await fetch(`/api/lfg/${id}/join`, { method: "POST" });
      await readApiResponse(response, "Tidak dapat bergabung ke party.");
      setNotice("Kamu berhasil bergabung ke party.");
      setRefreshKey((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Tidak dapat bergabung ke party."); }
  }

  const isAdmin = session?.user?.role === "ADMIN";
  return (
    <main className="page-shell events-page">
      <header className="events-heading">
        <p className="section-kicker">GUILD OPERATIONS</p>
        <h1>Events & <span>Party Finder</span></h1>
        <p className="muted-copy">Daftarkan tim ke turnamen atau temukan party untuk sesi berikutnya.</p>
      </header>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {notice && <p className="inline-notice" role="status">{notice}</p>}

      <section className="events-section">
        <div className="events-section-heading"><div><p className="section-kicker">BRACKET / SINGLE ELIMINATION</p><h2>Turnamen</h2></div><CalendarDays size={18} /></div>
        {isAdmin && <form className="stack-form event-create-form" onSubmit={createTournament}>
          <label>Nama game<input required maxLength={80} value={game} onChange={(event) => setGame(event.target.value)} placeholder="Valorant" /></label>
          <label>Slot tim<input required type="number" min={2} max={64} value={maxSlots} onChange={(event) => setMaxSlots(event.target.value)} /></label>
          <label>Tanggal<input required type="datetime-local" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></label>
          <button className="button button-primary"><Plus size={15} /> Buat turnamen</button>
        </form>}
        <div className="event-list">
          {tournaments.length === 0 && <p className="empty-state">Belum ada turnamen terjadwal.</p>}
          {tournaments.map((tournament) => (
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

      <section className="events-section">
        <div className="events-section-heading"><div><p className="section-kicker">LOOKING FOR GROUP</p><h2>Jadwal Mabar</h2></div><Users size={18} /></div>
        <form className="stack-form lfg-create-form" onSubmit={createLfg}>
          <label>Nama game<input required maxLength={80} value={lfgGame} onChange={(event) => setLfgGame(event.target.value)} placeholder="Valorant" /></label>
          <label>Jadwal<input required type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label>
          <label>Jumlah pemain total<input required type="number" min={2} max={20} value={partySlots} onChange={(event) => setPartySlots(event.target.value)} /></label>
          <label className="form-wide">Deskripsi<textarea required maxLength={500} rows={2} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Butuh 2 orang untuk push rank jam 8 malam." /></label>
          <button className="button button-primary"><Plus size={15} /> Posting jadwal</button>
        </form>
        <div className="event-list">
          {lfgPosts.length === 0 && <p className="empty-state">Belum ada party yang mencari anggota.</p>}
          {lfgPosts.map((post) => {
            const occupied = post.joins.length + 1;
            return <article className="event-card lfg-card" key={post.id}>
              <div className="event-card-heading"><div><span className="event-game">{post.game}</span><p>{new Date(post.scheduledAt).toLocaleString("id-ID")}</p></div><span className="event-status">{occupied}/{post.maxSlots} · {post.status}</span></div>
              <p className="event-description">{post.description}</p>
              <div className="lfg-footer"><span>Host: {post.author.username ?? "Gamer"}</span><div className="lfg-actions">{post.joins.map((join, index) => <span key={`${join.username ?? "member"}-${index}`}>{join.username ?? "Gamer"}</span>)}{post.status === "OPEN" && !post.isOwner && !post.joinedByViewer && <button className="button button-quiet" onClick={() => void joinParty(post.id)}>Join Party</button>}</div></div>
            </article>;
          })}
        </div>
      </section>
    </main>
  );
}
