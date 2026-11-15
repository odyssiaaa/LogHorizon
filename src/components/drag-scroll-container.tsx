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

  function handleMouseDown(e: React.MouseEvent) {
    const el = containerRef.current;
    if (!el) return;
    isDownRef.current = true;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeftState(el.scrollLeft);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDownRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    el.scrollLeft = scrollLeftState - walk;
  }

  function handleMouseUp() {
    isDownRef.current = false;
    setIsDragging(false);
  }

  function handleWheel(e: React.WheelEvent) {
    const el = containerRef.current;
    if (!el) return;
    // If scrolling vertically and container has horizontal overflow, translate to horizontal scroll
    if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.shiftKey) {
      el.scrollLeft += e.deltaY;
    }
  }

  function scroll(direction: "left" | "right") {
    const el = containerRef.current;
    if (!el) return;
    const amount = Math.max(260, Math.floor(el.clientWidth * 0.75));
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
              className="p-1 rounded bg-gray-100 dark:bg-[#1A1524] border border-gray-200 dark:border-[#211C2B] text-gray-700 dark:text-gray-300 hover:border-[#9D4EDD] disabled:opacity-30 disabled:pointer-events-none transition"
              title="Geser ke kiri"
              aria-label="Geser ke kiri"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="p-1 rounded bg-gray-100 dark:bg-[#1A1524] border border-gray-200 dark:border-[#211C2B] text-gray-700 dark:text-gray-300 hover:border-[#9D4EDD] disabled:opacity-30 disabled:pointer-events-none transition"
              title="Geser ke kanan"
              aria-label="Geser ke kanan"
            >
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
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-[#120F17]/90 text-white border border-[#9D4EDD]/40 shadow-lg hover:bg-[#1C1726] transition active:scale-95 backdrop-blur-xs"
              title="Geser ke kiri"
              aria-label="Geser ke kiri"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scroll("right")}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-[#120F17]/90 text-white border border-[#9D4EDD]/40 shadow-lg hover:bg-[#1C1726] transition active:scale-95 backdrop-blur-xs"
              title="Geser ke kanan"
              aria-label="Geser ke kanan"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </>
      )}

      {/* Main Drag-to-Scroll Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`overflow-x-auto scrollbar-none select-none ${
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
