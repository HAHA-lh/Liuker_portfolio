"use client";

import Link from "next/link";
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { MotionHomeFallback } from "./components/MotionHomeFallback";
import { useLanguage } from "./language";
import { MEDIA_PRIORITY, unlockMediaPriority } from "./hero-media";
import "./motion-home.css";

const ShowreelDialog = lazy(() => import("./components/ShowreelDialog").then(m => ({ default: m.ShowreelDialog })));
type MotionScene = ReturnType<typeof import("./components/motion/scene.mjs").createMotionScene>;
const DURATION = 38;
const chapters = [
  { hash: "home", time: 0, zh: "首页", en: "Home" },
  { hash: "the-frame", time: 9.8, zh: "进入画面", en: "The frame" },
  { hash: "services", time: 16.8, zh: "创作方向", en: "Services" },
  { hash: "project-field", time: 24, zh: "精选作品", en: "Selected work" },
  { hash: "about", time: 30, zh: "关于我", en: "About" },
  { hash: "contact", time: 36, zh: "联系合作", en: "Contact" },
];
const workCards = [
  { col: -1, row: -1, href: "/work/quiet-tides", zh: "播", en: "BO" },
  { col: 0, row: -1, href: "/work/afterglow", zh: "百龄坛", en: "Ballantine’s" },
  { col: 1, row: -1, href: "/work/silent-ad", zh: "小电视形象展示", en: "TV character" },
  { col: -1, row: 0, href: "/work/project-2026-08-31-02", zh: "山海经 × 白桃饮料", en: "Mountains, seas & white peach" },
  { col: 0, row: 0, href: "/work", zh: "浏览全部作品", en: "Explore all work" },
  { col: 1, row: 0, href: "/work/orbital-form", zh: "华为荣耀", en: "HONOR" },
  { col: -1, row: 1, href: "/work/kinetic-type", zh: "HOW_Bra", en: "HOW_Bra" },
  { col: 0, row: 1, href: "/work/silent-ad", zh: "小电视形象展示", en: "TV character" },
  { col: 1, row: 1, href: "/work/quiet-tides", zh: "播", en: "BO" },
];
const box = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: `${x / 16}%`, top: `${y / 9}%`, width: `${w / 16}%`, height: `${h / 9}%` });
const smooth = (p: number) => { const n = Math.min(1, Math.max(0, p)); return n * n * (3 - 2 * n); };

export function MotionHome() {
  const { language, setLanguage } = useLanguage();
  const english = language === "en";
  const journey = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<MotionScene | null>(null), timeRef = useRef(0);
  const languageRef = useRef(language), pauseRef = useRef(false);
  const [eligible, setEligible] = useState(false), [ready, setReady] = useState(false);
  const [staticView, setStaticView] = useState(false), [paused, setPaused] = useState(false);
  const [time, setTime] = useState(0), [showreel, setShowreel] = useState(false);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enhanced = eligible && ready && !staticView;
  const closeReel = useCallback(() => setShowreel(false), []);

  useEffect(() => {
    const desktop = matchMedia("(min-width: 960px)"), reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEligible(desktop.matches && !reduce.matches);
    update();desktop.addEventListener("change", update);reduce.addEventListener("change", update);
    return () => { desktop.removeEventListener("change", update);reduce.removeEventListener("change", update); };
  }, []);

  useEffect(() => { languageRef.current = language;scene.current?.setLanguage(language); }, [language]);
  useEffect(() => { pauseRef.current = paused || showreel;scene.current?.setPaused(pauseRef.current); }, [paused, showreel]);
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);

  useEffect(() => {
    if (!eligible || staticView || !canvas.current) return;
    let cancelled = false, instance: MotionScene | null = null;
    const element = canvas.current;
    const start = async () => {
      try {
        const [{ createMotionScene }] = await Promise.all([
          import("./components/motion/scene.mjs"),
          document.fonts.load('156px "LIUKER Display"').catch(() => []),
        ]);
        if (cancelled) return;
        instance = createMotionScene(element, { assetBase: "/motion/assets", heroVideoSrc: "/media/motion/hero-paper-20261114.mp4?v=paper01", language: languageRef.current });
        scene.current = instance;
        await instance.ready;
        if (cancelled) return;
        instance.setProgress(timeRef.current);instance.startLive();instance.setPaused(pauseRef.current);
        document.documentElement.dataset.siteReady = "true";
        document.dispatchEvent(new Event("liuker:site-ready"));
        unlockMediaPriority(MEDIA_PRIORITY.archive);
        setReady(true);
      } catch {
        instance?.dispose();scene.current = null;
        if (!cancelled) setStaticView(true);
      }
    };
    void start();
    return () => { cancelled = true;instance?.dispose();scene.current = null;setReady(false); };
  }, [eligible, staticView]);

  const goTo = useCallback((next: number, hash?: string) => {
    const root = journey.current;
    if (!root) return;
    const range = Math.max(1, root.offsetHeight - innerHeight);
    const top = root.getBoundingClientRect().top + scrollY;
    if (hash) history.replaceState(null, "", `#${hash}`);
    scrollTo({ top: top + next / DURATION * range, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!enhanced) return;
    let frame = 0;
    const update = () => {
      frame = 0;const root = journey.current;if (!root) return;
      const range = Math.max(1, root.offsetHeight - innerHeight);
      const next = Math.max(0, Math.min(DURATION, -root.getBoundingClientRect().top / range * DURATION));
      timeRef.current = next;scene.current?.setProgress(next);setTime(next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const restoreHash = () => {
      const hash = location.hash.slice(1), chapter = chapters.find(c => c.hash === hash);
      if (chapter) goTo(chapter.time);
      else if (hash === "experience" || hash === "studio") goTo(30);
      else if (hash === "work" || hash === "projects") goTo(24);
    };
    addEventListener("scroll", schedule, { passive: true });addEventListener("resize", schedule);addEventListener("hashchange", restoreHash);
    update();restoreHash();
    return () => { cancelAnimationFrame(frame);removeEventListener("scroll", schedule);removeEventListener("resize", schedule);removeEventListener("hashchange", restoreHash); };
  }, [enhanced, goTo]);

  useEffect(() => {
    if (!showreel) return;
    const previous = document.activeElement as HTMLElement | null;
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      const items = dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], video[controls], [tabindex="0"]');
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault();last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault();first.focus(); }
    };
    addEventListener("keydown", trap);
    return () => { removeEventListener("keydown", trap);previous?.focus(); };
  }, [showreel]);

  const copyWechat = async () => {
    try { await navigator.clipboard.writeText("a541067143");setNotice(english ? "WeChat ID copied" : "微信号已复制"); }
    catch { setNotice("WeChat: a541067143"); }
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 3500);
  };
  const headerVisible = time < 4.8 || (time >= 15.8 && time < 21) || time >= 22;
  const galleryActive = time >= 22 && time < 25;
  const dark = time >= 21 && time < 29 || time >= 35;
  const galleryScale = .48 + (.46 - .48) * smooth((time - 18) / 6);
  const chapterIndex = [0, 7.1, 11, 18, 29, 32].reduce((active, start, i) => time >= start ? i : active, 0);

  return (
    <main className="motion-home" data-enhanced={enhanced} data-release="motion-paper-20261114" data-dark={dark}>
      <Link prefetch={false} className="motion-skip" href="/work">{english ? "Skip to all work" : "跳转至全部作品"}</Link>
      <div hidden={enhanced}><MotionHomeFallback onOpenShowreel={() => setShowreel(true)} /></div>
      <div className="motion-desktop-journey" ref={journey} aria-label={english ? "LIUKER creative journey" : "LIUKER 创作之旅"} hidden={!enhanced}>
        <div className="motion-desktop-viewport">
          <div className="motion-desktop-stage">
            <canvas ref={canvas} width={1600} height={900} aria-hidden="true" />
            <div className="motion-accessible-copy">
              <h1>LIUKER — BEYOND THE FRAME.</h1>
              <p>{english ? "Independent visual creator. Film, AI/CGI and motion design." : "独立视觉创作者。影像、AI/CGI 与动态设计。创意，不止于画面。"}</p>
              <h2>{english ? chapters[chapterIndex].en : chapters[chapterIndex].zh}</h2>
            </div>
            {headerVisible && <nav aria-label={english ? "Main navigation" : "主导航"}>
              <a className="motion-hotspot" style={box(65, 22, 220, 60)} href="#home" onClick={e => { e.preventDefault();goTo(0, "home"); }} aria-label={english ? "LIUKER home" : "LIUKER 首页"} />
              <Link prefetch={false} className="motion-hotspot" style={box(644, 24, 111, 56)} href="/work" aria-label={english ? "All work" : "全部作品"} />
              <a className="motion-hotspot" style={box(765, 24, 120, 56)} href="#about" onClick={e => { e.preventDefault();goTo(30, "about"); }} aria-label={english ? "About LIUKER" : "关于 LIUKER"} />
              <Link prefetch={false} className="motion-hotspot" style={box(1320, 18, 225, 70)} href="/contact" aria-label={english ? "Work with LIUKER" : "联系合作"} />
            </nav>}
            {time < 3.4 && <>
              <button type="button" className="motion-hotspot" style={box(72, 772, 224, 58)} onClick={() => setShowreel(true)} aria-haspopup="dialog" aria-label={english ? "Play Showreel" : "播放 Showreel"} />
              <a className="motion-hotspot" style={box(1290, 782, 198, 58)} href="#the-frame" onClick={e => { e.preventDefault();goTo(9.8, "the-frame"); }} aria-label={english ? "Enter the creative journey" : "进入创作之旅"} />
            </>}
            {time >= 15.8 && time < 18 && <nav aria-label={english ? "Creative services" : "创作方向"}>
              {[{ href: "/portfolio/film-post", y: 275, zh: "品牌影片", en: "Brand film" }, { href: "/portfolio/aigc", y: 435, zh: "AI / CGI", en: "AI / CGI" }, { href: "/work", y: 595, zh: "动态设计", en: "Motion design" }].map(item => <Link prefetch={false} key={item.href} className="motion-hotspot" style={box(1120, item.y, 420, 115)} href={item.href} aria-label={english ? item.en : item.zh} />)}
            </nav>}
            {galleryActive && <nav aria-label={english ? "Selected projects" : "精选项目"}>
              {workCards.map((card, i) => <Link prefetch={false} key={i} className="motion-hotspot motion-project-hotspot" style={box(800 + card.col * 660 * galleryScale - 305 * galleryScale, 510 + card.row * 435 * galleryScale - 171.5625 * galleryScale, 610 * galleryScale, 343.125 * galleryScale)} href={card.href} aria-label={english ? card.en : card.zh}><span>{english ? "View project ↗" : "查看作品 ↗"}</span></Link>)}
              <Link prefetch={false} className="motion-all-work" href="/work">{english ? "View all work ↗" : "浏览全部作品 ↗"}</Link>
            </nav>}
            {time >= 35 && <>
              <a className="motion-hotspot" style={box(65, 688, 540, 62)} href="mailto:541067143@qq.com" aria-label={english ? "Email 541067143@qq.com" : "发送邮件至 541067143@qq.com"} />
              <button className="motion-hotspot" style={box(65, 755, 370, 55)} onClick={copyWechat} aria-label={english ? "Copy WeChat ID a541067143" : "复制微信号 a541067143"} />
              <a className="motion-hotspot" style={box(1310, 755, 235, 55)} href="tel:+8615072059913" aria-label={english ? "Call 15072059913" : "拨打 15072059913"} />
              <Link prefetch={false} className="motion-hotspot" style={box(1390, 650, 160, 120)} href="/contact" aria-label={english ? "Start a project" : "发起合作需求"} />
            </>}
          </div>
          <nav className="motion-chapters" aria-label={english ? "Jump to a section" : "跳转章节"}>
            {chapters.map((chapter, i) => <a key={chapter.hash} href={`#${chapter.hash}`} aria-label={english ? chapter.en : chapter.zh} title={english ? chapter.en : chapter.zh} aria-current={i === chapterIndex ? "step" : undefined} onClick={e => { e.preventDefault();goTo(chapter.time, chapter.hash); }} />)}
          </nav>
          <div className="motion-utilities">
            <button onClick={() => setShowreel(true)}>{english ? "Play showreel ↗" : "播放作品集 ↗"}</button>
            <button onClick={() => setLanguage(english ? "zh" : "en")} aria-label={english ? "切换中文" : "Switch to English"}>{english ? "中文" : "EN"}</button>
            <button onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? (english ? "Play motion" : "播放动态") : (english ? "Pause motion" : "暂停动态")}</button>
            <button onClick={() => { setStaticView(true);scrollTo(0, 0); }}>{english ? "Simple view" : "简洁浏览"}</button>
          </div>
          <div className="motion-scroll-progress" aria-hidden="true" style={{ transform: `scaleX(${time / DURATION})` }} />
        </div>
      </div>
      {!enhanced && <div className="motion-static-utilities">
        <button onClick={() => setShowreel(true)}>{english ? "Play showreel ↗" : "播放作品集 ↗"}</button>
        {eligible && staticView && <button onClick={() => { setStaticView(false);scrollTo(0, 0); }}>{english ? "Animated experience" : "动态浏览"}</button>}
      </div>}
      {notice && <div className="motion-notice" role="status">{notice}</div>}
      {showreel && <Suspense fallback={<div className="motion-notice" role="status">{english ? "Opening showreel…" : "正在打开作品集…"}</div>}><ShowreelDialog open onClose={closeReel} /></Suspense>}
    </main>
  );
}
