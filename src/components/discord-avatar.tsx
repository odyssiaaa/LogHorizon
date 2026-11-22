"use client";

import Image from "next/image";
import { useState } from "react";
import { getAvatarFrameClasses } from "@/lib/armory-catalog";

export function DiscordAvatar({
  src,
  username,
  size = 40,
  className = "",
  frameId,
}: {
  src: string | null;
  username: string | null;
  size?: number;
  className?: string;
  frameId?: string | null;
}) {
  const [hasError, setHasError] = useState(false);
  const label = username ?? "Gamer";
  const frameClasses = getAvatarFrameClasses(frameId);

  const combinedClass = frameClasses ? `${className} ${frameClasses}`.trim() : className;

  if (!src || hasError) {
    return (
      <span
        className={`${combinedClass} avatar-fallback flex items-center justify-center font-bold text-xs uppercase bg-[#1E1A3A] text-purple-300`}
        role="img"
        aria-label={`${label} avatar`}
        style={frameClasses ? { boxSizing: "border-box" } : undefined}
      >
        {label.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      className={combinedClass}
      src={src}
      alt={`${label} avatar`}
      width={size}
      height={size}
      unoptimized
      onError={() => setHasError(true)}
    />
  );
}
