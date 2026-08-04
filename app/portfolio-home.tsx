"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ElementType,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { projects, siteContent, t, type Project } from "./content";
import ClickSpark from "./components/ClickSpark";
import DotField from "./components/DotField";
import GlassSurface from "./components/GlassSurface";
import GradientText from "./components/GradientText";
import type { InfiniteMenuItem } from "./components/InfiniteMenu";
import Masonry, { type MasonryItem } from "./components/Masonry";
import StaggeredMenu from "./components/StaggeredMenu";
import TextPressure from "./components/TextPressure";
import VariableProximity from "./components/VariableProximity";
import { useLanguage } from "./language";
import { ThemeToggle, useTheme } from "./theme";

const ease = [0.25, 0.1, 0.25, 1] as const;
const InfiniteMenu = lazy(() => import("./components/InfiniteMenu"));
const Lanyard = lazy(() => import("./components/Lanyard"));
const Orb = lazy(() => import("./components/Orb"));

const HERO_VIDEO_SRC = "/media/projects/%E4%B8%BB%E9%A1%B5_interactive_1080p_v3.mp4?v=bdcf780d-gop2";
const HERO_POSTER_WEBP = "/media/posters/home-hero.webp";
const HERO_POSTER_AVIF = "/media/posters/home-hero.avif";

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

function useEditableDraft(storageKey: string, fallback: string) {
  const [text, setText] = useState(fallback);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    setText(saved || fallback);
  }, [fallback, storageKey]);

  const save = (nextValue: string) => {
    const next = nextValue.trim() || fallback;
    setText(next);
    window.localStorage.setItem(storageKey, next);
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
      className={`inline-editable ${className}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      aria-label={ariaLabel}
      title={ariaLabel}
      onBlur={(event: React.FocusEvent<HTMLElement>) =>
        save(event.currentTarget.textContent || "")
      }
      onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          event.currentTarget.textContent = text;
          event.currentTarget.blur();
        }
      }}
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
      onDoubleClick={beginEditing}
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
      <button
        type="button"
        className="inline-edit-trigger"
        onMouseDown={(event) => event.preventDefault()}
        onClick={editing ? finishEditing : beginEditing}
      >
        {editing ? "✓" : editLabel}
      </button>
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
    setDraft(text);
    setEditing(true);
  };
  const finishEditing = () => {
    save(draft);
    setEditing(false);
  };

  return (
    <div className={`about-pressure-wrap editable-pressure ${editing ? "is-editing" : ""}`} onDoubleClick={beginEditing}>
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
      <button
        type="button"
        className="inline-edit-trigger"
        onMouseDown={(event) => event.preventDefault()}
        onClick={editing ? finishEditing : beginEditing}
      >
        {editing ? "✓" : editLabel}
      </button>
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
      label: t(siteContent.nav.work, language),
      ariaLabel: language === "zh" ? "前往作品" : "Go to work",
      link: "#work",
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

function PreviewVideo({ project, className = "preview-video" }: { project: Project; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const hoveredRef = useRef(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          hoveredRef.current = false;
          video.pause();
          if (video.getAttribute("src")) {
            video.removeAttribute("src");
            video.load();
          }
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
      video.removeAttribute("src");
    };
  }, []);

  const play = () => {
    if (reduced || !window.matchMedia("(hover: hover)").matches) return;
    const video = ref.current;
    if (!video) return;
    hoveredRef.current = true;
    document.querySelectorAll<HTMLVideoElement>("video.preview-video").forEach((candidate) => {
      if (candidate !== video) candidate.pause();
    });
    if (!video.getAttribute("src")) {
      video.src = project.previewVideo;
      video.load();
    }
    const start = () => {
      if (hoveredRef.current) video.play().catch(() => undefined);
    };
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) start();
    else video.addEventListener("canplay", start, { once: true });
  };

  const pause = () => {
    hoveredRef.current = false;
    ref.current?.pause();
  };

  return (
    <video
      ref={ref}
      className={className}
      poster={project.poster || undefined}
      muted
      loop
      playsInline
      preload="none"
      onMouseEnter={play}
      onMouseLeave={pause}
      aria-label={`${project.title.en} preview`}
    />
  );
}

function VideoModal({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const { language } = useLanguage();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!project) return;
    document.body.classList.add("modal-open");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const panel = document.querySelector<HTMLElement>(".modal-panel");
        if (!panel) return;
        const focusables = panel.querySelectorAll<HTMLElement>(
          "button, a, video[controls], [tabindex]:not([tabindex='-1'])",
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    window.setTimeout(() => closeRef.current?.focus(), 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open");
    };
  }, [project, onClose]);

  const stop = (event: MouseEvent<HTMLDivElement>) => event.stopPropagation();

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          className="video-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onMouseDown={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="modal-panel"
            onMouseDown={stop}
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
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
                aria-label={language === "zh" ? "关闭播放器" : "Close player"}
              >
                <X size={19} />
              </button>
              <video src={project.heroVideo} controls playsInline preload="metadata" />
            </div>
            <div className="modal-footer">
              <div>
                <div className="eyebrow">DEMO / {t(project.category, language)}</div>
                <h2 id="modal-title" className="modal-title">
                  {t(project.title, language)}
                </h2>
              </div>
              <Link className="primary-button" href={`/work/${project.slug}`}>
                {language === "zh" ? "查看完整案例" : "View case study"}
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
                src="/media/showreel/LIUKER_Showreel_2026_web.mp4?v=4b1e0911-web19"
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

function Marquee({ open }: { open: (project: Project) => void }) {
  const { language } = useLanguage();
  const menuItems: InfiniteMenuItem<Project>[] = projects.slice(0, 20).map((project) => ({
    image: project.poster || "/og.png",
    title: t(project.title, language),
    description: `${t(project.category, language)} · ${project.year}`,
    meta: project.year,
    value: project,
  }));

  return (
    <section id="project-field" className="marquee-section infinite-work-section" aria-label="Interactive project field">
      <div className="infinite-work-kicker container-wide">
        <span>Selected loop / 01—20</span>
        <span>{language === "zh" ? "拖动探索作品" : "Drag to explore"}</span>
      </div>
      <ViewportMount className="infinite-menu-mount">
        {(active) => (
          <InfiniteMenu
            active={active}
            items={menuItems}
            scale={1}
            actionLabel={language === "zh" ? "打开作品" : "Open project"}
            onItemClick={(item) => item.value && open(item.value as Project)}
          />
        )}
      </ViewportMount>
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
  const renderedTimeRef = useRef(0);
  const seekFrameRef = useRef<number | null>(null);
  const lastSeekAtRef = useRef(0);
  const loadRequestedRef = useRef(false);
  const [videoRequested, setVideoRequested] = useState(false);
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

  const requestHeroVideo = () => {
    if (loadRequestedRef.current) return;
    loadRequestedRef.current = true;
    setVideoRequested(true);
  };

  const seekTowardTarget = (timestamp: number) => {
    const video = videoRef.current;
    if (reduced || !video || !durationRef.current) {
      seekFrameRef.current = null;
      return;
    }

    if (timestamp - lastSeekAtRef.current < 40) {
      seekFrameRef.current = window.requestAnimationFrame(seekTowardTarget);
      return;
    }

    if (video.seeking) {
      seekFrameRef.current = window.requestAnimationFrame(seekTowardTarget);
      return;
    }

    const actualTime = Number.isFinite(video.currentTime)
      ? video.currentTime
      : renderedTimeRef.current;
    const difference = targetTimeRef.current - actualTime;
    if (Math.abs(difference) < 0.018) {
      renderedTimeRef.current = targetTimeRef.current;
      seekFrameRef.current = null;
      return;
    }

    const easedStep = Math.max(-0.12, Math.min(0.12, difference * 0.22));
    renderedTimeRef.current = actualTime + easedStep;
    video.currentTime = renderedTimeRef.current;
    lastSeekAtRef.current = timestamp;
    seekFrameRef.current = window.requestAnimationFrame(seekTowardTarget);
  };

  const queueSeek = () => {
    if (seekFrameRef.current === null) {
      seekFrameRef.current = window.requestAnimationFrame(seekTowardTarget);
    }
  };

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    scrollProgressRef.current = Math.min(1, Math.max(0, progress));
    if (scrollProgressRef.current > 0.001) requestHeroVideo();
    const video = videoRef.current;
    if (reduced || !video || !durationRef.current) return;
    const end = Math.max(0, durationRef.current - 0.05);
    targetTimeRef.current = scrollProgressRef.current * end;
    queueSeek();
  });

  useEffect(() => () => {
    if (seekFrameRef.current !== null) {
      window.cancelAnimationFrame(seekFrameRef.current);
    }
  }, []);

  useEffect(() => {
    const requestOnScroll = () => requestHeroVideo();
    window.addEventListener("scroll", requestOnScroll, { passive: true, once: true });
    return () => window.removeEventListener("scroll", requestOnScroll);
  }, []);

  const registerDuration = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    durationRef.current = video.duration;
    const end = Math.max(0, video.duration - 0.05);
    const initialTime = Math.max(0.01, scrollProgressRef.current * end);
    targetTimeRef.current = initialTime;
    renderedTimeRef.current = video.currentTime || 0.01;
    video.pause();
    queueSeek();
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
      renderedTimeRef.current = Number.isFinite(video.currentTime)
        ? video.currentTime
        : 0.01;
      video.pause();
      queueSeek();
    };

    ensureDuration();
    video.addEventListener("loadedmetadata", ensureDuration);
    video.addEventListener("durationchange", ensureDuration);

    return () => {
      video.removeEventListener("loadedmetadata", ensureDuration);
      video.removeEventListener("durationchange", ensureDuration);
    };
  }, []);

  return (
    <section ref={sectionRef} className="hero" aria-label="Scroll-controlled showreel">
      <div className="hero-stage">
        <div className="hero-media">
          <motion.div
            className="hero-media-frame"
            data-video-requested={videoRequested || undefined}
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
              src={videoRequested ? HERO_VIDEO_SRC : undefined}
              muted
              playsInline
              preload={videoRequested ? "metadata" : "none"}
              onLoadedMetadata={registerDuration}
              onCanPlay={queueSeek}
              onLoadedData={() => setFrameReady(true)}
              onSeeked={() => setFrameReady(true)}
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
              <a className="ghost-button" href="#work">
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
                  storageKey={`liuker-experience-${index}-year-${language}`}
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
                  storageKey={`liuker-experience-${index}-title-${language}`}
                  value={t(item.title, language)}
                  ariaLabel={language === "zh" ? "点击编辑经历名称" : "Click to edit role"}
                />
                <InlineEditable
                  as="p"
                  storageKey={`liuker-experience-${index}-note-${language}`}
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
            <h2 className="contact-title gradient-text">
              {t(siteContent.contact.heading, language)}
            </h2>
          </FadeIn>
          <p className="contact-note">{t(siteContent.contact.note, language)}</p>
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
  const { theme } = useTheme();
  const router = useRouter();
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [showreelOpen, setShowreelOpen] = useState(false);
  const masonryHeights = [520, 410, 470, 390, 540, 430, 500, 380, 460, 560, 405, 485, 535, 420, 510, 390, 475, 545, 415, 495];
  const masonryItems: MasonryItem<Project>[] = projects.slice(0, 20).map((project, index) => ({
    id: `${project.slug}-${index + 1}`,
    img: project.poster || "/og.png",
    height: masonryHeights[index % masonryHeights.length],
    title: t(project.title, language),
    category: t(project.category, language),
    year: project.year,
    value: project,
  }));

  return (
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

      <Marquee open={setActiveProject} />

      <section id="work" className="selected-section container-wide">
        <div className="section-lead">
          <FadeIn>
            <div className="eyebrow">{language === "zh" ? "精选案例" : "Selected cases"}</div>
            <h2 className="section-heading gradient-text">{language === "zh" ? "作品" : "Work"}</h2>
          </FadeIn>
          <span className="section-count">{masonryItems.length} / {projects.length} · Demo</span>
        </div>
        <Masonry
          items={masonryItems}
          onItemClick={setActiveProject}
          onDetails={(project) => router.push(`/work/${project.slug}`)}
          playLabel={language === "zh" ? "播放" : "Play"}
          detailsLabel={language === "zh" ? "案例详情" : "Case study"}
        />
      </section>

      <section id="about" className="about-section container-wide">
        <div className="about-orb-stage">
          <ViewportMount className="about-orb-mount">
            {(active) => (
              <Orb
                active={active}
                hue={285}
                hoverIntensity={0.62}
                rotateOnHover
                backgroundColor={theme === "light" ? "#f3f0e9" : "#0c0c0c"}
              />
            )}
          </ViewportMount>
        </div>
        <div className="about-content">
          <FadeIn>
            <div className="eyebrow">
              <InlineEditable
                storageKey={`liuker-about-kicker-${language}`}
                value={language === "zh" ? "关于这份作品集" : "About this portfolio"}
                ariaLabel={language === "zh" ? "点击编辑关于板块标签" : "Click to edit about label"}
              />
            </div>
            <EditablePressureTitle
              storageKey={`liuker-about-title-${language}`}
              value={language === "zh" ? "关于我" : "ABOUT ME"}
              editLabel={language === "zh" ? "编辑标题" : "Edit title"}
            />
          </FadeIn>
          <EditableProximityCopy
            storageKey={`liuker-about-copy-${language}`}
            value={t(siteContent.about, language)}
            editLabel={language === "zh" ? "编辑文字" : "Edit copy"}
          />
        </div>
      </section>

      <ExperienceTimeline />

      <ContactSection />

      <ShowreelModal open={showreelOpen} onClose={() => setShowreelOpen(false)} />
      <VideoModal project={activeProject} onClose={() => setActiveProject(null)} />
    </main>
    </ClickSpark>
  );
}
