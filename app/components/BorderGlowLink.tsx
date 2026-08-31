"use client";

// Adapted from React Bits BorderGlow by David Haz; see reactbits-LICENSE.txt.
// https://reactbits.dev/components/border-glow
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { useCallback, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { useTheme } from "../theme";
import { borderGlowPointer } from "../lib/motion-geometry";
import "./border-glow.css";

export function BorderGlowLink({ href, className = "", children }: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const light = theme === "light";
  const handlePointerMove = useCallback((event: PointerEvent<HTMLAnchorElement>) => {
    if (reducedMotion || event.pointerType === "touch") return;
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const { proximity, angle } = borderGlowPointer(rect.width, rect.height, event.clientX - rect.left, event.clientY - rect.top);
    card.style.setProperty("--edge-proximity", proximity.toFixed(3));
    card.style.setProperty("--cursor-angle", `${angle.toFixed(3)}deg`);
  }, [reducedMotion]);

  // Match the reference preview defaults, including its light-theme treatment.
  const glow = light ? "278deg 90% 58%" : "40deg 80% 80%";
  const intensity = light ? 1.25 : 1;
  const style = {
    "--card-bg": light ? "#ffffff" : "#120F17",
    "--fill-opacity": light ? 0.22 : 0.5,
    ...Object.fromEntries([100, 60, 50, 40, 30, 20, 10].map(opacity => [
      `--glow-color${opacity === 100 ? "" : `-${opacity}`}`,
      `hsl(${glow} / ${Math.min(opacity * intensity, 100)}%)`,
    ])),
  } as CSSProperties;

  return <Link
    href={href}
    className={`${className} border-glow-card${light ? " border-glow-card--light" : ""}`}
    style={style}
    onPointerMove={handlePointerMove}
    onPointerLeave={event => event.currentTarget.style.setProperty("--edge-proximity", "0")}
  >
    <span className="edge-light" aria-hidden="true" />
    <span className="border-glow-inner">{children}</span>
  </Link>;
}
