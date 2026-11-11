import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileText, Scale, ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Syarat & Ketentuan | LogHorizon",
  description: "Syarat, ketentuan, dan etika bertransaksi serta berdiskusi di komunitas LogHorizon.",
};

export default function TermsPage() {
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
            <FileText size={14} /> SYARAT &amp; KETENTUAN KOMUNITAS
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            Ketentuan &amp; Etika Guild
          </h1>
          <p className="text-xs text-gray-500 mt-2">
            Dengan mengakses situs dan berpartisipasi di komunitas LogHorizon, Anda setuju untuk mematuhi ketentuan berikut.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Scale size={16} className="text-[#9D4EDD]" /> 1. Kode Etik &amp; Sikap Komunitas
          </h2>
          <p className="text-sm leading-relaxed">
            LogHorizon dibangun atas dasar persaudaraan sesama gamer. Seluruh petualang wajib menjunjung tinggi rasa hormat:
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm space-y-1.5 pl-2 text-gray-600 dark:text-gray-400">
            <li>Dilarang melakukan pelecehan, intimidasi, ujaran kebencian, atau perilaku toxic di Forum, Chat, dan Voice Room.</li>
            <li>Dilarang keras menyebarkan cheat ilegal, eksploit yang merusak ekosistem game, malware, atau tautan phishing.</li>
            <li>Dilarang melakukan spamming massal pada forum atau eksploitasi dan perusakan terhadap sistem komunitas.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-500" /> 2. Perdagangan &amp; Transaksi Lapak (Marketplace)
          </h2>
          <p className="text-sm leading-relaxed">
            Marketplace LogHorizon adalah papan temu antar gamer komunitas. Pengguna bertanggung jawab penuh atas barang/jasa yang diperjualbelikan:
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm space-y-1.5 pl-2 text-gray-600 dark:text-gray-400">
            <li>Seluruh deskripsi produk wajib jujur, akurat, dan tidak menyesatkan pihak pembeli.</li>
            <li>Penipuan (scam) akan berakibat pada pemblokiran akun permanen (Ban IP &amp; Discord) serta pencantuman reputasi buruk secara publik.</li>
            <li>Fitur status Escrow berfungsi memantau koordinasi serah terima item demi keamanan dan transparansi guild.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" /> 3. Donasi &amp; Kas Perbendaharaan Guild
          </h2>
          <p className="text-sm leading-relaxed">
            Setiap kontribusi pada halaman Treasury (/donate) merupakan bentuk dukungan sukarela untuk keberlangsungan server,
            hadiah turnamen mabar, dan pengembangan ekosistem LogHorizon. Kontribusi donatur dihargai melalui lencana profil
            kehormatan (*Knight*, *High Merchant*, *Noble Patron*).
          </p>
        </section>

        <section className="space-y-2 pt-4 border-t border-gray-100 dark:border-[#211C2B]">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Penegakan &amp; Yurisdiksi Pengurus</h2>
          <p className="text-xs leading-relaxed text-gray-500">
            Emperor dan Moderator berhak membatasi, menangguhkan, atau menghapus akun/postingan yang terbukti melanggar
            ketentuan demi menjaga ketentraman seluruh anggota guild LogHorizon.
          </p>
        </section>
      </article>
    </main>
  );
}
