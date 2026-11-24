"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Smartphone } from "lucide-react";
import { useLocale } from "@/context/locale-context";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { openPwaInstallModal } from "@/components/pwa-install-modal";

export function Footer() {
  const { t } = useLocale();

  return (
    <footer className="border-t border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#09040F] py-8 mt-auto rounded-none transition-colors duration-300">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        {/* Brand & Copyright & Developer Credit */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <span className="font-display font-bold text-sm tracking-wider uppercase text-slate-900 dark:text-[#F8FAFC]">
              LOG<span className="text-[#7C3AED] dark:text-[#A78BFA]">HORIZON</span>
            </span>
            <span className="font-mono text-[10px] text-emerald-600 dark:text-[#10B981] px-1.5 py-0.2 bg-slate-100 dark:bg-[#130921] border border-slate-200 dark:border-[#2E1E45] font-bold">
              ● GUILD HQ
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#A78BFA] font-mono">
            © 2026 LogHorizon. Find your party. Beyond the horizon.
          </p>

          {/* Pil Kredit Developer Eksklusif LogHorizonStudio */}
          <div className="flex items-center justify-center md:justify-start pt-1">
            <a
              href="https://loghorizonstudio.web.id"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#7C3AED]/40 bg-slate-100/90 dark:bg-[#11091D]/90 hover:border-[#A78BFA] hover:bg-[#7C3AED]/15 transition-all text-xs font-medium text-slate-700 dark:text-[#C4B5FD] group shadow-xs cursor-pointer select-none"
              title="Official Web Engineering & Architecture Studio: LogHorizonStudio"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="relative size-3.5 rounded overflow-hidden shrink-0">
                <Image
                  src="/loghorizon-studio-logo.png"
                  alt="LogHorizonStudio"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="tracking-tight text-[11px] sm:text-xs">
                Engineered &amp; Powered by{" "}
                <strong className="font-bold text-slate-900 dark:text-white group-hover:text-[#7C3AED] dark:group-hover:text-[#A78BFA] transition-colors">
                  LogHorizonStudio
                </strong>
              </span>
              <span className="text-slate-400 dark:text-[#A78BFA] text-xs leading-none group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                ↗
              </span>
            </a>
          </div>
        </div>

        {/* Center / Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-5 gap-y-2 text-xs font-mono text-slate-600 dark:text-[#A78BFA]">
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
          <button
            type="button"
            onClick={openPwaInstallModal}
            className="hover:text-[#7C3AED] dark:hover:text-[#C4B5FD] text-[#7C3AED] dark:text-[#A78BFA] transition-colors inline-flex items-center gap-1.5 font-bold cursor-pointer"
          >
            <Smartphone size={13} />
            <span>{t("Pasang Aplikasi (PWA)", "Install App (PWA)")}</span>
          </button>
          <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
            {t("Privasi", "Privacy")}
          </Link>
          <Link href="/terms" className="hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors">
            {t("Syarat", "Terms")}
          </Link>
        </div>

        {/* Right / Footer Locale Switcher */}
        <div className="shrink-0 flex items-center justify-center gap-2">
          <LocaleSwitcher />
        </div>
      </div>
    </footer>
  );
}
