"use client";

import React from "react";
import { DiscordAvatar } from "@/components/discord-avatar";
import { getCustomTitleBadge, getCustomTitleStyle } from "@/lib/armory-catalog";

export interface UserBadgeAvatarProps {
  src: string | null;
  username: string | null;
  size?: number;
  className?: string;
  frameId?: string | null;
  customTitleId?: string | null;
  partyTag?: string | null;
  showTitle?: boolean;
  layout?: "avatar-only" | "inline" | "stacked";
}

/**
 * Universal UserBadgeAvatar Component
 * Combines the Discord-style animated avatar frame with custom European job titles
 * and party tags, complete with luxury Rare-to-Mythic visual effects.
 */
export function UserBadgeAvatar({
  src,
  username,
  size = 40,
  className = "",
  frameId,
  customTitleId,
  partyTag,
  showTitle = false,
  layout = "avatar-only",
}: UserBadgeAvatarProps) {
  const avatarElement = (
    <DiscordAvatar
      src={src}
      username={username}
      size={size}
      className={className}
      frameId={frameId}
    />
  );

  if (layout === "avatar-only" || (!showTitle && !partyTag)) {
    return avatarElement;
  }

  const titleBadge = customTitleId ? getCustomTitleBadge(customTitleId) : null;
  const titleStyle = customTitleId ? getCustomTitleStyle(customTitleId) : "";

  return (
    <div
      className={`inline-flex items-center ${
        layout === "stacked" ? "flex-col gap-1 text-center" : "gap-2"
      }`}
    >
      {avatarElement}
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        {partyTag && (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0">
            [{partyTag.trim()}]
          </span>
        )}
        {titleBadge && (
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded shrink-0 transition-all ${titleStyle}`}
          >
            {titleBadge}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Standalone CustomTitleBadge component for rendering job title badges with tiered styling
 */
export function CustomTitleBadge({
  titleId,
  className = "",
}: {
  titleId?: string | null;
  className?: string;
}) {
  if (!titleId) return null;
  const text = getCustomTitleBadge(titleId);
  if (!text) return null;
  const style = getCustomTitleStyle(titleId);

  return (
    <span
      className={`text-[10px] font-mono px-2 py-0.5 rounded inline-flex items-center shrink-0 transition-all ${style} ${className}`.trim()}
    >
      {text}
    </span>
  );
}

export { DiscordAvatar };
