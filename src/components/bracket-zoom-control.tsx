"use client";

import React from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface BracketZoomControlProps {
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  className?: string;
}

export function BracketZoomControl({
  zoom,
  onZoomChange,
  className = "",
}: BracketZoomControlProps) {
  const percent = Math.round(zoom * 100);

  const handleZoomOut = () => {
    onZoomChange(Math.max(0.5, Math.round((zoom - 0.1) * 10) / 10));
  };

  const handleZoomIn = () => {
    onZoomChange(Math.min(1.4, Math.round((zoom + 0.1) * 10) / 10));
  };

  const handleReset = () => {
    onZoomChange(1.0);
  };

  return (
    <div
      className={`inline-flex items-center rounded-none border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#11091D] p-0.5 shrink-0 select-none shadow-sm dark:shadow-none ${className}`}
      title="Kontrol Zoom Bagan Turnamen"
    >
      <button
        type="button"
        onClick={handleZoomOut}
        disabled={zoom <= 0.5}
        className="w-7 h-7 flex items-center justify-center text-xs font-mono text-slate-600 dark:text-[#A78BFA] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#1A0E2E] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
        title="Zoom Out (Kecilkan bagan hingga 50%)"
        aria-label="Zoom Out"
      >
        <span className="text-xs">➖</span>
      </button>

      <button
        type="button"
        onClick={handleReset}
        className="px-2 h-7 flex items-center justify-center gap-1 text-[11px] font-mono font-bold text-slate-900 dark:text-[#F8FAFC] hover:text-[#7C3AED] hover:bg-slate-100 dark:hover:bg-[#1A0E2E] transition cursor-pointer"
        title="Klik untuk reset zoom ke 100%"
        aria-label="Reset Zoom"
      >
        <span>{percent}%</span>
        {zoom !== 1.0 && <RotateCcw size={10} className="text-[#7C3AED] dark:text-[#A78BFA]" />}
      </button>

      <button
        type="button"
        onClick={handleZoomIn}
        disabled={zoom >= 1.4}
        className="w-7 h-7 flex items-center justify-center text-xs font-mono text-slate-600 dark:text-[#A78BFA] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#1A0E2E] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
        title="Zoom In (Perbesar bagan hingga 140%)"
        aria-label="Zoom In"
      >
        <span className="text-xs">➕</span>
      </button>
    </div>
  );
}
