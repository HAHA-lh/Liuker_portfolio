"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import {
  MEDIA_PRIORITY,
  unlockMediaPriority,
  whenMediaPriorityReady,
} from "../hero-media";
import {
  playExclusivePreview,
  readMediaRuntimePolicy,
  releaseExclusivePreview,
  subscribeMediaRuntimePolicy,
  subscribePreviewScrollState,
} from "../media-runtime";

gsap.registerPlugin(ScrollTrigger);

export type FocusItem = {
  id: string;
  title: string;
  subtitle: string;
  projectLabel: string;
  href: string;
  media: {
    type: "image" | "video";
    src: string;
    poster?: string;
    background?: string;
  };
};

type EditorialFocusProps = {
  items: FocusItem[];
  title: string;
  viewLabel: string;
};

export function EditorialFocus({ items, title, viewLabel }: EditorialFocusProps) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const mediaQuery = gsap.matchMedia();
    mediaQuery.add(
      {
        desktop: "(min-width: 1024px)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const panels = Array.from(root.querySelectorAll<HTMLElement>(".motion-focus-panel"));
        const videos = Array.from(root.querySelectorAll<HTMLVideoElement>(".motion-focus-video"));
        const links = panels.map((panel) => panel.querySelector<HTMLAnchorElement>(".motion-focus-media-link")!);
        const pauseVideos = () => videos.forEach((video) => releaseExclusivePreview(video));

        if (!context.conditions?.desktop || context.conditions?.reduced) {
          root.removeAttribute("data-motion-enhanced");
          panels.forEach((panel) => panel.removeAttribute("aria-hidden"));
          links.forEach((link) => link.removeAttribute("tabindex"));
          pauseVideos();
          return pauseVideos;
        }

        root.setAttribute("data-motion-enhanced", "true");

        const heading = root.querySelector<HTMLElement>(".motion-focus-heading")!;
        const headingIndex = root.querySelector<HTMLElement>(".motion-focus-heading-index")!;
        const copies = panels.map((panel) => panel.querySelector<HTMLElement>(".motion-focus-copy")!);
        const mediaMasks = panels.map((panel) => panel.querySelector<HTMLElement>(".motion-focus-media-mask")!);
        const mediaContents = panels.map((panel) => panel.querySelector<HTMLElement>(".motion-focus-media-content")!);
        const progressFill = root.querySelector<HTMLElement>(".motion-focus-progress-fill")!;
        const progressSteps = Array.from(root.querySelectorAll<HTMLElement>(".motion-focus-step"));
        const animatedTargets = [heading, headingIndex, ...copies, ...mediaMasks, ...mediaContents];
        const listenerCleanups: Array<() => void> = [];
        let activeIndex = -1;
        let capabilityPriorityReady = false;
        let capabilityNearViewport = false;
        let scrollIdle = true;
        let mediaPolicy = readMediaRuntimePolicy();

        const hydrateVideo = (video: HTMLVideoElement) => {
          if (video.getAttribute("src") || !video.dataset.src) return;
          video.src = video.dataset.src;
          video.load();
        };

        const releaseVideo = (video: HTMLVideoElement) => {
          releaseExclusivePreview(video);
          video.closest<HTMLElement>(".motion-focus-media-stage")?.classList.remove("is-video-ready");
          if (!video.getAttribute("src")) return;
          video.removeAttribute("src");
          video.preload = "none";
          video.load();
        };

        const syncActive = (nextIndex: number, shouldPlay = true, force = false) => {
          if (!force && nextIndex === activeIndex) return;
          activeIndex = nextIndex;

          panels.forEach((panel, index) => {
            const isCurrent = index === activeIndex;
            panel.classList.toggle("is-current", isCurrent);
            panel.setAttribute("aria-hidden", String(!isCurrent));
            links[index].tabIndex = isCurrent ? 0 : -1;
          });
          progressSteps.forEach((step, index) => step.classList.toggle("is-current", index === activeIndex));

          videos.forEach((video) => {
            const videoIndex = Number(video.dataset.index);
            const canUseNetwork = capabilityPriorityReady && capabilityNearViewport && mediaPolicy.autoPlayPreviews;
            const shouldKeepLoaded = videoIndex === activeIndex;
            if (canUseNetwork && shouldKeepLoaded) hydrateVideo(video);
            else if (!shouldKeepLoaded) releaseVideo(video);
            if (
              canUseNetwork &&
              videoIndex === activeIndex &&
              shouldPlay &&
              scrollIdle &&
              document.visibilityState === "visible"
            ) {
              void playExclusivePreview(video);
            } else {
              releaseExclusivePreview(video);
            }
          });
        };

        videos.forEach((video) => {
          const stage = video.closest<HTMLElement>(".motion-focus-media-stage");
          if (!stage) return;
          const showVideo = () => stage.classList.add("is-video-ready");
          const releaseShowreel = () => unlockMediaPriority(MEDIA_PRIORITY.showreel);
          const showPoster = () => {
            stage.classList.remove("is-video-ready");
            releaseShowreel();
          };
          video.addEventListener("playing", showVideo);
          video.addEventListener("loadeddata", releaseShowreel, { once: true });
          video.addEventListener("error", showPoster);
          listenerCleanups.push(() => {
            video.removeEventListener("playing", showVideo);
            video.removeEventListener("loadeddata", releaseShowreel);
            video.removeEventListener("error", showPoster);
          });
        });

        const proximityObserver = new IntersectionObserver(
          ([entry]) => {
            capabilityNearViewport = entry.isIntersecting;
            if (capabilityNearViewport) {
              // Direct anchors and very fast scrolling should never leave the
              // requested section waiting behind speculative off-screen work.
              unlockMediaPriority(MEDIA_PRIORITY.capabilities);
              syncActive(Math.max(0, activeIndex), true, true);
            } else {
              videos.forEach(releaseVideo);
            }
          },
          { rootMargin: "420px 0px", threshold: 0.01 },
        );
        proximityObserver.observe(root);
        listenerCleanups.push(() => proximityObserver.disconnect());

        const stopPriorityWait = whenMediaPriorityReady(MEDIA_PRIORITY.capabilities, () => {
          capabilityPriorityReady = true;
          if (capabilityNearViewport) syncActive(Math.max(0, activeIndex), true, true);
        });
        listenerCleanups.push(stopPriorityWait);

        const stopPolicyWatch = subscribeMediaRuntimePolicy((nextPolicy) => {
          mediaPolicy = nextPolicy;
          if (!mediaPolicy.autoPlayPreviews) videos.forEach(releaseVideo);
          else if (capabilityNearViewport) syncActive(Math.max(0, activeIndex), true, true);
        });
        listenerCleanups.push(stopPolicyWatch);

        const stopScrollWatch = subscribePreviewScrollState((idle) => {
          scrollIdle = idle;
          if (scrollIdle) syncActive(Math.max(0, activeIndex), true, true);
          else pauseVideos();
        });
        listenerCleanups.push(stopScrollWatch);

        links.forEach((link) => {
          const cursor = link.querySelector<HTMLElement>(".motion-focus-cursor");
          const parallax = link.querySelector<HTMLElement>(".motion-focus-media-parallax");
          if (!cursor || !parallax) return;

          let bounds: DOMRect | null = null;
          const cursorX = gsap.quickTo(cursor, "x", { duration: 0.16, ease: "power3.out" });
          const cursorY = gsap.quickTo(cursor, "y", { duration: 0.16, ease: "power3.out" });
          const parallaxX = gsap.quickTo(parallax, "x", { duration: 0.35, ease: "power3.out" });
          const parallaxY = gsap.quickTo(parallax, "y", { duration: 0.35, ease: "power3.out" });
          const enter = () => {
            bounds = link.getBoundingClientRect();
            link.classList.add("is-pointer-active");
          };
          const move = (event: PointerEvent) => {
            if (!bounds) return;
            const localX = event.clientX - bounds.left;
            const localY = event.clientY - bounds.top;
            cursorX(localX);
            cursorY(localY);
            parallaxX(((localX / bounds.width) - 0.5) * 10);
            parallaxY(((localY / bounds.height) - 0.5) * 10);
          };
          const leave = () => {
            bounds = null;
            link.classList.remove("is-pointer-active");
            parallaxX(0);
            parallaxY(0);
          };

          link.addEventListener("pointerenter", enter);
          link.addEventListener("pointermove", move, { passive: true });
          link.addEventListener("pointerleave", leave);
          listenerCleanups.push(() => {
            link.removeEventListener("pointerenter", enter);
            link.removeEventListener("pointermove", move);
            link.removeEventListener("pointerleave", leave);
          });
        });

        const handleVisibility = () => {
          if (document.visibilityState === "visible" && scrollIdle) syncActive(activeIndex, true, true);
          else pauseVideos();
        };
        document.addEventListener("visibilitychange", handleVisibility);
        listenerCleanups.push(() => document.removeEventListener("visibilitychange", handleVisibility));

        copies.forEach((copy, index) => gsap.set(copy, { yPercent: index === 0 ? 0 : 126, autoAlpha: 1 }));
        mediaMasks.forEach((mask, index) => {
          gsap.set(mask, { clipPath: index === 0 ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)" });
        });
        mediaContents.forEach((content, index) => {
          gsap.set(content, { yPercent: index === 0 ? 0 : 9, scale: index === 0 ? 1.035 : 1.065 });
        });
        gsap.set(progressFill, { scaleX: 0, transformOrigin: "left center" });
        panels.forEach((panel, index) => gsap.set(panel, { zIndex: index + 1 }));

        const timeline = gsap.timeline({
          defaults: { ease: "power4.inOut" },
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.72,
            invalidateOnRefresh: true,
            onToggle: (self) => {
              animatedTargets.forEach((target) => {
                target.style.willChange = self.isActive ? "transform, clip-path, opacity" : "auto";
              });
              if (self.isActive) syncActive(Math.max(0, activeIndex), true, true);
              else pauseVideos();
            },
            onUpdate: (self) => {
              gsap.set(progressFill, { scaleX: self.progress });
              const nextIndex = Math.min(items.length - 1, Math.max(0, Math.floor(self.progress * items.length + 0.12)));
              syncActive(nextIndex);
            },
          },
        });

        timeline
          .fromTo(headingIndex, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.13, ease: "power3.out" }, 0)
          .fromTo(heading, { yPercent: 24, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.22, ease: "power4.out" }, 0.02)
          .to(mediaContents[0], { yPercent: 0, scale: 1, duration: 0.34, ease: "power4.out" }, 0.04);

        for (let index = 1; index < items.length; index += 1) {
          const at = index - 0.38;
          timeline
            .to(copies[index - 1], { yPercent: -126, duration: 0.32 }, at)
            .to(copies[index], { yPercent: 0, duration: 0.38, ease: "power4.out" }, at + 0.06)
            .to(mediaContents[index - 1], { yPercent: -4, scale: 0.985, duration: 0.36 }, at)
            .to(mediaMasks[index], { clipPath: "inset(0% 0% 0% 0%)", duration: 0.43 }, at)
            .to(mediaContents[index], { yPercent: 0, scale: 1, duration: 0.52 }, at);
        }

        const finalAt = items.length - 0.38;
        timeline
          .to(copies[items.length - 1], { yPercent: -18, autoAlpha: 0.68, duration: 0.38, ease: "power3.in" }, finalAt)
          .to(mediaContents[items.length - 1], { yPercent: -4, scale: 0.975, duration: 0.38, ease: "power3.in" }, finalAt)
          .to({}, { duration: 0.38 }, finalAt);

        syncActive(0);

        return () => {
          listenerCleanups.forEach((cleanup) => cleanup());
          animatedTargets.forEach((target) => target.style.removeProperty("will-change"));
          videos.forEach((video) => {
            releaseVideo(video);
          });
          root.removeAttribute("data-motion-enhanced");
          panels.forEach((panel) => {
            panel.removeAttribute("aria-hidden");
            panel.classList.remove("is-current");
          });
          links.forEach((link) => {
            link.removeAttribute("tabindex");
            link.classList.remove("is-pointer-active");
          });
          progressSteps.forEach((step) => step.classList.remove("is-current"));
        };
      },
      root,
    );

    return () => mediaQuery.revert();
  }, [items]);

  return (
    <section ref={ref} id="services" className="editorial-section editorial-services motion-focus">
      <div className="motion-focus-sticky">
        <div className="editorial-section-head motion-focus-head">
          <p className="editorial-index motion-focus-heading-index">02</p>
          <h2 className="motion-focus-heading">{title}</h2>
        </div>

        <div className="motion-focus-window">
          {items.map((item, index) => (
            <article className="motion-focus-panel" key={item.id} data-index={item.id}>
              <div className="motion-focus-copy-clip">
                <div className="motion-focus-copy">
                  <span className="motion-focus-panel-index">{item.id} / 04</span>
                  <p className="motion-focus-subtitle">{item.subtitle}</p>
                  <h3>{item.title}</h3>
                  <p className="motion-focus-project">{item.projectLabel}</p>
                </div>
              </div>

              <Link className="motion-focus-media-link" href={item.href} aria-label={`${viewLabel}: ${item.projectLabel}`}>
                <div className="motion-focus-media-stage">
                  <div className="motion-focus-media-mask">
                    <div className="motion-focus-media-content" style={{ background: item.media.background }}>
                      <div className="motion-focus-media-parallax">
                        {item.media.poster ? (
                          <img
                            className="motion-focus-poster"
                            src={item.media.poster}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : null}
                        {item.media.type === "video" ? (
                          <video
                            className="motion-focus-video"
                            data-index={index}
                            data-src={item.media.src}
                            poster={item.media.poster}
                            muted
                            loop
                            playsInline
                            preload="none"
                            aria-hidden="true"
                          />
                        ) : (
                          <img
                            className="motion-focus-image"
                            src={item.media.src}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="motion-focus-cursor" aria-hidden="true">{viewLabel}</span>
                </div>
              </Link>
            </article>
          ))}
        </div>

        <div className="motion-focus-progress" aria-hidden="true">
          <span className="motion-focus-progress-track"><span className="motion-focus-progress-fill" /></span>
          {items.map((item) => (
            <span className="motion-focus-step" key={item.id}>
              <span>{item.id}</span>
              <small>{item.subtitle}</small>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
