"use client";

import { useEffect, useRef, type VideoHTMLAttributes } from "react";

type LazyVideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, "src" | "preload"> & {
  src: string;
  rootMargin?: string;
  preloadWhenVisible?: "none" | "metadata" | "auto";
  playWhenVisible?: boolean;
  unloadOnExit?: boolean;
};

export default function LazyVideo({
  src,
  rootMargin = "400px 0px",
  preloadWhenVisible = "metadata",
  playWhenVisible = false,
  unloadOnExit = false,
  ...videoProps
}: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const play = () => {
      if (visible && playWhenVisible && !reducedMotion.matches) {
        video.play().catch(() => undefined);
      }
    };
    const attach = () => {
      visible = true;
      if (!video.getAttribute("src")) {
        video.preload = preloadWhenVisible;
        video.src = src;
        video.load();
      }
      if (playWhenVisible && !reducedMotion.matches) {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) play();
        else video.addEventListener("canplay", play, { once: true });
      }
    };
    const release = () => {
      visible = false;
      video.removeEventListener("canplay", play);
      video.pause();
      if (unloadOnExit && video.getAttribute("src")) {
        video.removeAttribute("src");
        video.preload = "none";
        video.load();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) attach();
        else release();
      },
      { rootMargin, threshold: 0.01 },
    );

    observer.observe(video);
    const handleReducedMotion = () => {
      if (reducedMotion.matches) video.pause();
      else play();
    };
    reducedMotion.addEventListener("change", handleReducedMotion);
    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", handleReducedMotion);
      release();
    };
  }, [playWhenVisible, preloadWhenVisible, rootMargin, src, unloadOnExit]);

  // This removes the browser's download affordance, not access to the media.
  return <video ref={videoRef} preload="none" controlsList="nodownload" {...videoProps} data-lazy-video />;
}
