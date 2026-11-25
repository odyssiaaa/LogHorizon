import { Metadata } from "next";
import Link from "next/link";
import { DungeonBoard } from "@/components/dungeon-board";
import { ArrowLeft, Skull, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Royal Dungeon & Wanted Bounty Board | LogHorizon",
  description:
    "Papan buronan penipu (scammer), sanksi blacklist permanen, dan sel tahanan royal dungeon guild LogHorizon.",
};

export const instant = false;

export default function DungeonPage() {
  return (
    <main className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full min-w-0 animate-fade-in-up">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-400 hover:underline"
        >
          <ArrowLeft size={15} /> Kembali ke Beranda
        </Link>
        <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
          <Link href="/rules" className="hover:text-white transition">
            Kode Etik &amp; Sanksi
          </Link>
          <span>•</span>
          <Link href="/marketplace" className="hover:text-white transition">
            Rekber Aman
          </Link>
        </div>
      </div>

      <DungeonBoard />
    </main>
  );
}
