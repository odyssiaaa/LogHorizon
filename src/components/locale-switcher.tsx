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
  const activeCurrencyInfo = CURRENCIES[currency] || CURRENCIES.IDR;

  if (isMobileDrawer) {
    return (
      <div className={`p-3 rounded-none border border-slate-200 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#130921] space-y-3 ${className}`}>
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
          <Globe size={15} className="text-[#7C3AED] dark:text-[#A78BFA]" />
          <span>BAHASA &amp; MATA UANG</span>
        </div>

        {/* Language selector in mobile */}
        <div>
          <label className="text-[10px] font-mono text-slate-500 dark:text-[#A78BFA] uppercase tracking-wider block mb-1">
            Bahasa / Language:
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.values(LOCALES).map((loc) => {
              const isActive = loc.code === locale;
              return (
                <button
                  key={loc.code}
                  type="button"
                  onClick={() => setLocale(loc.code as Locale)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-none border text-xs font-mono transition-all ${
                    isActive
                      ? "border-[#7C3AED] bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#C4B5FD] font-bold"
                      : "border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#1A0E2E] text-slate-700 dark:text-slate-300 hover:border-slate-400"
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span>{loc.flag}</span>
                    <span className="truncate">{loc.code}</span>
                  </span>
                  {isActive && <Check size={12} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Currency selector in mobile */}
        <div>
          <label className="text-[10px] font-mono text-slate-500 dark:text-[#A78BFA] uppercase tracking-wider block mb-1">
            Mata Uang / Currency:
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {Object.values(CURRENCIES).map((cur) => {
              const isActive = cur.code === currency;
              return (
                <button
                  key={cur.code}
                  type="button"
                  onClick={() => setCurrency(cur.code as Currency)}
                  className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-none border text-xs font-mono transition-all ${
                    isActive
                      ? "border-[#7C3AED] bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#C4B5FD] font-bold"
                      : "border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#1A0E2E] text-slate-700 dark:text-slate-300 hover:border-slate-400"
                  }`}
                >
                  <span className="font-bold">{cur.code}</span>
                  <span className="text-[10px] opacity-70">({cur.symbol})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-10 px-2.5 sm:px-3 rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] hover:border-[#7C3AED] transition-colors flex items-center gap-1.5 font-mono text-xs text-slate-800 dark:text-[#F8FAFC] shadow-sm dark:shadow-none select-none"
        aria-label="Pilih Bahasa dan Mata Uang"
        title="Pengaturan Bahasa & Mata Uang"
      >
        <Globe size={14} className="text-[#7C3AED] dark:text-[#A78BFA] shrink-0" />
        <span className="font-bold">
          {activeLocaleInfo.flag} {locale}
        </span>
        <span className="text-slate-400 dark:text-slate-600">|</span>
        <span className="font-bold text-[#7C3AED] dark:text-[#A78BFA]">
          {currency}
        </span>
        <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-72 rounded-lg border border-slate-200 dark:border-[#7C3AED]/60 bg-white dark:bg-[#11091D] p-3 shadow-2xl z-50 space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#2A1B42]/60">
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Globe size={13} className="text-[#7C3AED]" />
                <span>Preferensi Regional</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Tersimpan Otomatis</span>
            </div>

            {/* Language options */}
            <div>
              <div className="text-[10px] font-mono font-bold text-slate-500 dark:text-[#A78BFA] uppercase tracking-wider mb-1.5">
                Pilih Bahasa / Language
              </div>
              <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-1">
                {Object.values(LOCALES).map((loc) => {
                  const isSelected = loc.code === locale;
                  return (
                    <button
                      key={loc.code}
                      type="button"
                      onClick={() => {
                        setLocale(loc.code as Locale);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        isSelected
                          ? "bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#C4B5FD] font-bold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A0E2E]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm">{loc.flag}</span>
                        <span className="font-medium">{loc.nativeLabel}</span>
                        <span className="text-[10px] opacity-60 font-mono">({loc.code})</span>
                      </span>
                      {isSelected && <Check size={14} className="text-[#7C3AED] dark:text-[#C4B5FD]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Currency options */}
            <div className="pt-2 border-t border-slate-100 dark:border-[#2A1B42]/60">
              <div className="text-[10px] font-mono font-bold text-slate-500 dark:text-[#A78BFA] uppercase tracking-wider mb-1.5">
                Mata Uang / Currency
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.values(CURRENCIES).map((cur) => {
                  const isSelected = cur.code === currency;
                  return (
                    <button
                      key={cur.code}
                      type="button"
                      onClick={() => {
                        setCurrency(cur.code as Currency);
                      }}
                      className={`flex flex-col items-center justify-center p-1.5 rounded-md border text-center transition-all ${
                        isSelected
                          ? "border-[#7C3AED] bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#C4B5FD] font-bold"
                          : "border-slate-200 dark:border-[#2A1B42] text-slate-700 dark:text-slate-300 hover:border-slate-400"
                      }`}
                    >
                      <span className="text-xs font-mono font-bold">{cur.code}</span>
                      <span className="text-[10px] text-slate-400">{cur.symbol}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
