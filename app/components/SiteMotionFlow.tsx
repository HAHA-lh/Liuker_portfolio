"use client";

import { useLayoutEffect, useRef } from "react";

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const smoothstep = (start: number, end: number, value: number) => {
  const progress = clamp((value - start) / Math.max(0.0001, end - start));
  return progress * progress * (3 - 2 * progress);
};

/**
 * One lightweight scroll coordinator for the homepage. It does not replace the
 * character of each section; it gives every section the same reversible enter,
 * focus and hand-off values so their local motion reads as one sequence.
 */
export default function SiteMotionFlow() {
  const frameRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-motion-chapter]"),
    );
    if (!sections.length) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const render = () => {
      frameRef.current = null;
      const viewportHeight = Math.max(1, window.innerHeight);
      const pageRange = Math.max(1, document.documentElement.scrollHeight - viewportHeight);
      const pageProgress = clamp(window.scrollY / pageRange);
      const metrics = sections.map((section) => {
        const bounds = section.getBoundingClientRect();
        const local = clamp(
          (viewportHeight - bounds.top) / Math.max(1, viewportHeight + bounds.height),
        );
        return {
          section,
          bounds,
          local,
          enter: smoothstep(0.015, 0.2, local),
          exit: smoothstep(0.78, 0.98, local),
        };
      });

      let nextActive = 0;
      const readingLine = viewportHeight * 0.48;
      metrics.forEach(({ bounds }, index) => {
        if (bounds.top <= readingLine && bounds.bottom >= readingLine) {
          nextActive = index;
        } else if (bounds.bottom < readingLine) {
          nextActive = Math.min(index + 1, metrics.length - 1);
        }
      });

      metrics.forEach((metric, index) => {
        const nextEnter = metrics[index + 1]?.enter ?? 0;
        const enter = reducedMotion.matches ? 1 : metric.enter;
        const exit = reducedMotion.matches ? 0 : metric.exit;
        const handoff = reducedMotion.matches ? 0 : smoothstep(0.22, 0.92, nextEnter);
        const contentOpacity = reducedMotion.matches
          ? 1
          : clamp(0.38 + enter * 0.62 - handoff * 0.34, 0.34, 1);
        const shift = reducedMotion.matches ? 0 : (1 - enter) * 52 - handoff * 34;
        const scale = reducedMotion.matches ? 1 : 0.986 + enter * 0.014 - handoff * 0.008;
        const ruleOpacity = reducedMotion.matches ? 0.8 : 0.18 + enter * 0.62;
        const tracking = reducedMotion.matches ? 0 : enter * 0.012;
        const mediaLight = reducedMotion.matches ? 1 : 0.78 + enter * 0.22 - handoff * 0.12;

        metric.section.style.setProperty("--chapter-progress", metric.local.toFixed(4));
        metric.section.style.setProperty("--chapter-enter", enter.toFixed(4));
        metric.section.style.setProperty("--chapter-exit", exit.toFixed(4));
        metric.section.style.setProperty("--chapter-handoff", handoff.toFixed(4));
        metric.section.style.setProperty("--chapter-opacity", contentOpacity.toFixed(4));
        metric.section.style.setProperty("--chapter-shift", `${shift.toFixed(2)}px`);
        metric.section.style.setProperty("--chapter-scale", scale.toFixed(4));
        metric.section.style.setProperty("--chapter-rule-opacity", ruleOpacity.toFixed(4));
        metric.section.style.setProperty("--chapter-tracking", `${tracking.toFixed(4)}em`);
        metric.section.style.setProperty("--chapter-media-light", mediaLight.toFixed(4));
        metric.section.toggleAttribute("data-motion-active", index === nextActive);

        const items = metric.section.querySelectorAll<HTMLElement>(".motion-flow-item");
        items.forEach((item, itemIndex) => {
          const start = 0.035 + itemIndex * 0.055;
          const reveal = reducedMotion.matches
            ? 1
            : smoothstep(start, Math.min(0.68, start + 0.22), metric.local);
          item.style.setProperty("--flow-item-reveal", reveal.toFixed(4));
          item.style.setProperty(
            "--flow-item-shift",
            `${((1 - reveal) * Math.min(42, 22 + itemIndex * 4)).toFixed(2)}px`,
          );
          item.style.setProperty("--flow-item-scale", (0.985 + reveal * 0.015).toFixed(4));
        });
      });

      document.documentElement.style.setProperty("--site-motion-progress", pageProgress.toFixed(4));
      document.documentElement.dataset.motionChapter =
        sections[nextActive]?.dataset.motionChapter ?? "hero";
    };

    const requestRender = () => {
      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(render);
      }
    };

    render();
    window.addEventListener("scroll", requestRender, { passive: true });
    window.addEventListener("resize", requestRender);
    reducedMotion.addEventListener("change", requestRender);
    document.fonts.ready.then(requestRender).catch(() => undefined);

    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener("scroll", requestRender);
      window.removeEventListener("resize", requestRender);
      reducedMotion.removeEventListener("change", requestRender);
      sections.forEach((section) => {
        section.removeAttribute("data-motion-active");
        [
          "--chapter-progress",
          "--chapter-enter",
          "--chapter-exit",
          "--chapter-handoff",
          "--chapter-opacity",
          "--chapter-shift",
          "--chapter-scale",
          "--chapter-rule-opacity",
          "--chapter-tracking",
          "--chapter-media-light",
        ].forEach((property) => section.style.removeProperty(property));
      });
      delete document.documentElement.dataset.motionChapter;
      document.documentElement.style.removeProperty("--site-motion-progress");
    };
  }, []);

  return null;
}
