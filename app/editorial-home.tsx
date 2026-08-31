"use client";

import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowDown, ArrowUpRight, Play } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorialHeader } from "./components/EditorialHeader";
import { ShowreelDialog } from "./components/ShowreelDialog";
import { projects, siteContent, t } from "./content";
import {
  getPreparedHeroVideoSource,
  HERO_FRAME_READY_EVENT,
  HERO_MEDIA_PREPARED_EVENT,
  HERO_POSTER_AVIF,
  HERO_POSTER_WEBP,
  selectHeroVideoSource,
} from "./hero-media";
import { useLanguage } from "./language";

const aboutCopy = {
  zh: "我是 LIUKER，专注于影像、动态设计与 AI/CGI。工作横跨创意方向、剪辑、后期和三维视觉，把概念发展为能够被观看、记住并传播的画面。",
  en: "I am LIUKER, working across film, motion design and AI/CGI. From creative direction and editing to post-production and 3D, I turn concepts into images made to be watched, remembered and shared.",
};

const disciplines = [
  { zh: "创意方向", en: "Creative Direction" },
  { zh: "影像与剪辑", en: "Film / Edit" },
  { zh: "AI 与 CGI", en: "AI / CGI" },
  { zh: "动态设计", en: "Motion" },
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
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [frameReady, setFrameReady] = useState(false);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const mediaScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.2, 0.75, 0.96], [1, 1, 0.45, 0]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const progressScale = useTransform(scrollYProgress, [0, 1], [0.03, 1]);

  const requestVideo = useCallback(() => {
    if (loadRequestedRef.current) return;
    loadRequestedRef.current = true;
    setVideoSource(getPreparedHeroVideoSource() ?? selectHeroVideoSource());
  }, []);

  const notifyFrameReady = useCallback(() => {
    setFrameReady(true);
    document.dispatchEvent(new Event(HERO_FRAME_READY_EVENT));
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
    if (!precise && timestamp - lastSeekAtRef.current < 34) return;

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
        <motion.div
          className="editorial-hero-media-frame"
          style={{ scale: reducedMotion ? 1 : mediaScale }}
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
        </motion.div>
        <motion.div
          className="editorial-hero-copy"
          style={{ opacity: reducedMotion ? 1 : copyOpacity, y: reducedMotion ? 0 : copyY }}
        >
          <motion.p
            className="editorial-overline"
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            LIUKER / PORTFOLIO 2026
          </motion.p>
          <h1 id="editorial-hero-title">
            {["VIDEO", "MOTION", "CGI"].map((line, index) => (
              <span className="editorial-hero-line-mask" key={line}>
                <motion.span
                  className="editorial-hero-line"
                  initial={reducedMotion ? false : { y: "112%" }}
                  animate={{ y: 0 }}
                  transition={{
                    duration: 0.9,
                    delay: 0.12 + index * 0.09,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.div
            className="editorial-hero-foot"
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
          >
            <p>{t(siteContent.heroIntro, language)}</p>
            <button type="button" className="editorial-play" onClick={onOpenShowreel}>
              <Play size={17} fill="currentColor" />
              {language === "zh" ? "播放作品集" : "Play reel"}
            </button>
          </motion.div>
        </motion.div>
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

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reducedMotion ? false : { opacity: 0, y: 32 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function ScrollCycle({
  children,
  className = "",
  enterY = 38,
  exitY = -28,
}: {
  children: React.ReactNode;
  className?: string;
  enterY?: number;
  exitY?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.17, 0.8, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.17, 0.8, 1], [enterY, 0, 0, exitY]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        opacity: reducedMotion ? 1 : opacity,
        y: reducedMotion ? 0 : y,
      }}
    >
      {children}
    </motion.div>
  );
}

function MediaCycle({
  children,
  className,
  background,
}: {
  children: React.ReactNode;
  className: string;
  background: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 96%", "end 4%"],
  });
  const clipPath = useTransform(
    scrollYProgress,
    [0, 0.18, 0.82, 1],
    ["inset(12% 0% 12% 0%)", "inset(0% 0% 0% 0%)", "inset(0% 0% 0% 0%)", "inset(7% 0% 7% 0%)"],
  );
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.82, 1], [1.065, 1, 1, 1.025]);
  const y = useTransform(scrollYProgress, [0, 0.2, 0.82, 1], [32, 0, 0, -24]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        background,
        clipPath: reducedMotion ? "inset(0% 0% 0% 0%)" : clipPath,
        scale: reducedMotion ? 1 : scale,
        y: reducedMotion ? 0 : y,
      }}
    >
      {children}
    </motion.div>
  );
}

function MaskedScrollLine({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 94%", "end 6%"],
  });
  const y = useTransform(scrollYProgress, [0, 0.19, 0.82, 1], ["108%", "0%", "0%", "-108%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.14, 0.86, 1], [0, 1, 1, 0]);

  return (
    <span ref={ref} className="editorial-mask-line">
      <motion.span
        className="editorial-mask-line-inner"
        style={{
          y: reducedMotion ? "0%" : y,
          opacity: reducedMotion ? 1 : opacity,
        }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export function EditorialHome() {
  const { language } = useLanguage();
  const [showreelOpen, setShowreelOpen] = useState(false);
  const closeShowreel = useCallback(() => setShowreelOpen(false), []);
  const selectedProjects = useMemo(() => {
    const featured = projects.filter((project) => project.featured);
    const remaining = projects.filter((project) => !project.featured);
    return [...featured, ...remaining].slice(0, 6);
  }, []);

  return (
    <main className="editorial-site">
      <EditorialHeader />

      <EditorialScrollHero onOpenShowreel={() => setShowreelOpen(true)} />

      <section id="selected-work" className="editorial-section editorial-selected">
        <ScrollCycle className="editorial-section-head">
          <p className="editorial-index">01</p>
          <h2>
            <MaskedScrollLine>{language === "zh" ? "精选作品" : "Selected Works"}</MaskedScrollLine>
          </h2>
          <Link href="/work" className="editorial-text-link">
            {language === "zh" ? "查看全部作品" : "View all work"} <ArrowUpRight size={18} />
          </Link>
        </ScrollCycle>
        <div className="editorial-work-feed">
          {selectedProjects.map((project, index) => (
            <ScrollCycle
              key={project.slug}
              className={`editorial-project-row editorial-project-${(index % 3) + 1}`}
              enterY={48}
              exitY={-42}
            >
              <Link href={`/work/${project.slug}`} className="editorial-project-link">
                <MediaCycle
                  className="editorial-project-media"
                  background={project.visual}
                >
                  {project.poster ? (
                    <img src={project.poster} alt="" loading="lazy" decoding="async" />
                  ) : null}
                </MediaCycle>
                <ScrollCycle className="editorial-project-meta" enterY={22} exitY={-18}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div className="editorial-project-title-block">
                    <h3>{t(project.title, language)}</h3>
                    <p>{t(project.category, language)} · {project.year}</p>
                  </div>
                  <span className="editorial-project-cta">
                    {language === "zh" ? "查看项目" : "View project"}
                    <ArrowUpRight className="editorial-project-arrow" size={22} />
                  </span>
                </ScrollCycle>
              </Link>
            </ScrollCycle>
          ))}
        </div>
      </section>

      <section id="services" className="editorial-section editorial-services">
        <div className="editorial-section-head">
          <p className="editorial-index">02</p>
          <h2>{language === "zh" ? "我做什么" : "What I Do"}</h2>
        </div>
        <div className="editorial-discipline-list">
          {disciplines.map((discipline, index) => (
            <Reveal className="editorial-discipline" key={discipline.en}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{discipline[language]}</h3>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="about" className="editorial-section editorial-about">
        <ScrollCycle className="editorial-section-head">
          <p className="editorial-index">03</p>
          <h2>
            <MaskedScrollLine>{language === "zh" ? "关于我" : "About Me"}</MaskedScrollLine>
          </h2>
        </ScrollCycle>
        <div className="editorial-about-grid">
          <ScrollCycle className="editorial-about-copy" enterY={42} exitY={-34}>
            <p>{aboutCopy[language]}</p>
          </ScrollCycle>
          <MediaCycle className="editorial-about-portrait" background="linear-gradient(145deg, #08090f, #211035)">
            <img
              src="/media/contact/footer-search-character.webp"
              alt={language === "zh" ? "LIUKER 角色肖像" : "LIUKER character portrait"}
              loading="lazy"
              decoding="async"
            />
          </MediaCycle>
        </div>
      </section>

      <section id="experience" className="editorial-section editorial-experience">
        <div className="editorial-experience-label">
          <p className="editorial-index">04</p>
          <h2>EXPERIENCE</h2>
        </div>
        <div className="editorial-experience-list">
          {siteContent.experience.map((item, index) => (
            <Reveal className="editorial-experience-item" key={item.year}>
              <span className="editorial-experience-number">{String(index + 1).padStart(2, "0")}</span>
              <p className="editorial-experience-year">{item.year}</p>
              <div>
                <h3>{t(item.title, language)}</h3>
                <p>{t(item.note, language)}</p>
              </div>
            </Reveal>
          ))}
          <div className="editorial-toolkit">
            <span>TOOLKIT</span>
            <p>{siteContent.skills.join(" / ")}</p>
          </div>
        </div>
      </section>

      <footer id="contact" className="editorial-contact">
        <p className="editorial-overline">05 / CONTACT</p>
        <h2>
          <span>LET&apos;S MAKE</span>
          <span>SOMETHING</span>
          <span>MOVE.</span>
        </h2>
        <div className="editorial-contact-links" aria-label="Contact channels">
          {["EMAIL", "INSTAGRAM", "BEHANCE", "RED", "DOUYIN"].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="editorial-footer-line">
          <span>LIUKER / 2026</span>
          <a href="#top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>BACK TO TOP</a>
        </div>
      </footer>

      <ShowreelDialog open={showreelOpen} onClose={closeShowreel} />
    </main>
  );
}
