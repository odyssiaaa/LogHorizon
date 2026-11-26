"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSession, signIn } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { Shield, Sparkles, X, Compass, ExternalLink } from "lucide-react";

export function WelcomeOnboardingModal() {
  const { status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Only for unauthenticated anonymous visitors
    if (status !== "unauthenticated") {
      setIsOpen(false);
      return;
    }

    // Check if dismissed previously in localStorage or sessionStorage
    const isDismissed =
      localStorage.getItem("lh_welcome_dismissed") ||
      sessionStorage.getItem("lh_welcome_dismissed");

    if (isDismissed) return;

    // Trigger smoothly after 1.2s delay
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [status, mounted]);

  function handleDismiss() {
    try {
      localStorage.setItem("lh_welcome_dismissed", "true");
      sessionStorage.setItem("lh_welcome_dismissed", "true");
    } catch {
      // storage unavailable / incognito fallback
    }
    setIsOpen(false);
  }

  function handleConnectDiscord() {
    try {
      localStorage.setItem("lh_welcome_dismissed", "true");
      sessionStorage.setItem("lh_welcome_dismissed", "true");
    } catch {
      // ignore
    }
    setIsOpen(false);
    void signIn("discord");
  }

  function handleConnectGoogle() {
    try {
      localStorage.setItem("lh_welcome_dismissed", "true");
      sessionStorage.setItem("lh_welcome_dismissed", "true");
    } catch {
      // ignore
    }
    setIsOpen(false);
    void signIn("google");
  }

  // Lock background scroll when open & handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-modal-title"
        >
          {/* Backdrop Click */}
          <div
            className="absolute inset-0"
            onClick={handleDismiss}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-[calc(100vw-2rem)] max-w-md rounded-none border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] text-slate-900 dark:text-white p-5 sm:p-7 shadow-2xl overflow-hidden z-10"
          >
            {/* Ambient Cyber Glow */}
            <div className="absolute -top-24 -left-24 w-52 h-52 bg-[#9D4EDD]/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-[#5865F2]/20 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Tutup sambutan"
            >
              <X size={17} />
            </button>

            {/* Header Badge */}
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono font-bold tracking-wider text-[#C77DFF] uppercase mb-2.5">
              <Shield size={13} className="text-[#9D4EDD] shrink-0" />
              <span>GERBANG KOMUNITAS LOGHORIZON</span>
            </div>

            {/* Title */}
            <h2
              id="welcome-modal-title"
              className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug mb-2.5"
            >
              Selamat Datang di LogHorizon, Petualang!
            </h2>

            {/* Explanation */}
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-6 font-normal">
              Hubungkan akun Discord kamu untuk menyinkronkan foto profil, kasta role otomatis, kumpulkan XP, dan akses penuh fitur Rekber &amp; Turnamen. Atau jelajahi isi guild terlebih dahulu.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              {/* Primary Discord Button */}
              <button
                type="button"
                onClick={handleConnectDiscord}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-none bg-[#5865F2] hover:bg-[#4752C4] active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#5865F2]/30 transition-all cursor-pointer group"
              >
                <svg
                  className="w-4 h-4 shrink-0 fill-current"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span>Masuk dengan Discord</span>
              </button>

              {/* Google Button */}
              <button
                type="button"
                onClick={handleConnectGoogle}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-none bg-white dark:bg-[#160D26] hover:bg-slate-50 dark:hover:bg-[#1E1233] text-slate-800 dark:text-[#F8FAFC] font-bold text-xs sm:text-sm border border-slate-300 dark:border-[#7C3AED]/40 shadow-sm transition-all active:scale-[0.99] cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Masuk dengan Google</span>
              </button>

              {/* Secondary Ghost Button */}
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-none border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                <Compass size={14} className="text-gray-400" />
                <span>Lihat-Lihat Dulu</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
