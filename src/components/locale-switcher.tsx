"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, LOCALES, CURRENCIES, Locale, Currency } from "@/context/locale-context";

interface LocaleSwitcherProps {
  className?: string;
  isMobileDrawer?: boolean;
}

export function LocaleSwitcher({ className = "", isMobileDrawer = false }: LocaleSwitcherProps) {
  const { locale, currency, setLocale, setCurrency } = useLocale();
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

  const activeLocaleInfo = LOCALES[locale] || LOCALES.ID;

  if (isMobileDrawer) {
    return (
      <div className={`p-3 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#130921] space-y-3 ${className}`}>
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
          <Globe size={14} className="text-[#7C3AED] dark:text-[#A78BFA]" />
          <span>BAHASA &amp; MATA UANG</span>
        </div>

        {/* Language selector in mobile */}
        <div>
          <label className="text-[10px] font-mono text-slate-500 dark:text-[#A78BFA] uppercase tracking-wider block mb-1">
            Bahasa &amp; Mata Uang (Auto-Sync):
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.values(LOCALES).map((loc) => {
              const isActive = loc.code === locale;
              return (
                <button
                  key={loc.code}
                  type="button"
                  onClick={() => setLocale(loc.code as Locale)}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-none border text-xs font-mono transition-all ${
                    isActive
                      ? "border-[#7C3AED] bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#C4B5FD] font-bold"
                      : "border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#1A0E2E] text-slate-700 dark:text-slate-300 hover:border-slate-400"
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span>{loc.flag}</span>
                    <span className="font-bold">{loc.code}</span>
                    <span className="text-[10px] opacity-70 font-sans">• {loc.defaultCurrency}</span>
                  </span>
                  {isActive && <Check size={12} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 ${className}`} ref={containerRef}>
      {/* 1 Compact Pill Button: e.g. 🇮🇩 ID • IDR ▾ with whitespace-nowrap */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-9 px-2.5 rounded-md border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] hover:border-[#7C3AED] transition-colors inline-flex items-center gap-1.5 font-mono text-xs text-slate-800 dark:text-[#F8FAFC] shadow-xs select-none whitespace-nowrap"
        aria-label="Pilih Bahasa dan Mata Uang"
        title="Pengaturan Bahasa & Mata Uang"
      >
        <span className="text-sm shrink-0 leading-none">{activeLocaleInfo.flag}</span>
        <span className="font-bold tracking-tight">{locale} • {currency}</span>
        <ChevronDown size={11} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Popover compact w-56 right-0 top-full mt-2 solid background */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 w-56 rounded-md border border-slate-200 dark:border-[#7C3AED]/60 bg-white dark:bg-[#11091D] p-2.5 shadow-2xl z-50 space-y-2 select-none"
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
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors whitespace-nowrap ${
                      isSelected
                        ? "bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#C4B5FD] font-bold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A0E2E]"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="text-sm">{loc.flag}</span>
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
