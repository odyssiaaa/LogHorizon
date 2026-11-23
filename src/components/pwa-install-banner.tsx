"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X, Sparkles, Share, PlusSquare } from "lucide-react";
import { openPwaInstallModal } from "@/components/pwa-install-modal";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallBanner({ isDrawer = false }: { isDrawer?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already running in standalone PWA mode
    const isRunningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(isRunningStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone || dismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setDismissed(true);
      }
      setDeferredPrompt(null);
    } else {
      openPwaInstallModal();
    }
  };

  return (
    <>
      <div className={`p-3 rounded-xl border border-[#7C3AED]/40 bg-gradient-to-r from-[#7C3AED]/15 via-purple-900/10 to-[#7C3AED]/15 text-slate-800 dark:text-slate-100 ${isDrawer ? "mt-3" : "my-2"}`}>
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-[#7C3AED] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#7C3AED]/30">
              <Smartphone size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                <span>Pasang Aplikasi LogHorizon</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA]">
                  PWA
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Akses cepat &amp; bebas lag di layar utama ponsel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={13} />
              <span>Pasang</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              title="Tutup banner"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Guide Modal */}
      {showIosGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            className="w-full max-w-sm p-6 rounded-2xl border border-[#7C3AED]/60 bg-white dark:bg-[#11091D] shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#2E1E45]">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-[#7C3AED]" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Pasang di iPhone / iPad
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Safari di iOS mendukung instalasi web langsung ke layar utama ponsel seperti aplikasi native App Store:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45] flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] flex items-center justify-center shrink-0 font-bold font-mono text-xs">
                  1
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Ketuk tombol Bagikan (Share)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Ikon kotak panah ke atas (⎋) di bilah bawah peramban Safari.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45] flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] flex items-center justify-center shrink-0 font-bold font-mono text-xs">
                  2
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Pilih &apos;Tambahkan ke Layar Utama&apos;
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Gulir sedikit ke bawah pada menu opsi lalu ketuk &apos;Add to Home Screen&apos; (➕).
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1A0E2E] border border-slate-200 dark:border-[#2E1E45] flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] flex items-center justify-center shrink-0 font-bold font-mono text-xs">
                  3
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Selesai &amp; Buka dari Beranda HP
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Ikon LogHorizon akan muncul di layar utama tanpa batas url bar!
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold transition"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
