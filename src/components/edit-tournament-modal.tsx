"use client";

import { useState, useEffect, FormEvent } from "react";
import { X, Trophy, Calendar, Gamepad2, Users, DollarSign, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { isoToDateTimeLocal, dateTimeLocalToIso } from "@/lib/tournament";

export type EditableTournamentData = {
  id: string;
  title: string;
  game: string;
  prizePool?: string | null;
  prize1st?: string | null;
  prize2nd?: string | null;
  prize3rd?: string | null;
  format?: string | null;
  maxSlots?: number;
  mainPlayersCount?: number;
  subPlayersCount?: number;
  entryFee?: number;
  isFreeEntry?: boolean;
  rules?: string | null;
  status: string;
  eventDate?: string | Date;
};

interface EditTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: EditableTournamentData | null;
  onSuccess: (updated: any) => void;
}

const COMMON_GAMES = [
  "Valorant",
  "Mobile Legends",
  "Dota 2",
  "Honor of Kings",
  "Counter-Strike 2",
  "Apex Legends",
  "PUBG Mobile",
  "Free Fire",
];

export function EditTournamentModal({
  isOpen,
  onClose,
  tournament,
  onSuccess,
}: EditTournamentModalProps) {
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("");
  const [eventDateLocal, setEventDateLocal] = useState("");
  const [prizePool, setPrizePool] = useState("");
  const [prize1st, setPrize1st] = useState("");
  const [prize2nd, setPrize2nd] = useState("");
  const [prize3rd, setPrize3rd] = useState("");
  const [isFreeEntry, setIsFreeEntry] = useState(true);
  const [entryFee, setEntryFee] = useState<number>(0);
  const [mainPlayersCount, setMainPlayersCount] = useState<number>(5);
  const [subPlayersCount, setSubPlayersCount] = useState<number>(2);
  const [status, setStatus] = useState<string>("REGISTRATION");
  const [rules, setRules] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Populate form with current tournament data when opened
  useEffect(() => {
    if (tournament && isOpen) {
      setTitle(tournament.title || "");
      setGame(tournament.game || "");
      
      const rawDate = tournament.eventDate
        ? typeof tournament.eventDate === "string"
          ? tournament.eventDate
          : tournament.eventDate.toISOString()
        : "";
      setEventDateLocal(isoToDateTimeLocal(rawDate));

      setPrizePool(tournament.prizePool || "");
      setPrize1st(tournament.prize1st || "");
      setPrize2nd(tournament.prize2nd || "");
      setPrize3rd(tournament.prize3rd || "");
      const free = tournament.isFreeEntry ?? (tournament.entryFee === 0 || !tournament.entryFee);
      setIsFreeEntry(free);
      setEntryFee(tournament.entryFee || 0);
      setMainPlayersCount(tournament.mainPlayersCount ?? 5);
      setSubPlayersCount(tournament.subPlayersCount ?? 2);
      setStatus(tournament.status || "REGISTRATION");
      setRules(tournament.rules || "");
      setError("");
      setSuccessMsg("");
    }
  }, [tournament, isOpen]);

  if (!isOpen || !tournament) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Judul turnamen tidak boleh kosong.");
      return;
    }
    if (!game.trim()) {
      setError("Nama game wajib diisi.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const isoEventDate = dateTimeLocalToIso(eventDateLocal);
      const payload: Record<string, unknown> = {
        title: title.trim(),
        game: game.trim(),
        prizePool: prizePool.trim(),
        prize1st: prize1st.trim() || null,
        prize2nd: prize2nd.trim() || null,
        prize3rd: prize3rd.trim() || null,
        isFreeEntry,
        entryFee: isFreeEntry ? 0 : Number(entryFee) || 0,
        mainPlayersCount: Number(mainPlayersCount) || 5,
        subPlayersCount: Number(subPlayersCount) || 0,
        status,
        rules: rules.trim(),
      };

      if (isoEventDate) {
        payload.eventDate = isoEventDate;
      }

      const res = await fetch(`/api/tournaments/${tournament!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memperbarui informasi turnamen.");
      }

      setSuccessMsg("Informasi turnamen berhasil diperbarui!");
      setTimeout(() => {
        onSuccess(data.tournament);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menyimpan perubahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-[calc(100vw-1.5rem)] max-w-2xl max-h-[85vh] flex flex-col rounded-none border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] text-slate-900 dark:text-[#F8FAFC] shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-tournament-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#0E061A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-[#C77DFF] rounded-none">
              <Trophy size={18} />
            </div>
            <div>
              <h2
                id="edit-tournament-title"
                className="font-display font-extrabold text-base sm:text-lg uppercase tracking-tight text-[#F8FAFC]"
              >
                Edit Info Turnamen
              </h2>
              <p className="font-mono text-[11px] text-[#A78BFA]">
                Perbarui detail turnamen tanpa mengubah susunan bagan &amp; skor berjalan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-none text-zinc-400 hover:text-white hover:bg-white/10 transition"
            aria-label="Tutup modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs font-mono">
          {error && (
            <div className="p-3 rounded-none bg-red-500/15 border border-red-500/30 text-red-300 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-none bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Judul Turnamen */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[#A78BFA] uppercase tracking-wider">
              Judul Turnamen *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: LogHorizon Valorant Major Cup 2026"
              className="w-full h-10 px-3 rounded-none border border-[#2A1B42] bg-[#160B27] text-white focus:outline-none focus:border-[#7C3AED] transition-colors"
            />
          </div>

          {/* 2. Game & Quick Selector */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[#A78BFA] uppercase tracking-wider flex items-center gap-1.5">
              <Gamepad2 size={13} className="text-[#C77DFF]" />
              <span>Nama Game / Cabang Esports *</span>
            </label>
            <input
              type="text"
              required
              value={game}
              onChange={(e) => setGame(e.target.value)}
              placeholder="Contoh: Valorant / Mobile Legends"
              className="w-full h-10 px-3 rounded-none border border-[#2A1B42] bg-[#160B27] text-white focus:outline-none focus:border-[#7C3AED] transition-colors mb-1.5"
            />
            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5">
              {COMMON_GAMES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGame(g)}
                  className={`px-2 py-0.5 rounded-none text-[10px] font-mono transition ${
                    game === g
                      ? "bg-[#7C3AED] text-white font-bold border border-[#7C3AED]"
                      : "bg-[#1A0E2E] text-[#A78BFA] hover:text-white border border-[#2A1B42]"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Tanggal & Jam Mulai (WIB) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[#A78BFA] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} className="text-[#C77DFF]" />
              <span>Tanggal &amp; Jam Mulai Turnamen (WIB / Asia/Jakarta)</span>
            </label>
            <input
              type="datetime-local"
              value={eventDateLocal}
              onChange={(e) => setEventDateLocal(e.target.value)}
              className="w-full h-10 px-3 rounded-none border border-[#2A1B42] bg-[#160B27] text-white focus:outline-none focus:border-[#7C3AED] transition-colors"
            />
          </div>

          {/* 4. Total Hadiah (Prize Pool) & Rincian Opsional */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[#A78BFA] uppercase tracking-wider flex items-center gap-1.5">
              <Trophy size={13} className="text-[#F59E0B]" />
              <span>Total Hadiah (Prize Pool) &amp; Benefit Tambahan</span>
            </label>
            <input
              type="text"
              value={prizePool}
              onChange={(e) => setPrizePool(e.target.value)}
              placeholder="Contoh: Rp 2.500.000 + Discord Role Juara & Sertifikat"
              className="w-full h-10 px-3 rounded-none border border-[#2A1B42] bg-[#160B27] text-white focus:outline-none focus:border-[#7C3AED] transition-colors"
            />
            {/* Rincian Juara 1, 2, 3 Opsional */}
            <div className="pt-2 p-3 bg-[#0E061A] border border-[#2A1B42] space-y-2">
              <span className="text-[10px] font-mono text-[#A78BFA] uppercase tracking-wider block font-bold">
                🎁 Rincian Hadiah Juara (Opsional — Boleh Dikosongkan)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-amber-400 font-semibold block mb-0.5">🥇 Juara 1</label>
                  <input
                    type="text"
                    value={prize1st}
                    onChange={(e) => setPrize1st(e.target.value)}
                    placeholder="Contoh: Rp 1.500.000"
                    className="w-full h-8 px-2.5 text-xs bg-[#160B27] border border-[#2A1B42] text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-300 font-semibold block mb-0.5">🥈 Juara 2</label>
                  <input
                    type="text"
                    value={prize2nd}
                    onChange={(e) => setPrize2nd(e.target.value)}
                    placeholder="Contoh: Rp 700.000"
                    className="w-full h-8 px-2.5 text-xs bg-[#160B27] border border-[#2A1B42] text-white focus:outline-none focus:border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-amber-600 font-semibold block mb-0.5">🥉 Juara 3</label>
                  <input
                    type="text"
                    value={prize3rd}
                    onChange={(e) => setPrize3rd(e.target.value)}
                    placeholder="Contoh: Rp 300.000"
                    className="w-full h-8 px-2.5 text-xs bg-[#160B27] border border-[#2A1B42] text-white focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 5. Mode & Biaya Pendaftaran */}
          <div className="space-y-2 p-3.5 rounded-none border border-[#2A1B42] bg-[#0E061A]">
            <label className="block text-[11px] font-bold text-[#A78BFA] uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={13} className="text-[#10B981]" />
              <span>Mode &amp; Biaya Pendaftaran</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsFreeEntry(true);
                  setEntryFee(0);
                }}
                className={`p-2.5 rounded-none text-center font-bold transition border ${
                  isFreeEntry
                    ? "bg-[#10B981]/20 border-[#10B981] text-[#10B981]"
                    : "bg-[#160B27] border-[#2A1B42] text-zinc-400 hover:text-white"
                }`}
              >
                ✓ Gratis (Free Entry)
              </button>
              <button
                type="button"
                onClick={() => setIsFreeEntry(false)}
                className={`p-2.5 rounded-none text-center font-bold transition border ${
                  !isFreeEntry
                    ? "bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]"
                    : "bg-[#160B27] border-[#2A1B42] text-zinc-400 hover:text-white"
                }`}
              >
                💳 Berbayar (Paid Entry)
              </button>
            </div>

            {!isFreeEntry && (
              <div className="pt-2 space-y-1">
                <label className="block text-[10px] text-[#A78BFA]">
                  Nominal Biaya Registrasi per Tim (IDR):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-400">Rp</span>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={entryFee || ""}
                    onChange={(e) => setEntryFee(Math.max(0, Number(e.target.value)))}
                    placeholder="50000"
                    className="w-full h-10 pl-10 pr-3 rounded-none border border-[#2A1B42] bg-[#160B27] text-white focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 6. Komposisi Roster Pemain */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-none border border-[#2A1B42] bg-[#0E061A]">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#A78BFA] uppercase tracking-wider flex items-center gap-1.5">
                <Users size={13} className="text-[#C77DFF]" />
                <span>Pemain Inti (Wajib)</span>
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={mainPlayersCount}
                onChange={(e) => setMainPlayersCount(Math.max(1, Math.min(10, Number(e.target.value))))}
                className="w-full h-10 px-3 rounded-none border border-[#2A1B42] bg-[#160B27] text-white focus:outline-none focus:border-[#7C3AED]"
              />
              <span className="text-[10px] text-zinc-400 block">Default: 5 pemain (misal MOBA/FPS)</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#A78BFA] uppercase tracking-wider flex items-center gap-1.5">
                <Users size={13} className="text-zinc-400" />
                <span>Pemain Cadangan (Maks)</span>
              </label>
              <input
                type="number"
                min="0"
                max="5"
                value={subPlayersCount}
                onChange={(e) => setSubPlayersCount(Math.max(0, Math.min(5, Number(e.target.value))))}
                className="w-full h-10 px-3 rounded-none border border-[#2A1B42] bg-[#160B27] text-white focus:outline-none focus:border-[#7C3AED]"
              />
              <span className="text-[10px] text-zinc-400 block">Default: 2 pemain opsional</span>
            </div>
          </div>

          {/* 7. Status Turnamen */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[#A78BFA] uppercase tracking-wider">
              Status Turnamen Saat Ini
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus("REGISTRATION")}
                className={`p-2.5 rounded-none text-center font-bold transition border ${
                  status === "REGISTRATION" || status === "OPEN"
                    ? "bg-[#7C3AED]/20 border-[#7C3AED] text-[#C77DFF]"
                    : "bg-[#160B27] border-[#2A1B42] text-zinc-400 hover:text-white"
                }`}
              >
                ● REGISTRATION
                <span className="block text-[9px] font-normal opacity-75">Pendaftaran Buka</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus("ONGOING")}
                className={`p-2.5 rounded-none text-center font-bold transition border ${
                  status === "ONGOING"
                    ? "bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]"
                    : "bg-[#160B27] border-[#2A1B42] text-zinc-400 hover:text-white"
                }`}
              >
                🔴 ONGOING
                <span className="block text-[9px] font-normal opacity-75">Sedang Berlangsung</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus("COMPLETED")}
                className={`p-2.5 rounded-none text-center font-bold transition border ${
                  status === "COMPLETED"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                    : "bg-[#160B27] border-[#2A1B42] text-zinc-400 hover:text-white"
                }`}
              >
                ✓ COMPLETED
                <span className="block text-[9px] font-normal opacity-75">Turnamen Selesai</span>
              </button>
            </div>
          </div>

          {/* 8. Peraturan Khusus Turnamen */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-[#A78BFA] uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={13} className="text-[#C77DFF]" />
              <span>Peraturan &amp; Ketentuan Khusus Turnamen (`rules`)</span>
            </label>
            <textarea
              rows={5}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="Tuliskan format pertandingan (BO1/BO3), batas keterlambatan WO (15 menit), aturan pause, dan ketentuan teknis lainnya..."
              className="w-full p-3 rounded-none border border-[#2A1B42] bg-[#160B27] text-white focus:outline-none focus:border-[#7C3AED] leading-relaxed"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-[#2A1B42] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-none border border-[#2A1B42] bg-[#1A0E2E] text-zinc-300 hover:text-white hover:border-[#7C3AED] transition font-bold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-none bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold inline-flex items-center gap-2 border border-[#7C3AED] transition shadow-md disabled:opacity-50"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              <span>Simpan Perubahan Turnamen</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
