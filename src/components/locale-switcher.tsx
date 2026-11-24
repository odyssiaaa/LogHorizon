"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, LOCALES, Locale } from "@/context/locale-context";

interface LocaleSwitcherProps {
  className?: string;
  isMobileDrawer?: boolean;
  direction?: "up" | "down";
}

// Crisp, standalone SVG Flag component for pixel-perfect cross-platform rendering
// (Fixes the Windows bug where emoji flags like 🇮🇩 render as literal text "ID")
export function FlagIcon({
  locale,
  className = "w-4 h-3 rounded-xs shrink-0 inline-block align-middle shadow-xs border border-black/10 dark:border-white/10",
}: {
  locale: string;
  className?: string;
}) {
  switch (locale) {
    case "ID":
      return (
        <svg viewBox="0 0 640 480" className={className} aria-hidden="true">
          <path fill="#e70011" d="M0 0h640v240H0z" />
          <path fill="#ffffff" d="M0 240h640v240H0z" />
        </svg>
      );
    case "EN":
      return (
        <svg viewBox="0 0 640 480" className={className} aria-hidden="true">
          <path fill="#bd3d44" d="M0 0h640v480H0z" />
          <path stroke="#ffffff" strokeWidth="37" d="M0 55.5h640M0 129.5h640M0 203.5h640M0 277.5h640M0 351.5h640M0 425.5h640" />
          <path fill="#192f5d" d="M0 0h260v260H0z" />
        </svg>
      );
    case "JA":
      return (
        <svg viewBox="0 0 640 480" className={className} aria-hidden="true">
          <path fill="#ffffff" d="M0 0h640v480H0z" />
          <circle cx="320" cy="240" r="144" fill="#bc002d" />
        </svg>
      );
    case "KO":
      return (
        <svg viewBox="0 0 640 480" className={className} aria-hidden="true">
          <path fill="#ffffff" d="M0 0h640v480H0z" />
          <circle cx="320" cy="240" r="120" fill="#cd2e3a" />
          <path fill="#0047a0" d="M320 240a60 60 0 0 0 0 120 120 120 0 0 1 0-240 60 60 0 0 0 0 120z" />
        </svg>
      );
    case "ZH":
      return (
        <svg viewBox="0 0 640 480" className={className} aria-hidden="true">
          <path fill="#de2910" d="M0 0h640v480H0z" />
          <polygon fill="#ffde00" points="128,40 144,88 194,88 153,118 169,166 128,136 87,166 103,118 62,88 112,88" />
        </svg>
      );
    case "AR":
      return (
        <svg viewBox="0 0 640 480" className={className} aria-hidden="true">
          <path fill="#006c35" d="M0 0h640v480H0z" />
          <path fill="#ffffff" d="M160 280h320v16H160zM280 200h120v14h-120z" />
        </svg>
      );
    case "ES":
      return (
        <svg viewBox="0 0 640 480" className={className} aria-hidden="true">
          <path fill="#aa151b" d="M0 0h640v480H0z" />
          <path fill="#f1bf00" d="M0 120h640v240H0z" />
        </svg>
      );
    default:
      return <span>🌐</span>;
  }
}

export function LocaleSwitcher({ className = "", isMobileDrawer = false, direction = "up" }: LocaleSwitcherProps) {
  const { locale, currency, setLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (isMobileDrawer) {
    return (
      <div className={`p-3 rounded-xl border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#130921] space-y-2.5 ${className}`}>
        <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
          <span className="flex items-center gap-1.5">
            <Globe size={14} className="text-[#7C3AED] dark:text-[#A78BFA]" />
            <span>BAHASA &amp; MATA UANG</span>
          </span>
          <span className="text-[10px] text-slate-400 font-sans font-normal">Auto-Sync</span>
        </div>

        {/* Language selector in mobile */}
        <div className="grid grid-cols-2 gap-1.5">
          {Object.values(LOCALES).map((loc) => {
            const isActive = loc.code === locale;
            return (
              <button
                key={loc.code}
                type="button"
                onClick={() => setLocale(loc.code as Locale)}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs font-mono transition-all ${
                  isActive
                    ? "border-[#7C3AED] bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#C4B5FD] font-bold shadow-xs"
                    : "border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#1A0E2E] text-slate-700 dark:text-slate-300 hover:border-slate-400"
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <FlagIcon locale={loc.code} />
                  <span className="font-bold">{loc.code}</span>
                  <span className="text-[10px] opacity-70 font-sans">• {loc.defaultCurrency}</span>
                </span>
                {isActive && <Check size={12} className="shrink-0 text-[#7C3AED] dark:text-[#C4B5FD]" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 ${className}`} ref={containerRef}>
      {/* 1 Compact Pill Button: e.g. [Flag] ID • IDR ▾ without duplicate text */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] hover:border-[#7C3AED] transition-colors inline-flex items-center gap-2 font-mono text-xs text-slate-800 dark:text-[#F8FAFC] shadow-xs select-none whitespace-nowrap shrink-0"
        aria-label="Pilih Bahasa dan Mata Uang"
        title="Pengaturan Bahasa & Mata Uang"
      >
        <FlagIcon locale={locale} />
        <span className="font-bold tracking-tight">{locale} • {currency}</span>
        <ChevronDown size={11} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Popover compact w-56 right-0 opening up or down with solid anti-translucent background */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: direction === "up" ? -4 : 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: direction === "up" ? -4 : 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={`absolute right-0 ${
              direction === "up" ? "bottom-full mb-2" : "top-full mt-2"
            } w-56 rounded-lg border border-slate-200 dark:border-[#7C3AED]/60 bg-white dark:bg-[#11091D] p-2.5 shadow-2xl z-50 space-y-2 select-none`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-[#2A1B42]/60">
              <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Globe size={12} className="text-[#7C3AED]" />
                <span>Bahasa &amp; Kurs</span>
              </span>
              <span className="text-[9px] font-mono text-slate-400">1-Klik Auto-Sync</span>
            </div>

            {/* Language list with auto-synced currency */}
            <div className="space-y-1">
              {Object.values(LOCALES).map((loc) => {
                const isSelected = loc.code === locale;
                return (
                  <button
                    key={loc.code}
                    type="button"
                    onClick={() => {
                      setLocale(loc.code as Locale);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors whitespace-nowrap ${
                      isSelected
                        ? "bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#C4B5FD] font-bold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A0E2E]"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FlagIcon locale={loc.code} />
                      <span className="font-semibold">{loc.nativeLabel}</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                      <span>{loc.defaultCurrency}</span>
                      {isSelected && <Check size={12} className="text-[#7C3AED] dark:text-[#C4B5FD] ml-0.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
