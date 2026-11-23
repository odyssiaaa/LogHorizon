"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Award,
  Ban,
  Bot,
  CheckCircle2,
  Clock,
  Coins,
  Crown,
  FileText,
  Gamepad2,
  HelpCircle,
  Lock,
  MessageSquare,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { openPwaInstallModal } from "@/components/pwa-install-modal";

export function RulesGuideTabs() {
  const [activeTab, setActiveTab] = useState<"ethics" | "esports" | "escrow" | "faq">("ethics");

  return (
    <div className="space-y-6">
      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("ethics")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === "ethics"
              ? "bg-[#7C3AED] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Scale size={15} />
          <span>⚖️ Kode Etik &amp; Sanksi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("esports")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === "esports"
              ? "bg-[#7C3AED] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Trophy size={15} />
          <span>🏆 Regulasi Turnamen</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("escrow")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === "escrow"
              ? "bg-[#7C3AED] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <ShieldCheck size={15} />
          <span>🛡️ Panduan Rekber 3-Pihak</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("faq")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === "faq"
              ? "bg-[#7C3AED] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <HelpCircle size={15} />
          <span>❓ FAQ &amp; Panduan Fitur</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: KODE ETIK & KEBIJAKAN SANKSI                                       */}
      {/* ========================================================================= */}
      {activeTab === "ethics" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-sm space-y-6">
            <div className="border-b border-slate-100 dark:border-[#2E1E45] pb-4">
              <span className="text-[11px] font-mono uppercase font-bold text-[#7C3AED] dark:text-[#A78BFA] block mb-1">
                PILAR KOMUNITAS
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Kode Etik &amp; Kebijakan Sanksi Komunitas LogHorizon
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                LogHorizon adalah ruang bersama yang aman, suportif, dan adil bagi seluruh gamer dari berbagai latar belakang.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Anti-Toxic */}
              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-950/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-2">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                  <ShieldAlert size={16} />
                  <span>1. Anti-Toxic &amp; Anti-SARA</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Dilarang keras melakukan pelecehan, intimidasi, penghinaan berbau suku/agama/ras, atau perilaku merendahkan sesama member di Forum, Obrolan, dan Voice Channel.
                </p>
              </div>

              {/* Anti-Cheat */}
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-950/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                  <Ban size={16} />
                  <span>2. Anti-Cheat &amp; Exploit</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Penggunaan aplikasi pihak ketiga ilegal (maphack, aimbot, wallhack, script auto-combo) atau eksploitasi celah bug yang merusak integritas kompetitif dilarang 100%.
                </p>
              </div>

              {/* Anti-Scam */}
              <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-950/60 bg-purple-50/50 dark:bg-purple-950/20 space-y-2">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
                  <ShieldCheck size={16} />
                  <span>3. Anti-Scam &amp; Transaksi Gelap</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Segala bentuk jual beli akun, joki, atau item WAJIB melalui sistem Rekber Escrow resmi LogHorizon. Mengajak transaksi di luar rekber akan ditindak tegas.
                </p>
              </div>
            </div>

            {/* Tingkatan Sanksi Resmi */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scale size={16} className="text-[#7C3AED]" /> Hierarki &amp; Tingkatan Sanksi Pelanggaran
              </h3>
              <div className="space-y-2.5 text-xs font-mono">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#0A0512] flex items-start gap-3">
                  <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500 font-bold text-[10px] shrink-0">
                    TINGKAT 1
                  </span>
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200 block">Teguran Resmi (Official Warning)</strong>
                    <span className="text-slate-500 dark:text-slate-400">
                      Diberikan untuk pelanggaran ringan (spamming minor, provokasi awal). Tercatat dalam riwayat rekam jejak akun.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#0A0512] flex items-start gap-3">
                  <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-500 font-bold text-[10px] shrink-0">
                    TINGKAT 2
                  </span>
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200 block">Pembatasan Fitur &amp; Mute (3–7 Hari)</strong>
                    <span className="text-slate-500 dark:text-slate-400">
                      Akun tidak dapat memposting di forum, membuat lapak, atau mengirim pesan pribadi untuk sementara waktu.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#0A0512] flex items-start gap-3">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-500 font-bold text-[10px] shrink-0">
                    TINGKAT 3
                  </span>
                  <div>
                    <strong className="text-rose-500 block">Pemblokiran Permanen (Permanent Ban &amp; Blacklist)</strong>
                    <span className="text-slate-500 dark:text-slate-400">
                      Dikenakan pada pelaku penipuan (scammer), penyebar cheat, atau pelanggar etika berat. Akun dan Discord ID masuk blacklist komunitas.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REGULASI TURNAMEN ESPORTS                                         */}
      {/* ========================================================================= */}
      {activeTab === "esports" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-sm space-y-6">
            <div className="border-b border-slate-100 dark:border-[#2E1E45] pb-4">
              <span className="text-[11px] font-mono uppercase font-bold text-amber-500 block mb-1">
                STANDAR KOMPETISI RESMI
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Buku Aturan &amp; Regulasi Baku Turnamen LogHorizon
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Wajib ditaati oleh seluruh kapten tim, pemain inti, dan cadangan sebelum bertanding di Arena LogHorizon.
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {/* Batas Telat 12 Menit */}
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 flex items-start gap-3">
                <Clock size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                    1. Batas Toleransi Keterlambatan Tepat 12 Menit (Walkover / WO)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Setiap tim diberikan waktu toleransi keterlambatan maksimal <strong>12 menit</strong> sejak jadwal ronde pertandingan dimulai atau sejak room lobi dibuat. Jika setelah 12 menit tim lawan belum lengkap atau tidak hadir di lobi tanpa konfirmasi resmi ke panitia, wasit berhak memberikan kemenangan WO otomatis (1-0 atau 2-0).
                  </p>
                </div>
              </div>

              {/* Larangan Chat All & Radio */}
              <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 flex items-start gap-3">
                <MessageSquare size={20} className="text-[#7C3AED] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                    2. Larangan Radio / All-Chat &amp; Taunting Berlebihan
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Selama pertandingan berlangsung di game (misal MLBB, Valorant, dll.), pemain dilarang menggunakan fitur <strong>All-Chat</strong> untuk memprovokasi, merendahkan, atau melakukan taunting berlebihan terhadap tim lawan. Chat in-game hanya diperbolehkan untuk jeda teknis (pause) atau ucapan &quot;GGWP&quot; di akhir pertandingan.
                  </p>
                </div>
              </div>

              {/* Syarat Bukti Screenshot */}
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-start gap-3">
                <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                    3. Syarat Wajib Bukti Screenshot Hasil Pertandingan
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Kapten tim pemenang <strong>wajib melampirkan screenshot papan skor (scoreboard)</strong> dan layar kemenangan (Victory screen) pada ruang chat match atau ke wasit panitia turnamen. Tanpa bukti visual yang sah, skor pada bagan bracket tidak akan dimajukan ke ronde berikutnya.
                  </p>
                </div>
              </div>

              {/* Alur Pembagian Hadiah */}
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 flex items-start gap-3">
                <Coins size={20} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                    4. Alur &amp; Jadwal Pencairan Hadiah Kas / Prizepool
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Setelah babak Grand Final selesai:
                  </p>
                  <ul className="list-disc list-inside text-xs mt-1 space-y-1 text-slate-600 dark:text-slate-400 pl-2">
                    <li>Kapten tim juara 1, 2, dan 3 wajib menyerahkan nomor rekening bank atau e-wallet resmi.</li>
                    <li>Kas perbendaharaan guild akan mentransfer hadiah dalam tempo maksimal <strong>1x24 jam</strong> kerja.</li>
                    <li>Nama tim dan roster otomatis terukir permanen di galeri <Link href="/hall-of-winners" className="text-[#7C3AED] underline font-bold">Hall of Winners 🏆</Link>.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PANDUAN REKBER 3-PIHAK (ESCROW)                                   */}
      {/* ========================================================================= */}
      {activeTab === "escrow" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-sm space-y-6">
            <div className="border-b border-slate-100 dark:border-[#2E1E45] pb-4">
              <span className="text-[11px] font-mono uppercase font-bold text-emerald-500 block mb-1">
                PERLINDUNGAN TRANSAKSI 100%
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Panduan Rekening Bersama (Rekber / Escrow) 3-Pihak
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Lindungi uang dan akunmu dari penipuan. Jangan pernah bertransaksi langsung tanpa pengawalan Rekber LogHorizon.
              </p>
            </div>

            {/* 4 Langkah Alur Rekber */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#08040E] space-y-2">
                <div className="w-7 h-7 rounded-lg bg-[#7C3AED] text-white flex items-center justify-center font-mono font-bold text-xs">
                  1
                </div>
                <h3 className="font-bold text-xs text-slate-900 dark:text-white">Pembeli Setor Dana</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Setelah sepakat harga, pembeli mentransfer dana ke rekening/QRIS kas resmi perbendaharaan LogHorizon.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#08040E] space-y-2">
                <div className="w-7 h-7 rounded-lg bg-[#7C3AED] text-white flex items-center justify-center font-mono font-bold text-xs">
                  2
                </div>
                <h3 className="font-bold text-xs text-slate-900 dark:text-white">Dana Dikunci di Escrow</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Sistem dan Staff memverifikasi dana &amp; membuka ruang transaksi aman. Penjual diinstruksikan menyerahkan data akun.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#08040E] space-y-2">
                <div className="w-7 h-7 rounded-lg bg-[#7C3AED] text-white flex items-center justify-center font-mono font-bold text-xs">
                  3
                </div>
                <h3 className="font-bold text-xs text-slate-900 dark:text-white">Verifikasi &amp; Amankan</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Pembeli mengamankan data (ganti email, sandi, no HP, 2FA) dan memastikan akun sesuai spesifikasi yang dijanjikan.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#08040E] space-y-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-mono font-bold text-xs">
                  4
                </div>
                <h3 className="font-bold text-xs text-slate-900 dark:text-white">Pencairan Dana ke Penjual</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Pembeli menekan tombol konfirmasi selesai, lalu wasit rekber mencairkan dana ke rekening penjual secara instan.
                </p>
              </div>
            </div>

            {/* Jaminan Keamanan */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-3 text-xs">
              <ShieldCheck size={20} className="text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Jaminan 100% Uang Kembali (Money-Back Guarantee)
                </h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Jika penjual membatalkan transaksi, memberikan data palsu, atau akun mengalami masalah (hackback / minus kredit) dalam masa pengawalan rekber, uang pembeli akan dikembalikan utuh tanpa potongan biaya administrasi.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FAQ & PANDUAN FITUR                                                */}
      {/* ========================================================================= */}
      {activeTab === "faq" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] shadow-sm space-y-6">
            <div className="border-b border-slate-100 dark:border-[#2E1E45] pb-4">
              <span className="text-[11px] font-mono uppercase font-bold text-[#7C3AED] dark:text-[#A78BFA] block mb-1">
                TANYA JAWAB RESMI
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Frequently Asked Questions (FAQ) &amp; Panduan Fitur
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Jawaban atas pertanyaan yang sering diajukan mengenai sistem XP, Party Squad, dan Satpam Horizon AI.
              </p>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              {/* FAQ 1: Cara Naik Level / XP */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#0A0512] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Zap size={16} className="text-[#7C3AED]" />
                  <span>Bagaimana cara menaikkan Level dan mengumpulkan XP?</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
                  Setiap 100 XP kamu akan naik 1 Level. Kamu bisa memperoleh XP dengan:
                </p>
                <ul className="list-disc list-inside text-xs text-slate-500 dark:text-slate-400 pl-8 space-y-1">
                  <li><strong>Absen Harian (+50 XP):</strong> Klaim harian di halaman profil atau beranda.</li>
                  <li><strong>Misi Petualang Harian (+30 s/d +75 XP):</strong> Membuat thread, like diskusi, atau ikut party mabar LFG.</li>
                  <li><strong>Undang Teman (+200 XP):</strong> Bagikan tautan referral unikmu (<code>?ref=username</code>).</li>
                  <li><strong>Buka Peti Harian Kerajaan:</strong> Dapatkan bonus XP kejutan hingga +150 XP setiap hari.</li>
                </ul>
              </div>

              {/* FAQ 2: Cara Membuat Guild Party */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#0A0512] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Users size={16} className="text-[#7C3AED]" />
                  <span>Bagaimana cara membuat atau bergabung dengan Guild Party (Squad)?</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
                  Kunjungi halaman <Link href="/events?view=party" className="text-[#7C3AED] underline font-bold">Direktori Guild Party</Link>. Kamu dapat membuat party baru dengan menentukan Nama, Tag 2–5 huruf (misal <code>[NVG]</code>), game utama, dan warna emblem tim. Kapten dapat mengundang hingga 10 anggota tetap dan langsung mendaftarkan seluruh squad ke turnamen dalam 1 kali klik.
                </p>
              </div>

              {/* FAQ 3: Perintah @satpam AI */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#0A0512] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Bot size={16} className="text-[#7C3AED]" />
                  <span>Apa saja yang bisa dilakukan oleh Satpam Horizon AI (@satpam)?</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
                  Satpam Horizon adalah AI asisten penjaga kerajaan LogHorizon. Kamu bisa berinteraksi dengannya melalui:
                </p>
                <ul className="list-disc list-inside text-xs text-slate-500 dark:text-slate-400 pl-8 space-y-1">
                  <li><strong>Widget Maskot Ksatria Melayang:</strong> Klik maskot ksatria di pojok kanan bawah layar untuk bertanya seputar jadwal turnamen, panduan aturan, atau meminta navigasi fitur.</li>
                  <li><strong>Mention di Komentar Forum:</strong> Ketik <code>@satpam</code> pada kolom komentar thread mana pun. Satpam AI akan membaca konteks diskusi dan membalas pertanyaan atau merangkum isi thread secara cerdas.</li>
                  <li><strong>Sensor Kata Kasar Otomatis:</strong> Satpam AI secara otomatis memfilter komentar atau konten berbahaya demi menjaga keamanan komunitas.</li>
                </ul>
              </div>

              {/* FAQ 4: Cara Pasang Aplikasi PWA */}
              <div className="p-4 rounded-xl border border-[#7C3AED]/40 bg-[#7C3AED]/5 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <Smartphone size={16} className="text-[#7C3AED]" />
                    <span>Bagaimana cara mengunduh dan memasang LogHorizon sebagai aplikasi di HP atau PC (PWA)?</span>
                  </div>
                  <button
                    type="button"
                    onClick={openPwaInstallModal}
                    className="px-3 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold font-mono transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Smartphone size={13} />
                    <span>Panduan Lengkap</span>
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
                  LogHorizon adalah Progressive Web App (PWA) resmi yang dapat dipasang ke layar utama HP (Android / iPhone) atau Desktop PC (Windows / Mac) tanpa perlu download melalui Play Store atau App Store:
                </p>
                <ul className="list-disc list-inside text-xs text-slate-500 dark:text-slate-400 pl-8 space-y-1">
                  <li><strong>Android (Chrome/Edge):</strong> Buka browser, ketuk menu titik tiga (⋮) di pojok kanan atas, lalu pilih <em>&quot;Tambahkan ke Layar Utama&quot;</em> atau <em>&quot;Instal Aplikasi&quot;</em>.</li>
                  <li><strong>iPhone/iPad (Safari):</strong> Buka di Safari, ketuk tombol <strong>Share (⬆️)</strong> di bilah bawah, lalu pilih <em>&quot;Tambah ke Layar Utama&quot;</em>.</li>
                  <li><strong>PC/Laptop:</strong> Buka di Chrome/Edge, klik ikon <strong>Layar + Unduh (📥)</strong> di pojok kanan bilah alamat URL, lalu klik <strong>Install</strong>.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
