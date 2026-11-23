"use client";

import React, { useEffect, useState } from "react";
import { X, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { useLocale } from "@/context/locale-context";

export function openLoginModal(callbackUrl?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-login-modal", { detail: { callbackUrl } }));
  }
}

export function LoginModal() {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState<string | undefined>(undefined);
  const [loadingProvider, setLoadingProvider] = useState<"discord" | "google" | null>(null);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ callbackUrl?: string }>;
      setCallbackUrl(customEvent.detail?.callbackUrl);
      setIsOpen(true);
    };

    window.addEventListener("open-login-modal", handleOpen);
    return () => window.removeEventListener("open-login-modal", handleOpen);
  }, []);

  const handleSignIn = async (provider: "discord" | "google") => {
    try {
      setLoadingProvider(provider);
      await signIn(provider, { callbackUrl: callbackUrl || window.location.pathname });
    } catch {
      setLoadingProvider(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Gelap Anti-Tembus */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !loadingProvider && setIsOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#7C3AED]/50 bg-white dark:bg-[#11091D] p-6 shadow-2xl z-10 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-modal-title"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 size-48 rounded-full bg-[#7C3AED]/20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 size-48 rounded-full bg-[#5865F2]/15 blur-3xl pointer-events-none" />

            {/* Header & Close Button */}
            <div className="flex items-start justify-between gap-3 relative z-10 mb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/30 mb-2">
                  <ShieldCheck size={12} />
                  <span>LOGHORIZON CITADEL // AUTH</span>
                </div>
                <h3 id="login-modal-title" className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {t("login_title", "Masuk ke LogHorizon")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 leading-relaxed">
                  {t("login_subtitle", "Pilih metode login untuk bergabung dan berpetualang bersama guild")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={Boolean(loadingProvider)}
                className="size-8 rounded-lg border border-slate-200 dark:border-[#2A1B42] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A0F2E] flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                aria-label="Tutup modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Provider Options */}
            <div className="space-y-3 relative z-10">
              {/* Option 1: Discord Button */}
              <button
                type="button"
                onClick={() => void handleSignIn("discord")}
                disabled={Boolean(loadingProvider)}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-mono text-sm font-bold shadow-lg shadow-[#5865F2]/25 border border-[#5865F2] transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {loadingProvider === "discord" ? (
                  <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="size-5 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                )}
                <span>{t("login_with_discord", "Masuk dengan Discord")}</span>
              </button>

              {/* Option 2: Google Button */}
              <button
                type="button"
                onClick={() => void handleSignIn("google")}
                disabled={Boolean(loadingProvider)}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-white dark:bg-[#160D26] hover:bg-slate-50 dark:hover:bg-[#1E1233] text-slate-800 dark:text-[#F8FAFC] font-mono text-sm font-bold border border-slate-300 dark:border-[#7C3AED]/40 shadow-sm transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {loadingProvider === "google" ? (
                  <span className="size-5 border-2 border-slate-400 border-t-[#7C3AED] rounded-full animate-spin" />
                ) : (
                  <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                )}
                <span>{t("login_with_google", "Masuk dengan Google")}</span>
              </button>
            </div>

            {/* Footer Notice */}
            <p className="text-[11px] text-center text-slate-400 dark:text-[#94A3B8]/70 mt-5 leading-normal relative z-10">
              Dengan masuk, Anda menyetujui Ketentuan Layanan &amp; Kebijakan Privasi LogHorizon.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
