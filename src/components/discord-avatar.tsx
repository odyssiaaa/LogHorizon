"use client";

import Image from "next/image";
import { useState } from "react";
import { getAvatarFrameClasses, getAvatarFrameEffectType } from "@/lib/armory-catalog";

interface DiscordAvatarProps {
  src: string | null;
  username: string | null;
  size?: number;
  className?: string;
  frameId?: string | null;
}

export function DiscordAvatar({
  src,
  username,
  size = 40,
  className = "",
  frameId,
}: DiscordAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const label = username ?? "Gamer";
  const frameClasses = getAvatarFrameClasses(frameId);
  const effectType = getAvatarFrameEffectType(frameId);

  const fallbackContent = (
    <span
      className="w-full h-full flex items-center justify-center font-bold text-xs uppercase bg-[#1E1A3A] text-purple-300 rounded-full"
      role="img"
      aria-label={`${label} avatar`}
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  );

  const imageContent =
    !src || hasError ? (
      fallbackContent
    ) : (
      <Image
        src={src}
        alt={`${label} avatar`}
        width={size}
        height={size}
        unoptimized
        onError={() => setHasError(true)}
        className="w-full h-full object-cover rounded-full"
      />
    );

  // If no frame is selected, render standard avatar
  if (!frameId || !effectType) {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 rounded-full ${frameClasses} ${className}`.trim()}
        style={{ width: size, height: size }}
      >
        <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
          {imageContent}
        </div>
      </div>
    );
  }

  // Render Discord-Style Animated Avatar Decoration Overlay
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`.trim()}
      style={{ width: size, height: size }}
    >
      {/* 1. Core Avatar Image with Subtle Base Ring */}
      <div
        className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center relative z-0 ${frameClasses}`}
      >
        {imageContent}
      </div>

      {/* 2. Discord-style Animated SVG Decoration Overlay */}
      <AvatarDecorationSvg effectType={effectType} size={size} />
    </div>
  );
}

/**
 * GPU-Accelerated SVG Avatar Decoration Overlay (Discord Style)
 * Uses viewBox="0 0 100 100" where the avatar sits at center (cx=50, cy=50, r=36).
 * Decorations (crown, wings, horns, aura) project outwards without clipping.
 */
function AvatarDecorationSvg({
  effectType,
  size,
}: {
  effectType: "arcane_vortex" | "cyber_valkyrie" | "crimson_dragon" | "golden_sovereign";
  size: number;
}) {
  return (
    <div
      className="absolute -inset-[22%] w-[144%] h-[144%] pointer-events-none select-none z-10 overflow-visible flex items-center justify-center"
      aria-hidden="true"
    >
      {effectType === "arcane_vortex" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible drop-shadow-[0_0_8px_rgba(168,85,247,0.85)]"
        >
          <defs>
            <linearGradient id="vortexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="50%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
            <radialGradient id="vortexAura" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="transparent" />
              <stop offset="100%" stopColor="rgba(168,85,247,0.4)" />
            </radialGradient>
          </defs>

          {/* Glowing Base Radial Pulse */}
          <circle cx="50" cy="50" r="39" fill="url(#vortexAura)" className="animate-pulse" />

          {/* Rotating Arcane Ring */}
          <g className="animate-[spin_12s_linear_infinite] origin-center">
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="url(#vortexGrad)"
              strokeWidth="2.5"
              strokeDasharray="18 6 8 4 14 8"
            />
            {/* 4 Mystic Glyphs */}
            <circle cx="50" cy="12" r="2" fill="#E9D5FF" />
            <circle cx="88" cy="50" r="2" fill="#E9D5FF" />
            <circle cx="50" cy="88" r="2" fill="#E9D5FF" />
            <circle cx="12" cy="50" r="2" fill="#E9D5FF" />
          </g>

          {/* Counter-rotating Outer Star Flares */}
          <g className="animate-[spin_18s_linear_infinite_reverse] origin-center opacity-80">
            <polygon points="50,6 52,12 50,14 48,12" fill="#F3E8FF" />
            <polygon points="94,50 88,52 86,50 88,48" fill="#F3E8FF" />
            <polygon points="50,94 48,88 50,86 52,88" fill="#F3E8FF" />
            <polygon points="6,50 12,48 14,50 12,52" fill="#F3E8FF" />
          </g>
        </svg>
      )}

      {effectType === "cyber_valkyrie" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible drop-shadow-[0_0_8px_rgba(6,182,212,0.9)]"
        >
          <defs>
            <linearGradient id="cyberWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22D3EE" />
              <stop offset="50%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>

          {/* Top Tech Visor Bar */}
          <path
            d="M 38 12 L 62 12 L 56 16 L 44 16 Z"
            fill="#22D3EE"
            className="animate-pulse"
          />
          <line x1="32" y1="14" x2="68" y2="14" stroke="#8B5CF6" strokeWidth="1" strokeDasharray="3 2" />

          {/* Left Cyber Valkyrie Wing */}
          <g className="animate-pulse">
            <path
              d="M 16 35 L 4 30 L 10 44 L 2 40 L 8 55 L 14 50 Z"
              fill="url(#cyberWingGrad)"
              opacity="0.9"
            />
            <polyline points="15,34 3,29 9,43 1,39 7,54 13,49" fill="none" stroke="#67E8F9" strokeWidth="1" />
          </g>

          {/* Right Cyber Valkyrie Wing */}
          <g className="animate-pulse">
            <path
              d="M 84 35 L 96 30 L 90 44 L 98 40 L 92 55 L 86 50 Z"
              fill="url(#cyberWingGrad)"
              opacity="0.9"
            />
            <polyline points="85,34 97,29 91,43 99,39 93,54 87,49" fill="none" stroke="#67E8F9" strokeWidth="1" />
          </g>

          {/* Cyber Circular Border */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="#06B6D4"
            strokeWidth="2"
            strokeDasharray="30 8 12 8"
          />
        </svg>
      )}

      {effectType === "crimson_dragon" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible drop-shadow-[0_0_10px_rgba(239,68,68,0.95)]"
        >
          <defs>
            <linearGradient id="dragonHornGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#991B1B" />
              <stop offset="50%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id="flameGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#DC2626" />
              <stop offset="60%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#FDE047" />
            </linearGradient>
          </defs>

          {/* Dragon Horns at Top (Left & Right) */}
          <path
            d="M 32 20 C 24 10 18 4 12 2 C 16 12 24 18 28 24 Z"
            fill="url(#dragonHornGrad)"
          />
          <path
            d="M 68 20 C 76 10 82 4 88 2 C 84 12 76 18 72 24 Z"
            fill="url(#dragonHornGrad)"
          />

          {/* Central Dragon Crest Flame */}
          <path
            d="M 50 4 C 47 11 44 14 50 18 C 56 14 53 11 50 4 Z"
            fill="#FDE047"
            className="animate-pulse"
          />

          {/* Blazing Flame Tendrils around Bottom Perimeter */}
          <path
            d="M 22 75 C 16 84 26 94 36 96 C 42 98 48 94 50 90 C 52 94 58 98 64 96 C 74 94 84 84 78 75 C 72 82 62 88 50 86 C 38 88 28 82 22 75 Z"
            fill="url(#flameGrad)"
            opacity="0.95"
            className="animate-pulse"
          />

          {/* Fiery Circle Accent */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="url(#flameGrad)"
            strokeWidth="2.5"
            strokeDasharray="24 6 12 6"
          />
        </svg>
      )}

      {effectType === "golden_sovereign" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible drop-shadow-[0_0_12px_rgba(245,158,11,0.95)]"
        >
          <defs>
            <linearGradient id="goldCrownGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#B45309" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#FEF08A" />
            </linearGradient>
            <linearGradient id="goldWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>

          {/* Sovereign Golden Crown at Top */}
          <g className="origin-top animate-pulse">
            <path
              d="M 32 18 L 36 6 L 44 14 L 50 2 L 56 14 L 64 6 L 68 18 Z"
              fill="url(#goldCrownGrad)"
              stroke="#FEF08A"
              strokeWidth="0.8"
            />
            {/* Crown Jewel */}
            <circle cx="50" cy="11" r="2.2" fill="#EF4444" stroke="#FFF" strokeWidth="0.6" />
            <circle cx="36" cy="15" r="1.4" fill="#3B82F6" />
            <circle cx="64" cy="15" r="1.4" fill="#3B82F6" />
          </g>

          {/* Left Majestic Angel Wing */}
          <g opacity="0.9">
            <path
              d="M 16 38 C 4 32 2 46 6 56 C 10 52 14 48 16 42 Z"
              fill="url(#goldWingGrad)"
            />
            <path
              d="M 15 48 C 6 48 4 60 10 68 C 13 62 16 56 16 52 Z"
              fill="url(#goldWingGrad)"
              opacity="0.8"
            />
          </g>

          {/* Right Majestic Angel Wing */}
          <g opacity="0.9">
            <path
              d="M 84 38 C 96 32 98 46 94 56 C 90 52 86 48 84 42 Z"
              fill="url(#goldWingGrad)"
            />
            <path
              d="M 85 48 C 94 48 96 60 90 68 C 87 62 84 56 84 52 Z"
              fill="url(#goldWingGrad)"
              opacity="0.8"
            />
          </g>

          {/* Radiating Ring */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="url(#goldCrownGrad)"
            strokeWidth="3"
            strokeDasharray="40 10"
          />
        </svg>
      )}
    </div>
  );
}
