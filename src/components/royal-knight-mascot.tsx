"use client";

import React from "react";

interface RoyalKnightMascotProps {
  isDragging?: boolean;
  isOpen?: boolean;
  className?: string;
}

export function RoyalKnightMascot({
  isDragging = false,
  isOpen = false,
  className = "w-14 h-14 sm:w-16 sm:h-16",
}: RoyalKnightMascotProps) {
  return (
    <svg
      viewBox="0 0 72 72"
      className={`${className} relative z-10 drop-shadow-[0_4px_10px_rgba(124,58,237,0.45)] select-none`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Gradients for shiny armor, gold, and royal purple */}
        <linearGradient id="helm-steel" x1="22" y1="12" x2="50" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F1F5F9" />
          <stop offset="35%" stopColor="#CBD5E1" />
          <stop offset="70%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>

        <linearGradient id="helm-gold" x1="22" y1="18" x2="50" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        <linearGradient id="royal-plume" x1="34" y1="2" x2="54" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="40%" stopColor="#A855F7" />
          <stop offset="80%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#581C87" />
        </linearGradient>

        <linearGradient id="cape-purple" x1="24" y1="38" x2="48" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="50%" stopColor="#6D28D9" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>

        <linearGradient id="shield-body" x1="48" y1="34" x2="64" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="60%" stopColor="#6D28D9" />
          <stop offset="100%" stopColor="#3B0764" />
        </linearGradient>

        <linearGradient id="halberd-blade" x1="6" y1="12" x2="18" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
      </defs>

      {/* 1. ROYAL PURPLE CAPE (JUBAH BELAKANG) */}
      <path
        d="M24 38 C17 46 15 57 13 63 C22 61 28 62 36 62 C44 62 50 61 59 63 C57 57 55 46 48 38 Z"
        fill="url(#cape-purple)"
        stroke="#4C1D95"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M19 44 C21 53 23 58 24 62" stroke="#A78BFA" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
      <path d="M53 44 C51 53 49 58 48 62" stroke="#A78BFA" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />

      {/* 2. GUARD HALBERD (TOMBAK PENJAGA DI TANGAN KANAN/SISI KIRI) */}
      <g id="halberd-weapon">
        {/* Shaft / Gagang Tombak */}
        <line x1="14" y1="16" x2="14" y2="64" stroke="#311042" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="14" y1="28" x2="14" y2="60" stroke="#7C3AED" strokeWidth="1" strokeLinecap="round" opacity="0.7" />

        {/* Spear Tip (Ujung Tombak Atas) */}
        <polygon points="14,8 17.5,17 10.5,17" fill="url(#halberd-blade)" stroke="#475569" strokeWidth="0.8" />
        <line x1="14" y1="9" x2="14" y2="16.5" stroke="#F8FAFC" strokeWidth="0.8" />

        {/* Crescent Axe Blade (Mata Kapak Halberd) */}
        <path
          d="M14 15 C7 13 4 19 6 25 C9 24 13 22 14 21 Z"
          fill="url(#halberd-blade)"
          stroke="#475569"
          strokeWidth="0.8"
        />
        {/* Gold Rivet on Axe Collar */}
        <circle cx="14" cy="18" r="1.5" fill="#F59E0B" stroke="#B45309" strokeWidth="0.5" />

        {/* Back Spike / Pick */}
        <polygon points="14,16.5 18.5,18.5 14,20" fill="#F59E0B" stroke="#B45309" strokeWidth="0.5" />
      </g>

      {/* 3. TORSO / BREASTPLATE (ZIRAH DADA CHIBI BERLAPIS EMAS) */}
      <g id="breastplate-body">
        {/* Main Chest Armor */}
        <path
          d="M26 36 C26 32 30 31 36 31 C42 31 46 32 46 36 L47 49 C47 53 42 54 36 54 C30 54 25 53 25 49 Z"
          fill="#334155"
          stroke="#64748B"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Gold Inlaid Plate */}
        <path
          d="M28 35 C32 34 40 34 44 35 L43 45 C39 47 33 47 29 45 Z"
          fill="url(#helm-gold)"
          stroke="#FDE68A"
          strokeWidth="0.8"
        />

        {/* Guild Star Emblem on Chest */}
        <polygon
          points="36,37 37.5,40 40.5,40 38,42 39,45 36,43 33,45 34,42 31.5,40 34.5,40"
          fill="#FFFFFF"
          stroke="#D97706"
          strokeWidth="0.4"
        />
      </g>

      {/* 4. CHIBI ARMORED SABATONS / BOOTS (KAKI BERAYUN) */}
      <g id="knight-boots">
        {isDragging ? (
          // Dangling / swinging feet when dragged!
          <>
            {/* Left foot dangling slightly tilted */}
            <path
              d="M27 52 L24 60 C24 62 27 63 30 62 L32 53 Z"
              fill="#475569"
              stroke="#64748B"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Right foot dangling & kicking slightly outward */}
            <path
              d="M45 52 L48 60 C48 62 45 63 42 62 L40 53 Z"
              fill="#475569"
              stroke="#64748B"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </>
        ) : (
          // Standing sturdy boots
          <>
            <path
              d="M28 52 L26 59 C26 60.5 29 61.5 32 61 L33 53 Z"
              fill="#475569"
              stroke="#64748B"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <path
              d="M44 52 L46 59 C46 60.5 43 61.5 40 61 L39 53 Z"
              fill="#475569"
              stroke="#64748B"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </>
        )}
      </g>

      {/* 5. MINI GUILD KITE SHIELD (PERISAI DI TANGAN KIRI/SISI KANAN) */}
      <g id="guild-shield">
        {/* Shield Rim & Core */}
        <path
          d="M51 34 C58 35 62 39 60 48 C58 54 53 59 50 62 C47 59 45 54 45 48 C45 39 47 35 51 34 Z"
          fill="url(#shield-body)"
          stroke="#F59E0B"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Shield Inner Inset */}
        <path
          d="M51 37 C56 38 58 41 57 47 C55 52 52 55 50 58 C48 55 47 52 47 47 C47 41 48 38 51 37 Z"
          fill="#3B0764"
          stroke="#FDE68A"
          strokeWidth="0.8"
        />

        {/* Shield Guild Star Emblem */}
        <polygon
          points="51,43 52.2,45.5 54.8,45.5 52.8,47 53.5,49.5 51,48 48.5,49.5 49.2,47 47.2,45.5 49.8,45.5"
          fill="#F59E0B"
        />
      </g>

      {/* 6. PAULDRONS (PELINDUNG BAHU BAJA & EMAS) */}
      <g id="pauldrons">
        {/* Right Shoulder (Left side of drawing) */}
        <path
          d="M20 33 C18 30 23 27 28 29 C28 33 26 36 20 37 Z"
          fill="#94A3B8"
          stroke="#CBD5E1"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M19 34 C23 34 26 31 28 29" stroke="#F59E0B" strokeWidth="1.2" fill="none" strokeLinecap="round" />

        {/* Left Shoulder (Right side of drawing) */}
        <path
          d="M52 33 C54 30 49 27 44 29 C44 33 46 36 52 37 Z"
          fill="#94A3B8"
          stroke="#CBD5E1"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M53 34 C49 34 46 31 44 29" stroke="#F59E0B" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </g>

      {/* 7. ROYAL PURPLE PLUME (BULU JAMBUL KERAJAAN NEON UNGU) */}
      <g id="royal-plume-crest">
        {/* Primary flowing feather */}
        <path
          d="M36 3 C41 1 50 4 48 13 C45 9 40 8 36 9 C34 6 35 4 36 3 Z"
          fill="url(#royal-plume)"
          stroke="#C4B5FD"
          strokeWidth="0.8"
        />
        {/* Secondary wave plume */}
        <path
          d="M36 7 C44 5 54 11 50 18 C46 13 41 13 36 14 Z"
          fill="url(#royal-plume)"
          stroke="#A78BFA"
          strokeWidth="0.8"
        />
        {/* Base Crest Mount */}
        <path d="M34 11 C38 9 43 14 39 19 C37 16 34 15 33 15 Z" fill="#6D28D9" />
      </g>

      {/* 8. GREAT HELM / SALLET (HELM ZIRAH BAJA MENGILAP PERAK) */}
      <g id="great-helm">
        {/* Main Helm Dome */}
        <path
          d="M21 16 C21 9 27 6 36 6 C45 6 51 9 51 16 L51 28 C51 34 45 37 36 37 C27 37 21 34 21 28 Z"
          fill="url(#helm-steel)"
          stroke="#334155"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        {/* Shiny Highlight Reflection on Helmet */}
        <path
          d="M22 17 C22 11 27 8 36 8 C37 8 37 35 36 35 C27 35 22 32 22 28 Z"
          fill="#FFFFFF"
          opacity="0.25"
        />
        <path
          d="M24 13 C26 10.5 31 9 36 9 L36 11.5 C32 11.5 28 12.5 25.5 14.5 Z"
          fill="#FFFFFF"
          opacity="0.6"
        />

        {/* Golden Cross Trim & Rivets */}
        <path
          d="M21 21 C26 19 46 19 51 21"
          stroke="url(#helm-gold)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line x1="36" y1="8" x2="36" y2="21" stroke="url(#helm-gold)" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="36" cy="20" r="2.2" fill="#FDE68A" stroke="#B45309" strokeWidth="0.8" />
        <circle cx="26" cy="20.5" r="1.3" fill="#FDE68A" />
        <circle cx="46" cy="20.5" r="1.3" fill="#FDE68A" />

        {/* 9. VISOR SLIT & EYES (CELAH VISOR UNGU-CYAN MISTERIUS / EKSPRESI KAGET) */}
        <rect x="25" y="23" width="22" height="7.5" rx="3.5" fill="#09040F" stroke="#3B0764" strokeWidth="1.2" />

        {isDragging ? (
          // Cute startled / dizzy expression: "> <" with sweat drop
          <g id="visor-startled-eyes">
            {/* Left Eye > */}
            <path
              d="M28.5 25 L32 26.8 L28.5 28.5"
              stroke="#38BDF8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Right Eye < */}
            <path
              d="M43.5 25 L40 26.8 L43.5 28.5"
              stroke="#38BDF8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Cute Blue Sweat Drop */}
            <path
              d="M52 13 C52 13 55 17 55 19 C55 20.8 53.6 22 52 22 C50.4 22 49 20.8 49 19 C49 17 52 13 52 13 Z"
              fill="#38BDF8"
              opacity="0.95"
            />
          </g>
        ) : (
          // Mysterious sleek glowing slit
          <g id="visor-glowing-eyes">
            <rect x="27" y="25" width="18" height="3.5" rx="1.7" fill="#A78BFA" opacity="0.4" />
            <line x1="28.5" y1="26.8" x2="33.5" y2="26.8" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
            <line x1="38.5" y1="26.8" x2="43.5" y2="26.8" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
            <circle cx="31" cy="26.8" r="0.8" fill="#FFFFFF" />
            <circle cx="41" cy="26.8" r="0.8" fill="#FFFFFF" />
          </g>
        )}

        {/* Lower Chin / Bevor Guard with breathing slits */}
        <path d="M25 31 L36 35 L47 31" stroke="#CBD5E1" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="32" y1="32.5" x2="32" y2="34.5" stroke="#475569" strokeWidth="1" strokeLinecap="round" />
        <line x1="36" y1="33" x2="36" y2="35.5" stroke="#475569" strokeWidth="1" strokeLinecap="round" />
        <line x1="40" y1="32.5" x2="40" y2="34.5" stroke="#475569" strokeWidth="1" strokeLinecap="round" />
      </g>
    </svg>
  );
}
