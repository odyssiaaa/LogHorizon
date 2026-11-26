"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  Smartphone,
  Laptop,
  Apple,
  X,
  Share,
  PlusSquare,
  MoreVertical,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale } from "@/context/locale-context";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function openPwaInstallModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-pwa-install-modal"));
  }
}

export function PwaInstallModal() {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scroll when open & handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    // Check if already in standalone PWA mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandaloneMode);
    };
    checkStandalone();

    // Listen for beforeinstallprompt
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);

    // Listen for custom trigger to open modal
    const handleOpenModal = () => {
      setIsOpen(true);
    };
    window.addEventListener("open-pwa-install-modal", handleOpenModal);

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("open-pwa-install-modal", handleOpenModal);
    };
  }, []);

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallSuccess(true);
        setTimeout(() => setIsOpen(false), 2000);
      }
      setDeferredPrompt(null);
    }
  };

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-[#7C3AED]/50 bg-white dark:bg-[#0B0614] shadow-2xl p-5 sm:p-7 space-y-6 text-slate-900 dark:text-[#F8FAFC]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-modal-title"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-[#2A1B42] pb-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/40 text-[#7C3AED] dark:text-[#A78BFA] flex items-center justify-center shrink-0 shadow-sm">
                  <Smartphone size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 id="pwa-modal-title" className="text-base sm:text-lg font-black tracking-wide font-display">
                      {t("Pasang Aplikasi LogHorizon", "Install LogHorizon App")}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#7C3AED] text-white">
                      PWA
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t(
                      "Akses kilat dari layar utama HP & PC tanpa repot buka browser, hemat kuota & bebas lag!",
                      "Fast access from your home screen or desktop without typing URL, lightweight & lag-free!"
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="size-8 rounded-lg border border-slate-200 dark:border-[#2A1B42] text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition hover:border-[#7C3AED] shrink-0"
                aria-label="Tutup modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Direct 1-Click Install Button if supported */}
            {deferredPrompt && (
              <div className="p-4 rounded-xl border border-[#7C3AED] bg-gradient-to-r from-[#7C3AED]/20 via-purple-600/10 to-[#7C3AED]/20 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-[#7C3AED] text-white flex items-center justify-center shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {t("Browser Mendukung Instalasi Otomatis!", "Your Browser Supports 1-Click Install!")}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-300">
                      {t("Ketuk tombol di sebelah kanan untuk langsung memasang ke layar utama.", "Click the button to install directly onto your device.")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold font-mono transition shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Download size={15} />
                  <span>{t("1-Klik Pasang Sekarang", "1-Click Install Now")}</span>
                </button>
              </div>
            )}

            {installSuccess && (
              <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{t("Aplikasi LogHorizon berhasil dipasang ke perangkatmu!", "LogHorizon successfully installed to your device!")}</span>
              </div>
            )}

            {/* 3 Step-by-Step Tutorial Cards */}
            <div className="space-y-4">
              <p className="text-xs font-mono font-bold text-slate-400 dark:text-[#A78BFA] uppercase tracking-wider">
                {t("Panduan Langkah Pemasangan Sesuai Perangkat", "Step-by-step Guides by Device")}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. ANDROID (Chrome / Edge) */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#11091D] space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="size-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Smartphone size={16} />
                      </div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">Android</span>
                      <span className="text-[10px] text-slate-400 font-mono">Chrome/Edge</span>
                    </div>

                    <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="size-4 rounded-full bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#C4B5FD] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          1
                        </span>
                        <span>Buka <strong>loghorizon.vercel.app</strong> di Google Chrome.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="size-4 rounded-full bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#C4B5FD] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          2
                        </span>
                        <span>Ketuk ikon <strong>Titik Tiga (⋮)</strong> di pojok kanan atas browser.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="size-4 rounded-full bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#C4B5FD] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          3
                        </span>
                        <span>Pilih <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> atau <strong>&quot;Instal Aplikasi&quot;</strong>, lalu ketuk <strong>Instal</strong>.</span>
                      </li>
                    </ol>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 dark:border-[#2A1B42]/60 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>Mendukung offline &amp; push notif</span>
                  </div>
                </div>

                {/* 2. IPHONE / IPAD (Safari iOS) */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#11091D] space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="size-7 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                        <Apple size={16} />
                      </div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">iPhone / iPad</span>
                      <span className="text-[10px] text-slate-400 font-mono">Safari iOS</span>
                    </div>

                    <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="size-4 rounded-full bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#C4B5FD] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          1
                        </span>
                        <span>Wajib buka website menggunakan browser <strong>Safari</strong>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="size-4 rounded-full bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#C4B5FD] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          2
                        </span>
                        <span>Ketuk ikon <strong>Share (⬆️ kotak panah atas)</strong> di bilah bawah.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="size-4 rounded-full bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#C4B5FD] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          3
                        </span>
                        <span>Gulir ke bawah, pilih <strong>&quot;Tambah ke Layar Utama&quot;</strong>, lalu ketuk <strong>Tambah</strong>.</span>
                      </li>
                    </ol>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 dark:border-[#2A1B42]/60 text-[10px] text-sky-600 dark:text-sky-400 font-mono font-medium flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>Layar penuh tanpa bar browser</span>
                  </div>
                </div>

                {/* 3. PC / LAPTOP (Chrome / Edge Windows & Mac) */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-slate-50 dark:bg-[#11091D] space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="size-7 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <Laptop size={16} />
                      </div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">PC / Laptop</span>
                      <span className="text-[10px] text-slate-400 font-mono">Chrome / Edge</span>
                    </div>

                    <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="size-4 rounded-full bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#C4B5FD] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          1
                        </span>
                        <span>Buka website di Google Chrome atau Microsoft Edge.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="size-4 rounded-full bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#C4B5FD] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          2
                        </span>
                        <span>Klik ikon <strong>Layar + Unduh (📥)</strong> di ujung kanan kolom alamat URL browser.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="size-4 rounded-full bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#C4B5FD] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          3
                        </span>
                        <span>Klik <strong>Install</strong>. Jendela LogHorizon akan terbuka sebagai aplikasi desktop mandiri!</span>
                      </li>
                    </ol>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 dark:border-[#2A1B42]/60 text-[10px] text-purple-600 dark:text-purple-400 font-mono font-medium flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>Shortcut desktop &amp; taskbar mandiri</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 dark:border-[#2A1B42] flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                LogHorizon Progressive Web App (PWA)
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#2A1B42] bg-slate-100 dark:bg-[#1A0E2E] hover:border-[#7C3AED] text-xs font-mono font-bold text-slate-800 dark:text-slate-200 transition cursor-pointer"
              >
                {t("Mengerti, Tutup", "Got it, Close")}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
