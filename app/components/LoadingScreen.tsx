"use client";

import { useEffect, useRef, useState } from "react";
import {
  HERO_FRAME_READY_EVENT,
  HERO_MEDIA_PREPARED_EVENT,
  HERO_POSTER_AVIF,
  HERO_POSTER_WEBP,
  prepareHeroVideo,
} from "../hero-media";
import { useLanguage } from "../language";

type Phase = "enter" | "loading" | "ready" | "exit" | "done";
type ReadinessScore = "poster" | "font" | "paint" | "video";

const MIN_FIRST_VISIT_MS = 1150;
const MIN_REPEAT_VISIT_MS = 320;
const MAX_WAIT_MS = 18000;
const READY_HOLD_MS = 260;
const EXIT_MS = 760;
const SESSION_KEY = "liuker-loader-ack:v2";
const SCORE_WEIGHT: Record<ReadinessScore, number> = {
  poster: 0.15,
  font: 0.1,
  paint: 0.05,
  video: 0.7,
};

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function waitForPaint(signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    let firstFrame = 0;
    let secondFrame = 0;
    const finish = () => {
      signal.removeEventListener("abort", finish);
      if (firstFrame) window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
      resolve();
    };
    signal.addEventListener("abort", finish, { once: true });
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(finish);
    });
  });
}

function loadImage(source: string, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", finish);
      image.onload = null;
      image.onerror = null;
      resolve();
    };
    signal.addEventListener("abort", finish, { once: true });
    image.decoding = "async";
    image.onload = finish;
    image.onerror = finish;
    image.src = source;
    if (image.complete) finish();
  });
}

async function waitForFonts(signal: AbortSignal) {
  const ready = document.fonts?.ready;
  if (!ready || signal.aborted) return;
  await Promise.race([
    ready.catch(() => undefined),
    new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true })),
  ]);
}

function waitForHeroFrame(timeoutMs: number) {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ready: boolean) => {
      if (settled) return;
      settled = true;
      document.removeEventListener(HERO_FRAME_READY_EVENT, onReady);
      window.clearTimeout(timer);
      resolve(ready);
    };
    const onReady = () => finish(true);
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    document.addEventListener(HERO_FRAME_READY_EVENT, onReady, { once: true });
  });
}

export default function LoadingScreen() {
  const { language } = useLanguage();
  const [phase, setPhase] = useState<Phase>("enter");
  const [progress, setProgress] = useState(2);
  const [streamFallback, setStreamFallback] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    const root = document.documentElement;
    const body = document.body;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let repeatVisit = false;
    try {
      repeatVisit = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      repeatVisit = false;
    }

    const scrollY = window.scrollY;
    const previousBody = {
      overflow: body.style.overflow,
      position: body.style.position,
      width: body.style.width,
      top: body.style.top,
    };
    root.dataset.siteLoading = "true";
    delete root.dataset.siteReady;
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.width = "100%";
    body.style.top = `-${scrollY}px`;

    const controller = new AbortController();
    const scores: Record<ReadinessScore, number> = {
      poster: 0,
      font: 0,
      paint: 0,
      video: 0,
    };
    let scrollRestored = false;

    const updateScore = (key: ReadinessScore, value: number) => {
      scores[key] = Math.min(1, Math.max(scores[key], value));
      const next = Object.entries(scores).reduce(
        (sum, [scoreKey, scoreValue]) =>
          sum + SCORE_WEIGHT[scoreKey as ReadinessScore] * scoreValue,
        0,
      );
      if (!cancelledRef.current) setProgress(Math.min(99, 2 + next * 97));
    };

    const restorePage = () => {
      if (scrollRestored) return;
      scrollRestored = true;
      body.style.overflow = previousBody.overflow;
      body.style.position = previousBody.position;
      body.style.width = previousBody.width;
      body.style.top = previousBody.top;
      delete root.dataset.siteLoading;
      root.dataset.siteReady = "true";
      window.scrollTo(0, scrollY);
      document.dispatchEvent(new Event("liuker:site-ready"));
    };

    const posterTask = Promise.all([
      loadImage(HERO_POSTER_AVIF, controller.signal),
      loadImage(HERO_POSTER_WEBP, controller.signal),
    ]).then(() => updateScore("poster", 1));
    const fontTask = waitForFonts(controller.signal).then(() => updateScore("font", 1));
    const paintTask = waitForPaint(controller.signal).then(() => updateScore("paint", 1));
    const videoTask = prepareHeroVideo({
      signal: controller.signal,
      onProgress: (value) => updateScore("video", value),
    }).then(() => updateScore("video", 1));

    const run = async () => {
      const startedAt = performance.now();
      const minimumDuration = repeatVisit ? MIN_REPEAT_VISIT_MS : MIN_FIRST_VISIT_MS;
      const raf = window.requestAnimationFrame(() => {
        if (!cancelledRef.current) setPhase("loading");
      });

      let timedOut = false;
      const allCriticalAssets = Promise.all([posterTask, fontTask, paintTask, videoTask]);
      const timeout = wait(MAX_WAIT_MS).then(() => {
        timedOut = true;
      });

      try {
        await Promise.race([allCriticalAssets, timeout]);
        if (timedOut) {
          controller.abort();
          setStreamFallback(true);
        } else {
          const frameReady = waitForHeroFrame(1400);
          document.dispatchEvent(new Event(HERO_MEDIA_PREPARED_EVENT));
          await frameReady;
        }
      } catch {
        controller.abort();
        setStreamFallback(true);
      } finally {
        window.cancelAnimationFrame(raf);
      }

      if (cancelledRef.current) return;
      const remaining = minimumDuration - (performance.now() - startedAt);
      if (remaining > 0) await wait(remaining);
      if (cancelledRef.current) return;

      setProgress(100);
      setPhase("ready");
      if (!reduceMotion) await wait(READY_HOLD_MS);
      if (cancelledRef.current) return;

      setPhase("exit");
      await wait(reduceMotion ? 180 : EXIT_MS);
      if (cancelledRef.current) return;

      try {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Private browsing can reject session storage; replaying is harmless.
      }
      setPhase("done");
      restorePage();
    };

    void run();
    return () => {
      cancelledRef.current = true;
      controller.abort();
      restorePage();
    };
  }, []);

  if (phase === "done") return null;

  const ready = phase === "ready" || phase === "exit";
  const label = ready
    ? language === "zh" ? "准备就绪" : "READY"
    : `${Math.round(progress).toString().padStart(2, "0")}%`;
  const subtitle = language === "zh"
    ? ready
      ? streamFallback ? "已切换流式加载" : "首屏视频与交互已就绪"
      : "正在缓存首屏交互视频"
    : ready
      ? streamFallback ? "Streaming fallback enabled" : "Hero video and interaction ready"
      : "Caching interactive hero video";

  return (
    <div
      className={`liuker-loader phase-${phase}${streamFallback ? " is-stream-fallback" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy={!ready}
      aria-label={language === "zh" ? "页面加载中" : "Loading page"}
    >
      <span className="liuker-loader-glow liuker-loader-glow-a" aria-hidden="true" />
      <span className="liuker-loader-glow liuker-loader-glow-b" aria-hidden="true" />
      <div className="liuker-loader-grid" aria-hidden="true" />

      <div className="liuker-loader-stage">
        <div className="liuker-loader-brand">
          <div className="liuker-loader-orb" aria-hidden="true">
            <span className="liuker-loader-ring liuker-loader-ring-a" />
            <span className="liuker-loader-ring liuker-loader-ring-b" />
            <span className="liuker-loader-dot" />
            <span className="liuker-loader-dot-pulse" />
          </div>
          <span className="liuker-loader-name">LIUKER</span>
          <span className="liuker-loader-divider" aria-hidden="true" />
          <span className="liuker-loader-role">
            {language === "zh" ? "视频创作者 · 动态设计" : "VIDEO CREATOR · MOTION DESIGN"}
          </span>
        </div>

        <div className="liuker-loader-progress">
          <div
            className="liuker-loader-progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <span className="liuker-loader-progress-bar" style={{ width: `${progress}%` }} />
            <span className="liuker-loader-progress-shimmer" aria-hidden="true" />
          </div>
          <div className="liuker-loader-progress-meta">
            <span className="liuker-loader-progress-label">{label}</span>
            <span className="liuker-loader-progress-subtitle">{subtitle}</span>
          </div>
        </div>

        <div className="liuker-loader-corner liuker-loader-corner-tl" aria-hidden="true">
          <span>LIUKER / 01</span>
          <span>{language === "zh" ? "关键素材预载" : "CRITICAL PRELOAD"}</span>
        </div>
        <div className="liuker-loader-corner liuker-loader-corner-tr" aria-hidden="true">
          <span>{language === "zh" ? "首屏交互" : "HERO INTERACTION"}</span>
          <span>2026</span>
        </div>
        <div className="liuker-loader-corner liuker-loader-corner-bl" aria-hidden="true">
          <span>{language === "zh" ? "视频缓存" : "VIDEO CACHE"}</span>
          <span>{language === "zh" ? "加载后进入" : "ENTER WHEN READY"}</span>
        </div>
        <div className="liuker-loader-corner liuker-loader-corner-br" aria-hidden="true">
          <span>{streamFallback ? "STREAM" : "BUFFER"}</span>
          <span>{Math.round(progress).toString().padStart(3, "0")}</span>
        </div>
      </div>
    </div>
  );
}
