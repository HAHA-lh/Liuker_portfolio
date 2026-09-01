"use client";

import { useEffect, useRef } from "react";
import {
  MEDIA_PRIORITY,
  unlockMediaPriority,
  whenMediaPriorityReady,
  type MediaPriority,
} from "../hero-media";

type PriorityPreviewVideoProps = {
  src: string;
  poster?: string;
  priority?: MediaPriority;
  releaseNextPriority?: MediaPriority;
  rootMargin?: string;
  className?: string;
};

export function PriorityPreviewVideo({
  src,
  poster,
  priority = MEDIA_PRIORITY.selected,
  releaseNextPriority,
  rootMargin = "600px 0px",
  className = "",
}: PriorityPreviewVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let priorityReady = false;
    let nearViewport = false;
    let visible = false;
    let releaseTimer = 0;

    const releaseNext = () => {
      if (releaseNextPriority === undefined) return;
      window.clearTimeout(releaseTimer);
      unlockMediaPriority(releaseNextPriority);
    };
    const play = () => {
      if (!visible || reducedMotion.matches || !video.getAttribute("src")) return;
      void video.play().catch(() => undefined);
    };
    const release = () => {
      window.clearTimeout(releaseTimer);
      video.pause();
      video.classList.remove("is-playing");
      if (!video.getAttribute("src")) return;
      video.removeAttribute("src");
      video.preload = "none";
      video.load();
    };
    const attach = () => {
      if (!priorityReady || !nearViewport || reducedMotion.matches || video.getAttribute("src")) return;
      video.preload = "metadata";
      video.src = src;
      video.load();
      if (releaseNextPriority !== undefined) {
        releaseTimer = window.setTimeout(releaseNext, 1400);
      }
      play();
    };
    const onPlaying = () => video.classList.add("is-playing");
    const onUnavailable = () => {
      video.classList.remove("is-playing");
      releaseNext();
    };

    const preloadObserver = new IntersectionObserver(
      ([entry]) => {
        nearViewport = entry.isIntersecting;
        if (nearViewport) attach();
        else release();
      },
      { rootMargin, threshold: 0.01 },
    );
    const playbackObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) play();
        else video.pause();
      },
      { threshold: 0.35 },
    );
    const stopWaiting = whenMediaPriorityReady(priority, () => {
      priorityReady = true;
      attach();
    });
    const onReducedMotion = () => {
      if (reducedMotion.matches) release();
      else attach();
    };

    preloadObserver.observe(video);
    playbackObserver.observe(video);
    reducedMotion.addEventListener("change", onReducedMotion);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("loadeddata", releaseNext, { once: true });
    video.addEventListener("error", onUnavailable, { once: true });

    return () => {
      stopWaiting();
      preloadObserver.disconnect();
      playbackObserver.disconnect();
      reducedMotion.removeEventListener("change", onReducedMotion);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("loadeddata", releaseNext);
      video.removeEventListener("error", onUnavailable);
      window.clearTimeout(releaseTimer);
      release();
    };
  }, [priority, releaseNextPriority, rootMargin, src]);

  return (
    <video
      ref={ref}
      className={`priority-preview-video ${className}`}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      tabIndex={-1}
      aria-hidden="true"
    />
  );
}
