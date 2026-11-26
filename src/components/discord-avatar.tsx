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
    | "thunder_sovereign"
    | "seraphim_divinity";
  size: number;
}) {
  return (
    <div
      className="absolute -inset-[28%] w-[156%] h-[156%] pointer-events-none select-none z-10 overflow-visible flex items-center justify-center"
      aria-hidden="true"
    >
      {/* ======================================================== */}
      {/* 1. TIER 1 RARE: ROYAL ARCANE VORTEX (500 HC/XP)          */}
      {/* ======================================================== */}
      {effectType === "arcane_vortex" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible drop-shadow-[0_0_10px_rgba(168,85,247,0.9)]"
        >
          <defs>
            <linearGradient id="vortexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E9D5FF" />
              <stop offset="40%" stopColor="#C084FC" />
              <stop offset="80%" stopColor="#9333EA" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
            <radialGradient id="vortexAura" cx="50%" cy="50%" r="50%">
              <stop offset="65%" stopColor="transparent" />
              <stop offset="100%" stopColor="rgba(168,85,247,0.45)" />
            </radialGradient>
          </defs>

          {/* Soft Pulsing Ambient Radial Aura */}
          <circle cx="50" cy="50" r="39" fill="url(#vortexAura)" className="animate-pulse" />

          {/* Smooth Spinning Energy Ring with Dashed Flow */}
          <g className="animate-[spin_10s_linear_infinite] origin-center">
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="url(#vortexGrad)"
              strokeWidth="2.4"
              strokeDasharray="22 6 10 4 14 6"
            />
            {/* 4 Mystic Diamond Nodes */}
            <polygon points="50,10 52,12 50,14 48,12" fill="#F3E8FF" />
            <polygon points="90,50 88,52 86,50 88,48" fill="#F3E8FF" />
            <polygon points="50,90 48,88 50,86 52,88" fill="#F3E8FF" />
            <polygon points="10,50 12,48 14,50 12,52" fill="#F3E8FF" />
          </g>

          {/* Counter-Spinning Mystic Starlight Sparks */}
          <g className="animate-[spin_16s_linear_infinite_reverse] origin-center opacity-85">
            <circle cx="50" cy="8" r="1.5" fill="#FFFFFF" />
            <circle cx="92" cy="50" r="1.5" fill="#FFFFFF" />
            <circle cx="50" cy="92" r="1.5" fill="#FFFFFF" />
            <circle cx="8" cy="50" r="1.5" fill="#FFFFFF" />
            <polygon points="78,22 80,24 78,26 76,24" fill="#E9D5FF" />
            <polygon points="22,78 24,80 22,82 20,80" fill="#E9D5FF" />
          </g>
        </svg>
      )}

      {/* ======================================================== */}
      {/* 2. TIER 1 RARE: CYBER VALKYRIE HALO (800 HC/XP)          */}
      {/* ======================================================== */}
      {effectType === "cyber_valkyrie" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible drop-shadow-[0_0_10px_rgba(6,182,212,0.95)]"
        >
          <defs>
            <linearGradient id="cyberWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A5F3FC" />
              <stop offset="35%" stopColor="#22D3EE" />
              <stop offset="70%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
            <linearGradient id="cyberRingGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>

          {/* Top Visor Sensor Crest */}
          <path
            d="M 36 10 L 64 10 L 58 15 L 42 15 Z"
            fill="#22D3EE"
            className="animate-pulse"
          />
          <line x1="30" y1="12" x2="70" y2="12" stroke="#A855F7" strokeWidth="1.2" strokeDasharray="4 2" />

          {/* Left Holographic Circuit Wings */}
          <g className="animate-pulse">
            <path
              d="M 16 32 L 2 26 L 8 42 L 0 38 L 6 56 L 14 50 Z"
              fill="url(#cyberWingGrad)"
              opacity="0.95"
            />
            <polyline points="15,31 1,25 7,41 0,37 5,55 13,49" fill="none" stroke="#E0F2FE" strokeWidth="1" />
            <circle cx="3" cy="27" r="1.5" fill="#67E8F9" />
            <circle cx="8" cy="54" r="1.5" fill="#67E8F9" />
          </g>

          {/* Right Holographic Circuit Wings */}
          <g className="animate-pulse">
            <path
              d="M 84 32 L 98 26 L 92 42 L 100 38 L 94 56 L 86 50 Z"
              fill="url(#cyberWingGrad)"
              opacity="0.95"
            />
            <polyline points="85,31 99,25 93,41 100,37 95,55 87,49" fill="none" stroke="#E0F2FE" strokeWidth="1" />
            <circle cx="97" cy="27" r="1.5" fill="#67E8F9" />
            <circle cx="92" cy="54" r="1.5" fill="#67E8F9" />
          </g>

          {/* Outer Dual Concentric Sci-Fi Rings */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="url(#cyberRingGrad)"
            strokeWidth="2.2"
            strokeDasharray="28 8 14 8"
          />
          <circle
            cx="50"
            cy="50"
            r="41"
            fill="none"
            stroke="#22D3EE"
            strokeWidth="0.8"
            strokeDasharray="4 16"
            className="animate-[spin_12s_linear_infinite]"
          />
        </svg>
      )}

      {/* ======================================================== */}
      {/* 3. TIER 2 EPIC: FROST MONARCH RING (900 HC/XP)           */}
      {/* ======================================================== */}
      {effectType === "frost_monarch" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible drop-shadow-[0_0_12px_rgba(56,189,248,0.95)]"
        >
          <defs>
            <linearGradient id="frostGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F0F9FF" />
              <stop offset="35%" stopColor="#BAE6FD" />
              <stop offset="70%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <radialGradient id="frostAura" cx="50%" cy="50%" r="50%">
              <stop offset="65%" stopColor="transparent" />
              <stop offset="100%" stopColor="rgba(56,189,248,0.4)" />
            </radialGradient>
          </defs>

          <circle cx="50" cy="50" r="39" fill="url(#frostAura)" className="animate-pulse" />

          {/* 5 Sharp Glacial Crown Spikes on Top */}
          <g className="origin-top animate-pulse">
            <polygon points="50,2 53,14 47,14" fill="#FFFFFF" />
            <polygon points="36,6 41,16 34,16" fill="#BAE6FD" />
            <polygon points="64,6 66,16 59,16" fill="#BAE6FD" />
            <polygon points="24,14 29,22 22,23" fill="#7DD3FC" />
            <polygon points="76,14 78,23 71,22" fill="#7DD3FC" />
          </g>

          {/* Rotating Snowflake Crystal Orbit with 6 Ice Gems */}
          <g className="animate-[spin_18s_linear_infinite] origin-center">
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="url(#frostGrad)"
              strokeWidth="2.4"
              strokeDasharray="20 6 8 6"
            />
            {/* 4 Floating Snowflake Crosses */}
            <g transform="translate(50, 11)">
              <line x1="-3" y1="0" x2="3" y2="0" stroke="#FFF" strokeWidth="1.2" />
              <line x1="0" y1="-3" x2="0" y2="3" stroke="#FFF" strokeWidth="1.2" />
            </g>
            <g transform="translate(89, 50)">
              <line x1="-3" y1="0" x2="3" y2="0" stroke="#FFF" strokeWidth="1.2" />
              <line x1="0" y1="-3" x2="0" y2="3" stroke="#FFF" strokeWidth="1.2" />
            </g>
            <g transform="translate(50, 89)">
              <line x1="-3" y1="0" x2="3" y2="0" stroke="#FFF" strokeWidth="1.2" />
              <line x1="0" y1="-3" x2="0" y2="3" stroke="#FFF" strokeWidth="1.2" />
            </g>
            <g transform="translate(11, 50)">
              <line x1="-3" y1="0" x2="3" y2="0" stroke="#FFF" strokeWidth="1.2" />
              <line x1="0" y1="-3" x2="0" y2="3" stroke="#FFF" strokeWidth="1.2" />
            </g>
          </g>

          {/* Shimmering Glacial Dust */}
          <circle cx="28" cy="18" r="1.4" fill="#FFFFFF" className="animate-ping" />
          <circle cx="72" cy="82" r="1.4" fill="#FFFFFF" className="animate-ping" />
        </svg>
      )}

      {/* ======================================================== */}
      {/* 4. TIER 2 EPIC: EMERALD FOREST SPIRIT (1.000 HC/XP)      */}
      {/* ======================================================== */}
      {effectType === "emerald_spirit" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible drop-shadow-[0_0_12px_rgba(16,185,129,0.95)]"
        >
          <defs>
            <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ECFDF5" />
              <stop offset="30%" stopColor="#6EE7B7" />
              <stop offset="70%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <radialGradient id="natureAura" cx="50%" cy="50%" r="50%">
              <stop offset="65%" stopColor="transparent" />
              <stop offset="100%" stopColor="rgba(16,185,129,0.4)" />
            </radialGradient>
          </defs>

          <circle cx="50" cy="50" r="39" fill="url(#natureAura)" className="animate-pulse" />

          {/* Living Nature Vines & Enchanted Leaves */}
          <g className="animate-[spin_22s_linear_infinite] origin-center">
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="url(#emeraldGrad)"
              strokeWidth="2.5"
              strokeDasharray="18 8 26 8"
            />
            {/* 4 Majestic Golden-Emerald Leaves */}
            <path d="M 50 6 C 55 10 55 16 50 19 C 45 16 45 10 50 6 Z" fill="#34D399" stroke="#FDE047" strokeWidth="0.8" />
            <path d="M 94 50 C 90 55 84 55 81 50 C 84 45 90 45 94 50 Z" fill="#34D399" stroke="#FDE047" strokeWidth="0.8" />
            <path d="M 50 94 C 45 90 45 84 50 81 C 55 84 55 90 50 94 Z" fill="#34D399" stroke="#FDE047" strokeWidth="0.8" />
            <path d="M 6 50 C 10 45 16 45 19 50 C 16 55 10 55 6 50 Z" fill="#34D399" stroke="#FDE047" strokeWidth="0.8" />
          </g>

          {/* Floating Firefly Orbs with Pulsating Glow */}
          <circle cx="26" cy="18" r="2.2" fill="#FDE047" className="animate-ping" />
          <circle cx="74" cy="22" r="1.8" fill="#A7F3D0" className="animate-pulse" />
          <circle cx="76" cy="80" r="2.2" fill="#FDE047" className="animate-ping" />
          <circle cx="22" cy="76" r="1.8" fill="#A7F3D0" className="animate-pulse" />
        </svg>
      )}

      {/* ======================================================== */}
      {/* 5. TIER 2 EPIC: CRIMSON DRAGON CREST (1.200 HC/XP)       */}
      {/* ======================================================== */}
      {effectType === "crimson_dragon" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible drop-shadow-[0_0_14px_rgba(239,68,68,1)]"
        >
          <defs>
            <linearGradient id="dragonHornGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#7F1D1D" />
              <stop offset="40%" stopColor="#DC2626" />
              <stop offset="80%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#FDE047" />
            </linearGradient>
            <linearGradient id="flameGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#B91C1C" />
              <stop offset="50%" stopColor="#EA580C" />
              <stop offset="100%" stopColor="#FACC15" />
            </linearGradient>
          </defs>

          {/* Dual Fierce Crimson Dragon Horns */}
          <path
            d="M 30 18 C 22 8 16 2 10 0 C 14 10 22 18 26 24 Z"
            fill="url(#dragonHornGrad)"
            stroke="#FDE047"
            strokeWidth="0.8"
          />
          <path
            d="M 70 18 C 78 8 84 2 90 0 C 86 10 78 18 74 24 Z"
            fill="url(#dragonHornGrad)"
            stroke="#FDE047"
            strokeWidth="0.8"
          />

          {/* Central Apex Dragon Pearl */}
          <circle cx="50" cy="8" r="3" fill="#FDE047" stroke="#DC2626" strokeWidth="1" className="animate-pulse" />

          {/* Fierce Rising Dragon Flames at Bottom */}
          <path
            d="M 20 74 C 14 84 24 96 34 98 C 42 100 48 95 50 90 C 52 95 58 100 66 98 C 76 96 86 84 80 74 C 74 82 64 89 50 87 C 36 89 26 82 20 74 Z"
            fill="url(#flameGrad)"
            opacity="0.95"
            className="animate-pulse"
          />

          {/* Rotating Ember Ring */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="url(#flameGrad)"
            strokeWidth="2.6"
            strokeDasharray="26 6 12 6"
          />
          <circle cx="16" cy="40" r="1.5" fill="#FDE047" className="animate-ping" />
          <circle cx="84" cy="40" r="1.5" fill="#FDE047" className="animate-ping" />
        </svg>
      )}

      {/* ======================================================== */}
      {/* 6. TIER 3 LEGENDARY: CELESTIAL ASTRAL ORBIT (1.600 HC/XP) */}
      {/* ======================================================== */}
      {effectType === "celestial_astral" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible drop-shadow-[0_0_14px_rgba(129,140,248,1)]"
        >
          <defs>
            <linearGradient id="astralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="30%" stopColor="#C7D2FE" />
              <stop offset="70%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
            <linearGradient id="astralGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="50%" stopColor="#C084FC" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>

          {/* Orbit 1: Tilted Ellipse Spinning Clockwise */}
          <g className="animate-[spin_14s_linear_infinite] origin-center">
            <ellipse
              cx="50"
              cy="50"
              rx="46"
              ry="22"
              fill="none"
              stroke="url(#astralGrad)"
              strokeWidth="2"
              strokeDasharray="32 8 12 6"
              transform="rotate(-28 50 50)"
            />
            {/* Luminous Pearl Moon */}
            <circle cx="92" cy="38" r="3.6" fill="#FFFFFF" stroke="#818CF8" strokeWidth="1" />
            <circle cx="8" cy="62" r="2.2" fill="#E0E7FF" />
          </g>

          {/* Orbit 2: Intersecting Ellipse Spinning Counter-Clockwise */}
          <g className="animate-[spin_20s_linear_infinite_reverse] origin-center">
            <ellipse
              cx="50"
              cy="50"
              rx="46"
              ry="22"
              fill="none"
              stroke="url(#astralGrad2)"
              strokeWidth="1.8"
              strokeDasharray="24 10 10 8"
              transform="rotate(38 50 50)"
            />
            {/* Golden Star Planet */}
            <circle cx="92" cy="62" r="3" fill="#FDE047" stroke="#F59E0B" strokeWidth="0.8" />
            <circle cx="8" cy="38" r="2" fill="#A855F7" />
          </g>

          {/* Starlight Constellation Ring */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="#818CF8"
            strokeWidth="1.6"
            strokeDasharray="8 12"
          />

          {/* 4 Celestial Apex Starbursts */}
          <polygon points="50,2 52,8 50,11 48,8" fill="#FFFFFF" className="animate-pulse" />
          <polygon points="98,50 92,52 89,50 92,48" fill="#FFFFFF" className="animate-pulse" />
          <polygon points="50,98 48,92 50,89 52,92" fill="#FFFFFF" className="animate-pulse" />
          <polygon points="2,50 8,48 11,50 8,52" fill="#FFFFFF" className="animate-pulse" />
        </svg>
      )}

      {/* ======================================================== */}
      {/* 7. TIER 3 LEGENDARY: THUNDER SOVEREIGN AURA (2.000 HC/XP) */}
      {/* ======================================================== */}
      {effectType === "thunder_sovereign" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible drop-shadow-[0_0_16px_rgba(234,179,8,1)]"
        >
          <defs>
            <linearGradient id="thunderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="30%" stopColor="#FEF08A" />
              <stop offset="70%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>
            <linearGradient id="cyanArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#67E8F9" />
              <stop offset="100%" stopColor="#FACC15" />
            </linearGradient>
          </defs>

          {/* 4 High-Voltage Branching Lightning Bolts */}
          <g className="animate-pulse">
            {/* Top Bolt */}
            <polygon points="50,0 54,9 49,9 53,16 45,16 48,8 44,8" fill="url(#thunderGrad)" />
            {/* Right Bolt */}
            <polygon points="100,50 91,54 91,49 84,53 84,45 92,48 92,44" fill="url(#thunderGrad)" />
            {/* Bottom Bolt */}
            <polygon points="50,100 46,91 51,91 47,84 55,84 52,92 56,92" fill="url(#thunderGrad)" />
            {/* Left Bolt */}
            <polygon points="0,50 9,46 9,51 16,47 16,55 8,52 8,56" fill="url(#thunderGrad)" />
          </g>

          {/* Electric Arcs Ring with High-Voltage Cyan Shimmer */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="url(#thunderGrad)"
            strokeWidth="2.8"
            strokeDasharray="16 8 22 6"
          />
          <circle
            cx="50"
            cy="50"
            r="41"
            fill="none"
            stroke="url(#cyanArcGrad)"
            strokeWidth="1.2"
            strokeDasharray="6 14"
            className="animate-[spin_6s_linear_infinite]"
          />

          {/* Crackling Plasma Dots */}
          <circle cx="20" cy="24" r="1.6" fill="#FEF08A" className="animate-ping" />
          <circle cx="80" cy="24" r="1.6" fill="#67E8F9" className="animate-ping" />
          <circle cx="80" cy="76" r="1.6" fill="#FEF08A" className="animate-ping" />
          <circle cx="20" cy="76" r="1.6" fill="#67E8F9" className="animate-ping" />
        </svg>
      )}

      {/* ======================================================== */}
      {/* 8. TIER 4 MYTHIC: GOLDEN SOVEREIGN WINGS (2.500 HC/XP)   */}
      {/* ======================================================== */}
      {effectType === "golden_sovereign" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible drop-shadow-[0_0_18px_rgba(245,158,11,1)]"
        >
          <defs>
            <linearGradient id="goldCrownGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#92400E" />
              <stop offset="30%" stopColor="#D97706" />
              <stop offset="70%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#FEF08A" />
            </linearGradient>
            <linearGradient id="goldWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFBEB" />
              <stop offset="30%" stopColor="#FEF08A" />
              <stop offset="70%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
          </defs>

          {/* Imperial Sovereign Crown at Top Peak */}
          <g className="origin-top animate-pulse">
            <path
              d="M 30 18 L 34 4 L 42 13 L 50 0 L 58 13 L 66 4 L 70 18 Z"
              fill="url(#goldCrownGrad)"
              stroke="#FEF08A"
              strokeWidth="1"
            />
            {/* Crown Gemstones */}
            <circle cx="50" cy="9" r="2.8" fill="#EF4444" stroke="#FFF" strokeWidth="0.8" />
            <circle cx="35" cy="14" r="1.8" fill="#3B82F6" stroke="#FFF" strokeWidth="0.5" />
            <circle cx="65" cy="14" r="1.8" fill="#3B82F6" stroke="#FFF" strokeWidth="0.5" />
          </g>

          {/* Left Layered Golden Wings with Soft Flapping */}
          <g className="animate-pulse origin-center">
            <path
              d="M 16 36 C 2 30 0 46 4 56 C 8 52 13 47 16 42 Z"
              fill="url(#goldWingGrad)"
            />
            <path
              d="M 15 46 C 4 46 2 60 8 68 C 11 62 15 56 16 51 Z"
              fill="url(#goldWingGrad)"
              opacity="0.9"
            />
            <path
              d="M 16 56 C 8 62 8 72 14 78 C 15 72 17 66 17 61 Z"
              fill="url(#goldWingGrad)"
              opacity="0.8"
            />
          </g>

          {/* Right Layered Golden Wings with Soft Flapping */}
          <g className="animate-pulse origin-center">
            <path
              d="M 84 36 C 98 30 100 46 96 56 C 92 52 87 47 84 42 Z"
              fill="url(#goldWingGrad)"
            />
            <path
              d="M 85 46 C 96 46 98 60 92 68 C 89 62 85 56 84 51 Z"
              fill="url(#goldWingGrad)"
              opacity="0.9"
            />
            <path
              d="M 84 56 C 92 62 92 72 86 78 C 85 72 83 66 83 61 Z"
              fill="url(#goldWingGrad)"
              opacity="0.8"
            />
          </g>

          {/* Radiant Imperial Gold Perimeter Ring */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="url(#goldCrownGrad)"
            strokeWidth="3.2"
            strokeDasharray="42 8"
          />

          {/* Golden Shimmer Sparks */}
          <polygon points="50,96 51,98 50,100 49,98" fill="#FEF08A" />
        </svg>
      )}

      {/* ======================================================== */}
      {/* 9. TIER 4 MYTHIC PINNACLE: SERAPHIM ETERNAL DIVINITY     */}
      {/*    (5.000 HC/XP - 6 Grand Cosmic Wings & Magic Runes)   */}
      {/* ======================================================== */}
      {effectType === "seraphim_divinity" && (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible drop-shadow-[0_0_24px_rgba(245,158,11,1)] drop-shadow-[0_0_36px_rgba(168,85,247,0.85)]"
        >
          <defs>
            <linearGradient id="seraphimGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="25%" stopColor="#FEF08A" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
            <linearGradient id="seraphimCosmicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="40%" stopColor="#EC4899" />
              <stop offset="75%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
            <radialGradient id="seraphimDivAura" cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="transparent" />
              <stop offset="85%" stopColor="rgba(245,158,11,0.3)" />
              <stop offset="100%" stopColor="rgba(168,85,247,0.5)" />
            </radialGradient>
          </defs>

          {/* Ambient Cosmic Divine Radial Aura */}
          <circle cx="50" cy="50" r="44" fill="url(#seraphimDivAura)" className="animate-pulse" />

          {/* OUTER SACRED RUNIC CIRCLE (Spinning Smoothly) */}
          <g className="animate-[spin_24s_linear_infinite] origin-center opacity-90">
            <circle
              cx="50"
              cy="50"
              r="43"
              fill="none"
              stroke="url(#seraphimCosmicGrad)"
              strokeWidth="1.6"
              strokeDasharray="6 8 14 6 18 10"
            />
            {/* 6 Sacred Astrological Rune Symbols */}
            <polygon points="50,5 52,9 50,11 48,9" fill="#FFFBEB" />
            <polygon points="83,16 86,19 83,21 81,19" fill="#FEF08A" />
            <polygon points="95,50 97,53 94,54 93,51" fill="#FFFBEB" />
            <polygon points="83,84 85,87 82,88 81,85" fill="#FEF08A" />
            <polygon points="17,16 19,19 17,21 15,19" fill="#FEF08A" />
            <polygon points="5,50 7,53 5,55 3,53" fill="#FFFBEB" />
          </g>

          {/* INNER CELESTIAL CIRCLE (Counter-Spinning) */}
          <g className="animate-[spin_16s_linear_infinite_reverse] origin-center">
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="url(#seraphimGoldGrad)"
              strokeWidth="2.8"
              strokeDasharray="30 8 10 8"
            />
          </g>

          {/* 6 GRAND SERAPHIM COSMIC WINGS (3 PAIRS) */}
          {/* PAIR 1: UPPER ASCENDING WINGS */}
          <g className="animate-pulse origin-top">
            <path
              d="M 28 22 C 14 6 4 8 0 16 C 6 22 14 26 22 28 Z"
              fill="url(#seraphimCosmicGrad)"
              opacity="0.95"
            />
            <path
              d="M 72 22 C 86 6 96 8 100 16 C 94 22 86 26 78 28 Z"
              fill="url(#seraphimCosmicGrad)"
              opacity="0.95"
            />
          </g>

          {/* PAIR 2: MIDDLE RADIANT WINGS */}
          <g className="animate-pulse origin-center">
            <path
              d="M 14 38 C -2 32 -4 48 2 60 C 6 54 11 48 14 44 Z"
              fill="url(#seraphimGoldGrad)"
            />
            <path
              d="M 86 38 C 102 32 104 48 98 60 C 94 54 89 48 86 44 Z"
              fill="url(#seraphimGoldGrad)"
            />
          </g>

          {/* PAIR 3: LOWER EMBRACING WINGS */}
          <g className="animate-pulse origin-bottom">
            <path
              d="M 18 64 C 4 72 6 88 14 96 C 17 88 20 80 20 74 Z"
              fill="url(#seraphimCosmicGrad)"
              opacity="0.9"
            />
            <path
              d="M 82 64 C 96 72 94 88 86 96 C 83 88 80 80 80 74 Z"
              fill="url(#seraphimCosmicGrad)"
              opacity="0.9"
            />
          </g>

          {/* APEX DIVINE SOLAR CROWN */}
          <g className="origin-top animate-pulse">
            <polygon points="50,-2 54,8 50,12 46,8" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="1" />
            <circle cx="50" cy="8" r="3.2" fill="#EF4444" stroke="#FFF" strokeWidth="0.8" />
          </g>

          {/* FALLING STARS & CELESTIAL FLARES */}
          <circle cx="28" cy="8" r="1.8" fill="#FFFFFF" className="animate-ping" />
          <circle cx="72" cy="8" r="1.8" fill="#FFFFFF" className="animate-ping" />
          <circle cx="50" cy="98" r="2.2" fill="#FDE047" className="animate-ping" />
        </svg>
      )}
    </div>
  );
}
