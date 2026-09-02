"use client";

import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowDown, ArrowUpRight, Play } from "lucide-react";
import { gsap } from "gsap";
import Link from "next/link";
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { EditorialHeader } from "./components/EditorialHeader";
import { BorderGlowLink } from "./components/BorderGlowLink";
import { ExperienceHeading } from "./components/ExperienceHeading";
import type { FocusItem } from "./components/EditorialFocus";
import { PriorityPreviewVideo } from "./components/PriorityPreviewVideo";
import LoadingScreen from "./components/LoadingScreen";
import { CounterMediaReveal, DualLayerHeading, MediaScrollExit, ScrollParallax, SectionTransition, SplitLineReveal, mediaDirections, motionContext, scrubMotion } from "./components/EditorialMotion";
import { projects, siteContent, t } from "./content";
import {
  getPreparedHeroVideoSource,
  MEDIA_PRIORITY,
  HERO_MEDIA_PREPARED_EVENT,
  HERO_POSTER_AVIF,
  HERO_POSTER_WEBP,
  selectHeroVideoSource,
  markHeroFrameReady,
} from "./hero-media";
import { useLanguage } from "./language";
import { mediaUrl } from "./media-delivery";
import { readMediaRuntimePolicy, subscribeMediaRuntimePolicy } from "./media-runtime";
import { useTheme } from "./theme";

const LazyEditorialFocus = lazy(() => import("./components/EditorialFocus").then((module) => ({ default: module.EditorialFocus })));
const LazyShowreelDialog = lazy(() => import("./components/ShowreelDialog").then((module) => ({ default: module.ShowreelDialog })));

const aboutCopy = {
  zh: "我是 LIUKER，专注于影像、动态设计与 AI/CGI。工作横跨创意方向、剪辑、后期和三维视觉，把概念发展为能够被观看、记住并传播的画面。",
  en: "I am LIUKER, working across film, motion design and AI/CGI. From creative direction and editing to post-production and 3D, I turn concepts into images made to be watched, remembered and shared.",
};

const disciplines = [
  { id: "01", zh: "创意方向", en: "CREATIVE DIRECTION", projectIndex: 0 },
  { id: "02", zh: "影像与剪辑", en: "FILM / EDITING", projectIndex: 1 },
  { id: "03", zh: "AI 与 CGI", en: "AI / CGI", projectIndex: 4 },
  { id: "04", zh: "动态设计", en: "MOTION DESIGN", projectIndex: 8 },
];

type ScrubbableVideo = HTMLVideoElement & {
  fastSeek?: (time: number) => void;
  requestVideoFrameCallback?: (
    callback: (now: number, metadata: { mediaTime: number }) => void,
  ) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

function EditorialScrollHero({ onOpenShowreel }: { onOpenShowreel: () => void }) {
  const { language } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const durationRef = useRef(0);
  const scrollProgressRef = useRef(0);
  const targetTimeRef = useRef(0);
  const seekFrameRef = useRef<number | null>(null);
  const lastSeekAtRef = useRef(0);
  const settleTimerRef = useRef<number | null>(null);
  const presentedFrameRef = useRef<number | null>(null);
  const preciseSeekRef = useRef(false);
  const loadRequestedRef = useRef(false);
  const seekIntervalRef = useRef(50);
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [siteReady, setSiteReady] = useState(false);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const progressScale = useTransform(scrollYProgress, [0, 1], [0.03, 1]);

  useEffect(() => {
    const updatePolicy = () => {
      seekIntervalRef.current = readMediaRuntimePolicy().heroSeekIntervalMs;
    };
    updatePolicy();
    return subscribeMediaRuntimePolicy(updatePolicy);
  }, []);

  useEffect(() => {
    const markSiteReady = () => setSiteReady(true);
    document.addEventListener("liuker:site-ready", markSiteReady);
    if (document.documentElement.dataset.siteReady === "true") markSiteReady();
    return () => document.removeEventListener("liuker:site-ready", markSiteReady);
  }, []);

  useLayoutEffect(() => {
    if (!siteReady) return;
    const root = sectionRef.current;
    if (!root) return;
    return motionContext(root, mobile => {
      const media = root.querySelector<HTMLElement>(".editorial-hero-media-frame")!;
      const mediaLayers = Array.from(media.querySelectorAll<HTMLElement>(".editorial-hero-media, video"));
      const words = Array.from(root.querySelectorAll<HTMLElement>(".motion-hero-word"));
      const masks = Array.from(root.querySelectorAll<HTMLElement>(".motion-hero-word-inner"));
      const outlines = Array.from(root.querySelectorAll<HTMLElement>(".motion-dual-outline"));
      const solids = Array.from(root.querySelectorAll<HTMLElement>(".motion-dual-solid"));
      const intro = gsap.timeline({ defaults: { duration: 1.15, ease: "power4.out" } });
      masks.forEach((word, index) => intro.fromTo(word, { yPercent: index ? -115 : 115 }, { yPercent: 0 }, index * 0.08));
      intro.fromTo(outlines, { xPercent: -12 }, { xPercent: 0 }, 0)
        .fromTo(solids, { xPercent: 12 }, { xPercent: 0 }, 0);
      const tl = scrubMotion(root, [media, ...words], "top top", "bottom bottom", 0.55);
      tl.fromTo(media, { clipPath: `inset(12% ${mobile ? 18 : 32}%)`, scale: 1 }, { clipPath: "inset(0% 0%)", duration: 0.36, ease: "power3.inOut" }, 0)
        // Keep the head inside the opening window; settle back as the mask opens.
        .fromTo(mediaLayers, { yPercent: 12 }, { yPercent: 0, duration: 0.36, ease: "power3.inOut" }, 0)
        .to(media, { scale: mobile ? 0.9 : 0.75, duration: 0.26, ease: "power3.inOut" }, 0.74)
        .fromTo(words[0], { xPercent: 0 }, { xPercent: mobile ? -9 : -20, duration: 0.85, ease: "none" }, 0.1)
        .fromTo(words[1], { xPercent: 0 }, { xPercent: mobile ? 9 : 20, duration: 0.85, ease: "none" }, 0.1)
        .to(outlines, { color: "#ee5b78", duration: 0.12 }, 0.2)
        .to(outlines, { color: "#f7f3ed", duration: 0.2 }, 0.32);
    });
  }, [siteReady]);

  const requestVideo = useCallback(() => {
    if (loadRequestedRef.current) return;
    loadRequestedRef.current = true;
    setVideoSource(getPreparedHeroVideoSource() ?? selectHeroVideoSource());
  }, []);

  const notifyFrameReady = useCallback(() => {
    setFrameReady(true);
    markHeroFrameReady();
  }, []);

  const markNextPresentedFrame = useCallback((video: ScrubbableVideo) => {
    if (!video.requestVideoFrameCallback) return;
    if (presentedFrameRef.current !== null && video.cancelVideoFrameCallback) {
      video.cancelVideoFrameCallback(presentedFrameRef.current);
    }
    presentedFrameRef.current = video.requestVideoFrameCallback(() => {
      presentedFrameRef.current = null;
      notifyFrameReady();
    });
  }, [notifyFrameReady]);

  const seekToLatestTarget = useCallback((timestamp: number) => {
    seekFrameRef.current = null;
    const video = videoRef.current as ScrubbableVideo | null;
    if (reducedMotion || !video || !durationRef.current) return;

    const precise = preciseSeekRef.current;
    preciseSeekRef.current = false;
    if (!precise && timestamp - lastSeekAtRef.current < seekIntervalRef.current) return;

    const targetTime = Math.min(
      Math.max(0.01, targetTimeRef.current),
      Math.max(0.01, durationRef.current - 0.05),
    );
    const difference = targetTime - (Number.isFinite(video.currentTime) ? video.currentTime : 0);
    if (Math.abs(difference) < 0.012) {
      markNextPresentedFrame(video);
      return;
    }

    try {
      if (!precise && Math.abs(difference) > 0.16 && video.fastSeek) video.fastSeek(targetTime);
      else video.currentTime = targetTime;
    } catch {
      video.currentTime = targetTime;
    }
    lastSeekAtRef.current = timestamp;
    markNextPresentedFrame(video);
  }, [markNextPresentedFrame, reducedMotion]);

  const queueSeek = useCallback((precise = false) => {
    preciseSeekRef.current = preciseSeekRef.current || precise;
    if (seekFrameRef.current === null) {
      seekFrameRef.current = window.requestAnimationFrame(seekToLatestTarget);
    }
  }, [seekToLatestTarget]);

  const queueSettledSeek = useCallback(() => {
    if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      queueSeek(true);
    }, 96);
  }, [queueSeek]);

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    scrollProgressRef.current = Math.min(1, Math.max(0, progress));
    if (scrollProgressRef.current > 0.001) requestVideo();
    const video = videoRef.current;
    if (reducedMotion || !video || !durationRef.current) return;
    targetTimeRef.current = scrollProgressRef.current * Math.max(0, durationRef.current - 0.05);
    queueSeek();
    queueSettledSeek();
  });

  useEffect(() => {
    const video = videoRef.current as ScrubbableVideo | null;
    return () => {
      if (seekFrameRef.current !== null) window.cancelAnimationFrame(seekFrameRef.current);
      if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
      if (video && presentedFrameRef.current !== null && video.cancelVideoFrameCallback) {
        video.cancelVideoFrameCallback(presentedFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const requestOnScroll = () => requestVideo();
    window.addEventListener("scroll", requestOnScroll, { passive: true, once: true });
    return () => window.removeEventListener("scroll", requestOnScroll);
  }, [requestVideo]);

  useEffect(() => {
    const usePreparedMedia = () => requestVideo();
    document.addEventListener(HERO_MEDIA_PREPARED_EVENT, usePreparedMedia);
    if (getPreparedHeroVideoSource()) requestVideo();
    return () => document.removeEventListener(HERO_MEDIA_PREPARED_EVENT, usePreparedMedia);
  }, [requestVideo]);

  const registerDuration = useCallback(() => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    durationRef.current = video.duration;
    targetTimeRef.current = Math.max(
      0.01,
      scrollProgressRef.current * Math.max(0, video.duration - 0.05),
    );
    video.pause();
    queueSeek(true);
  }, [queueSeek]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.addEventListener("loadedmetadata", registerDuration);
    video.addEventListener("durationchange", registerDuration);
    registerDuration();
    return () => {
      video.removeEventListener("loadedmetadata", registerDuration);
      video.removeEventListener("durationchange", registerDuration);
    };
  }, [registerDuration, videoSource]);

  return (
    <section ref={sectionRef} className="editorial-scroll-hero" aria-label="Scroll-controlled showreel">
      <div className="editorial-hero">
        <div
          className="editorial-hero-media-frame"
        >
          <picture className={`editorial-hero-media ${frameReady ? "is-hidden" : ""}`} aria-hidden="true">
            <source srcSet={HERO_POSTER_AVIF} type="image/avif" />
            <img src={HERO_POSTER_WEBP} alt="" fetchPriority="high" />
          </picture>
          <video
            ref={videoRef}
            src={videoSource ?? undefined}
            muted
            playsInline
            preload={videoSource ? "metadata" : "none"}
            onLoadedMetadata={registerDuration}
            onCanPlay={() => queueSeek(true)}
            onLoadedData={() => {
              queueSeek(true);
              notifyFrameReady();
            }}
            onSeeked={notifyFrameReady}
            disablePictureInPicture
            tabIndex={-1}
            aria-label="16 by 9 scroll-controlled showreel"
          />
          <div className="editorial-hero-shade" aria-hidden="true" />
        </div>
        <div
          className="editorial-hero-copy"
        >
          <p className="editorial-overline"><SplitLineReveal>LIUKER / PORTFOLIO 2026</SplitLineReveal></p>
          <h1 id="editorial-hero-title">
            {["SHOW", "REEL"].map(line => (
              <span className="motion-hero-word" key={line}>
                <span className="motion-hero-word-inner"><DualLayerHeading controlled>{line}</DualLayerHeading></span>
              </span>
            ))}
          </h1>
          <div className="editorial-hero-foot">
            <p><SplitLineReveal>{t(siteContent.heroIntro, language)}</SplitLineReveal></p>
            <button type="button" className="editorial-play" onClick={onOpenShowreel}>
              <Play size={17} fill="currentColor" />
              <SplitLineReveal>{language === "zh" ? "播放作品集" : "Play reel"}</SplitLineReveal>
            </button>
          </div>
        </div>
        <a className="editorial-scroll-cue" href="#selected-work" aria-label="Selected work">
          <ArrowDown size={18} />
        </a>
        <div className="editorial-hero-progress" aria-hidden="true">
          <motion.span style={{ scaleY: reducedMotion ? 1 : progressScale }} />
        </div>
      </div>
    </section>
  );
}

function DeferredEditorialFocus({ items, title, viewLabel }: { items: FocusItem[]; title: string; viewLabel: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || mounted) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setMounted(true);
        observer.disconnect();
      },
      { rootMargin: "1200px 0px", threshold: 0.01 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [mounted]);

  const firstItem = items[0];
  return (
    <div ref={ref} className="deferred-focus-shell">
      {mounted ? (
        <Suspense fallback={<div className="deferred-focus-loading" aria-hidden="true" />}>
          <LazyEditorialFocus title={title} items={items} viewLabel={viewLabel} />
        </Suspense>
      ) : (
        <section id="services" className="editorial-section editorial-services motion-focus deferred-focus-placeholder">
          <div className="editorial-section-head motion-focus-head">
            <p className="editorial-index">02</p>
            <h2>{title}</h2>
          </div>
          <div className="deferred-focus-preview" style={{ background: firstItem?.media.background }}>
            {firstItem?.media.poster ? <img src={firstItem.media.poster} alt="" loading="lazy" decoding="async" /> : null}
          </div>
        </section>
      )}
    </div>
  );
}


function ExperienceItem({
  item,
  index,
  language,
}: {
  item: (typeof siteContent.experience)[number];
  index: number;
  language: "zh" | "en";
}) {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 92%", "end 8%"],
  });
  const yearX = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [-60, 0, 0, -60]);
  const jobX = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [60, 0, 0, 60]);
  const yearColor = useTransform(
    scrollYProgress,
    [0, 0.2, 0.74, 1],
    [theme === "light" ? "#898985" : "#686d71", "#ee5b78", "#ee5b78", theme === "light" ? "#898985" : "#686d71"],
  );

  return (
    <div ref={ref} className="editorial-experience-item">
      <span className="editorial-experience-number">{String(index + 1).padStart(2, "0")}</span>
      <motion.p
        className="editorial-experience-year"
        style={{ x: reducedMotion ? 0 : yearX, color: reducedMotion ? "#ee5b78" : yearColor }}
      >
        {item.year}
      </motion.p>
      <motion.div style={{ x: reducedMotion ? 0 : jobX }}>
        <h3>{t(item.title, language)}</h3>
        <p>{t(item.note, language)}</p>
      </motion.div>
      <span className="editorial-experience-year-ghost" aria-hidden="true">
        {item.year.match(/\d{4}/)?.[0] ?? item.year}
      </span>
    </div>
  );
}

const toolkitRows = [
  ["After Effects", "DaVinci Resolve", "Cinema 4D", "Blender"],
  ["Premiere Pro", "Photoshop", "Illustrator", "Figma"],
];

function ToolkitMarquee() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    return motionContext(root, () => {
      const rows = Array.from(root.querySelectorAll<HTMLElement>(".toolkit-marquee-row"));
      const cleanups = rows.map((row, index) => {
        const track = row.querySelector<HTMLElement>(".toolkit-marquee-track")!;
        const loop = gsap.fromTo(track, { xPercent: index ? -50 : 0 }, { xPercent: index ? 0 : -50, repeat: -1, duration: 46, ease: "none", paused: true });
        let speedTween: gsap.core.Tween | undefined;
        const slow = () => { speedTween?.kill(); speedTween = gsap.to(loop, { timeScale: 0.25, duration: 0.4 }); };
        const resume = () => { speedTween?.kill(); speedTween = gsap.to(loop, { timeScale: 1, duration: 0.6 }); };
        let visible = false;
        const sync = () => { if (visible && !document.hidden) loop.play(); else loop.pause(); };
        const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
        observer.observe(row);
        document.addEventListener("visibilitychange", sync);
        row.addEventListener("pointerenter", slow); row.addEventListener("pointerleave", resume);
        row.addEventListener("focusin", slow); row.addEventListener("focusout", resume);
        return () => {
          observer.disconnect(); speedTween?.kill(); loop.kill();
          document.removeEventListener("visibilitychange", sync);
          row.removeEventListener("pointerenter", slow); row.removeEventListener("pointerleave", resume);
          row.removeEventListener("focusin", slow); row.removeEventListener("focusout", resume);
        };
      });
      return () => cleanups.forEach(cleanup => cleanup());
    });
  }, []);
  return (
    <div ref={ref} className="editorial-toolkit-marquee" aria-label="Toolkit">
      <div className="editorial-toolkit-title">
        <span>05 / TOOLKIT</span>
        <h2><SplitLineReveal>TOOLS IN MOTION</SplitLineReveal></h2>
      </div>
      {toolkitRows.map((row, rowIndex) => (
        <div className={`toolkit-marquee-row is-${rowIndex % 2 === 0 ? "left" : "right"}`} key={row.join("-")}>
          <div className="toolkit-marquee-track">
            {[...row, ...row].map((tool, index) => (
              <span tabIndex={index < row.length ? 0 : -1} aria-hidden={index >= row.length || undefined} key={`${tool}-${index}`}>{tool}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EditorialHome() {
  const { language } = useLanguage();
  const [showreelOpen, setShowreelOpen] = useState(false);
  const experienceRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress: timelineProgress } = useScroll({
    target: experienceRef,
    offset: ["start 80%", "end 34%"],
  });
  const closeShowreel = useCallback(() => setShowreelOpen(false), []);
  const selectedProjects = useMemo(() => {
    const featured = projects.filter((project) => project.featured).sort((left, right) => {
      const leftOrder = left.featuredOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.featuredOrder ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
    const remaining = projects.filter((project) => !project.featured);
    return [...featured, ...remaining].slice(0, 6);
  }, []);
  const focusItems = useMemo(() => disciplines.map((item) => {
    const project = projects[item.projectIndex];
    return {
      id: item.id,
      title: item.zh,
      subtitle: item.en,
      projectLabel: `${t(project.title, language)} · ${project.year}`,
      href: `/work/${project.slug}`,
      media: {
        type: project.previewVideo ? "video" as const : "image" as const,
        src: project.previewVideo || project.poster,
        poster: project.poster,
        background: project.visual,
      },
    };
  }), [language]);

  return (
    <main id="top" className="editorial-site editorial-motion-home">
      <LoadingScreen />
      <EditorialHeader stretchMenuButton />

      <EditorialScrollHero onOpenShowreel={() => setShowreelOpen(true)} />

      <section id="selected-work" className="editorial-section editorial-selected">
        <SectionTransition className="editorial-section-head">
          <p className="editorial-index"><SplitLineReveal>01</SplitLineReveal></p>
          <h2>
            <DualLayerHeading>{language === "zh" ? "精选作品" : "Selected Works"}</DualLayerHeading>
          </h2>
          <BorderGlowLink href="/work" className="editorial-text-link editorial-all-work-link">
            <span className="editorial-all-work-copy">
              <span className="editorial-all-work-title">{language === "zh" ? "查看全部作品" : "View all work"}</span>
              <span className="editorial-all-work-caption">
                {language === "zh" ? `${projects.length} 个项目 · 完整作品索引` : `${projects.length} projects · Full archive`}
              </span>
            </span>
            <span className="editorial-all-work-icon" aria-hidden="true"><ArrowUpRight size={26} /></span>
          </BorderGlowLink>
        </SectionTransition>
        <div className="editorial-work-feed">
          {selectedProjects.map((project, index) => (
            <SectionTransition
              key={project.slug}
              className={`editorial-project-row editorial-project-${(index % 3) + 1}`}
              project
            >
              <Link href={`/work/${project.slug}`} className="editorial-project-link">
                <MediaScrollExit className="editorial-project-media">
                  <CounterMediaReveal direction={mediaDirections[index % 4]} background={project.visual}>
                  {project.poster ? (
                    <img src={project.poster} alt="" loading="lazy" decoding="async" />
                  ) : null}
                  {project.previewVideo ? (
                    <PriorityPreviewVideo
                      src={project.previewVideo}
                      poster={project.poster || undefined}
                      releaseNextPriority={index === 0 ? MEDIA_PRIORITY.capabilities : undefined}
                    />
                  ) : null}
                  </CounterMediaReveal>
                </MediaScrollExit>
                <div className="editorial-project-meta">
                  <span><SplitLineReveal>{String(index + 1).padStart(2, "0")}</SplitLineReveal></span>
                  <div className="editorial-project-title-block">
                    <h3><SplitLineReveal>{t(project.title, language)}</SplitLineReveal></h3>
                    <p><SplitLineReveal>{`${t(project.category, language)} · ${project.year}`}</SplitLineReveal></p>
                  </div>
                  <span className="editorial-project-cta">
                    <SplitLineReveal>{language === "zh" ? "查看项目" : "View project"}</SplitLineReveal>
                    <ArrowUpRight className="editorial-project-arrow" size={22} />
                  </span>
                </div>
              </Link>
            </SectionTransition>
          ))}
        </div>
      </section>

      <DeferredEditorialFocus
        title={language === "zh" ? "能力展示：能做什么" : "Capabilities: What I Do"}
        items={focusItems}
        viewLabel={language === "zh" ? "查看案例" : "VIEW CASE"}
      />

      <section id="about" className="editorial-section editorial-about">
        <SectionTransition className="editorial-section-head">
          <p className="editorial-index"><SplitLineReveal>03</SplitLineReveal></p>
          <h2>
            <DualLayerHeading>{language === "zh" ? "关于我" : "About Me"}</DualLayerHeading>
          </h2>
        </SectionTransition>
        <ScrollParallax className="motion-about-backtype" axis="x" distance={-5} decorative>LIUKER</ScrollParallax>
        <div className="editorial-about-grid">
          <ScrollParallax className="editorial-about-copy" distance={6}>
            <p><SplitLineReveal>{aboutCopy[language]}</SplitLineReveal></p>
          </ScrollParallax>
          <div className="motion-about-image-stack">
            <ScrollParallax className="motion-about-red" distance={3} decorative><CounterMediaReveal direction="center" graphic><span /></CounterMediaReveal></ScrollParallax>
            <ScrollParallax distance={5}>
              <MediaScrollExit className="editorial-about-portrait">
                <CounterMediaReveal direction="center" background="linear-gradient(145deg, #08090f, #211035)">
            <img
              src={mediaUrl("/media/contact/footer-search-character.webp", "poster")}
              alt={language === "zh" ? "LIUKER 角色肖像" : "LIUKER character portrait"}
              loading="lazy"
              decoding="async"
            />
                </CounterMediaReveal>
              </MediaScrollExit>
            </ScrollParallax>
            <ScrollParallax className="motion-about-fronttype" axis="x" distance={5} decorative>IN MOTION.</ScrollParallax>
          </div>
        </div>
      </section>

      <section ref={experienceRef} id="experience" className="editorial-section editorial-experience">
        <div className="editorial-experience-label">
          <p className="editorial-index">04</p>
          <ExperienceHeading sectionRef={experienceRef} />
        </div>
        <div className="editorial-experience-list">
          <span className="editorial-experience-track" aria-hidden="true">
            <motion.span style={{ scaleY: reducedMotion ? 1 : timelineProgress }} />
          </span>
          {siteContent.experience.map((item, index) => (
            <ExperienceItem key={item.year} item={item} index={index} language={language} />
          ))}
        </div>
      </section>

      <ToolkitMarquee />

      <footer id="contact" className="editorial-contact">
        <p className="editorial-overline"><SplitLineReveal>05 / CONTACT</SplitLineReveal></p>
        <h2>
          <span className="motion-contact-line"><SplitLineReveal>LET&apos;S</SplitLineReveal></span>
          <span className="motion-contact-line"><SplitLineReveal>CREATE</SplitLineReveal></span>
          <span className="motion-contact-finale"><DualLayerHeading final className="motion-contact-next">THE NEXT</DualLayerHeading><DualLayerHeading final>FRAME.</DualLayerHeading></span>
        </h2>
        <div className="editorial-contact-links" aria-label="Contact channels">
          {["EMAIL", "INSTAGRAM", "BEHANCE", "RED", "DOUYIN"].map((label) => (
            <span key={label}><SplitLineReveal>{label}</SplitLineReveal></span>
          ))}
        </div>
        <div className="editorial-footer-line">
          <span><SplitLineReveal>LIUKER / 2026</SplitLineReveal></span>
          <a href="#top" onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" })}><SplitLineReveal>BACK TO TOP</SplitLineReveal></a>
        </div>
      </footer>

      {showreelOpen ? (
        <Suspense fallback={null}>
          <LazyShowreelDialog open={showreelOpen} onClose={closeShowreel} />
        </Suspense>
      ) : null}
    </main>
  );
}
