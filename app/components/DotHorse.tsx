"use client";
import { useEffect, useRef } from "react";

// Replay the reference frames at their original 25 fps, preserving every dot.
export default function DotHorse() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      if (motion.matches || document.hidden) video.pause();
      else void video.play().catch(() => { /* Keep the poster if autoplay is unavailable. */ });
    };
    update();
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      video.pause();
      motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return <video ref={ref} className="liuker-dot-horse" src="/media/loading/dot-horse-reference.mp4"
    poster="/media/loading/dot-horse-reference-poster.png" muted loop playsInline preload="auto"
    disablePictureInPicture aria-hidden="true" tabIndex={-1} />;
}
