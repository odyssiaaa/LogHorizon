"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DragScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  showScrollButtons?: boolean;
  buttonPosition?: "top" | "float";
  label?: string;
}

export function DragScrollContainer({
  children,
  className = "",
  innerClassName = "",
  showScrollButtons = true,
  buttonPosition = "top",
  label,
}: DragScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDownRef = useRef(false);
  const hasDraggedRef = useRef(false);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 2;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    const observer = new ResizeObserver(() => checkScroll());
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      observer.disconnect();
    };
  }, [checkScroll]);

  // Global mouse handlers so dragging doesn't stutter or break when cursor leaves container
  useEffect(() => {
    function handleGlobalMouseMove(e: MouseEvent) {
      if (!isDownRef.current) return;
      const el = containerRef.current;
      if (!el) return;
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      if (Math.abs(x - startX) > 4) {
        hasDraggedRef.current = true;
      }
      el.scrollLeft = scrollLeftState - walk;
    }

    function handleGlobalMouseUp() {
      if (isDownRef.current) {
        isDownRef.current = false;
        setIsDragging(false);
        // Reset hasDragged after microtask so click event can be captured/cancelled
        setTimeout(() => {
          hasDraggedRef.current = false;
        }, 50);
      }
    }

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [startX, scrollLeftState]);

  function handleMouseDown(e: React.MouseEvent) {
    const el = containerRef.current;
    if (!el) return;
    // Don't drag if clicking buttons or inputs directly
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) {
      return;
    }
    isDownRef.current = true;
    hasDraggedRef.current = false;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeftState(el.scrollLeft);
  }

  function handleClickCapture(e: React.MouseEvent) {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function scroll(direction: "left" | "right") {
    const el = containerRef.current;
    if (!el) return;
    const amount = Math.max(280, Math.floor(el.clientWidth * 0.7));
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  return (
    <div className={`relative group ${className}`}>
      {/* Top Header Controls (if top position chosen) */}
      {showScrollButtons && buttonPosition === "top" && (canScrollLeft || canScrollRight) && (
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          {label ? (
            <span className="text-[11px] font-mono text-gray-400 truncate">{label}</span>
          ) : (
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Geser untuk melihat bagan</span>
          )}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-gray-100 dark:bg-[#1A1524] border border-gray-200 dark:border-[#211C2B] text-gray-700 dark:text-gray-300 hover:border-[#9D4EDD] hover:text-[#9D4EDD] disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1 shadow-xs"
              title="Geser ke kiri"
              aria-label="Geser ke kiri"
            >
              <ChevronLeft size={14} />
              <span className="text-[11px]">Geser Kiri</span>
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-gray-100 dark:bg-[#1A1524] border border-gray-200 dark:border-[#211C2B] text-gray-700 dark:text-gray-300 hover:border-[#9D4EDD] hover:text-[#9D4EDD] disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1 shadow-xs"
              title="Geser ke kanan"
              aria-label="Geser ke kanan"
            >
              <span className="text-[11px]">Geser Kanan</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Side Buttons (if float position chosen) */}
      {showScrollButtons && buttonPosition === "float" && (
        <>
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scroll("left")}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 px-3 py-2 rounded-full bg-[#120F17]/90 text-white border border-[#9D4EDD]/40 shadow-lg hover:bg-[#1C1726] transition active:scale-95 backdrop-blur-xs flex items-center gap-1 text-xs font-bold"
              title="Geser ke kiri"
              aria-label="Geser ke kiri"
            >
              <ChevronLeft size={16} />
              <span className="text-[11px]">Geser Kiri</span>
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scroll("right")}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 px-3 py-2 rounded-full bg-[#120F17]/90 text-white border border-[#9D4EDD]/40 shadow-lg hover:bg-[#1C1726] transition active:scale-95 backdrop-blur-xs flex items-center gap-1 text-xs font-bold"
              title="Geser ke kanan"
              aria-label="Geser ke kanan"
            >
              <span className="text-[11px]">Geser Kanan</span>
              <ChevronRight size={16} />
            </button>
          )}
        </>
      )}

      {/* Main Drag-to-Scroll Container (Pure Click-and-Drag + Native Touch Pan, No Wheel Hijack) */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onClickCapture={handleClickCapture}
        className={`overflow-x-auto scrollbar-none select-none touch-pan-x overscroll-x-contain ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        } ${innerClassName}`}
        style={{
          WebkitOverflowScrolling: "touch",
        }}
      >
        {children}
      </div>
    </div>
  );
}
