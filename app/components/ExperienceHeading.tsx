"use client";

import { gsap } from "gsap";
import { useLayoutEffect, useRef, type RefObject } from "react";
import { experienceTrackingBounds } from "../lib/motion-geometry";
import { motionContext } from "./EditorialMotion";

export function ExperienceHeading({ sectionRef }: { sectionRef: RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const heading = ref.current;
    const list = section?.querySelector<HTMLElement>(".editorial-experience-list");
    if (!section || !heading || !list) return;

    return motionContext(section, () => {
      const measure = () => {
        const style = getComputedStyle(heading);
        const vertical = style.writingMode.startsWith("vertical");
        const range = document.createRange();
        range.selectNodeContents(heading);
        const textBounds = range.getBoundingClientRect();
        // The right column keeps its intrinsic height, avoiding layout feedback
        // as the left heading grows. On mobile, constrain to the column width.
        const availableExtent = vertical
          ? list.offsetHeight - heading.offsetTop - 48
          : heading.parentElement!.clientWidth - 8;
        return experienceTrackingBounds({
          fontSize: parseFloat(style.fontSize),
          glyphCount: Array.from(heading.textContent ?? "").length,
          extent: vertical ? textBounds.height : textBounds.width,
          currentSpacing: parseFloat(style.letterSpacing) || 0,
          availableExtent,
        });
      };

      const tween = gsap.fromTo(heading, {
        letterSpacing: () => `${measure().min}px`,
      }, {
        letterSpacing: () => `${measure().max}px`,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top 35%",
          end: "bottom 85%",
          scrub: 0.65,
          invalidateOnRefresh: true,
        },
      });

      let disposed = false;
      let frame = 0;
      const refresh = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          if (!disposed) tween.scrollTrigger?.refresh();
        });
      };
      const observer = new ResizeObserver(refresh);
      observer.observe(list);
      document.fonts.ready.then(() => { if (!disposed) refresh(); });
      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        observer.disconnect();
      };
    });
  }, [sectionRef]);

  return <h2 ref={ref} className="editorial-experience-heading">EXPERIENCE</h2>;
}
