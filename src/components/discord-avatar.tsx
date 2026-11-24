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
 * Decorations (crown, wings, horns, aura, frost, celestial) project outwards without clipping.
 */
function AvatarDecorationSvg({
  effectType,
}: {
  effectType:
    | "arcane_vortex"
    | "cyber_valkyrie"
    | "crimson_dragon"
    | "golden_sovereign"
    | "frost_monarch"
    | "emerald_spirit"
    | "celestial_astral"
    | "thunder_sovereign";
  size: number;
}) {
  return (
    <div
      className="absolute -inset-[22%] w-[144%] h-[144%] pointer-events-none select-none z-10 overflow-visible flex items-center justify-center"
      aria-hidden="true"
    >
      {/* 1. ROYAL ARCANE VORTEX */}
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

          <circle cx="50" cy="50" r="39" fill="url(#vortexAura)" className="animate-pulse" />

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
            <circle cx="50" cy="12" r="2" fill="#E9D5FF" />
            <circle cx="88" cy="50" r="2" fill="#E9D5FF" />
            <circle cx="50" cy="88" r="2" fill="#E9D5FF" />
            <circle cx="12" cy="50" r="2" fill="#E9D5FF" />
          </g>

          <g className="animate-[spin_18s_linear_infinite_reverse] origin-center opacity-80">
            <polygon points="50,6 52,12 50,14 48,12" fill="#F3E8FF" />
            <polygon points="94,50 88,52 86,50 88,48" fill="#F3E8FF" />
            <polygon points="50,94 48,88 50,86 52,88" fill="#F3E8FF" />
            <polygon points="6,50 12,48 14,50 12,52" fill="#F3E8FF" />
          </g>
        </svg>
      )}

      {/* 2. CYBER VALKYRIE HALO */}
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

          <path
            d="M 38 12 L 62 12 L 56 16 L 44 16 Z"
            fill="#22D3EE"
            className="animate-pulse"
          />
          <line x1="32" y1="14" x2="68" y2="14" stroke="#8B5CF6" strokeWidth="1" strokeDasharray="3 2" />

          <g className="animate-pulse">
            <path
              d="M 16 35 L 4 30 L 10 44 L 2 40 L 8 55 L 14 50 Z"
              fill="url(#cyberWingGrad)"
              opacity="0.9"
            />
            <polyline points="15,34 3,29 9,43 1,39 7,54 13,49" fill="none" stroke="#67E8F9" strokeWidth="1" />
          </g>

          <g className="animate-pulse">
            <path
              d="M 84 35 L 96 30 L 90 44 L 98 40 L 92 55 L 86 50 Z"
              fill="url(#cyberWingGrad)"
              opacity="0.9"
            />
            <polyline points="85,34 97,29 91,43 99,39 93,54 87,49" fill="none" stroke="#67E8F9" strokeWidth="1" />
          </g>

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

      {/* 3. FROST MONARCH RING */}
      {effectType === "frost_monarch" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible drop-shadow-[0_0_10px_rgba(56,189,248,0.9)]"
        >
          <defs>
            <linearGradient id="frostGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#BAE6FD" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <radialGradient id="frostAura" cx="50%" cy="50%" r="50%">
              <stop offset="65%" stopColor="transparent" />
              <stop offset="100%" stopColor="rgba(56,189,248,0.35)" />
            </radialGradient>
          </defs>

          <circle cx="50" cy="50" r="39" fill="url(#frostAura)" className="animate-pulse" />

          {/* Glacial Crown Spikes on Top */}
          <g className="origin-top animate-pulse">
            <polygon points="50,4 53,14 47,14" fill="#E0F2FE" />
            <polygon points="38,8 42,16 35,16" fill="#BAE6FD" />
            <polygon points="62,8 65,16 58,16" fill="#BAE6FD" />
            <polygon points="26,16 30,22 24,23" fill="#7DD3FC" />
            <polygon points="74,16 76,23 70,22" fill="#7DD3FC" />
          </g>

          {/* Rotating Snowflake Orbit */}
          <g className="animate-[spin_20s_linear_infinite] origin-center">
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="url(#frostGrad)"
              strokeWidth="2.2"
              strokeDasharray="22 6 6 6"
            />
            {/* 4 Floating Ice Crystals */}
            <rect x="48" y="10" width="4" height="4" transform="rotate(45 50 12)" fill="#FFFFFF" />
            <rect x="86" y="48" width="4" height="4" transform="rotate(45 88 50)" fill="#FFFFFF" />
            <rect x="48" y="86" width="4" height="4" transform="rotate(45 50 88)" fill="#FFFFFF" />
            <rect x="10" y="48" width="4" height="4" transform="rotate(45 12 50)" fill="#FFFFFF" />
          </g>
        </svg>
      )}

      {/* 4. EMERALD FOREST SPIRIT */}
      {effectType === "emerald_spirit" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible drop-shadow-[0_0_10px_rgba(16,185,129,0.9)]"
        >
          <defs>
            <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A7F3D0" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <radialGradient id="natureAura" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="transparent" />
              <stop offset="100%" stopColor="rgba(16,185,129,0.35)" />
            </radialGradient>
          </defs>

          <circle cx="50" cy="50" r="39" fill="url(#natureAura)" className="animate-pulse" />

          {/* Nature Spores & Floating Leaves */}
          <g className="animate-[spin_24s_linear_infinite] origin-center">
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="url(#emeraldGrad)"
              strokeWidth="2.5"
              strokeDasharray="16 8 24 8"
            />
            {/* Magic Leaves at Quadrants */}
            <path d="M 50 8 C 54 11 54 15 50 18 C 46 15 46 11 50 8 Z" fill="#6EE7B7" />
            <path d="M 92 50 C 89 54 85 54 82 50 C 85 46 89 46 92 50 Z" fill="#6EE7B7" />
            <path d="M 50 92 C 46 89 46 85 50 82 C 54 85 54 89 50 92 Z" fill="#6EE7B7" />
            <path d="M 8 50 C 11 46 15 46 18 50 C 15 54 11 54 8 50 Z" fill="#6EE7B7" />
          </g>

          {/* Sparkling Spirit Orbs */}
          <circle cx="28" cy="20" r="1.8" fill="#ECFDF5" className="animate-ping" />
          <circle cx="72" cy="80" r="1.8" fill="#ECFDF5" className="animate-ping" />
        </svg>
      )}

      {/* 5. CRIMSON DRAGON CREST */}
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

          <path
            d="M 32 20 C 24 10 18 4 12 2 C 16 12 24 18 28 24 Z"
            fill="url(#dragonHornGrad)"
          />
          <path
            d="M 68 20 C 76 10 82 4 88 2 C 84 12 76 18 72 24 Z"
            fill="url(#dragonHornGrad)"
          />

          <path
            d="M 50 4 C 47 11 44 14 50 18 C 56 14 53 11 50 4 Z"
            fill="#FDE047"
            className="animate-pulse"
          />

          <path
            d="M 22 75 C 16 84 26 94 36 96 C 42 98 48 94 50 90 C 52 94 58 98 64 96 C 74 94 84 84 78 75 C 72 82 62 88 50 86 C 38 88 28 82 22 75 Z"
            fill="url(#flameGrad)"
            opacity="0.95"
            className="animate-pulse"
          />

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

      {/* 6. CELESTIAL ASTRAL ORBIT */}
      {effectType === "celestial_astral" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible drop-shadow-[0_0_12px_rgba(129,140,248,0.95)]"
        >
          <defs>
            <linearGradient id="astralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E0E7FF" />
              <stop offset="50%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#4338CA" />
            </linearGradient>
            <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#A5B4FC" />
            </linearGradient>
          </defs>

          {/* Tilted Elliptical Planetary Ring */}
          <g className="animate-[spin_16s_linear_infinite] origin-center">
            <ellipse
              cx="50"
              cy="50"
              rx="44"
              ry="22"
              fill="none"
              stroke="url(#astralGrad)"
              strokeWidth="1.8"
              strokeDasharray="30 8 10 6"
              transform="rotate(-25 50 50)"
            />
            {/* Orbiting Moon / Planet */}
            <circle cx="90" cy="38" r="3.5" fill="url(#starGrad)" />
            <circle cx="10" cy="62" r="2" fill="#C7D2FE" />
          </g>

          {/* Outer Constellation Points */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="#6366F1"
            strokeWidth="1.5"
            strokeDasharray="8 12"
          />
          <polygon points="50,4 52,9 50,11 48,9" fill="#FFFFFF" className="animate-pulse" />
          <polygon points="50,96 52,91 50,89 48,91" fill="#FFFFFF" className="animate-pulse" />
        </svg>
      )}

      {/* 7. THUNDER SOVEREIGN AURA */}
      {effectType === "thunder_sovereign" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible drop-shadow-[0_0_12px_rgba(234,179,8,0.95)]"
        >
          <defs>
            <linearGradient id="thunderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="50%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>
          </defs>

          {/* Crackling Lightning Bolts */}
          <g className="animate-pulse">
            <polygon points="50,2 53,10 49,10 52,16 46,16 48,9 45,9" fill="url(#thunderGrad)" />
            <polygon points="98,50 90,53 90,49 84,52 84,46 91,48 91,45" fill="url(#thunderGrad)" />
            <polygon points="50,98 47,90 51,90 48,84 54,84 52,91 55,91" fill="url(#thunderGrad)" />
            <polygon points="2,50 10,47 10,51 16,48 16,54 9,52 9,55" fill="url(#thunderGrad)" />
          </g>

          {/* Electric Arcs Ring */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="url(#thunderGrad)"
            strokeWidth="2.5"
            strokeDasharray="14 8 20 6"
          />
        </svg>
      )}

      {/* 8. GOLDEN SOVEREIGN WINGS */}
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

          <g className="origin-top animate-pulse">
            <path
              d="M 32 18 L 36 6 L 44 14 L 50 2 L 56 14 L 64 6 L 68 18 Z"
              fill="url(#goldCrownGrad)"
              stroke="#FEF08A"
              strokeWidth="0.8"
            />
            <circle cx="50" cy="11" r="2.2" fill="#EF4444" stroke="#FFF" strokeWidth="0.6" />
            <circle cx="36" cy="15" r="1.4" fill="#3B82F6" />
            <circle cx="64" cy="15" r="1.4" fill="#3B82F6" />
          </g>

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
