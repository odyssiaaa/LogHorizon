"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

export interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  className?: string;
  label?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "icon";
  size?: "sm" | "md" | "lg";
  toastMessage?: string;
}

export function ShareButton({
  title,
  text,
  url,
  className = "",
  label = "Bagikan",
  variant = "outline",
  size = "md",
  toastMessage = "Link berhasil disalin! Siap dibagikan ke Discord/WA.",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const getFullUrl = () => {
    if (!url) {
      return typeof window !== "undefined" ? window.location.href : "";
    }
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "https://loghorizon.vercel.app";
    return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const fullUrl = getFullUrl();
    const shareText = text || title;

    // Check if Web Share API is supported (typical on mobile devices)
    if (typeof navigator !== "undefined" && navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: fullUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share aborted; proceed with clipboard fallback if not abort
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
      }
    }

    // Fallback: Copy link to clipboard
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement("textarea");
        textarea.value = fullUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopied(true);
      setToast(toastMessage);

      setTimeout(() => {
        setCopied(false);
      }, 2500);

      setTimeout(() => {
        setToast(null);
      }, 3500);
    } catch {
      setToast("Gagal menyalin link.");
      setTimeout(() => setToast(null), 2500);
    }
  };

  // Variant styling
  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-2.5 py-1 gap-1.5"
      : size === "lg"
        ? "text-sm px-4 py-2.5 gap-2"
        : "text-xs px-3 py-1.5 gap-1.5";

  const variantClasses =
    variant === "primary"
      ? "bg-[#9D4EDD] hover:bg-[#8338EC] text-white font-bold shadow-sm shadow-[#9D4EDD]/25"
      : variant === "secondary"
        ? "bg-purple-500/15 text-[#9D4EDD] dark:text-[#C77DFF] hover:bg-purple-500/25 border border-purple-500/30 font-semibold"
        : variant === "ghost"
          ? "bg-transparent hover:bg-gray-100 dark:hover:bg-[#1E1A3A] text-gray-600 dark:text-gray-300 font-medium"
          : variant === "icon"
            ? "p-2 rounded-lg border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] hover:border-[#9D4EDD] text-gray-500 dark:text-gray-400 hover:text-[#9D4EDD]"
            : "border border-gray-200 dark:border-[#211C2B] bg-white dark:bg-[#120F17] hover:border-[#9D4EDD] text-gray-700 dark:text-gray-200 hover:text-[#9D4EDD] font-semibold";

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleShare}
        className={`inline-flex items-center justify-center rounded-lg transition-all active:scale-95 cursor-pointer select-none ${variantClasses} ${variant !== "icon" ? sizeClasses : ""} ${className}`}
        title={label}
        aria-label={label}
      >
        {copied ? (
          <Check size={size === "sm" ? 13 : 15} className="text-emerald-500 shrink-0" />
        ) : (
          <Share2 size={size === "sm" ? 13 : 15} className="shrink-0" />
        )}
        {variant !== "icon" && <span>{copied ? "Disalin!" : label}</span>}
      </button>

      {/* Floating toast notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F0C15] border border-purple-500/40 text-white text-xs font-semibold shadow-2xl shadow-purple-950/80 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <div className="size-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check size={12} />
          </div>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
