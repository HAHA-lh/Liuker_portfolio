"use client";

import { gsap } from "gsap";
import { useLayoutEffect, useRef } from "react";
import { CounterMediaReveal, motionContext, scrubMotion, SplitLineReveal } from "./EditorialMotion";

type FocusItem = { title: string; poster?: string; visual: string };

export function EditorialFocus({ items, title }: { items: FocusItem[]; title: string }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    return motionContext(root, mobile => {
      root.setAttribute("data-motion-enhanced", "true");
      const heading = root.querySelector<HTMLElement>(".motion-focus-heading")!;
      // Use the section's exit, not the pinned heading's original position.
      // A soft mask retreats upwards while the text itself stays in place.
      gsap.fromTo(heading, { "--focus-heading-fade": "145%" }, {
        "--focus-heading-fade": "-5%",
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "bottom 120%",
          end: "bottom 95%",
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
      const panels = Array.from(root.querySelectorAll<HTMLElement>(".motion-focus-panel"));
      const labels = Array.from(root.querySelectorAll<HTMLElement>(".motion-focus-label-inner"));
      const masks = panels.map(panel => panel.querySelector<HTMLElement>(".motion-counter-mask")!);
      const images = panels.map(panel => panel.querySelector<HTMLElement>(".motion-counter-inner")!);
      const indices = Array.from(root.querySelectorAll<HTMLElement>(".motion-focus-step"));
      const tl = scrubMotion(root, [...labels, ...masks, ...images], "top top", "bottom bottom", 0.55);
      panels.forEach((panel, index) => {
        gsap.set(labels[index], { yPercent: index === 0 ? 0 : 115 });
        gsap.set(masks[index], { yPercent: index === 0 ? 0 : (mobile ? 70 : 100) });
        gsap.set(images[index], { yPercent: index === 0 ? 0 : (mobile ? -70 : -100) });
        if (!index) return;
        const at = index - 0.22;
        tl.to(labels[index - 1], { yPercent: -115, duration: 0.32, ease: "power3.inOut" }, at)
          .to(labels[index], { yPercent: 0, duration: 0.4, ease: "power3.out" }, at + 0.08)
          .to(masks[index], { yPercent: 0, duration: 0.5, ease: "power4.inOut" }, at)
          .to(images[index], { yPercent: 0, duration: 0.5, ease: "power4.inOut" }, at);
      });
      tl.to({}, { duration: 0.7 });
      const updateActive = () => {
        const active = Math.min(items.length - 1, Math.floor(tl.time() + 0.05));
        panels.forEach((panel, index) => panel.setAttribute("aria-hidden", String(index !== active)));
        indices.forEach((step, index) => step.classList.toggle("is-current", index === active));
      };
      tl.eventCallback("onUpdate", updateActive);
      updateActive();
      return () => { root.removeAttribute("data-motion-enhanced"); panels.forEach(panel => panel.removeAttribute("aria-hidden")); indices.forEach(step => step.classList.remove("is-current")); };
    });
  }, [items]);

  return <section ref={ref} id="services" className="editorial-section editorial-services motion-focus">
    <div className="motion-focus-sticky">
      <div className="editorial-section-head">
        <p className="editorial-index">02</p>
        <h2><span className="motion-focus-heading"><SplitLineReveal exit="none">{title}</SplitLineReveal></span></h2>
      </div>
      <div className="motion-focus-window">
        {items.map(item => <div className="motion-focus-panel" key={item.title}>
          <div className="motion-focus-label"><h3 className="motion-focus-label-inner">{item.title}</h3></div>
          <CounterMediaReveal className="motion-focus-media" controlled background={item.visual}>
            {item.poster && <img src={item.poster} alt="" loading="lazy" decoding="async" />}
          </CounterMediaReveal>
        </div>)}
      </div>
      <div className="motion-focus-progress" aria-hidden="true">
        {items.map((item, index) => <span className="motion-focus-step" key={item.title}>{String(index + 1).padStart(2, "0")}</span>)}
      </div>
    </div>
  </section>;
}
