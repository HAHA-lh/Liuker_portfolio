"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Play,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { siteContent, t } from "./content";
import ClickSpark from "./components/ClickSpark";
import DotField from "./components/DotField";
import GlassSurface from "./components/GlassSurface";
import GradientText from "./components/GradientText";
import LoadingScreen from "./components/LoadingScreen";
import ScrollExpand from "./components/ScrollExpand";
import StaggeredMenu from "./components/StaggeredMenu";
import TextPressure from "./components/TextPressure";
import VariableProximity from "./components/VariableProximity";
import {
  getPreparedHeroVideoSource,
  HERO_FRAME_READY_EVENT,
  HERO_MEDIA_PREPARED_EVENT,
  HERO_POSTER_AVIF,
  HERO_POSTER_WEBP,
  selectHeroVideoSource,
  SHOWREEL_VIDEO_SRC,
} from "./hero-media";
import { useLanguage } from "./language";
import {
  getProjectsForPortfolioGroup,
  portfolioGroups,
} from "./portfolio-groups";
import { ThemeToggle, useTheme } from "./theme";

const ease = [0.25, 0.1, 0.25, 1] as const;
const Lanyard = lazy(() => import("./components/Lanyard"));

const CONTENT_EDITING_ENABLED = process.env.NODE_ENV === "development";

type ScrubbableVideo = HTMLVideoElement & {
  fastSeek?: (time: number) => void;
  requestVideoFrameCallback?: (
    callback: (now: number, metadata: { mediaTime: number }) => void,
  ) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

function ViewportMount({
  children,
  className = "",
  rootMargin = "0px",
}: {
  children: ReactNode | ((active: boolean) => ReactNode);
  className?: string;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextActive = entry.isIntersecting;
        setActive(nextActive);
        if (nextActive) setMounted(true);
      },
      { rootMargin, threshold: 0.01 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin]);

  const content = typeof children === "function" ? children(active) : children;

  return (
    <div ref={ref} className={`viewport-mount ${className}`} data-active={active || undefined}>
      {mounted ? <Suspense fallback={<div className="scene-loader" />}>{content}</Suspense> : <div className="scene-loader" />}
    </div>
  );
}

function FadeIn({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "40px" }}
      transition={{ duration: 0.7, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

function useEditableDraft(storageKey: string, fallback: string, enabled = CONTENT_EDITING_ENABLED) {
  const [text, setText] = useState(fallback);

  useEffect(() => {
    if (!enabled) {
      setText(fallback);
      return;
    }
    const saved = window.localStorage.getItem(storageKey);
    setText(saved || fallback);
  }, [enabled, fallback, storageKey]);

  const save = (nextValue: string) => {
    const next = nextValue.trim() || fallback;
    setText(next);
    if (enabled) window.localStorage.setItem(storageKey, next);
  };

  return [text, save] as const;
}

function InlineEditable({
  storageKey,
  value,
  as: Component = "span",
  className = "",
  ariaLabel,
}: {
  storageKey: string;
  value: string;
  as?: ElementType;
  className?: string;
  ariaLabel: string;
}) {
  const [text, save] = useEditableDraft(storageKey, value);
  const EditableComponent = Component as ComponentType<
    HTMLAttributes<HTMLElement>
  >;

  return (
    <EditableComponent
      className={[CONTENT_EDITING_ENABLED ? "inline-editable" : "", className].filter(Boolean).join(" ")}
      contentEditable={CONTENT_EDITING_ENABLED || undefined}
      suppressContentEditableWarning={CONTENT_EDITING_ENABLED || undefined}
      spellCheck={false}
      aria-label={CONTENT_EDITING_ENABLED ? ariaLabel : undefined}
      title={CONTENT_EDITING_ENABLED ? ariaLabel : undefined}
      data-editable={CONTENT_EDITING_ENABLED || undefined}
      onBlur={CONTENT_EDITING_ENABLED
        ? (event: React.FocusEvent<HTMLElement>) => save(event.currentTarget.textContent || "")
        : undefined}
      onKeyDown={CONTENT_EDITING_ENABLED
        ? (event: React.KeyboardEvent<HTMLElement>) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              event.currentTarget.textContent = text;
              event.currentTarget.blur();
            }
          }
        : undefined}
    >
      {text}
    </EditableComponent>
  );
}

function EditableProximityCopy({
  storageKey,
  value,
  editLabel,
}: {
  storageKey: string;
  value: string;
  editLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [text, save] = useEditableDraft(storageKey, value);
  const [draft, setDraft] = useState(text);
  const [editing, setEditing] = useState(false);

  useEffect(() => setDraft(text), [text]);

  const beginEditing = () => {
    if (!CONTENT_EDITING_ENABLED) return;
    setDraft(text);
    setEditing(true);
  };

  const finishEditing = () => {
    save(draft);
    setEditing(false);
  };

  return (
    <div
      ref={containerRef}
      className={`about-proximity-wrap editable-proximity ${editing ? "is-editing" : ""}`}
      onDoubleClick={CONTENT_EDITING_ENABLED ? beginEditing : undefined}
    >
      {editing ? (
        <textarea
          className="about-inline-editor"
          value={draft}
          autoFocus
          aria-label={editLabel}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={finishEditing}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              setDraft(text);
              setEditing(false);
            }
          }}
        />
      ) : (
        <VariableProximity
          label={text}
          containerRef={containerRef}
          fromFontVariationSettings="'wght' 320, 'opsz' 12"
          toFontVariationSettings="'wght' 900, 'opsz' 72"
          radius={190}
          falloff="gaussian"
          className="about-proximity-copy"
        />
      )}
      {CONTENT_EDITING_ENABLED && (
        <button
          type="button"
          className="inline-edit-trigger"
          onMouseDown={(event) => event.preventDefault()}
          onClick={editing ? finishEditing : beginEditing}
        >
          {editing ? "✓" : editLabel}
        </button>
      )}
    </div>
  );
}

function EditablePressureTitle({
  storageKey,
  value,
  editLabel,
}: {
  storageKey: string;
  value: string;
  editLabel: string;
}) {
  const [text, save] = useEditableDraft(storageKey, value);
  const [draft, setDraft] = useState(text);
  const [editing, setEditing] = useState(false);

  useEffect(() => setDraft(text), [text]);

  const beginEditing = () => {
    if (!CONTENT_EDITING_ENABLED) return;
    setDraft(text);
    setEditing(true);
  };
  const finishEditing = () => {
    save(draft);
    setEditing(false);
  };

  return (
    <div
      className={`about-pressure-wrap editable-pressure ${editing ? "is-editing" : ""}`}
      onDoubleClick={CONTENT_EDITING_ENABLED ? beginEditing : undefined}
    >
      {editing ? (
        <input
          className="about-title-editor"
          value={draft}
          autoFocus
          aria-label={editLabel}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={finishEditing}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setDraft(text);
              setEditing(false);
            }
          }}
        />
      ) : (
        <TextPressure
          text={text}
          flex
          width
          weight
          italic
          textColor="currentColor"
          minFontSize={48}
        />
      )}
      {CONTENT_EDITING_ENABLED && (
        <button
          type="button"
          className="inline-edit-trigger"
          onMouseDown={(event) => event.preventDefault()}
          onClick={editing ? finishEditing : beginEditing}
        >
          {editing ? "✓" : editLabel}
        </button>
      )}
    </div>
  );
}

function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  return (
    <GlassSurface
      width={82}
      height={42}
      borderRadius={999}
      distortionScale={-105}
      greenOffset={8}
      blueOffset={14}
      brightness={64}
      opacity={0.9}
      blur={9}
      backgroundOpacity={0.09}
      saturation={1.5}
      className="language-glass"
    >
      <div className="language-toggle" aria-label="Language / 语言">
        <button
          type="button"
          className={language === "zh" ? "active" : ""}
          onClick={() => setLanguage("zh")}
          aria-pressed={language === "zh"}
        >
          中
        </button>
        <button
          type="button"
          className={language === "en" ? "active" : ""}
          onClick={() => setLanguage("en")}
          aria-pressed={language === "en"}
        >
          EN
        </button>
      </div>
    </GlassSurface>
  );
}

function Header() {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const menuItems = [
    {
      label: language === "zh" ? "首页" : "Home",
      ariaLabel: language === "zh" ? "返回首页顶部" : "Return to homepage",
      link: "/",
    },
    {
      label: t(siteContent.nav.work, language),
      ariaLabel: language === "zh" ? "前往作品" : "Go to work",
      link: "#project-field",
    },
    {
      label: t(siteContent.nav.about, language),
      ariaLabel: language === "zh" ? "前往关于" : "Go to about",
      link: "#about",
    },
    {
      label: t(siteContent.nav.experience, language),
      ariaLabel: language === "zh" ? "前往经历与技能" : "Go to experience",
      link: "#experience",
    },
    {
      label: t(siteContent.nav.contact, language),
      ariaLabel: language === "zh" ? "前往联系" : "Go to contact",
      link: "#contact",
    },
  ];

  return (
    <>
      <motion.header
        className="top-nav container-wide"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
      >
        <Link href="/" className="brand-mark" aria-label="LIUKER home">
          <span className="brand-orb" />
          {siteContent.name}
        </Link>
      </motion.header>
      <StaggeredMenu
        items={menuItems}
        position="right"
        colors={["#ff6a00", "#b600a8"]}
        accentColor="#b600a8"
        menuButtonColor={theme === "light" ? "#161719" : "#d7e2ea"}
        openMenuButtonColor="#111214"
        footer={
          <>
            <span className="sm-panel-caption">
              {language === "zh" ? "显示与语言" : "Display & language"}
            </span>
            <div className="sm-panel-controls">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </>
        }
      />
    </>
  );
}

function ShowreelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { language } = useLanguage();
  const closeRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("modal-open");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    window.setTimeout(() => {
      closeRef.current?.focus();
      videoRef.current?.play().catch(() => undefined);
    }, 40);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open");
      videoRef.current?.pause();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="video-modal showreel-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="showreel-modal-title"
          onMouseDown={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="modal-panel showreel-modal-panel"
            onMouseDown={(event) => event.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35, ease }}
          >
            <div className="modal-video">
              <button
                ref={closeRef}
                type="button"
                className="modal-close"
                onClick={onClose}
                aria-label={language === "zh" ? "关闭 Showreel" : "Close showreel"}
              >
                <X size={19} />
              </button>
              <video
                ref={videoRef}
                src={SHOWREEL_VIDEO_SRC}
                controls
                autoPlay
                playsInline
                preload="metadata"
                aria-label="LIUKER Showreel 2026"
              />
            </div>
            <div className="modal-footer showreel-modal-footer">
              <div>
                <div className="eyebrow">LIUKER / 2026</div>
                <h2 id="showreel-modal-title" className="modal-title">Showreel</h2>
              </div>
              <span className="showreel-runtime">01:47 · 1080P · Stereo</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PortfolioIndex() {
  const { language } = useLanguage();
  const reduced = useReducedMotion();

  return (
    <section
      id="project-field"
      className="portfolio-index-section container-wide"
      aria-label={language === "zh" ? "作品集分类" : "Portfolio categories"}
    >
      <div className="portfolio-index-lead">
        <div>
          <div className="eyebrow">
            {language === "zh" ? "作品集分类 · 选择方向" : "Portfolio index · Choose a direction"}
          </div>
        </div>
        <p>
          {language === "zh"
            ? "先选择作品方向，再进入对应的视频项目。每个方向都保留播放与案例详情入口。"
            : "Choose a discipline, then explore its video projects with playback and case-study access."}
        </p>
      </div>

      <div className="portfolio-group-grid">
        {portfolioGroups.map((group, groupIndex) => {
          const groupProjects = getProjectsForPortfolioGroup(group);
          const previewProjects = groupProjects.slice(0, 3);
          const entranceDelay = groupIndex * 0.14;

          return (
            <motion.div
              key={group.id}
              className="portfolio-group-card-frame"
              initial={
                reduced
                  ? false
                  : {
                      opacity: 0,
                      y: 96,
                      scale: 0.94,
                      rotateX: 7,
                      clipPath: "inset(18% 0 0 0 round 2.4rem)",
                    }
              }
              whileInView={
                reduced
                  ? undefined
                  : {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      rotateX: 0,
                      clipPath: "inset(0% 0 0 0 round 0rem)",
                    }
              }
              viewport={{ once: true, amount: 0.18 }}
              transition={{ duration: 0.88, delay: entranceDelay, ease }}
              style={{ transformOrigin: "50% 100%" }}
            >
              <Link
                href={`/portfolio/${group.id}`}
                className={`portfolio-group-card portfolio-group-card-${groupIndex + 1}`}
                aria-label={`${language === "zh" ? "进入" : "Open"} ${t(group.title, language)}`}
              >
                <motion.span
                  className="portfolio-group-media"
                  aria-hidden="true"
                  initial={reduced ? false : { opacity: 0.42, scale: 1.13, y: 30 }}
                  whileInView={reduced ? undefined : { opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.18 }}
                  transition={{ duration: 1.08, delay: entranceDelay + 0.1, ease }}
                >
                  {previewProjects.map((project, imageIndex) => (
                    <span className={`portfolio-group-image image-${imageIndex + 1}`} key={project.slug}>
                      <img src={project.poster || "/og.png"} alt="" loading="lazy" decoding="async" />
                    </span>
                  ))}
                  <span className="portfolio-group-scrim" />
                </motion.span>

                <motion.span
                  className="portfolio-group-content"
                  initial={reduced ? false : { opacity: 0, y: 38 }}
                  whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.18 }}
                  transition={{ duration: 0.72, delay: entranceDelay + 0.28, ease }}
                >
                  <span className="portfolio-group-meta">
                    <span>{group.index} / 03</span>
                    <span>{String(groupProjects.length).padStart(2, "0")} {language === "zh" ? "个项目" : "projects"}</span>
                  </span>
                  <span className="portfolio-group-label">{group.label}</span>
                  <span className="portfolio-group-title">{t(group.title, language)}</span>
                  <span className="portfolio-group-description">{t(group.description, language)}</span>
                  <span className="portfolio-group-action">
                    {language === "zh" ? "进入二级作品页" : "Open collection"}
                    <ArrowUpRight size={18} />
                  </span>
                </motion.span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function ScrollHero({ onOpenShowreel }: { onOpenShowreel: () => void }) {
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
  const [heroVideoSrc, setHeroVideoSrc] = useState<string | null>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const overlayOpacity = useTransform(
    scrollYProgress,
    [0, 0.18, 0.72, 0.95],
    [1, 1, 0.5, 0],
  );
  const overlayY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const titleOpacity = useTransform(scrollYProgress, [0, 1], [0.1, 0.7]);
  const progressScale = useTransform(scrollYProgress, [0, 1], [0.04, 1]);

  const requestHeroVideo = useCallback(() => {
    if (loadRequestedRef.current) return;
    loadRequestedRef.current = true;
    setHeroVideoSrc(getPreparedHeroVideoSource() ?? selectHeroVideoSource());
  }, []);

  const notifyFrameReady = useCallback(() => {
    setFrameReady(true);
    document.dispatchEvent(new Event(HERO_FRAME_READY_EVENT));
  }, []);

  const markNextPresentedFrame = useCallback((video: ScrubbableVideo) => {
    if (!video.requestVideoFrameCallback) return;
    if (
      presentedFrameRef.current !== null &&
      video.cancelVideoFrameCallback
    ) {
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
    if (reduced || !video || !durationRef.current) {
      return;
    }

    const precise = preciseSeekRef.current;
    preciseSeekRef.current = false;
    if (!precise && timestamp - lastSeekAtRef.current < 34) {
      return;
    }

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
      if (!precise && Math.abs(difference) > 0.16 && video.fastSeek) {
        video.fastSeek(targetTime);
      } else {
        video.currentTime = targetTime;
      }
    } catch {
      video.currentTime = targetTime;
    }
    lastSeekAtRef.current = timestamp;
    markNextPresentedFrame(video);
  }, [markNextPresentedFrame, reduced]);

  const queueSeek = useCallback((precise = false) => {
    preciseSeekRef.current = preciseSeekRef.current || precise;
    if (seekFrameRef.current === null) {
      seekFrameRef.current = window.requestAnimationFrame(seekToLatestTarget);
    }
  }, [seekToLatestTarget]);

  const queueSettledSeek = useCallback(() => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
    }
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      queueSeek(true);
    }, 96);
  }, [queueSeek]);

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    scrollProgressRef.current = Math.min(1, Math.max(0, progress));
    if (scrollProgressRef.current > 0.001) requestHeroVideo();
    const video = videoRef.current;
    if (reduced || !video || !durationRef.current) return;
    const end = Math.max(0, durationRef.current - 0.05);
    targetTimeRef.current = scrollProgressRef.current * end;
    queueSeek();
    queueSettledSeek();
  });

  useEffect(() => {
    const video = videoRef.current as ScrubbableVideo | null;
    return () => {
      if (seekFrameRef.current !== null) {
        window.cancelAnimationFrame(seekFrameRef.current);
      }
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
      }
      if (
        video &&
        presentedFrameRef.current !== null &&
        video.cancelVideoFrameCallback
      ) {
        video.cancelVideoFrameCallback(presentedFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const requestOnScroll = () => requestHeroVideo();
    window.addEventListener("scroll", requestOnScroll, { passive: true, once: true });
    return () => window.removeEventListener("scroll", requestOnScroll);
  }, [requestHeroVideo]);

  useEffect(() => {
    const usePreparedMedia = () => requestHeroVideo();
    document.addEventListener(HERO_MEDIA_PREPARED_EVENT, usePreparedMedia);
    if (getPreparedHeroVideoSource()) requestHeroVideo();
    return () => document.removeEventListener(HERO_MEDIA_PREPARED_EVENT, usePreparedMedia);
  }, [requestHeroVideo]);

  const registerDuration = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    durationRef.current = video.duration;
    const end = Math.max(0, video.duration - 0.05);
    const initialTime = Math.max(0.01, scrollProgressRef.current * end);
    targetTimeRef.current = initialTime;
    video.pause();
    queueSeek(true);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const ensureDuration = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      durationRef.current = video.duration;
      const end = Math.max(0, video.duration - 0.05);
      const nextTime = Math.max(0.01, scrollProgressRef.current * end);
      targetTimeRef.current = nextTime;
      video.pause();
      queueSeek(true);
    };

    ensureDuration();
    video.addEventListener("loadedmetadata", ensureDuration);
    video.addEventListener("durationchange", ensureDuration);

    return () => {
      video.removeEventListener("loadedmetadata", ensureDuration);
      video.removeEventListener("durationchange", ensureDuration);
    };
  }, [queueSeek]);

  return (
    <section ref={sectionRef} className="hero" aria-label="Scroll-controlled showreel">
      <div className="hero-stage">
        <div className="hero-media">
          <motion.div
            className="hero-media-frame"
            data-video-requested={Boolean(heroVideoSrc) || undefined}
            data-frame-ready={frameReady || undefined}
            data-video-failed={videoFailed || undefined}
            style={{ scale: reduced ? 1 : videoScale }}
          >
            <picture className={`hero-poster ${frameReady ? "is-hidden" : ""}`}>
              <source srcSet={HERO_POSTER_AVIF} type="image/avif" />
              <img src={HERO_POSTER_WEBP} alt="" fetchPriority="high" decoding="async" />
            </picture>
            <video
              ref={videoRef}
              src={heroVideoSrc ?? undefined}
              muted
              playsInline
              preload={heroVideoSrc ? "metadata" : "none"}
              onLoadedMetadata={registerDuration}
              onCanPlay={() => queueSeek(true)}
              onLoadedData={() => {
                queueSeek(true);
                notifyFrameReady();
              }}
              onSeeked={notifyFrameReady}
              onError={() => setVideoFailed(true)}
              disablePictureInPicture
              tabIndex={-1}
              aria-label="16 by 9 scroll-controlled showreel"
            />
            <div className="hero-scrim" />
          </motion.div>
        </div>

        <DotField
          className="hero-dot-field"
          dotRadius={1.45}
          dotSpacing={18}
          cursorRadius={520}
          bulgeStrength={72}
          glowRadius={180}
          gradientFrom="rgba(255, 255, 255, 0.28)"
          gradientTo="rgba(255, 119, 82, 0.2)"
          glowColor="rgba(182, 0, 168, 0.2)"
        />

        <motion.div
          className="hero-overlay container-wide"
        >
          <motion.div
            className="hero-title-wrap"
            style={{ opacity: reduced ? 0.7 : titleOpacity }}
          >
            <GradientText
              colors={["#dfe7ef", "#b50cff", "#ff7048", "#dfe7ef"]}
              animationSpeed={5.5}
              direction="horizontal"
              className="hero-title-gradient"
            >
              <h1 className="hero-title" aria-label="SHOWREEL">
                {Array.from("SHOWREEL").map((letter, index) => (
                  <span key={`${letter}-${index}`} aria-hidden="true">
                    {letter}
                  </span>
                ))}
              </h1>
            </GradientText>
          </motion.div>
          <motion.span
            className="demo-stamp"
            style={{ opacity: reduced ? 1 : overlayOpacity }}
          >
            Demo<br />Portfolio
          </motion.span>
          <motion.div
            className="hero-bottom"
            style={{ opacity: reduced ? 1 : overlayOpacity, y: reduced ? 0 : overlayY }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55, ease }}
            >
              <div className="eyebrow">{siteContent.name}</div>
              <p className="hero-intro">{t(siteContent.heroIntro, language)}</p>
            </motion.div>
            <motion.div
              className="hero-actions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.65, ease }}
            >
              <button
                type="button"
                className="primary-button"
                onClick={onOpenShowreel}
              >
                <Play size={15} fill="currentColor" /> Showreel
              </button>
              <a className="ghost-button" href="#project-field">
                {language === "zh" ? "浏览作品" : "Explore work"}
              </a>
            </motion.div>
          </motion.div>
        </motion.div>

        <div className="hero-scroll-track" aria-hidden="true">
          <motion.span style={{ scaleY: reduced ? 1 : progressScale }} />
        </div>
      </div>
    </section>
  );
}

function ExperienceTimeline() {
  const { language } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 72%", "end 42%"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 0.88], [0, 1]);

  return (
    <section ref={sectionRef} id="experience" className="experience-section">
      <div className="container-wide">
        <FadeIn>
          <div className="eyebrow">
            <InlineEditable
              storageKey={`liuker-experience-kicker-${language}`}
              value={language === "zh" ? "为招聘方准备" : "Built for recruiters"}
              ariaLabel={language === "zh" ? "点击编辑经历板块标签" : "Click to edit section label"}
            />
          </div>
          <div className="experience-title-row">
            <InlineEditable
              as="h2"
              className="section-heading experience-heading"
              storageKey={`liuker-experience-heading-${language}`}
              value={language === "zh" ? "经历时间线" : "Experience timeline"}
              ariaLabel={language === "zh" ? "点击编辑经历标题" : "Click to edit experience heading"}
            />
            <InlineEditable
              as="p"
              storageKey={`liuker-experience-intro-${language}`}
              value={language === "zh"
                ? "从视觉基础到独立创作，一条持续生长的影像路径。"
                : "A growing moving-image practice, from visual foundations to independent work."}
              ariaLabel={language === "zh" ? "点击编辑经历介绍" : "Click to edit experience introduction"}
            />
          </div>
        </FadeIn>

        <div className="career-timeline">
          <div className="career-line" aria-hidden="true">
            <motion.span style={{ scaleY: lineScale }} />
          </div>
          {siteContent.experience.map((item, index) => (
            <motion.article
              className="career-event"
              key={`${item.year}-${index}`}
              initial={{ opacity: 0, y: 42 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.7, delay: index * 0.08, ease }}
            >
              <div className="career-year">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <InlineEditable
                  as="strong"
                  storageKey={`liuker-experience-v2-${index}-year-${language}`}
                  value={item.year}
                  ariaLabel={language === "zh" ? "点击编辑年份" : "Click to edit year"}
                />
              </div>
              <i className="career-node" aria-hidden="true" />
              <div className="career-card">
                <span className="career-card-label">
                  {language === "zh" ? "经历占位" : "Experience placeholder"}
                </span>
                <InlineEditable
                  as="h3"
                  storageKey={`liuker-experience-v2-${index}-title-${language}`}
                  value={t(item.title, language)}
                  ariaLabel={language === "zh" ? "点击编辑经历名称" : "Click to edit role"}
                />
                <InlineEditable
                  as="p"
                  storageKey={`liuker-experience-v2-${index}-note-${language}`}
                  value={t(item.note, language)}
                  ariaLabel={language === "zh" ? "点击编辑经历说明" : "Click to edit experience note"}
                />
              </div>
            </motion.article>
          ))}
        </div>

        <div className="timeline-toolkit">
          <div>
            <span className="timeline-toolkit-index">Toolkit / 01</span>
            <InlineEditable
              as="h3"
              storageKey={`liuker-toolkit-heading-${language}`}
              value={language === "zh" ? "软件工具" : "Software"}
              ariaLabel={language === "zh" ? "点击编辑工具标题" : "Click to edit toolkit heading"}
            />
            <div className="skills-cloud">
              {siteContent.skills.map((skill, index) => (
                <InlineEditable
                  as="span"
                  className="skill-pill"
                  key={skill}
                  storageKey={`liuker-skill-${index}`}
                  value={skill}
                  ariaLabel={language === "zh" ? "点击编辑软件名称" : "Click to edit software name"}
                />
              ))}
            </div>
          </div>
          <div>
            <span className="timeline-toolkit-index">Focus / 02</span>
            <InlineEditable
              as="h3"
              storageKey={`liuker-capabilities-heading-${language}`}
              value={language === "zh" ? "专业能力" : "Capabilities"}
              ariaLabel={language === "zh" ? "点击编辑能力标题" : "Click to edit capabilities heading"}
            />
            <div className="capability-list">
              {siteContent.capabilities.map((capability, index) => (
                <div className="capability-row" key={capability.en}>
                  <InlineEditable
                    as="span"
                    storageKey={`liuker-capability-${index}-${language}`}
                    value={t(capability, language)}
                    ariaLabel={language === "zh" ? "点击编辑能力名称" : "Click to edit capability"}
                  />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  const { language } = useLanguage();
  return (
    <footer id="contact" className="contact-section lanyard-contact-section">
      <div className="contact-glow" aria-hidden="true" />
      <div className="contact-lanyard-layout container-wide">
        <div className="contact-message">
          <FadeIn>
            <div className="eyebrow">
              {language === "zh" ? "联系卡 · 拖动互动" : "Contact card · Drag to interact"}
            </div>
            <InlineEditable
              as="h2"
              className="contact-title gradient-text"
              storageKey={`liuker-contact-heading-${language}`}
              value={t(siteContent.contact.heading, language)}
              ariaLabel={language === "zh" ? "点击编辑联系标题" : "Click to edit contact heading"}
            />
          </FadeIn>
          <InlineEditable
            as="p"
            className="contact-note"
            storageKey={`liuker-contact-note-${language}`}
            value={t(siteContent.contact.note, language)}
            ariaLabel={language === "zh" ? "点击编辑联系说明" : "Click to edit contact note"}
          />
          <span className="ghost-button contact-placeholder" aria-disabled="true">
            <BriefcaseBusiness size={16} />
            {language === "zh" ? "等待真实联系方式" : "Awaiting real contact details"}
          </span>
          <div className="footer-line">
            <span>© 2026 {siteContent.name}</span>
            <span>{language === "zh" ? "首版框架 · 所有内容均为演示" : "V1 Framework · All content is demo"}</span>
          </div>
        </div>
        <div className="contact-lanyard-stage">
          <ViewportMount className="lanyard-mount">
            {(active) => (
              <Lanyard active={active} position={[0, 0, 18]} gravity={[0, -38, 0]} />
            )}
          </ViewportMount>
        </div>
      </div>
    </footer>
  );
}

export function PortfolioHome() {
  const { language } = useLanguage();
  const [showreelOpen, setShowreelOpen] = useState(false);

  return (
    <>
      <LoadingScreen />
      <ClickSpark
        sparkColor="#ff6a8b"
        sparkSize={12}
        sparkRadius={25}
        sparkCount={10}
        duration={480}
      >
      <main className="site-shell">
      <Header />
      <ScrollHero onOpenShowreel={() => setShowreelOpen(true)} />

      <PortfolioIndex />

      <section id="about" className="about-section">
        <ScrollExpand
          src="/media/projects/photo/%E5%B0%8F%E7%94%B5%E8%A7%86%E5%BD%A2%E8%B1%A1%E5%B1%95%E7%A4%BA.avif"
          mediaType="image"
          alt={language === "zh" ? "LIUKER 虚拟形象与动态设计作品" : "LIUKER virtual character and motion design work"}
          title={(
            <EditablePressureTitle
              storageKey={`liuker-about-title-${language}`}
              value={language === "zh" ? "关于我" : "ABOUT ME"}
              editLabel={language === "zh" ? "编辑标题" : "Edit title"}
            />
          )}
          scrollHint={language === "zh" ? "继续滚动展开" : "Scroll to expand"}
          startWidth={46}
          startRadius={34}
          aspectRatio={16 / 9}
          fillViewportOnExpand
          mediaZoom={1.28}
          scrollDistance={1.15}
          holdDistance={0.42}
          smoothing={0.09}
          overlayScrim={0.7}
          useWindowScroll
          className="about-scroll-expand"
        >
          <div className="about-content about-content--copy-only">
            <EditableProximityCopy
              storageKey={`liuker-about-copy-${language}`}
              value={t(siteContent.about, language)}
              editLabel={language === "zh" ? "编辑文字" : "Edit copy"}
            />
          </div>
        </ScrollExpand>
      </section>

      <ExperienceTimeline />

      <ContactSection />

      <ShowreelModal open={showreelOpen} onClose={() => setShowreelOpen(false)} />
      </main>
      </ClickSpark>
    </>
  );
}
