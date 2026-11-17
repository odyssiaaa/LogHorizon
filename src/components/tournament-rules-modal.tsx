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
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn text-left"
    >
      <div
        className="w-[calc(100vw-2rem)] max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2A1B42] rounded-none shadow-2xl relative my-auto overflow-hidden text-left text-slate-900 dark:text-[#F8FAFC]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#2A1B42] flex items-center justify-between gap-3 bg-slate-50 dark:bg-[#0E061A]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-none bg-[#130921] border border-[#2E1E45] flex items-center justify-center text-[#A78BFA] shrink-0">
              <BookOpen size={18} />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-[#A78BFA] uppercase tracking-wider block">
                WAJIB BACA &amp; SETUJU // {game}
              </span>
              <h3 id="tournament-rules-title" className="font-display text-base sm:text-lg font-extrabold text-[#F8FAFC] uppercase tracking-tight leading-tight">
                Peraturan Resmi Turnamen
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#A78BFA] hover:text-[#F8FAFC] p-1 rounded-none transition"
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
              <div className="p-4 rounded-none border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#181324] space-y-2">
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
              <div className="p-4 rounded-none border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#181324] space-y-2">
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
              <div className="p-4 rounded-none border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#181324] space-y-2">
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
              <div className="p-4 rounded-none border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#181324] space-y-2">
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
            <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed p-4 rounded-none border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#181324]">
              {rawRules}
            </div>
          )}
        </div>

        {/* Footer Persetujuan & Tombol Lanjut */}
        <div className="p-4 sm:p-5 border-t border-[#2E1E45] bg-[#1A0E2E] space-y-3 shrink-0 font-mono">
          {/* Checkbox Wajib */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 rounded-none border border-[#2E1E45] bg-[#09040F] text-[#7C3AED] focus:ring-0 cursor-pointer"
            />
            <span className="text-xs text-[#F8FAFC] group-hover:text-[#A78BFA] transition">
              Saya perwakilan tim telah membaca, memahami, dan menyetujui seluruh peraturan turnamen di atas untuk dibagikan kepada anggota tim saya.
            </span>
          </label>

          {/* Tombol Aksi */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-none font-mono text-xs uppercase tracking-wider bg-[#130921] text-[#A78BFA] border border-[#2E1E45] hover:border-[#7C3AED] hover:text-[#F8FAFC]"
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
              className={`px-4 py-2 rounded-none font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
                agreed
                  ? "bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F8FAFC] border border-[#7C3AED]"
                  : "bg-[#1A0E2E] text-[#A78BFA]/50 border border-[#2E1E45] cursor-not-allowed opacity-60"
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
