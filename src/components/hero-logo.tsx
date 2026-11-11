"use client";

import Image from "next/image";
import { useState } from "react";
import { Compass, Sparkles } from "lucide-react";

export function HeroLogo() {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className="w-48 sm:w-60 md:w-72 lg:w-80 xl:w-[350px] aspect-square rounded-full border-2 border-[#9D4EDD]/40 bg-gradient-to-br from-[#1F1633] via-[#0E0B16] to-[#08060B] shadow-2xl shadow-[#9D4EDD]/30 flex flex-col items-center justify-center p-6 text-center select-none"
        aria-label="Logo LogHorizon"
      >
        <div className="relative">
          <div className="absolute -inset-2 rounded-full bg-[#9D4EDD]/20 blur-md" />
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#9D4EDD]/20 border border-[#9D4EDD]/60 flex items-center justify-center text-[#C77DFF] mb-3">
            <Compass size={48} className="animate-[spin_12s_linear_infinite]" />
          </div>
        </div>
        <strong className="text-xl sm:text-2xl font-black tracking-widest text-white mt-1">
          LOG<span className="text-[#C77DFF]">HORIZON</span>
        </strong>
        <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-purple-300/80 font-mono tracking-wider mt-1 uppercase">
          <Sparkles size={12} /> Find Your Party
        </span>
      </div>
    );
  }

  return (
    <div className="relative select-none flex items-center justify-center">
      <div className="absolute -inset-4 rounded-full bg-[#9D4EDD]/15 blur-2xl pointer-events-none" />
      <Image
        className="hero-logo relative w-48 sm:w-60 md:w-72 lg:w-80 xl:w-[350px] max-w-[350px] h-auto object-contain drop-shadow-[0_20px_35px_rgba(157,78,221,0.35)]"
        src="/loghorizon-logo.png"
        alt="Logo komunitas LogHorizon: Find your party. Beyond the horizon."
        width={768}
        height={768}
        priority
        onError={() => setError(true)}
      />
    </div>
  );
}
