import { Suspense } from "react";
import { MembersDirectory } from "@/components/members-directory";
import { Users, Shield, Sparkles } from "lucide-react";

export const metadata = {
  title: "Direktori Petualang | LogHorizon",
  description: "Cari member, jelajahi profil petualang, cek reputasi kasta, dan langsung ajak mabar atau obrolan pribadi di LogHorizon.",
};

export const instant = false;

export default function MembersPage() {
  return (
    <main className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Page Title & Hero */}
      <div className="mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/30">
          <Users size={13} />
          <span>DIREKTORI PETUALANG GUILD LOGHORIZON</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Temukan &amp; Kenali Para Petualang
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
          Cari seluruh member komunitas berdasarkan kasta, game favorit, rank in-game, atau squad party. Pantau status online, ikuti perjalanan mereka, dan kirimkan Pesan Pribadi (PM) secara instan.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="py-24 text-center text-xs font-mono text-slate-400">
            Menyiapkan direktori petualang...
          </div>
        }
      >
        <MembersDirectory />
      </Suspense>
    </main>
  );
}
