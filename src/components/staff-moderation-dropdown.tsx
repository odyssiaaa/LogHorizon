"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { MoreVertical, Shield } from "lucide-react";

export interface StaffActionItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void | Promise<void>;
  danger?: boolean;
  disabled?: boolean;
}

export function StaffCardModerationMenu({
  actions,
  className = "",
  buttonClassName,
  label = "Moderasi",
}: {
  actions: StaffActionItem[];
  className?: string;
  buttonClassName?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!actions.length) return null;

  // Bersihkan karakter titik ganda '⋮' jika ada di label agar tidak dobel dengan ikon MoreVertical
  const displayLabel = label.replace(/^⋮\s*/, "");
  const hasCustomIcon = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(displayLabel);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={
          buttonClassName ||
          "h-7 px-2 rounded-none font-mono text-[11px] font-bold inline-flex items-center gap-1 border border-[#7C3AED]/30 bg-purple-500/10 hover:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] transition-all cursor-pointer shadow-sm shrink-0 whitespace-nowrap"
        }
        title="Opsi Moderasi Staf (Admin & Moderator)"
      >
        {!hasCustomIcon && <MoreVertical size={13} className="shrink-0" />}
        <span>{displayLabel}</span>
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 min-w-[220px] w-max whitespace-nowrap rounded-none bg-white dark:bg-[#11091D] border border-[#7C3AED]/60 shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150 text-left"
        >
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-[#1F1430] text-[10px] font-mono uppercase text-[#7C3AED] dark:text-[#A78BFA] font-bold flex items-center gap-1">
            <Shield size={11} />
            <span>Opsi Moderasi Staf</span>
          </div>

          <div className="py-1">
            {actions.map((act, idx) => (
              <button
                key={idx}
                type="button"
                disabled={act.disabled}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  void act.onClick();
                }}
                className={`w-full px-3 py-2 text-xs font-mono font-medium flex items-center gap-2 transition cursor-pointer text-left ${
                  act.disabled
                    ? "opacity-50 cursor-not-allowed"
                    : act.danger
                    ? "text-rose-600 dark:text-rose-400 hover:bg-rose-500/15"
                    : "text-slate-800 dark:text-slate-200 hover:bg-[#7C3AED]/15 hover:text-[#7C3AED] dark:hover:text-[#A78BFA]"
                }`}
              >
                {act.icon && <span className="shrink-0">{act.icon}</span>}
                <span className="whitespace-nowrap">{act.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
