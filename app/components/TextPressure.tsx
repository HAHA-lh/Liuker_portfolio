"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TextPressureProps = {
  text?: string;
  flex?: boolean;
  alpha?: boolean;
  stroke?: boolean;
  width?: boolean;
  weight?: boolean;
  italic?: boolean;
  textColor?: string;
  strokeColor?: string;
  minFontSize?: number;
  maxFontSize?: number;
  multiline?: boolean;
  className?: string;
};

export default function TextPressure({
  text = "Hello!",
  flex = true,
  alpha = false,
  stroke = false,
  width = true,
  weight = true,
  italic = true,
  textColor = "currentColor",
  strokeColor = "#ff3c7a",
  minFontSize = 36,
  maxFontSize = 184,
  multiline = false,
  className = "",
}: TextPressureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spansRef = useRef<Array<HTMLSpanElement | null>>([]);
  const target = useRef({ x: 0, y: 0 });
  const cursor = useRef({ x: 0, y: 0 });
  const [fontSize, setFontSize] = useState(minFontSize);
  const chars = Array.from(text);

  const setSize = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;
    const width = element.getBoundingClientRect().width;
    const unit = multiline ? 28 : Math.max(3.8, chars.length * 0.6);
    setFontSize(Math.max(minFontSize, Math.min(maxFontSize, width / unit)));
  }, [chars.length, maxFontSize, minFontSize, multiline]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    setSize();
    const observer = new ResizeObserver(setSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [setSize]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    target.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    cursor.current = { ...target.current };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const onMove = (event: PointerEvent) => {
      target.current.x = event.clientX;
      target.current.y = event.clientY;
    };
    let raf = 0;
    const animate = () => {
      cursor.current.x += (target.current.x - cursor.current.x) / 12;
      cursor.current.y += (target.current.y - cursor.current.y) / 12;
      const titleWidth = element.getBoundingClientRect().width;
      const maxDistance = Math.max(1, titleWidth * 0.48);
      spansRef.current.forEach((span) => {
        if (!span) return;
        const charRect = span.getBoundingClientRect();
        const distance = Math.hypot(
          cursor.current.x - (charRect.left + charRect.width / 2),
          cursor.current.y - (charRect.top + charRect.height / 2),
        );
        const pressure = Math.max(0, 1 - distance / maxDistance);
        span.style.fontWeight = weight ? String(Math.round(300 + pressure * 600)) : "700";
        span.style.opacity = alpha ? String(0.35 + pressure * 0.65) : "1";
        const scaleX = width ? 0.82 + pressure * 0.34 : 1;
        const skew = italic ? (pressure - 0.5) * -10 : 0;
        const lift = -pressure * 5;
        span.style.transform = `translateY(${lift}px) scaleX(${scaleX}) skewX(${skew}deg)`;
      });
      raf = requestAnimationFrame(animate);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [alpha, italic, text, weight, width]);

  const content = chars.map((char, index) => (
    <span
      key={`${char}-${index}`}
      ref={(element) => { spansRef.current[index] = element; }}
      data-char={char}
    >
      {char === " " ? "\u00A0" : char}
    </span>
  ));
  const classNames = `text-pressure-title${flex ? " is-flex" : ""}${stroke ? " is-stroke" : ""}${multiline ? " is-multiline" : ""}`;
  const style = { fontSize, color: textColor, WebkitTextStrokeColor: strokeColor };

  return (
    <div ref={containerRef} className={`text-pressure ${className}`}>
      {multiline ? (
        <p className={classNames} style={style}>{content}</p>
      ) : (
        <h2 className={classNames} style={style}>{content}</h2>
      )}
    </div>
  );
}
