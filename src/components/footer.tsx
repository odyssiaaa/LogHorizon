"use client";

import Link from "next/link";
import { useLocale } from "@/context/locale-context";

export function Footer() {
  const { t } = useLocale();

  return (
    <footer className="border-t border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#09040F] py-8 mt-auto rounded-none transition-colors duration-300">
      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
        <div className="space-y-1">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <span className="font-display font-bold text-sm tracking-wider uppercase text-slate-900 dark:text-[#F8FAFC]">
              LOGHORIZON
            </span>
            <span className="font-mono text-[10px] text-emerald-600 dark:text-[#10B981] px-1.5 py-0.2 bg-slate-100 dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45]">
              ● GUILD HQ
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A78BFA] font-mono">
            © 2026 LogHorizon. Find your party. Beyond the horizon.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-mono text-slate-600 dark:text-[#A78BFA]">
          <Link href="/" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
            {t("nav_home", "Home")}
          </Link>
          <Link href="/forum" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
            {t("nav_forum", "Forum")}
          </Link>
          <Link href="/events?view=turnamen" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
            {t("nav_tournaments", "Turnamen")}
          </Link>
          <Link href="/events?view=mabar" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
            {t("nav_lfg", "LFG Mabar")}
          </Link>
          <Link href="/marketplace" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
            {t("nav_marketplace", "Marketplace")}
          </Link>
          <Link href="/leaderboard" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
            {t("nav_leaderboard", "Leaderboard")}
          </Link>
          <Link href="/dungeon" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
            {t("nav_dungeon", "Dungeon")}
          </Link>
          <Link href="/rules" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
            {t("nav_rules", "Rules")}
          </Link>
          <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
            {t("Privasi", "Privacy")}
          </Link>
          <Link href="/terms" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
            {t("Syarat", "Terms")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
