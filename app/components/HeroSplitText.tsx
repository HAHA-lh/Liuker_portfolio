"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

/** React Bits-style character reveal, gated by the site's media loader. */
export function HeroSplitText({ text, ready, delay = 0 }: { text: string; ready: boolean; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ready || !ref.current) return;
    const element = ref.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let split: SplitText | undefined;
    let tween: gsap.core.Tween | undefined;
    let observer: IntersectionObserver | undefined;
    const restore = () => { tween?.kill(); split?.revert(); split = undefined; };
    const onPreference = () => { if (reduced.matches) { observer?.disconnect(); restore(); } };
    reduced.addEventListener("change", onPreference);

    void document.fonts.ready.then(() => {
      if (disposed || reduced.matches) return;
      split = new SplitText(element, { type: "chars,words", smartWrap: true, charsClass: "hero-split-char", aria: "auto" });
      tween = gsap.fromTo(split.chars, { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, duration: 1.05, stagger: 0.045, delay,
        ease: "power3.out", paused: true,
      });
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { tween?.play(); observer?.disconnect(); }
      }, { threshold: 0.1 });
      observer.observe(element);
    });
    return () => { disposed = true; observer?.disconnect(); restore(); reduced.removeEventListener("change", onPreference); };
  }, [text, ready, delay]);

  return <span ref={ref} className="hero-split-text">{text}</span>;
}
