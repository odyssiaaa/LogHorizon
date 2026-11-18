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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDownRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 2;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  }, []);

  // Membatalkan animasi scroll otomatis yang sedang berjalan secara instan
  const cancelScrollAnimation = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ left: el.scrollLeft, behavior: "auto" });
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

  // Global mouse handlers: selalu aktif dengan ref, tidak pernah re-bind di tengah drag
  useEffect(() => {
    function handleGlobalMouseMove(e: MouseEvent) {
      if (!isDownRef.current) return;
      const el = containerRef.current;
      if (!el) return;

      // Jika tombol mouse utama tidak lagi ditekan (misal dilepas di luar iframe/window)
      if (e.buttons === 0) {
        isDownRef.current = false;
        setIsDragging(false);
        hasDraggedRef.current = false;
        return;
      }

      const x = e.pageX - el.offsetLeft;
      const walk = (x - startXRef.current) * 1.5;
      if (Math.abs(x - startXRef.current) > 4) {
        hasDraggedRef.current = true;
      }
      el.scrollLeft = scrollLeftRef.current - walk;
    }

    function handleGlobalMouseUp() {
      if (isDownRef.current) {
        isDownRef.current = false;
        setIsDragging(false);
        // Reset hasDragged setelah microtask agar event click dapat dicegah jika memang dragging
        setTimeout(() => {
          hasDraggedRef.current = false;
        }, 50);
      }
    }

    function handleBlur() {
      if (isDownRef.current) {
        isDownRef.current = false;
        setIsDragging(false);
        hasDraggedRef.current = false;
      }
    }

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  function handleMouseDown(e: React.MouseEvent) {
    const el = containerRef.current;
    if (!el) return;

    // Batalkan animasi auto-scroll seketika saat user menekan mouse
    cancelScrollAnimation();

    // Jangan memulai drag jika user mengklik tombol, link, atau input formulir
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) {
      return;
    }

    // Hanya tangani klik kiri (button 0)
    if (e.button !== 0) return;

    isDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
    setIsDragging(true);
  }

  function handleWheel(e: React.WheelEvent) {
    // Batalkan animasi auto-scroll seketika saat user scroll dengan wheel / trackpad
    cancelScrollAnimation();
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 2) {
      const el = containerRef.current;
      if (el) el.scrollLeft += e.deltaX;
    }
  }

  function handleTouchStart() {
    // Batalkan animasi auto-scroll seketika saat user menyentuh layar
    cancelScrollAnimation();
  }

  function handleMouseLeave() {
    // Jika kursor keluar dari kontainer dan mouse button tidak sedang ditekan
    if (!isDownRef.current && isDragging) {
      setIsDragging(false);
    }
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
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onMouseLeave={handleMouseLeave}
        onClickCapture={handleClickCapture}
        className={`overflow-x-auto scrollbar-none select-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        } ${innerClassName}`}
        style={{
          touchAction: "pan-x pan-y",
          overscrollBehaviorY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {children}
      </div>
    </div>
  );
}
