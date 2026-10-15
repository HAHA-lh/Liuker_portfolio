"use client";

import { useEffect, useRef, useState } from "react";
import { MEDIA_PRIORITY, unlockMediaPriority } from "../hero-media";
import { readMediaRuntimePolicy } from "../media-runtime";
import { useLanguage } from "../language";
import DotHorse from "./DotHorse";
import "./dot-loader.css";

type Phase = "loading" | "exit" | "done";
const MAX_INTRO_MS = 4000;
const SESSION_KEY = "liuker:intro-seen:v1";

export default function LoadingScreen() {
  const { language } = useLanguage();
  const [phase, setPhase] = useState<Phase>("loading");
  const [canSkip, setCanSkip] = useState(false);
  const skip = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;
    let exiting = false;
    let restored = false;
    const timers: number[] = [];
    const cleanups: Array<() => void> = [];
    const root = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const started = performance.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let repeat = false;
    try { repeat = sessionStorage.getItem(SESSION_KEY) === "1"; } catch { /* Storage is optional. */ }
    const minimumDuration = reduced || repeat ? 0 : 450;
    const previous = { overflow: body.style.overflow, position: body.style.position, width: body.style.width, top: body.style.top };
    root.dataset.siteLoading = "true";
    delete root.dataset.siteReady;
    Object.assign(body.style, { overflow: "hidden", position: "fixed", width: "100%", top: `-${scrollY}px` });

    const schedule = (callback: () => void, ms: number) => {
      timers.push(window.setTimeout(() => { if (!cancelled) callback(); }, ms));
    };
    const restore = (ready: boolean) => {
      if (restored) return;
      restored = true;
      Object.assign(body.style, previous);
      delete root.dataset.siteLoading;
      if (ready) {
        root.dataset.siteReady = "true";
        window.scrollTo(0, scrollY);
        // A failed/offline hero must not prevent the remaining sections loading.
        unlockMediaPriority(MEDIA_PRIORITY.selected);
        document.dispatchEvent(new Event("liuker:site-ready"));
      }
    };
    const enter = () => {
      if (cancelled || exiting) return;
      exiting = true;
      setCanSkip(false);
      schedule(() => {
        setPhase("exit");
        schedule(() => {
          setPhase("done");
          try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* Storage is optional. */ }
          restore(true);
        }, reduced ? 120 : 340);
      }, Math.max(0, minimumDuration - (performance.now() - started)));
    };
    skip.current = enter;
    schedule(() => { if (!exiting) setCanSkip(true); }, 2000);
    // The poster remains visible while the same native video keeps buffering.
    // Do not restart a download or hold the whole site behind a network failure.
    schedule(enter, MAX_INTRO_MS);
    schedule(() => {
      const video = document.querySelector<HTMLVideoElement>("[data-loading-hero]");
      const poster = document.querySelector<HTMLImageElement>(".editorial-hero-media img, .hero-poster img");
      const posterReady = () => {
        if (!poster || poster.complete) { enter(); return; }
        poster.addEventListener("load", enter, { once: true });
        poster.addEventListener("error", enter, { once: true });
        cleanups.push(() => {
          poster.removeEventListener("load", enter);
          poster.removeEventListener("error", enter);
        });
      };
      if (!video || reduced || !readMediaRuntimePolicy().autoPrimeHero) {
        posterReady();
        return;
      }
      const onFrame = () => { if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) enter(); };
      video.addEventListener("loadeddata", onFrame);
      video.addEventListener("canplay", onFrame);
      video.addEventListener("error", posterReady);
      cleanups.push(() => {
        video.removeEventListener("loadeddata", onFrame);
        video.removeEventListener("canplay", onFrame);
        video.removeEventListener("error", posterReady);
      });
      if (video.error) posterReady();
      else onFrame();
    }, 0);

    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
      cleanups.forEach(cleanup => cleanup());
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
        <div className="liuker-loader-progress" aria-hidden="true">
          <div className="liuker-loader-progress-track"><span className="dot-loader-activity" /></div>
        </div>
        <p className="dot-loader-message" role="status" aria-live="polite">
          {phase === "exit" ? (zh ? "即将进入" : "LET’S BEGIN") : (zh ? "正在准备画面" : "Preparing the opening frame")}
        </p>
        {canSkip && <div className="dot-loader-actions">
          <button type="button" onClick={() => skip.current()}>{zh ? "直接进入" : "Enter now"}</button>
        </div>}
      </div>
    </div>
  );
}
