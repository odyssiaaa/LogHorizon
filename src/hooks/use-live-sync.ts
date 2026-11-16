"use client";

import { useEffect, useRef, useCallback } from "react";

export interface UseLiveSyncOptions {
  /**
   * Interval in milliseconds.
   * Suggested:
   * - 3000-4000ms for active chat/match rooms
   * - 10000-15000ms for feeds (forum, marketplace, lfg, notifications, admin)
   */
  intervalMs?: number;
  /**
   * Whether polling is currently enabled.
   * Default: true. Set to false to pause polling (e.g. when modal is closed or user is offline).
   */
  enabled?: boolean;
  /**
   * Whether to immediately fetch when browser tab regains focus or visibility.
   * Default: true.
   */
  revalidateOnFocus?: boolean;
}

/**
 * Universal hook for smart visibility-aware real-time polling and focus revalidation.
 * Conserves database queries and Neon compute quota by halting polling when tab is inactive.
 */
export function useLiveSync(
  syncFn: () => void | Promise<unknown>,
  options: UseLiveSyncOptions = {}
) {
  const {
    intervalMs = 12000,
    enabled = true,
    revalidateOnFocus = true,
  } = options;

  const savedCallback = useRef(syncFn);
  const isSyncingRef = useRef(false);

  // Always keep latest callback reference
  useEffect(() => {
    savedCallback.current = syncFn;
  });

  const triggerSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

    try {
      isSyncingRef.current = true;
      await savedCallback.current();
    } catch {
      // Ignored for background polling
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // Interval-based polling (runs only when tab is visible)
  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void triggerSync();
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [enabled, intervalMs, triggerSync]);

  // Focus and visibilitychange revalidation
  useEffect(() => {
    if (!enabled || !revalidateOnFocus) return;

    function handleVisibilityOrFocus() {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void triggerSync();
      }
    }

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [enabled, revalidateOnFocus, triggerSync]);
}
