"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileSpreadsheet, FileCode, ChevronDown } from "lucide-react";
import { exportTournamentToCsv, exportTournamentToJson, ExportableTournament } from "@/lib/tournament-export";

export function TournamentBackupDropdown({
  tournament,
  className = "",
  triggerClassName,
}: {
  tournament: ExportableTournament;
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const defaultTrigger = "border border-[#2A1B42] bg-[#11091D] hover:border-[#10B981] text-xs px-3 py-2 rounded-none font-mono font-bold inline-flex items-center gap-1.5 text-slate-200 hover:text-[#10B981] transition-all cursor-pointer shadow-sm";

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={triggerClassName || defaultTrigger}
        title="Simpan dan unduh cadangan data turnamen (.CSV / .JSON)"
      >
        <Download size={13} className="text-[#10B981]" />
        <span>Backup Data</span>
        <ChevronDown size={12} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-64 rounded-none bg-white dark:bg-[#11091D] border border-slate-200 dark:border-[#2A1B42] shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-left">
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-[#1F1430] text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">
            Pilih Format Ekspor
          </div>

          <button
            type="button"
            onClick={() => {
              exportTournamentToCsv(tournament);
              setOpen(false);
            }}
            className="w-full px-3 py-2.5 text-xs font-mono font-semibold flex items-center gap-2.5 text-slate-800 dark:text-slate-200 hover:bg-[#10B981]/15 hover:text-[#10B981] transition cursor-pointer text-left"
          >
            <FileSpreadsheet size={15} className="text-[#10B981] shrink-0" />
            <div>
              <div className="font-bold flex items-center gap-1">
                <span>Laporan Lengkap (.CSV)</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">Excel</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                Info, roster tim &amp; rekap bagan skor
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              exportTournamentToJson(tournament);
              setOpen(false);
            }}
            className="w-full px-3 py-2.5 text-xs font-mono font-semibold flex items-center gap-2.5 text-slate-800 dark:text-slate-200 hover:bg-[#7C3AED]/15 hover:text-[#C4B5FD] transition cursor-pointer text-left"
          >
            <FileCode size={15} className="text-[#7C3AED] shrink-0" />
            <div>
              <div className="font-bold flex items-center gap-1">
                <span>Full Raw Backup (.JSON)</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-[#A78BFA] font-mono">Arsip</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                Seluruh data objek mentah sistem
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
