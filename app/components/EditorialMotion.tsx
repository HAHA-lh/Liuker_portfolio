"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useTheme } from "../theme";

gsap.registerPlugin(ScrollTrigger, SplitText);

export const motionTiming = { micro: 0.32, text: 0.78, heading: 1.15, mask: 1, media: 1.4 };
export type MediaDirection = "bottom" | "left" | "top" | "right" | "center";
export const mediaDirections: MediaDirection[] = ["bottom", "left", "top", "right"];

// Every effect owns its context. Resizing, language changes, reduced motion and
// React Strict Mode all restore the original, readable DOM before rebuilding.
export function motionContext(root: HTMLElement, setup: (mobile: boolean) => void | (() => void)) {
  const mm = gsap.matchMedia();
  mm.add({ reduced: "(prefers-reduced-motion: reduce)", mobile: "(max-width: 700px)", desktop: "(min-width: 701px)" }, context => {
    if (context.conditions?.reduced) return;
    return setup(Boolean(context.conditions?.mobile));
  }, root);
  return () => mm.revert();
}

export function scrubMotion(trigger: Element, targets: Element[], start = "top bottom", end = "bottom top", scrub = 0.65) {
  return gsap.timeline({
    scrollTrigger: {
      trigger, start, end, scrub, invalidateOnRefresh: true,
      onToggle: self => targets.forEach(target => (target as HTMLElement).style.willChange = self.isActive ? "transform, clip-path" : "auto"),
      onKill: () => targets.forEach(target => (target as HTMLElement).style.removeProperty("will-change")),
    },
  });
}

type SplitLineRevealProps = { children: string; className?: string; reverse?: boolean; exit?: "slide" | "none" };

function SplitLineContent({ children, className = "", reverse = false, exit = "slide" }: SplitLineRevealProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    return motionContext(ref.current, () => {
      let trigger: ScrollTrigger | undefined;
      let tween: gsap.core.Tween | undefined;
      const split = SplitText.create(ref.current!, {
        type: "lines", mask: "lines", tag: "span", autoSplit: true,
        linesClass: "motion-text-line",
        // Preserve natural Chinese wrapping without making a paragraph one word.
        wordDelimiter: /[\u3400-\u9fff]/u.test(children)
          ? { delimiter: /(?<=[\u3400-\u9fff])|(?=[\u3400-\u9fff])/u, replaceWith: "" }
          : undefined,
        onSplit(self) {
          trigger?.kill();
          tween?.kill();
          const move = (yPercent: number, instant = false) => {
            tween?.kill();
            tween = gsap.to(self.lines, {
              yPercent, duration: instant ? 0 : motionTiming.text, stagger: instant ? 0 : 0.06,
              ease: "power3.out", overwrite: true,
              onStart: () => gsap.set(self.lines, { willChange: "transform" }),
              onComplete: () => gsap.set(self.lines, { willChange: "auto" }),
            });
          };
          gsap.set(self.lines, { yPercent: reverse ? -115 : 115 });
          trigger = ScrollTrigger.create({
            trigger: ref.current!, start: "top 94%", end: "bottom 2%",
            onEnter: () => move(0), onEnterBack: () => move(0),
            onLeave: () => { if (exit === "slide") move(-110); },
            onLeaveBack: () => move(reverse ? -115 : 115),
          });
          if (trigger.isActive) move(0);
          else if (trigger.progress === 1) move(exit === "slide" ? -110 : 0, true);
        },
      });
      return () => { trigger?.kill(); tween?.kill(); split.revert(); split.kill(); };
    });
  }, [children, reverse, exit]);
  return <span ref={ref} className={`motion-split ${className}`}>{children}</span>;
}

export function SplitLineReveal(props: SplitLineRevealProps) {
  return <SplitLineContent key={props.children} {...props} />;
}

export function DualLayerHeading({ children, className = "", final = false, controlled = false }: { children: string; className?: string; final?: boolean; controlled?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { theme } = useTheme();
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || controlled) return;
    return motionContext(root, mobile => {
      const outline = root.querySelector<HTMLElement>(".motion-dual-outline")!;
      const solid = root.querySelector<HTMLElement>(".motion-dual-solid")!;
      const neutral = getComputedStyle(root).color;
      const accent = getComputedStyle(root).getPropertyValue("--brand-red").trim();
      const travel = mobile ? 7 : 15;
      const tl = scrubMotion(root, [outline, solid], "top 96%", final ? "top 28%" : "bottom top");
      tl.fromTo(outline, { xPercent: -travel }, { xPercent: 0, duration: 0.3, ease: "power3.out" }, 0)
        .fromTo(solid, { xPercent: travel }, { xPercent: 0, duration: 0.3, ease: "power3.out" }, 0)
        .to(outline, { color: accent, duration: 0.12 }, 0.13)
        .to(outline, { color: neutral, duration: 0.18 }, 0.25)
        .to(solid, { scaleX: 1.018, duration: 0.22, ease: "sine.inOut" }, 0.3)
        .to(solid, { scaleX: 1, duration: 0.18 }, 0.52);
      if (!final) {
        tl.to(outline, { x: () => innerWidth * (mobile ? 0.035 : 0.08), duration: 0.25, ease: "power3.in" }, 0.75)
          .to(solid, { x: () => -innerWidth * (mobile ? 0.035 : 0.08), duration: 0.25, ease: "power3.in" }, 0.75);
      }
    });
  }, [children, final, controlled, theme]);
  return <span ref={ref} className={`motion-dual ${className}`} aria-label={children}>
    <span className="motion-dual-outline" aria-hidden="true">{children}</span>
    <span className="motion-dual-solid" aria-hidden="true">{children}</span>
  </span>;
}

export function CounterMediaReveal({ children, direction = "bottom", className = "", background, controlled = false, graphic = false }: {
  children: ReactNode; direction?: MediaDirection; className?: string; background?: string; controlled?: boolean; graphic?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || controlled) return;
    return motionContext(root, mobile => {
      const mask = root.querySelector<HTMLElement>(".motion-counter-mask")!;
      const inner = root.querySelector<HTMLElement>(".motion-counter-inner")!;
      const image = root.querySelector<HTMLElement>(".motion-counter-settle")!;
      const horizontal = direction === "left" || direction === "right";
      const sign = direction === "left" || direction === "top" ? -1 : 1;
      const distance = mobile ? 65 : 100;
      const axis = horizontal ? "xPercent" : "yPercent";
      const tl = scrubMotion(root, [mask, inner, image], graphic ? "top 114%" : "top 104%", "top 32%", 0.5);
      if (graphic) {
        tl.fromTo(mask, { scaleY: 0 }, { scaleY: 1, duration: motionTiming.mask, ease: "power4.out" });
      } else if (direction === "center") {
        tl.fromTo(mask, { clipPath: "inset(50% 0% 50% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: motionTiming.mask, ease: "power4.out" }, 0)
          .fromTo(inner, { yPercent: 8 }, { yPercent: 0, duration: motionTiming.media, ease: "power4.out" }, 0);
      } else {
        tl.fromTo(mask, { [axis]: sign * distance }, { [axis]: 0, duration: motionTiming.mask, ease: "power4.out" }, 0)
          .fromTo(inner, { [axis]: -sign * distance }, { [axis]: 0, duration: motionTiming.mask, ease: "power4.out" }, 0);
      }
      tl.fromTo(image, { scale: direction === "center" ? 1.14 : 1.1 }, { scale: 1, duration: motionTiming.media, ease: "power4.out" }, 0);
    });
  }, [direction, controlled, graphic]);
  return <div ref={ref} className={`motion-counter ${className}`} data-direction={direction}>
    <div className="motion-counter-mask"><div className="motion-counter-inner">
      <div className="motion-counter-settle" style={{ background }}>{children}</div>
    </div></div>
  </div>;
}

export function MediaScrollExit({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    return motionContext(root, mobile => {
      const crop = root.querySelector<HTMLElement>(".motion-exit-crop")!;
      const image = root.querySelector<HTMLElement>(".motion-exit-image")!;
      scrubMotion(root, [crop, image], "center 55%", "bottom top")
        .fromTo(crop, { clipPath: "inset(0% 0% 0% 0%)", xPercent: 0 }, { clipPath: "inset(7% 0% 9% 0%)", xPercent: mobile ? 1 : 3, duration: 1, ease: "none" }, 0)
        .fromTo(image, { scale: 1, yPercent: 0 }, { scale: mobile ? 1.035 : 1.06, yPercent: mobile ? -3 : -6, duration: 1, ease: "none" }, 0);
    });
  }, []);
  return <div ref={ref} className={`motion-media-exit ${className}`}>
    <div className="motion-exit-crop"><div className="motion-exit-image">{children}</div></div>
  </div>;
}

export function ScrollParallax({ children, className = "", axis = "y", distance = 5, decorative = false }: {
  children: ReactNode; className?: string; axis?: "x" | "y"; distance?: number; decorative?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    return motionContext(root, mobile => {
      const inner = root.firstElementChild!;
      const amount = distance * (mobile ? 0.35 : 1);
      scrubMotion(root, [inner]).fromTo(inner, { [`${axis}Percent`]: amount }, { [`${axis}Percent`]: -amount, duration: 1, ease: "none" });
    });
  }, [axis, distance]);
  return <div ref={ref} className={`motion-parallax ${className}`} aria-hidden={decorative || undefined}><div>{children}</div></div>;
}

export function SectionTransition({ children, className = "", project = false }: { children: ReactNode; className?: string; project?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    return motionContext(root, mobile => {
      if (project) {
        const media = root.querySelector(".motion-media-exit")!;
        const title = root.querySelector<HTMLElement>(".editorial-project-title-block")!;
        scrubMotion(media, [title], "top 104%", "top 32%", 0.5)
          .fromTo(title, { letterSpacing: "0em" }, { letterSpacing: "0.045em", duration: 0.45, ease: "power3.out" })
          .to(title, { letterSpacing: "0.01em", duration: 0.55, ease: "power4.out" });
        scrubMotion(media, [title], "center 55%", "bottom top")
          .fromTo(title, { xPercent: 0 }, { xPercent: mobile ? -2 : -6, duration: 1, ease: "none" });
      } else {
        const rule = root.querySelector<HTMLElement>(".motion-section-rule");
        if (rule) scrubMotion(root, [rule], "top 96%", "top 45%", 0.5)
          .fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 1, ease: "power3.out" });
      }
    });
  }, [project]);
  return <div ref={ref} className={className}>{children}{!project && <span className="motion-section-rule" aria-hidden="true" />}</div>;
}
