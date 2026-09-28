"use client";

import { useEffect, useRef, useState } from "react";
import { HERO_MEDIA_PREPARED_EVENT, selectHeroVideoSource, selectShowreelVideoSource } from "../hero-media";
import { preloadVideo } from "../video-preload";
import { useLanguage } from "../language";
import DotHorse from "./DotHorse";
import "./dot-loader.css";

type Phase = "loading" | "error" | "exit" | "done";
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export default function LoadingScreen() {
  const { language } = useLanguage();
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0);
  const [count, setCount] = useState({ loaded: 0, total: 0 });
  const retry = useRef<() => void>(() => {});
  const skip = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;
    let exiting = false;
    let controller = new AbortController();
    const root = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const previous = { overflow: body.style.overflow, position: body.style.position, width: body.style.width, top: body.style.top };
    root.dataset.siteLoading = "true";
    delete root.dataset.siteReady;
    Object.assign(body.style, { overflow: "hidden", position: "fixed", width: "100%", top: `-${scrollY}px` });
    const restore = (ready: boolean) => {
      Object.assign(body.style, previous);
      delete root.dataset.siteLoading;
      if (ready) {
        root.dataset.siteReady = "true";
        window.scrollTo(0, scrollY);
        document.dispatchEvent(new Event("liuker:site-ready"));
      }
    };
    const enter = async (complete: boolean) => {
      if (cancelled || exiting) return;
      exiting = true;
      controller.abort();
      if (complete) setProgress(100);
      setPhase("exit");
      await wait(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 120 : 340);
      if (cancelled) return;
      setPhase("done");
      restore(true);
    };
    const run = async () => {
      controller.abort();
      controller = new AbortController();
      const attempt = controller;
      const started = performance.now();
      setPhase("loading");
      setProgress(0);
      // Read mounted homepage previews, not videos belonging to other routes.
      const hero = selectHeroVideoSource();
      const sources = [...new Set([hero, selectShowreelVideoSource(),
        ...Array.from(document.querySelectorAll<HTMLVideoElement>("video[data-preload-src]"), video => video.dataset.preloadSrc!).filter(Boolean),
      ])];
      const scores = sources.map(() => 0);
      setCount({ loaded: 0, total: sources.length });
      let cursor = 0;
      const timeout = window.setTimeout(() => attempt.abort(new Error("Video loading timed out")), 180000);
      try {
        const worker = async () => {
          while (cursor < sources.length) {
            const index = cursor++;
            const source = sources[index];
            const prepared = await preloadVideo(source, attempt.signal, value => {
              if (cancelled || attempt.signal.aborted) return;
              scores[index] = value;
              setProgress(Math.min(99, scores.reduce((a, b) => a + b, 0) / sources.length * 100));
              setCount({ loaded: scores.filter(score => score === 1).length, total: sources.length });
            });
            if (source === hero) {
              window.__LIUKER_PREPARED_HERO_MEDIA__ = { source, ...prepared };
              document.dispatchEvent(new Event(HERO_MEDIA_PREPARED_EVENT));
            }
          }
        };
        await Promise.all([worker(), worker()]);
        clearTimeout(timeout);
        await wait(Math.max(0, 1800 - (performance.now() - started)));
        if (!cancelled && !attempt.signal.aborted) await enter(true);
      } catch {
        clearTimeout(timeout);
        attempt.abort();
        if (!cancelled && !exiting) setPhase("error");
      }
    };
    retry.current = () => { void run(); };
    skip.current = () => { void enter(false); };
    // Defer until sibling effects and all initial video nodes are mounted.
    const start = window.setTimeout(() => { void run(); }, 0);
    return () => {
      cancelled = true;
      clearTimeout(start);
      controller.abort();
      restore(false);
    };
  }, []);

  if (phase === "done") return null;
  const zh = language === "zh";
  return (
    <div className={`liuker-loader dot-loader phase-${phase}`} aria-label={zh ? "页面加载中" : "Loading page"}>
      <div className="liuker-loader-stage">
        <div className="liuker-loader-art" aria-hidden="true">
          <DotHorse />
          <span className="dot-loader-brand">LIUKER</span>
          <span className="dot-loader-edition">BEYOND THE FRAME / 01</span>
        </div>
        <div className="liuker-loader-progress">
          <div className="liuker-loader-progress-track" role="progressbar" aria-label={zh ? "视频加载进度" : "Video loading progress"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(progress)}>
            <span className="liuker-loader-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="liuker-loader-progress-meta">
            <span>{Math.floor(progress)}%</span>
            <span>{zh ? "视频" : "Videos"} {count.loaded}/{count.total}</span>
          </div>
        </div>
        <p className="dot-loader-message" role="status" aria-live="polite">
          {phase === "error" ? (zh ? "部分视频加载失败，请重试。" : "Some videos could not load. Please retry.")
            : phase === "exit" ? (progress === 100 ? (zh ? "加载完成，即将进入" : "Ready to enter") : (zh ? "继续进入网页" : "Entering"))
            : (zh ? "正在加载首页视频，请稍候" : "Loading homepage videos…")}
        </p>
        {phase === "error" && <div className="dot-loader-actions">
          <button type="button" onClick={() => retry.current()}>{zh ? "重新加载" : "Retry"}</button>
          <button type="button" onClick={() => skip.current()}>{zh ? "跳过未完成视频，继续进入" : "Continue without remaining videos"}</button>
        </div>}
      </div>
    </div>
  );
}
