"use client";

import { useEffect, useRef, useState } from "react";

// Presentation-only motion helpers for the marketing pages. No data, no
// business logic — decorative wrappers per the Cal-Apple restraint rules
// (subtle only; prefers-reduced-motion is honoured globally in globals.css,
// which collapses the entrance animation to an instant single run).

/**
 * Reveals children with the shared fade-rise animation the first time they
 * scroll into view. `delay` (ms) staggers siblings. Renders a plain block
 * wrapper so grid/flex parents keep their track sizing.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No IntersectionObserver (very old browsers): just show the content.
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${shown ? "animate-fade-rise" : "opacity-0"} ${className}`}
      style={shown && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * A card surface with a faint blue radial glow (≈5% primary) that follows
 * the cursor. Pointer-only decoration: on touch devices nothing renders
 * because :hover never sticks. Styling lives in .glow-card (globals.css).
 */
export function GlowCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--gx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--gy", `${e.clientY - r.top}px`);
  }

  return (
    <div onMouseMove={onMove} className={`glow-card ${className}`}>
      {children}
    </div>
  );
}
