"use client";

import { useEffect, useRef } from "react";

export function CinemaViewfinder() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const lens = ref.current;
    const hero = lens?.closest<HTMLElement>(".editorial-hero");
    if (!lens || !hero) return;
    const media = matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    let x = 0, y = 0, tx = 0, ty = 0;
    const draw = () => {
      frame = 0;
      x += (tx - x) * 0.14; y += (ty - y) * 0.14;
      lens.style.transform = `translate3d(${x}px,${y}px,0)`;
      if (Math.abs(tx-x) + Math.abs(ty-y) > 0.25) frame = requestAnimationFrame(draw);
    };
    const move = (e: PointerEvent) => {
      if (!media.matches || document.hidden) return;
      const r = hero.getBoundingClientRect();
      tx = Math.max(12, Math.min(r.width - lens.offsetWidth - 12, e.clientX-r.left-lens.offsetWidth/2));
      ty = Math.max(70, Math.min(r.height - lens.offsetHeight - 30, e.clientY-r.top-lens.offsetHeight/2));
      if (!hero.classList.contains("cinema-looking")) { x=tx; y=ty; }
      hero.classList.add("cinema-looking");
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const leave = () => { hero.classList.remove("cinema-looking"); cancelAnimationFrame(frame); frame=0; };
    const visibility = () => { if (document.hidden) leave(); };
    hero.addEventListener("pointermove",move);
    hero.addEventListener("pointerleave",leave);
    media.addEventListener("change",leave);
    document.addEventListener("visibilitychange",visibility);
    return () => { leave(); hero.removeEventListener("pointermove",move); hero.removeEventListener("pointerleave",leave); media.removeEventListener("change",leave); document.removeEventListener("visibilitychange",visibility); };
  }, []);
  return <div className="cinema-viewfinder" ref={ref} aria-hidden="true"><i/><i/><i/><i/><span className="cinema-finder-label">LIUKER — LOOK CLOSER</span><span className="cinema-crosshair">+</span><span className="cinema-finder-bottom">COLOR STUDY / 01</span></div>;
}

export function CinemaPilot() {
  useEffect(() => {
    const screens = Array.from(document.querySelectorAll<HTMLElement>(".reference-feature"));
    if (!screens.length) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const render = () => {
      frame = 0;
      screens.forEach(first => {
      const r = first.getBoundingClientRect();
      const enter = Math.max(0, Math.min(1, (innerHeight * .65-r.top)/(innerHeight*.36)));
      const exit = Math.max(0, Math.min(1, (innerHeight*.12-r.bottom)/(innerHeight*.25)));
      const progress = reduced.matches ? 1 : (enter*enter*(3-2*enter))*(1-exit);
      first.style.setProperty("--cinema-open",progress.toFixed(4));
      first.style.setProperty("--cinema-inset",`${((1-progress)*22).toFixed(2)}%`);
      first.style.setProperty("--cinema-scale",`${1+(1-progress)*.12}`);
      first.style.setProperty("--cinema-travel",`${(1-progress)*28}px`);
      });
    };
    const schedule = () => { if (!frame && !document.hidden) frame=requestAnimationFrame(render); };
    screens.forEach(first=>first.classList.add("cinema-screen"));
    const observer = new ResizeObserver(schedule); screens.forEach(first=>observer.observe(first));
    window.addEventListener("scroll",schedule,{passive:true});
    window.addEventListener("resize",schedule);
    document.addEventListener("visibilitychange",schedule);
    reduced.addEventListener("change",schedule);
    schedule();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll",schedule); window.removeEventListener("resize",schedule); document.removeEventListener("visibilitychange",schedule); reduced.removeEventListener("change",schedule); screens.forEach(first=>{ first.classList.remove("cinema-screen"); ["--cinema-open","--cinema-inset","--cinema-scale","--cinema-travel"].forEach(key=>first.style.removeProperty(key)); }); };
  },[]);
  return null;
}
