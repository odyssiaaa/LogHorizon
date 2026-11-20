"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";

export interface DraggableScrollRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  dragSpeed?: number;
}

export function useDraggableScroll<T extends HTMLElement = HTMLDivElement>(dragSpeed = 1) {
  const ref = useRef<T | null>(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const [isGrabbing, setIsGrabbing] = useState(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Hanya tangani klik kiri mouse
    if (e.button !== 0 || !ref.current) return;
    isDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - ref.current.offsetLeft;
    startScrollLeftRef.current = ref.current.scrollLeft;
    setIsGrabbing(true);
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDownRef.current || !ref.current) return;
      e.preventDefault();
      const currentX = e.pageX - ref.current.offsetLeft;
      const walk = (currentX - startXRef.current) * dragSpeed;

      // Bedakan jarak geser > 5px agar klik tombol tidak terpicu saat berniat drag
      if (Math.abs(currentX - startXRef.current) > 5) {
        hasDraggedRef.current = true;
      }

      ref.current.scrollLeft = startScrollLeftRef.current - walk;
    },
    [dragSpeed]
  );

  const onMouseUp = useCallback(() => {
    isDownRef.current = false;
    setIsGrabbing(false);
  }, []);

  const onMouseLeave = useCallback(() => {
    isDownRef.current = false;
    setIsGrabbing(false);
  }, []);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasDraggedRef.current = false;
    }
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!ref.current) return;
    if (e.deltaY !== 0) {
      ref.current.scrollLeft += e.deltaY;
    }
  }, []);

  // Pasang listener wheel native non-passive agar saat kursor berada di atas row,
  // guliran roda mouse vertikal dialihkan mulus ke horizontal tanpa scroll halaman berantakan
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleWheelNative = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        const canScrollLeft = el.scrollLeft > 0;
        const canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
        if ((e.deltaY < 0 && canScrollLeft) || (e.deltaY > 0 && canScrollRight)) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      }
    };

    el.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheelNative);
    };
  }, []);

  return {
    ref,
    isGrabbing,
    events: {
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
      onClickCapture,
      onWheel,
    },
  };
}

export function DraggableScrollRow({
  children,
  className = "",
  dragSpeed = 1,
  ...props
}: DraggableScrollRowProps) {
  const { ref, isGrabbing, events } = useDraggableScroll<HTMLDivElement>(dragSpeed);

  return (
    <div
      ref={ref}
      {...events}
      className={`overflow-x-auto no-scrollbar scrollbar-none select-none ${
        isGrabbing ? "cursor-grabbing" : "cursor-grab"
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
