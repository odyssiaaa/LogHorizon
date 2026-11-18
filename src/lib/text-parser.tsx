"use client";

import React from "react";
import Link from "next/link";

export type TextParserOptions = {
  routeButtonVariant?: "button" | "link";
  onImageClick?: (src: string) => void;
  enableBlocks?: boolean;
  className?: string;
};

/**
 * Friendly route labels for internal navigation in LogHorizon
 */
export function getRouteLabel(route: string): string {
  const clean = route.replace(/[?#].*$/, "").trim();
  if (clean === "/events" || clean.startsWith("/events")) {
    if (route.includes("view=turnamen") || route.includes("/turnamen")) return "Turnamen Resmi 🏆";
    if (route.includes("view=mabar")) return "Cari Teman Mabar (LFG) 🎮";
    return "Event & Turnamen Guild 🏆";
  }
  if (clean === "/forum" || clean.startsWith("/forum")) return "Diskusi Forum Guild 💬";
  if (clean === "/marketplace" || clean.startsWith("/marketplace")) return "Marketplace & Rekber 🛒";
  if (clean === "/donate") return "Kunjungi Kas Donasi 🎁";
  if (clean === "/leaderboard") return "Papan Peringkat Guild 👑";
  if (clean === "/hall-of-winners") return "Buka Hall of Winners 🏅";
  if (clean === "/news" || clean.startsWith("/news")) return "Warta & Berita Resmi 📰";
  if (clean === "/profile") return "Buka Profil Karakter 👤";
  if (clean === "/rules") return "Aturan Resmi Guild 📜";
  if (clean === "/settings") return "Pengaturan Akun ⚙️";
  if (clean === "/messages") return "Pesan Pribadi (PM) 💬";
  if (clean.startsWith("/u/")) {
    const user = clean.replace("/u/", "");
    return `@${user} 👤`;
  }
  return `Buka ${clean} ↗`;
}

/**
 * Removes legacy repeating AI headers if present in historical comments
 */
export function cleanSatpamPrefix(rawText: string): string {
  return rawText.replace(
    /^(?:🛡️\s*)?(?:\*{1,2})?\[?(?:SATPAM\s*HORIZON|AI\s*GUARDIAN)[^\]]*\]?(?:\*{1,2})?\s*[:\n]*/i,
    ""
  );
}

/**
 * Parses inline formatting tokens:
 * - Markdown links [Label](/route or https://)
 * - Backticked routes `(/events)`
 * - Standalone internal routes
 * - Bold **text**
 * - Inline code `code`
 * - Italic *text*
 * - @satpam badge
 * - @username user mention link
 * - #hashtag forum tag link
 * - Raw URLs
 */
export function parseInlineMarkdown(
  rawText: string,
  options: { routeButtonVariant?: "button" | "link" } = {}
): React.ReactNode[] {
  const { routeButtonVariant = "button" } = options;
  const text = cleanSatpamPrefix(rawText);

  // Regex ordered by specificity
  const tokenRegex =
    /(!\[([^\]]*)\]\(([^)]+)\))|(\[([^\]]+)\]\(([^)]+)\))|(`(\/[a-zA-Z0-9_\-\/?=&%#.]+)`)|((?:^|(?<=\s))(\/(?:events|forum|marketplace|donate|leaderboard|hall-of-winners|news|profile|rules|settings|messages|u)(?:[a-zA-Z0-9_\-\/?=&%#]*)))|(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\*([^*]+)\*)|(@(?:satpam|[a-zA-Z0-9_.-]+))|(#[a-zA-Z0-9_]+)|(https?:\/\/[^\s<]+)/gi;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }

    const key = `inline-${match.index}`;

    if (match[1]) {
      // Image handled inline if encountered
      const alt = match[2] || "Gambar";
      const src = match[3];
      elements.push(
        <img
          key={key}
          src={src}
          alt={alt}
          className="inline-block max-h-48 rounded my-1 border border-slate-200 dark:border-[#2E1E45] shadow-xs cursor-pointer"
        />
      );
    } else if (match[4]) {
      // 1. Markdown link [Label](url)
      const rawLabel = match[5];
      const url = match[6];
      const isInternal = url.startsWith("/");
      const label = rawLabel.includes("↗") || rawLabel.includes("➔") ? rawLabel : `${rawLabel} ↗`;

      if (isInternal && routeButtonVariant === "button") {
        elements.push(
          <Link
            key={key}
            href={url}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 my-0.5 rounded bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <span>{label}</span>
          </Link>
        );
      } else if (isInternal) {
        elements.push(
          <Link
            key={key}
            href={url}
            className="text-[#7C3AED] dark:text-[#A78BFA] hover:text-[#6D28D9] dark:hover:text-[#C4B5FD] underline font-semibold transition inline-flex items-center gap-0.5"
          >
            <span>{rawLabel}</span>
          </Link>
        );
      } else {
        elements.push(
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#7C3AED] dark:text-[#A78BFA] hover:text-[#6D28D9] dark:hover:text-[#C4B5FD] underline font-semibold transition"
          >
            {rawLabel}
          </a>
        );
      }
    } else if (match[7]) {
      // 2. Backticked route `(/route)`
      const url = match[8];
      const label = getRouteLabel(url);
      elements.push(
        <Link
          key={key}
          href={url}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 my-0.5 rounded bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
        >
          <span>{label}</span>
        </Link>
      );
    } else if (match[9]) {
      // 3. Standalone route /route
      const url = match[10];
      const label = getRouteLabel(url);
      elements.push(
        <Link
          key={key}
          href={url}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 my-0.5 rounded bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
        >
          <span>{label}</span>
        </Link>
      );
    } else if (match[11]) {
      // 4. Bold **text**
      elements.push(
        <strong key={key} className="font-bold text-slate-900 dark:text-white">
          {match[12]}
        </strong>
      );
    } else if (match[13]) {
      // 5. Backtick code `code` (not route)
      elements.push(
        <code
          key={key}
          className="px-1.5 py-0.5 rounded bg-[#7C3AED]/15 dark:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#C4B5FD] font-mono text-[11px] border border-[#7C3AED]/30 font-semibold"
        >
          {match[14]}
        </code>
      );
    } else if (match[15]) {
      // 6. Italic *text*
      elements.push(
        <em key={key} className="italic text-[#7C3AED] dark:text-[#C4B5FD]">
          {match[16]}
        </em>
      );
    } else if (match[17]) {
      // 7. @satpam or @username mention
      const mention = match[17];
      if (mention.toLowerCase() === "@satpam") {
        elements.push(
          <span
            key={key}
            className="inline-flex items-center gap-0.5 text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-[#7C3AED]/25 text-[#7C3AED] dark:text-[#C4B5FD] border border-[#7C3AED]/50 select-none"
          >
            🛡️ @satpam
          </span>
        );
      } else {
        const username = mention.slice(1);
        elements.push(
          <Link
            key={key}
            href={`/u/${username}`}
            className="text-[#7C3AED] dark:text-[#A78BFA] font-semibold hover:underline"
          >
            @{username}
          </Link>
        );
      }
    } else if (match[18]) {
      // 8. #hashtag
      const tag = match[18].slice(1);
      elements.push(
        <Link
          key={key}
          href={`/forum?tag=${encodeURIComponent(tag)}`}
          className="inline-flex items-center text-xs font-mono font-medium text-[#7C3AED] dark:text-[#A78BFA] hover:text-[#6D28D9] dark:hover:text-white bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 px-1.5 py-0.5 rounded transition-colors"
        >
          #{tag}
        </Link>
      );
    } else if (match[19]) {
      // 9. Raw URL
      const url = match[19];
      elements.push(
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#7C3AED] dark:text-[#A78BFA] hover:underline break-all"
        >
          {url}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements;
}

/**
 * Universal Unified Text Renderer:
 * Handles inline formatting and optionally block elements (headings, lists, block images).
 */
export function UniversalTextRenderer({
  content,
  onImageClick,
  enableBlocks = true,
  routeButtonVariant = "button",
  className = "",
}: {
  content: string;
  onImageClick?: (src: string) => void;
  enableBlocks?: boolean;
  routeButtonVariant?: "button" | "link";
  className?: string;
}) {
  if (!content) return null;

  if (!enableBlocks) {
    return <span className={className}>{parseInlineMarkdown(content, { routeButtonVariant })}</span>;
  }

  // Handle standalone image blocks ![alt](url)
  const imageRegex = /!\[(.*?)\]\(((?:data:image\/[^)]+|https?:\/\/[^)]+|\/[^)]+))\)/g;
  const imageSplits: Array<{ type: "text" | "image"; text?: string; src?: string; alt?: string }> = [];
  let lastImageIndex = 0;
  let imgMatch: RegExpExecArray | null;

  while ((imgMatch = imageRegex.exec(content)) !== null) {
    if (imgMatch.index > lastImageIndex) {
      imageSplits.push({ type: "text", text: content.slice(lastImageIndex, imgMatch.index) });
    }
    imageSplits.push({ type: "image", alt: imgMatch[1], src: imgMatch[2] });
    lastImageIndex = imgMatch.index + imgMatch[0].length;
  }
  if (lastImageIndex < content.length) {
    imageSplits.push({ type: "text", text: content.slice(lastImageIndex) });
  }

  return (
    <div className={`space-y-2 text-left leading-relaxed ${className}`}>
      {imageSplits.map((part, pIdx) => {
        if (part.type === "image" && part.src) {
          return (
            <div key={`img-blk-${pIdx}`} className="my-2.5">
              <img
                src={part.src}
                alt={part.alt || "Lampiran Forum"}
                className={`max-w-full sm:max-w-md max-h-96 rounded-none border border-slate-200 dark:border-[#2E1E45] object-cover shadow-sm ${
                  onImageClick ? "cursor-zoom-in hover:opacity-95 transition" : ""
                }`}
                onClick={() => onImageClick && part.src && onImageClick(part.src)}
              />
              {part.alt && part.alt !== "Gambar" && (
                <span className="text-[10px] text-slate-400 block mt-1 font-mono">{part.alt}</span>
              )}
            </div>
          );
        }

        if (!part.text) return null;

        const lines = part.text.split("\n");
        const renderedBlocks: React.ReactNode[] = [];

        for (let i = 0; i < lines.length; i++) {
          const rawLine = lines[i];
          const trimmed = rawLine.trim();

          if (!trimmed) {
            renderedBlocks.push(<div key={`sp-${pIdx}-${i}`} className="h-1.5" />);
            continue;
          }

          // ### Heading 3
          if (trimmed.startsWith("### ")) {
            const headingText = trimmed.replace(/^###\s+/, "");
            renderedBlocks.push(
              <h4
                key={`h3-${pIdx}-${i}`}
                className="text-xs sm:text-sm font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-wider mt-2.5 mb-1"
              >
                {parseInlineMarkdown(headingText, { routeButtonVariant })}
              </h4>
            );
            continue;
          }

          // ## or # Heading
          if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
            const headingText = trimmed.replace(/^#{1,2}\s+/, "");
            renderedBlocks.push(
              <h3
                key={`h2-${pIdx}-${i}`}
                className="text-sm sm:text-base font-extrabold text-[#7C3AED] dark:text-[#C4B5FD] uppercase tracking-wider mt-3 mb-1"
              >
                {parseInlineMarkdown(headingText, { routeButtonVariant })}
              </h3>
            );
            continue;
          }

          // Bullet List: * item, - item, • item
          if (/^(\*|-|•)\s+/.test(trimmed)) {
            const itemText = trimmed.replace(/^(\*|-|•)\s+/, "");
            renderedBlocks.push(
              <div key={`bullet-${pIdx}-${i}`} className="flex items-start gap-2 my-1 pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] dark:bg-[#A78BFA] mt-1.5 shrink-0" />
                <div className="text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                  {parseInlineMarkdown(itemText, { routeButtonVariant })}
                </div>
              </div>
            );
            continue;
          }

          // Numbered List: 1. item, 2. item
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (numMatch) {
            const num = numMatch[1];
            const itemText = numMatch[2];
            renderedBlocks.push(
              <div key={`num-${pIdx}-${i}`} className="flex items-start gap-2 my-1 pl-1">
                <span className="text-[11px] font-mono font-bold text-[#7C3AED] dark:text-[#A78BFA] shrink-0 mt-0.5">
                  {num}.
                </span>
                <div className="text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                  {parseInlineMarkdown(itemText, { routeButtonVariant })}
                </div>
              </div>
            );
            continue;
          }

          // Standard paragraph
          renderedBlocks.push(
            <p
              key={`p-${pIdx}-${i}`}
              className="text-xs font-medium leading-relaxed text-slate-800 dark:text-slate-200"
            >
              {parseInlineMarkdown(rawLine, { routeButtonVariant })}
            </p>
          );
        }

        return <React.Fragment key={`part-${pIdx}`}>{renderedBlocks}</React.Fragment>;
      })}
    </div>
  );
}

// Backwards-compatible alias
export { UniversalTextRenderer as FormattedText };
