"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import "./ScrollExpand.css";

const clamp = (value: number, min: number, max: number) =>
  value < min ? min : value > max ? max : value;

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const progress = clamp((value - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return progress * progress * (3 - 2 * progress);
};

type ScrollExpandProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  src?: string;
  mediaType?: "image" | "video";
  poster?: string;
  alt?: string;
  title?: ReactNode;
  scrollHint?: string;
  startWidth?: number;
  startHeight?: number;
  startRadius?: number;
  endRadius?: number;
  aspectRatio?: number;
  fillViewportOnExpand?: boolean;
  mediaZoom?: number;
  scrollDistance?: number;
  holdDistance?: number;
  smoothing?: number;
  overlayScrim?: number;
  useWindowScroll?: boolean;
  enabled?: boolean;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export default function ScrollExpand({
  src = "",
  mediaType = "image",
  poster = "",
  alt = "",
  title = "",
  scrollHint = "",
  startWidth = 42,
  startHeight = 58,
  startRadius = 24,
  endRadius = 0,
  aspectRatio = 16 / 9,
  fillViewportOnExpand = false,
  mediaZoom = 1.35,
  scrollDistance = 1.2,
  holdDistance = 0.35,
  smoothing = 0.1,
  overlayScrim = 0.45,
  useWindowScroll = false,
  enabled = true,
  children,
  className = "",
  style,
  ...rest
}: ScrollExpandProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  const propsRef = useRef({
    startWidth,
    startHeight,
    startRadius,
    endRadius,
    aspectRatio,
    fillViewportOnExpand,
    mediaZoom,
    scrollDistance,
    holdDistance,
    smoothing,
    overlayScrim,
    useWindowScroll,
    enabled,
  });

  useEffect(() => {
    propsRef.current = {
      startWidth,
      startHeight,
      startRadius,
      endRadius,
      aspectRatio,
      fillViewportOnExpand,
      mediaZoom,
      scrollDistance,
      holdDistance,
      smoothing,
      overlayScrim,
      useWindowScroll,
      enabled,
    };
  }, [
    enabled,
    aspectRatio,
    endRadius,
    fillViewportOnExpand,
    holdDistance,
    mediaZoom,
    overlayScrim,
    scrollDistance,
    smoothing,
    startHeight,
    startRadius,
    startWidth,
    useWindowScroll,
  ]);

  const applyProgress = useCallback((progress: number) => {
    const frame = frameRef.current;
    const media = mediaRef.current;
    if (!frame || !media) return;

    const config = propsRef.current;
    const eased = smoothstep(0, 1, progress);
    const radius = config.startRadius + (config.endRadius - config.startRadius) * eased;

    if (config.aspectRatio > 0 && frame.parentElement) {
      const bounds = frame.parentElement.getBoundingClientRect();
      const maximumWidth = Math.min(bounds.width, bounds.height * config.aspectRatio);
      const startScale = clamp(config.startWidth / 100, 0.05, 1);
      const initialWidth = maximumWidth * startScale;
      const initialHeight = initialWidth / config.aspectRatio;
      const finalWidth = config.fillViewportOnExpand ? bounds.width : maximumWidth;
      const finalHeight = config.fillViewportOnExpand ? bounds.height : maximumWidth / config.aspectRatio;
      frame.style.width = `${initialWidth + (finalWidth - initialWidth) * eased}px`;
      frame.style.height = `${initialHeight + (finalHeight - initialHeight) * eased}px`;
      frame.style.clipPath = "none";
      frame.style.borderRadius = `${radius}px`;
    } else {
      const width = config.startWidth + (100 - config.startWidth) * eased;
      const height = config.startHeight + (100 - config.startHeight) * eased;
      const insetX = Math.max(0, (100 - width) / 2);
      const insetY = Math.max(0, (100 - height) / 2);
      frame.style.width = "100%";
      frame.style.height = "100%";
      frame.style.borderRadius = "0";
      frame.style.clipPath = `inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${radius}px)`;
    }
    media.style.transform = `scale(${config.mediaZoom + (1 - config.mediaZoom) * eased})`;

    if (scrimRef.current) {
      scrimRef.current.style.opacity = `${config.overlayScrim * eased}`;
    }

    if (titleRef.current) {
      const exit = smoothstep(0.28, 0.62, progress);
      titleRef.current.style.opacity = `${1 - exit}`;
      titleRef.current.style.transform = `translate3d(-50%, -50%, 0) translateY(${-28 * exit}px) scale(${1 + 0.06 * exit})`;
    }

    if (hintRef.current) {
      const exit = smoothstep(0, 0.12, progress);
      hintRef.current.style.opacity = `${1 - exit}`;
      hintRef.current.style.transform = `translate3d(-50%, ${8 * exit}px, 0)`;
    }

    if (overlayRef.current) {
      const enter = smoothstep(0.72, 1, progress);
      overlayRef.current.style.opacity = `${enter}`;
      overlayRef.current.style.transform = `translate3d(0, ${18 * (1 - enter)}px, 0)`;
      overlayRef.current.style.pointerEvents = enter > 0.92 ? "auto" : "none";
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!root || !track || !stage) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrame = 0;
    let current = 0;
    let target = 0;
    let stageHeight = 0;
    let running = false;

    const measure = () => {
      const config = propsRef.current;
      stageHeight = config.useWindowScroll ? window.innerHeight : root.clientHeight;
      if (stageHeight <= 0) return;

      stage.style.height = `${stageHeight}px`;
      track.style.height = `${stageHeight * (1 + Math.max(0, config.scrollDistance) + Math.max(0, config.holdDistance))}px`;
      const width = root.clientWidth || stageHeight;
      stage.style.setProperty("--se-title-size", `${clamp(width * 0.075, 20, 84)}px`);
    };

    const readProgress = () => {
      const config = propsRef.current;
      if (reduceMotion) return 1;
      if (!config.enabled) return 1;
      const span = stageHeight * Math.max(0.01, config.scrollDistance);
      if (config.useWindowScroll) {
        return clamp(-track.getBoundingClientRect().top / span, 0, 1);
      }
      return clamp(root.scrollTop / span, 0, 1);
    };

    const tick = () => {
      const config = propsRef.current;
      const strength = config.smoothing <= 0 ? 1 : 1 - Math.exp(-1 / (60 * config.smoothing));
      current += (target - current) * strength;
      if (Math.abs(target - current) < 0.0004) {
        current = target;
        running = false;
      }
      applyProgress(current);
      animationFrame = running ? requestAnimationFrame(tick) : 0;
    };

    const kick = () => {
      if (running) return;
      running = true;
      if (!animationFrame) animationFrame = requestAnimationFrame(tick);
    };

    const handleScroll = () => {
      target = readProgress();
      if (propsRef.current.smoothing <= 0 || reduceMotion) {
        current = target;
        applyProgress(current);
        return;
      }
      kick();
    };

    const handleResize = () => {
      measure();
      target = readProgress();
      current = target;
      applyProgress(current);
    };

    measure();
    target = readProgress();
    current = reduceMotion ? 1 : target;
    applyProgress(current);

    const scroller: Window | HTMLDivElement = useWindowScroll ? window : root;
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(root);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      scroller.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  }, [applyProgress, useWindowScroll]);

  const media = mediaType === "video" ? (
    <video
      ref={(node) => {
        mediaRef.current = node;
      }}
      className="scroll-expand__media"
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
    />
  ) : (
    // The media element is transformed directly on scroll; Next Image's wrapper
    // would add an extra layout layer and break the clip/zoom composition.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={(node) => {
        mediaRef.current = node;
      }}
      className="scroll-expand__media"
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );

  return (
    <div
      ref={rootRef}
      className={`scroll-expand ${useWindowScroll ? "" : "scroll-expand--scroller"} ${className}`.trim()}
      style={style}
      {...rest}
    >
      <div ref={trackRef} className="scroll-expand__track">
        <div ref={stageRef} className="scroll-expand__stage">
          <div ref={frameRef} className="scroll-expand__frame">
            {media}
            <div ref={scrimRef} className="scroll-expand__scrim" />
            {children ? (
              <div ref={overlayRef} className="scroll-expand__overlay">
                {children}
              </div>
            ) : null}
          </div>
          {title ? (
            <div ref={titleRef} className="scroll-expand__title">
              {title}
            </div>
          ) : null}
          {scrollHint ? (
            <div ref={hintRef} className="scroll-expand__hint">
              {scrollHint}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
