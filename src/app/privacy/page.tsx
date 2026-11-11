import Link from "next/link";
import { ArrowLeft, CheckCircle2, Lock, Shield } from "lucide-react";

export const metadata = {
  title: "Kebijakan Privasi | LogHorizon",
  description: "Kebijakan privasi dan perlindungan data anggota komunitas LogHorizon.",
};

export default function PrivacyPage() {
  return (
    <main className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full max-w-full overflow-x-hidden">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9D4EDD] hover:underline mb-6"
      >
        <ArrowLeft size={15} /> Kembali ke Beranda
      </Link>

      <article className="p-6 sm:p-10 rounded-xl border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] shadow-xl space-y-6 text-gray-700 dark:text-gray-300">
        <header className="border-b border-gray-100 dark:border-[#211C2B] pb-6">
          <p className="text-xs font-bold text-[#9D4EDD] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Shield size={14} /> KEBIJAKAN PRIVASI KOMUNITAS
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            Privasi &amp; Perlindungan Data
          </h1>
          <p className="text-xs text-gray-500 mt-2">
            Terakhir diperbarui: November 2026 • Berlaku untuk seluruh anggota guild LogHorizon.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Lock size={16} className="text-[#9D4EDD]" /> 1. Data yang Kami Kumpulkan
          </h2>
          <p className="text-sm leading-relaxed">
            LogHorizon menggunakan protokol autentikasi resmi <strong>Discord OAuth2</strong>. Kami hanya menyimpan
            identitas publik akun Discord Anda yang diperlukan untuk mengenali keanggotaan guild:
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm space-y-1.5 pl-2 text-gray-600 dark:text-gray-400">
            <li>ID Discord unik (Discord Snowflake ID).</li>
            <li>Username Discord dan tautan avatar publik.</li>
            <li>Alamat email (hanya jika diverifikasi oleh penyedia OAuth Discord untuk sinkronisasi akun).</li>
          </ul>
          <p className="text-xs text-gray-500">
            Kami <strong>tidak pernah</strong> meminta, menyimpan, atau memiliki akses ke kata sandi (password) akun Discord Anda.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#9D4EDD]" /> 2. Penggunaan Data Komunitas
          </h2>
          <p className="text-sm leading-relaxed">
            Data yang tersimpan digunakan semata-mata untuk memfasilitasi aktivitas komunitas internal:
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm space-y-1.5 pl-2 text-gray-600 dark:text-gray-400">
            <li>Menampilkan profil, level reputasi, dan lencana petualang di Forum &amp; Leaderboard.</li>
            <li>Memfasilitasi sistem moderasi guild, pencegahan kecurangan (anti-cheat/anti-scam), dan notifikasi aktivitas.</li>
            <li>Memverifikasi kelayakan peran kasta (Emperor, Council, Knight, High Merchant, Adventurer).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield size={16} className="text-[#9D4EDD]" /> 3. Keamanan Data &amp; Pihak Ketiga
          </h2>
          <p className="text-sm leading-relaxed">
            LogHorizon tidak menjual atau menyewakan informasi anggota kepada pihak periklanan manapun. Database kami
            dikelola menggunakan enkripsi modern pada cloud PostgreSQL terkelola yang terisolasi dengan akses ketat.
          </p>
        </section>

        <section className="space-y-2 pt-4 border-t border-gray-100 dark:border-[#211C2B]">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Pertanyaan &amp; Bantuan Privasi</h2>
          <p className="text-xs leading-relaxed text-gray-500">
            Jika Anda memiliki pertanyaan seputar hak privasi atau ingin mengajukan penghapusan data akun, silakan hubungi
            pengurus guild melalui server Discord resmi LogHorizon atau hubungi Emperor .odyssia.
          </p>
        </section>
      </article>
    </main>
  );
}
