"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("loghorizon-theme");
    const dark = saved !== "light";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  function handleToggle(e: React.MouseEvent<HTMLButtonElement>) {
    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 550);

    const x = e.clientX || window.innerWidth / 2;
    const y = e.clientY || 40;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const nextDark = !isDark;

    const applyTheme = () => {
      setIsDark(nextDark);
      document.documentElement.classList.toggle("dark", nextDark);
      localStorage.setItem("loghorizon-theme", nextDark ? "dark" : "light");
    };

    if (
      typeof document !== "undefined" &&
      "startViewTransition" in document &&
      typeof (document as unknown as { startViewTransition: unknown }).startViewTransition === "function"
    ) {
      const doc = document as unknown as {
        startViewTransition: (cb: () => void) => { ready: Promise<void> };
      };
      const transition = doc.startViewTransition(() => {
        applyTheme();
      });

      transition.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 650,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        })
        .catch(() => {
          // Fallback if animate fails
        });
    } else {
      applyTheme();
    }
  }

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Ganti mode tema"
        className={`w-10 h-10 rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] text-slate-500 dark:text-[#94A3B8] flex items-center justify-center shrink-0 ${className}`}
      >
        <Sun size={16} className="text-[#F59E0B]" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`w-10 h-10 rounded-lg border border-slate-200 dark:border-[#2A1B42] bg-white dark:bg-[#11091D] text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:border-[#7C3AED] dark:hover:border-[#7C3AED] flex items-center justify-center transition-all duration-300 shrink-0 shadow-sm dark:shadow-none ${className}`}
      title={isDark ? "Ganti ke mode terang (Light Mode)" : "Ganti ke mode gelap (Dark Mode)"}
      aria-label="Ganti mode tema"
    >
      {isDark ? (
        <Sun
          size={16}
          className={`text-[#F59E0B] transition-transform duration-500 ease-out ${
            isRotating ? "rotate-180 scale-110" : "hover:rotate-45"
          }`}
        />
      ) : (
        <Moon
          size={16}
          className={`text-[#7C3AED] transition-transform duration-500 ease-out ${
            isRotating ? "-rotate-180 scale-110" : "hover:-rotate-12"
          }`}
        />
      )}
    </button>
  );
}
