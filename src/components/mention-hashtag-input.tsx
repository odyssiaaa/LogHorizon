"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { DiscordAvatar } from "@/components/discord-avatar";
import { Hash, Sparkles } from "lucide-react";

export type MentionUser = {
  id?: string;
  username: string | null;
  name?: string | null;
  avatar?: string | null;
  role?: string | null;
  isPremium?: boolean;
  isBot?: boolean;
  description?: string;
};

const POPULAR_HASHTAGS = [
  "MobileLegends",
  "Valorant",
  "CariMabar",
  "TurnamenLH",
  "TipsBuild",
  "Marketplace",
  "GachaHoki",
  "InfoGuild",
];

const SATPAM_BOT_USER: MentionUser = {
  id: "satpam-horizon",
  username: "satpam",
  name: "Satpam Horizon",
  role: "BOT",
  isBot: true,
  description: "AI Assistant & Perangkum",
};

export interface MentionHashtagInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  relevantUsers?: MentionUser[];
}

export function MentionHashtagInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  rows = 3,
  maxLength = 10000,
  disabled = false,
  autoFocus = false,
  className = "",
  relevantUsers = [],
}: MentionHashtagInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [popupType, setPopupType] = useState<"@" | "#" | null>(null);
  const [query, setQuery] = useState("");
  const [matchRange, setMatchRange] = useState<{ start: number; end: number } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchedUsers, setSearchedUsers] = useState<MentionUser[]>([]);

  // Auto-focus support
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Fetch users when @ query changes
  useEffect(() => {
    if (popupType !== "@") return;
    let active = true;

    const timer = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
        .then((res) => (res.ok ? res.json() : { users: [] }))
        .then((data) => {
          if (active && Array.isArray(data.users)) {
            setSearchedUsers(data.users);
          }
        })
        .catch(() => {
          if (active) setSearchedUsers([]);
        });
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [popupType, query]);

  // Combine and deduplicate mention options
  const mentionList: MentionUser[] = useMemo(() => {
    if (popupType !== "@") return [];
    const list: MentionUser[] = [];

    // 1. Pilihan Teratas: Satpam Horizon
    const qLower = query.toLowerCase();
    if (!qLower || "satpam".includes(qLower) || "satpam horizon".includes(qLower)) {
      list.push(SATPAM_BOT_USER);
    }

    const seenUsernames = new Set<string>(["satpam"]);

    // 2. Relevant users (thread author, commenters)
    for (const u of relevantUsers) {
      const uName = (u.username ?? "").toLowerCase();
      if (!uName || seenUsernames.has(uName)) continue;
      if (!qLower || uName.includes(qLower) || (u.name && u.name.toLowerCase().includes(qLower))) {
        seenUsernames.add(uName);
        list.push(u);
      }
    }

    // 3. Searched users from DB
    for (const u of searchedUsers) {
      const uName = (u.username ?? "").toLowerCase();
      if (!uName || seenUsernames.has(uName)) continue;
      seenUsernames.add(uName);
      list.push(u);
    }

    return list.slice(0, 7);
  }, [popupType, query, relevantUsers, searchedUsers]);

  // Combine hashtag options
  const hashtagList = useMemo(() => {
    if (popupType !== "#") return [];
    const qLower = query.toLowerCase();
    const result: string[] = [];

    // If query exists and not in popular list, offer it as a new tag
    if (query && !POPULAR_HASHTAGS.some((t) => t.toLowerCase() === qLower)) {
      result.push(query);
    }

    for (const tag of POPULAR_HASHTAGS) {
      if (!qLower || tag.toLowerCase().includes(qLower)) {
        if (!result.includes(tag)) result.push(tag);
      }
    }

    return result.slice(0, 7);
  }, [popupType, query]);

  // Reset selected index when list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [popupType, query]);

  // Detect @ or # trigger from cursor position
  const checkTrigger = () => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBefore = value.slice(0, cursor);

    // Matches @query or #query at word boundary
    const match = textBefore.match(/(?:^|\s)([@#])([a-zA-Z0-9_.-]*)$/);

    if (match) {
      const trigger = match[1] as "@" | "#";
      const q = match[2];
      const matchIndex = textBefore.lastIndexOf(trigger + q);
      setPopupType(trigger);
      setQuery(q);
      setMatchRange({ start: matchIndex, end: cursor });
    } else {
      setPopupType(null);
      setMatchRange(null);
    }
  };

  const applyMention = (userToInsert: MentionUser) => {
    if (!matchRange || !textareaRef.current) return;
    const username = userToInsert.username ?? "user";
    const insertText = `@${username} `;
    const before = value.slice(0, matchRange.start);
    const after = value.slice(matchRange.end);
    const newValue = before + insertText + after;

    onChange(newValue);
    setPopupType(null);
    setMatchRange(null);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const nextPos = before.length + insertText.length;
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 10);
  };

  const applyHashtag = (tagToInsert: string) => {
    if (!matchRange || !textareaRef.current) return;
    const cleanTag = tagToInsert.replace(/^#/, "");
    const insertText = `#${cleanTag} `;
    const before = value.slice(0, matchRange.start);
    const after = value.slice(matchRange.end);
    const newValue = before + insertText + after;

    onChange(newValue);
    setPopupType(null);
    setMatchRange(null);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const nextPos = before.length + insertText.length;
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shortcut Ctrl+Enter / Cmd+Enter: Send
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (onSubmit) onSubmit();
      return;
    }

    if (!popupType) return;

    const listLength = popupType === "@" ? mentionList.length : hashtagList.length;
    if (listLength === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % listLength);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + listLength) % listLength);
      return;
    }

    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (popupType === "@" && mentionList[selectedIndex]) {
        applyMention(mentionList[selectedIndex]);
      } else if (popupType === "#" && hashtagList[selectedIndex]) {
        applyHashtag(hashtagList[selectedIndex]);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setPopupType(null);
      setMatchRange(null);
      return;
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Autocomplete Popup */}
      {popupType && (
        <div className="absolute bottom-full mb-1.5 left-0 w-full sm:w-88 max-h-64 overflow-y-auto bg-white dark:bg-[#11091D] border border-[#7C3AED]/70 shadow-2xl rounded-lg z-50 text-left">
          {/* Header */}
          <div className="px-3 py-1.5 bg-slate-100 dark:bg-[#1A0E2E] border-b border-slate-200 dark:border-[#2E1E45] flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-[#A78BFA]">
            <span className="flex items-center gap-1.5">
              {popupType === "@" ? <Sparkles size={11} className="text-[#7C3AED]" /> : <Hash size={11} className="text-[#7C3AED]" />}
              {popupType === "@" ? "Mention Anggota / Bot" : "Pilih Topik Hashtag"}
            </span>
            <span className="text-[9px] text-slate-400 dark:text-[#A78BFA]/60">[Tab / Enter]</span>
          </div>

          {/* List items */}
          <div className="py-1">
            {popupType === "@" && (
              <>
                {mentionList.length === 0 ? (
                  <div className="px-3 py-2 text-xs font-mono text-slate-400 dark:text-slate-500">
                    Tidak ada member yang cocok
                  </div>
                ) : (
                  mentionList.map((u, idx) => {
                    const isSelected = idx === selectedIndex;
                    const isBot = Boolean(u.isBot);
                    const isEmperor = (u.username ?? "").toLowerCase() === ".odyssia" || (u.username ?? "").toLowerCase() === "odyssia";

                    return (
                      <button
                        key={u.id ?? u.username ?? idx}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyMention(u);
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#7C3AED]/20 dark:bg-[#7C3AED]/30 border-l-2 border-[#7C3AED]"
                            : "hover:bg-slate-100 dark:hover:bg-[#1A0E2E]/60 border-l-2 border-transparent"
                        }`}
                      >
                        {isBot ? (
                          <div className="w-7 h-7 rounded-full bg-[#7C3AED] flex items-center justify-center text-sm shrink-0 shadow-sm">
                            🛡️
                          </div>
                        ) : (
                          <DiscordAvatar
                            className="shrink-0"
                            src={u.avatar ?? null}
                            username={u.username}
                            size={28}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 leading-tight">
                            <span
                              className={`text-xs font-bold truncate ${
                                isBot
                                  ? "text-[#7C3AED] dark:text-[#C4B5FD]"
                                  : isEmperor
                                  ? "text-amber-500 font-extrabold"
                                  : "text-slate-900 dark:text-[#F8FAFC]"
                              }`}
                            >
                              {isBot ? "Satpam Horizon" : `@${u.username}`}
                            </span>
                            {isBot ? (
                              <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-[#7C3AED] text-white">
                                BOT AI
                              </span>
                            ) : isEmperor ? (
                              <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30">
                                👑 Emperor
                              </span>
                            ) : u.role === "ADMIN" ? (
                              <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/30">
                                ✨ Prince
                              </span>
                            ) : u.role === "MODERATOR" ? (
                              <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                ⚔️ Mod
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-[#A78BFA]/70 truncate font-mono mt-0.5">
                            {isBot ? u.description : u.name || `@${u.username}`}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </>
            )}

            {popupType === "#" && (
              <>
                {hashtagList.length === 0 ? (
                  <div className="px-3 py-2 text-xs font-mono text-slate-400 dark:text-slate-500">
                    Ketik nama hashtag...
                  </div>
                ) : (
                  hashtagList.map((tag, idx) => {
                    const isSelected = idx === selectedIndex;
                    const isCustom = query && tag.toLowerCase() === query.toLowerCase() && !POPULAR_HASHTAGS.includes(tag);

                    return (
                      <button
                        key={tag}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyHashtag(tag);
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#7C3AED]/20 dark:bg-[#7C3AED]/30 border-l-2 border-[#7C3AED]"
                            : "hover:bg-slate-100 dark:hover:bg-[#1A0E2E]/60 border-l-2 border-transparent"
                        }`}
                      >
                        <span className="text-xs font-mono font-semibold text-[#7C3AED] dark:text-[#C4B5FD] flex items-center gap-1.5">
                          <Hash size={13} className="text-[#7C3AED]" />
                          <span>{tag}</span>
                        </span>
                        {isCustom ? (
                          <span className="text-[9px] font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            + Tag Baru
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-slate-400 dark:text-[#A78BFA]/60">
                            Populer
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Textarea */}
      <textarea
        ref={textareaRef}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setTimeout(checkTrigger, 0);
        }}
        onSelect={checkTrigger}
        onClick={checkTrigger}
        onKeyUp={checkTrigger}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
    </div>
  );
}
