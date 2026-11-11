"use client";

import Image from "next/image";
import { useState } from "react";

export function DiscordAvatar({ src, username, size = 40, className = "" }: { src: string | null; username: string | null; size?: 40 | 48; className?: string }) {
  const [hasError, setHasError] = useState(false);
  const label = username ?? "Gamer";

  if (!src || hasError) {
    return (
      <span className={`${className} avatar-fallback flex items-center justify-center font-bold text-xs uppercase bg-[#1E1A3A] text-purple-300`} role="img" aria-label={`${label} avatar`}>
        {label.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      className={className}
      src={src}
      alt={`${label} avatar`}
      width={size}
      height={size}
      unoptimized
      onError={() => setHasError(true)}
    />
  );
}
