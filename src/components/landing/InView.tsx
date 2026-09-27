"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/** Adds the class "in" to itself once it scrolls into view. Drives .reveal, .scene and .bar animations. */
export function InView({
  as: Tag = "div",
  className = "",
  children,
  threshold = 0.25,
  style,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  threshold?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
}
