"use client";

import { useEffect } from "react";

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };

/** A single reversible scroll pass. Content stays visible without JavaScript. */
export function ReferenceMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".reference-home");
    if (!root) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const groups = [
      ".reference-small-project",
      ".reference-services > div:first-child",
      ".reference-service-list > details",
      ".reference-about > *",
      ".creative-process > *, .frame-notes > *",
      ".reference-background > details",
      ".reference-footer-kicker, .reference-footer-title, .reference-footer-description, .reference-footer-social, .reference-footer-bottom",
    ];
    const items = groups.flatMap(selector => Array.from(root.querySelectorAll<HTMLElement>(selector)).map((element, index) => ({ element, delay: Math.min(index, 3) * 0.035, y: 0 })));
    items.forEach(({element}) => element.classList.add("reference-reveal"));
    let frame = 0;
    let disposed = false;
    let readyAt = document.documentElement.dataset.siteReady === "true" ? performance.now() : 0;
    const hero = root.querySelector<HTMLElement>(".editorial-hero-copy");
    const ending = root.querySelector<HTMLElement>(".reference-contact");
    const render = (now: number) => {
      frame = 0;
      if (disposed) return;
      const height = innerHeight;
      const remainingScroll = Math.max(0, document.documentElement.scrollHeight - height - scrollY);
      const short = innerWidth < 641;
      // Read all geometry before writing styles to avoid layout thrashing.
      const bounds = items.map(item => item.element.getBoundingClientRect());
      const endingBounds = ending?.getBoundingClientRect();
      if (ending && endingBounds) {
        const distance = height - endingBounds.top;
        const progress = preference.matches ? 1 : ease(distance / Math.max(1,Math.min(height*.65, remainingScroll+distance)));
        ending.style.setProperty("--ending",progress.toFixed(4));
      }
      items.forEach((item, index) => {
        const top = bounds[index].top - item.y;
        const bottom = bounds[index].bottom - item.y;
        const entryDistance = height * (0.98 - item.delay) - top;
        // Shorten the final reveal near the page end so footer links fully appear.
        const entryRange = Math.max(1, Math.min(height * 0.25, remainingScroll + entryDistance));
        const enter = preference.matches ? 1 : ease(entryDistance / entryRange);
        // Exit only as the element's trailing edge leaves the viewport.
        const leave = preference.matches ? 0 : ease((height * 0.16 - bottom) / (height * 0.28));
        const visible = enter * (1 - leave);
        item.y = preference.matches ? 0 : (1 - enter) * (short ? 22 : 38) - leave * 18;
        item.element.style.setProperty("--reveal-opacity", visible.toFixed(4));
        item.element.style.setProperty("--reveal-y", `${item.y.toFixed(2)}px`);
        item.element.style.setProperty("--reveal-scale", (1.035 - enter * 0.035 + leave * 0.015).toFixed(4));
      });
      if (hero) {
        const opening = preference.matches ? 1 : readyAt ? ease((now - readyAt) / 950) : 0;
        hero.style.setProperty("--hero-opening", opening.toFixed(4));
        hero.style.setProperty("--hero-opening-y", `${((1 - opening) * 24).toFixed(2)}px`);
        if (readyAt && opening < 1 && !document.hidden) schedule();
      }
    };
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(render); };
    const ready = () => { readyAt = performance.now(); schedule(); };
    const visibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else schedule();
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    root.addEventListener("toggle", schedule, true);
    window.addEventListener("scroll", schedule, {passive:true});
    window.addEventListener("resize", schedule);
    document.addEventListener("liuker:site-ready", ready);
    document.addEventListener("visibilitychange", visibility);
    preference.addEventListener("change", schedule);
    document.fonts.ready.then(schedule);
    schedule();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      root.removeEventListener("toggle", schedule, true);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("liuker:site-ready", ready);
      document.removeEventListener("visibilitychange", visibility);
      preference.removeEventListener("change", schedule);
      items.forEach(({element}) => {
        element.classList.remove("reference-reveal");
        ["--reveal-opacity", "--reveal-y", "--reveal-scale"].forEach(name=>element.style.removeProperty(name));
      });
      hero?.style.removeProperty("--hero-opening");
      hero?.style.removeProperty("--hero-opening-y");
      ending?.style.removeProperty("--ending");
    };
  }, []);
  return null;
}
