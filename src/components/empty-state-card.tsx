import React, { ReactNode } from "react";
import Link from "next/link";
import { LucideIcon, Sparkles } from "lucide-react";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "outline";
}

export interface EmptyStateCardProps {
  icon?: LucideIcon | ReactNode;
  title: string;
  description: string;
  actionPrimary?: EmptyStateAction;
  actionSecondary?: EmptyStateAction;
  className?: string;
}

export function EmptyStateCard({
  icon: IconOrNode,
  title,
  description,
  actionPrimary,
  actionSecondary,
  className = "",
}: EmptyStateCardProps) {
  const renderAction = (action: EmptyStateAction, isPrimary = false) => {
    const IconComponent = action.icon;
    const baseClasses =
      action.variant === "secondary" || (!isPrimary && !action.variant)
        ? "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold border border-slate-300 dark:border-[#2E1E45] bg-slate-100 dark:bg-[#1A0E2E] text-slate-800 dark:text-slate-200 hover:border-[#7C3AED] hover:text-[#7C3AED] dark:hover:text-white transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer shadow-xs"
        : "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-[#7C3AED] to-[#9D4EDD] hover:from-[#6D28D9] hover:to-[#8B5CF6] text-white shadow-md shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer";

    if (action.href) {
      return (
        <Link
          key={action.label}
          href={action.href}
          onClick={action.onClick}
          className={baseClasses}
        >
          {IconComponent && <IconComponent size={14} className="shrink-0" />}
          <span>{action.label}</span>
        </Link>
      );
    }

    return (
      <button
        key={action.label}
        type="button"
        onClick={action.onClick}
        className={baseClasses}
      >
        {IconComponent && <IconComponent size={14} className="shrink-0" />}
        <span>{action.label}</span>
      </button>
    );
  };

  const isLucideIcon = typeof IconOrNode === "function";

  return (
    <div
      className={`my-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-[#2A1B42] bg-white/50 dark:bg-[#0D0518]/60 p-8 sm:p-12 text-center backdrop-blur-xs transition-all duration-200 ${className}`}
    >
      {/* Icon Capsule with Neon Glow */}
      <div className="relative mb-4">
        <div className="w-14 h-14 rounded-2xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center text-[#A78BFA] shadow-inner shadow-purple-500/10">
          {IconOrNode ? (
            isLucideIcon ? (
              React.createElement(IconOrNode as LucideIcon, { size: 26, strokeWidth: 1.75 })
            ) : (
              (IconOrNode as ReactNode)
            )
          ) : (
            <Sparkles size={26} strokeWidth={1.75} />
          )}
        </div>
      </div>

      {/* Title & Description */}
      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md leading-relaxed mb-6">
        {description}
      </p>

      {/* CTA Buttons */}
      {(actionPrimary || actionSecondary) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          {actionPrimary && renderAction(actionPrimary, true)}
          {actionSecondary && renderAction(actionSecondary, false)}
        </div>
      )}
    </div>
  );
}
