"use client";

import { memo, useEffect, useRef } from "react";
import "./dot-field.css";

type Dot = { ax: number; ay: number; sx: number; sy: number };

type DotFieldProps = {
  dotRadius?: number;
  dotSpacing?: number;
  cursorRadius?: number;
  bulgeStrength?: number;
  glowRadius?: number;
  sparkle?: boolean;
  waveAmplitude?: number;
  gradientFrom?: string;
  gradientTo?: string;
  glowColor?: string;
  className?: string;
  pauseWhenSelectorVisible?: string;
};

const TWO_PI = Math.PI * 2;

const DotField = memo(function DotField({
  dotRadius = 1.5,
  dotSpacing = 14,
  cursorRadius = 500,
  bulgeStrength = 67,
  glowRadius = 160,
  sparkle = false,
  waveAmplitude = 0,
  gradientFrom = "rgba(168, 85, 247, 0.35)",
  gradientTo = "rgba(180, 151, 207, 0.25)",
  glowColor = "rgba(182, 0, 168, 0.28)",
  className = "",
  pauseWhenSelectorVisible,
}: DotFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let raf = 0;
    let resizeTimer = 0;
    let engagement = 0;
    let visible = true;
    let stopped = false;
    let lastPaint = 0;
    let parentLeft = 0;
    let parentTop = 0;
    let blockedBySelector = false;
    const mouse = { x: -9999, y: -9999, px: -9999, py: -9999, speed: 0 };

    const build = () => {
      const rect = parent.getBoundingClientRect();
      parentLeft = rect.left;
      parentTop = rect.top;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const step = dotRadius + dotSpacing;
      const cols = Math.floor(width / step);
      const rows = Math.floor(height / step);
      const padX = (width % step) / 2;
      const padY = (height % step) / 2;
      dots = [];
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const ax = padX + col * step + step / 2;
          const ay = padY + row * step + step / 2;
          dots.push({ ax, ay, sx: ax, sy: ay });
        }
      }
    };

    const pointerMove = (event: PointerEvent) => {
      if (!visible || blockedBySelector) return;
      mouse.x = event.clientX - parentLeft;
      mouse.y = event.clientY - parentTop;
      const dx = mouse.x - mouse.px;
      const dy = mouse.y - mouse.py;
      const distance = Math.hypot(dx, dy);
      mouse.speed += (distance - mouse.speed) * 0.55;
      mouse.px = mouse.x;
      mouse.py = mouse.y;
    };

    const draw = () => {
      frame += 1;
      ctx.clearRect(0, 0, width, height);
      const target = Math.min(mouse.speed / 5, 1);
      engagement += (target - engagement) * 0.08;
      mouse.speed *= 0.92;

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, gradientFrom);
      gradient.addColorStop(1, gradientTo);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      const radius = dotRadius / 2;
      for (let i = 0; i < dots.length; i += 1) {
        const dot = dots[i];
        const dx = mouse.x - dot.ax;
        const dy = mouse.y - dot.ay;
        const distance = Math.hypot(dx, dy);
        if (distance < cursorRadius && engagement > 0.006) {
          const force = (1 - distance / cursorRadius) ** 2 * bulgeStrength * engagement;
          const angle = Math.atan2(dy, dx);
          dot.sx += (dot.ax - Math.cos(angle) * force - dot.sx) * 0.16;
          dot.sy += (dot.ay - Math.sin(angle) * force - dot.sy) * 0.16;
        } else {
          dot.sx += (dot.ax - dot.sx) * 0.11;
          dot.sy += (dot.ay - dot.sy) * 0.11;
        }
        const waveX = waveAmplitude ? Math.cos(dot.ay * 0.03 + frame * 0.014) * waveAmplitude * 0.5 : 0;
        const waveY = waveAmplitude ? Math.sin(dot.ax * 0.03 + frame * 0.02) * waveAmplitude : 0;
        const sparkleScale = sparkle && ((i * 2654435761) ^ (frame >> 3)) % 100 < 3 ? 1.8 : 1;
        const x = dot.sx + waveX;
        const y = dot.sy + waveY;
        ctx.moveTo(x + radius * sparkleScale, y);
        ctx.arc(x, y, radius * sparkleScale, 0, TWO_PI);
      }
      ctx.fill();

      if (engagement > 0.002 && mouse.x > -1000) {
        const glow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, glowRadius);
        glow.addColorStop(0, glowColor);
        glow.addColorStop(1, "transparent");
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = glow;
        ctx.fillRect(mouse.x - glowRadius, mouse.y - glowRadius, glowRadius * 2, glowRadius * 2);
        ctx.globalCompositeOperation = "source-over";
      }

    };

    build();
    const interactive = !reduced;
    draw();

    const loop = (timestamp: number) => {
      if (stopped || !visible || blockedBySelector || document.hidden) {
        raf = 0;
        return;
      }
      if (timestamp - lastPaint >= 33) {
        draw();
        lastPaint = timestamp;
      }
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (interactive && visible && !blockedBySelector && !document.hidden && !raf) {
        raf = requestAnimationFrame(loop);
      }
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !blockedBySelector) start();
        else stop();
      },
      { threshold: 0, rootMargin: "120px" },
    );
    observer.observe(parent);

    const blocker = pauseWhenSelectorVisible
      ? document.querySelector(pauseWhenSelectorVisible)
      : null;
    const blockerObserver = blocker
      ? new IntersectionObserver(
          ([entry]) => {
            blockedBySelector = entry.isIntersecting;
            if (blockedBySelector) stop();
            else start();
          },
          { threshold: 0.01 },
        )
      : null;
    if (blocker && blockerObserver) blockerObserver.observe(blocker);

    const visibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    const resize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        build();
        draw();
      }, 100);
    };
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", visibilityChange);
    if (interactive) {
      window.addEventListener("pointermove", pointerMove, { passive: true });
    }
    return () => {
      stopped = true;
      stop();
      observer.disconnect();
      blockerObserver?.disconnect();
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", pointerMove);
      document.removeEventListener("visibilitychange", visibilityChange);
    };
  }, [bulgeStrength, cursorRadius, dotRadius, dotSpacing, glowColor, glowRadius, gradientFrom, gradientTo, pauseWhenSelectorVisible, sparkle, waveAmplitude]);

  return <div className={`dot-field-container ${className}`} aria-hidden="true"><canvas ref={canvasRef} /></div>;
});

export default DotField;
