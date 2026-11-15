"use client";

import { useState } from "react";
import { AlertTriangle, BookOpen, Check, ShieldAlert, X } from "lucide-react";
import { DEFAULT_TOURNAMENT_RULES } from "@/lib/tournament";

interface TournamentRulesModalProps {
  isOpen: boolean;
  tournamentTitle: string;
  game: string;
  rules?: string | null;
  onClose: () => void;
  onAgree: () => void;
}

export function TournamentRulesModal({
  isOpen,
  tournamentTitle,
  game,
  rules,
  onClose,
  onAgree,
}: TournamentRulesModalProps) {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const rawRules = (rules && rules.trim().length > 0) ? rules.trim() : DEFAULT_TOURNAMENT_RULES;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tournament-rules-title"
      className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
    >
      <div
        className="w-[calc(100vw-2rem)] max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-[#120F17] border border-gray-200 dark:border-[#211C2B] rounded-2xl shadow-2xl relative my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-[#211C2B] flex items-center justify-between gap-3 bg-gray-50/70 dark:bg-[#181322]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-[#9D4EDD] shrink-0">
              <BookOpen size={18} />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-[#9D4EDD] uppercase tracking-wider block">
                WAJIB BACA &amp; SETUJU • {game}
              </span>
              <h3 id="tournament-rules-title" className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight">
                Peraturan Resmi Turnamen
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Banner Peringatan */}
        <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-500 dark:text-amber-300">
          <ShieldAlert size={16} className="shrink-0 text-amber-400" />
          <span>
            Setiap perwakilan tim bertanggung jawab menyampaikan dan memastikan seluruh anggota tim menaati aturan ini.
          </span>
        </div>

        {/* Isi Kotak Peraturan (Scrollable) */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {rawRules === DEFAULT_TOURNAMENT_RULES ? (
            <>
              {/* PASAL 1 */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#181324] space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 text-rose-500 dark:text-rose-400">
                  <span>1. MASALAH RADIO &amp; CHAT ALL</span>
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300 pl-1">
                  <li>
                    Jika ada lawan yang melakukan <em>Radio All</em> atau <em>Chat All</em>, harap segera ambil <em>screenshot</em> bukti dan langsung lakukan <strong>surrender (menyerah)</strong>, kemudian lapor ke Admin saat itu juga. <strong className="text-rose-400 dark:text-rose-300">(Laporan tidak diterima apabila match sudah selesai dimainkan).</strong>
                  </li>
                  <li className="text-gray-500 dark:text-gray-400 bg-black/10 dark:bg-black/30 p-2.5 rounded-lg border border-black/5 dark:border-white/5">
                    <strong>Contoh Kasus:</strong> Tim A vs Tim B. Tim A melakukan <em>Radio All / Chat All</em> dan Tim B tidak langsung melapor (melanjutkan game hingga kalah), maka laporan setelah match selesai tidak diterima dan kemenangan tetap sah milik Tim A.
                  </li>
                </ul>
              </div>

              {/* PASAL 2 */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#181324] space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 text-amber-500 dark:text-amber-400">
                  <span>2. TENTANG JADWAL PERTANDINGAN</span>
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300 pl-1">
                  <li>
                    Dilarang memainkan pertandingan di luar jadwal yang ditentukan (misal jadwal pukul 20:00 WIB, kedua tim sepakat mundur ke pukul 20:20 WIB tanpa izin panitia, maka <strong className="text-rose-400">kedua tim didiskualifikasi</strong>). <em>(Pertandingan boleh dipercepat asalkan kedua tim sepakat dan melapor ke panitia).</em>
                  </li>
                  <li>
                    Toleransi keterlambatan maksimal <strong>12 menit</strong> dari jadwal resmi.
                  </li>
                  <li>
                    Untuk tim yang mengalami <em>late game</em> pada pertandingan sebelumnya, Admin memberikan toleransi waktu setelah game sebelumnya selesai.
                  </li>
                </ul>
              </div>

              {/* PASAL 3 */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#181324] space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 text-purple-600 dark:text-purple-300">
                  <span>3. DETAIL PERATURAN TOURNAMENT LOGHORIZON</span>
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300 pl-1">
                  <li>
                    Jaringan / koneksi internet dan kondisi <em>device</em> sepenuhnya menjadi tanggung jawab masing-masing pemain.
                  </li>
                  <li>
                    Dilarang keras menggunakan <em>cheat</em> dalam bentuk apa pun (<em>maphack</em>, <em>drone view</em>, script ilegal, dll.).
                  </li>
                  <li>
                    Dilarang melakukan <em>Radio All</em> (<em>GG</em>, <em>Well played</em>, <em>Mainnya hebat</em>, dsb.) maupun <em>Chat All</em> kepada lawan.
                  </li>
                  <li>
                    <em>Emote</em> dan <em>recall-recall</em> <strong>diperbolehkan</strong>.
                  </li>
                  <li className="text-rose-400 font-semibold">
                    Pelanggaran terhadap aturan di atas (dengan bukti valid ke Admin) berakibat <strong>diskualifikasi mutlak</strong> tanpa pengecualian. Pastikan aturan ini dibagikan ke seluruh anggota tim.
                  </li>
                </ul>
              </div>

              {/* PASAL 4 */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#181324] space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 text-emerald-500 dark:text-emerald-400">
                  <span>4. SISTEM MATCH TOURNAMENT LOGHORIZON</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm pt-1">
                  <div className="p-2.5 rounded-lg bg-black/10 dark:bg-black/30 border border-black/5 dark:border-white/5">
                    <strong>Kualifikasi:</strong> BO1 (<em>Best of 1</em>: kalah langsung gugur)
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/10 dark:bg-black/30 border border-black/5 dark:border-white/5">
                    <strong>Semifinal:</strong> BO3 (<em>Best of 3</em>: kalah langsung gugur)
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/10 dark:bg-black/30 border border-black/5 dark:border-white/5">
                    <strong>Bronze Match (Juara 3):</strong> BO3
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/10 dark:bg-black/30 border border-black/5 dark:border-white/5">
                    <strong>Grand Final:</strong> BO3
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#181324]">
              {rawRules}
            </div>
          )}
        </div>

        {/* Footer Persetujuan & Tombol Lanjut */}
        <div className="p-4 sm:p-5 border-t border-gray-200 dark:border-[#211C2B] bg-gray-50/70 dark:bg-[#181322] space-y-3 shrink-0">
          {/* Checkbox Wajib */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-white/20 text-[#9D4EDD] focus:ring-[#9D4EDD] focus:ring-offset-0 bg-white dark:bg-black/40 cursor-pointer"
            />
            <span className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition">
              Saya perwakilan tim telah membaca, memahami, dan menyetujui seluruh peraturan turnamen di atas untuk dibagikan kepada anggota tim saya.
            </span>
          </label>

          {/* Tombol Aksi */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="button button-quiet text-xs font-semibold px-4 py-2"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!agreed}
              onClick={() => {
                if (!agreed) return;
                onAgree();
              }}
              className={`button text-xs font-black px-4 py-2 flex items-center gap-1.5 transition ${
                agreed
                  ? "button-primary shadow-lg shadow-[#9D4EDD]/25"
                  : "bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed opacity-60"
              }`}
            >
              <span>Lanjut ke Form Pendaftaran ➔</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
