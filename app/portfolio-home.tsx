"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Play,
  Volume2,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { projects, siteContent, t, type Project } from "./content";
import { useLanguage } from "./language";

const ease = [0.25, 0.1, 0.25, 1] as const;

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

function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  return (
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
  );
}

function Header() {
  const { language } = useLanguage();
  return (
    <motion.header
      className="top-nav container-wide"
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease }}
    >
      <Link href="/" className="brand-mark" aria-label="Back to home">
        <span className="brand-orb" />
        {siteContent.name}
      </Link>
      <nav className="nav-links" aria-label={language === "zh" ? "主导航" : "Primary navigation"}>
        <a href="#work">{t(siteContent.nav.work, language)}</a>
        <a href="#about">{t(siteContent.nav.about, language)}</a>
        <a href="#experience">{t(siteContent.nav.experience, language)}</a>
        <a href="#contact">{t(siteContent.nav.contact, language)}</a>
        <LanguageToggle />
      </nav>
    </motion.header>
  );
}

function PreviewVideo({ project, className = "preview-video" }: { project: Project; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) video.pause();
      },
      { threshold: 0.05 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const play = () => {
    if (reduced || !window.matchMedia("(hover: hover)").matches) return;
    ref.current?.play().catch(() => undefined);
  };

  return (
    <video
      ref={ref}
      className={className}
      src={project.previewVideo}
      poster={project.poster || undefined}
      muted
      loop
      playsInline
      preload="metadata"
      onMouseEnter={play}
      onMouseLeave={() => ref.current?.pause()}
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

function MarqueeTile({ project }: { project: Project }) {
  const { language } = useLanguage();
  return (
    <div className="marquee-tile" style={{ "--tile-bg": project.visual } as CSSProperties}>
      <PreviewVideo project={project} />
      <div className="marquee-label">
        <span>{t(project.title, language)}</span>
        <span>{project.year}</span>
      </div>
    </div>
  );
}

function Marquee() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const rowOne = useTransform(scrollYProgress, [0, 1], ["-12%", "4%"]);
  const rowTwo = useTransform(scrollYProgress, [0, 1], ["-2%", "-18%"]);
  const items = [...projects, ...projects];
  return (
    <section ref={sectionRef} className="marquee-section" aria-label="Demo reel wall">
      <motion.div className="marquee-row" style={{ x: rowOne }}>
        {items.map((project, index) => (
          <MarqueeTile key={`a-${project.slug}-${index}`} project={project} />
        ))}
      </motion.div>
      <motion.div className="marquee-row" style={{ x: rowTwo }}>
        {[...items].reverse().map((project, index) => (
          <MarqueeTile key={`b-${project.slug}-${index}`} project={project} />
        ))}
      </motion.div>
    </section>
  );
}

function StackCard({
  project,
  index,
  total,
  open,
}: {
  project: Project;
  index: number;
  total: number;
  open: (project: Project) => void;
}) {
  const { language } = useLanguage();
  const itemRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: itemRef, offset: ["start start", "end start"] });
  const targetScale = 1 - (total - 1 - index) * 0.025;
  const scale = useTransform(scrollYProgress, [0, 1], [1, targetScale]);
  return (
    <div ref={itemRef} className="project-stack-item">
      <motion.article className="project-card" style={{ scale }}>
        <div className="project-info">
          <div>
            <div className="project-index">{String(index + 1).padStart(2, "0")}</div>
            <h3 className="project-title">{t(project.title, language)}</h3>
            <p className="project-description">{t(project.summary, language)}</p>
          </div>
          <div>
            <div className="project-meta">
              <span className="meta-pill">DEMO</span>
              <span className="meta-pill">{t(project.category, language)}</span>
              <span className="meta-pill">{t(project.role, language)}</span>
              <span className="meta-pill">{project.year}</span>
            </div>
            <div className="card-actions">
              <button type="button" className="primary-button" onClick={() => open(project)}>
                <Play size={15} fill="currentColor" />
                {language === "zh" ? "播放视频" : "Play video"}
              </button>
              <Link href={`/work/${project.slug}`} className="ghost-button">
                {language === "zh" ? "案例详情" : "Case study"}
                <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        </div>
        <div className="project-visual" style={{ "--visual-bg": project.visual } as CSSProperties}>
          <PreviewVideo project={project} />
          <span className="visual-corner">
            <Volume2 size={13} /> {language === "zh" ? "悬停预览" : "Hover preview"}
          </span>
        </div>
      </motion.article>
    </div>
  );
}

function AnimatedCharacter({
  char,
  index,
  total,
  progress,
}: {
  char: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const start = index / total;
  const end = Math.min(1, start + 0.14);
  const opacity = useTransform(progress, [start, end], [0.16, 1]);
  return <motion.span style={{ opacity }}>{char === " " ? "\u00A0" : char}</motion.span>;
}

function AnimatedAbout() {
  const { language } = useLanguage();
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.82", "end 0.3"] });
  const copy = t(siteContent.about, language);
  return (
    <p ref={ref} className="animated-copy">
      {Array.from(copy).map((char, index) => (
        <AnimatedCharacter
          key={`${language}-${index}`}
          char={char}
          index={index}
          total={copy.length}
          progress={scrollYProgress}
        />
      ))}
    </p>
  );
}

export function PortfolioHome() {
  const { language } = useLanguage();
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const featured = projects.filter((project) => project.featured);

  return (
    <main className="site-shell">
      <Header />
      <section className="hero container-wide">
        <div className="hero-glow" />
        <motion.div
          className="hero-title-wrap"
          initial={{ opacity: 0, y: 45 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.12, ease }}
        >
          <h1 className="hero-title gradient-text">Video Creator</h1>
        </motion.div>
        <motion.div
          className="hero-reel"
          style={{ "--visual-bg": projects[0].visual } as CSSProperties}
          initial={{ opacity: 0, y: 40, x: "-50%", rotate: -2 }}
          animate={{ opacity: 1, y: 0, x: "-50%", rotate: -2 }}
          transition={{ duration: 0.9, delay: 0.4, ease }}
        >
          <PreviewVideo project={projects[0]} />
        </motion.div>
        <span className="demo-stamp">Demo<br />Portfolio</span>
        <div className="hero-bottom">
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
            <button type="button" className="primary-button" onClick={() => setActiveProject(projects[0])}>
              <Play size={15} fill="currentColor" /> Showreel
            </button>
            <a className="ghost-button" href="#work">
              {language === "zh" ? "浏览作品" : "Explore work"}
            </a>
          </motion.div>
        </div>
      </section>

      <Marquee />

      <section id="work" className="selected-section container-wide">
        <div className="section-lead">
          <FadeIn>
            <div className="eyebrow">{language === "zh" ? "精选案例" : "Selected cases"}</div>
            <h2 className="section-heading gradient-text">{language === "zh" ? "作品" : "Work"}</h2>
          </FadeIn>
          <span className="section-count">04 / 06 · Demo</span>
        </div>
        {featured.map((project, index) => (
          <StackCard
            key={project.slug}
            project={project}
            index={index}
            total={featured.length}
            open={setActiveProject}
          />
        ))}
      </section>

      <section id="about" className="about-section container-wide">
        <motion.div className="about-orb one" whileInView={{ x: 30, rotate: 12 }} transition={{ duration: 1.2 }} />
        <motion.div className="about-orb two" whileInView={{ x: -30, rotate: -12 }} transition={{ duration: 1.2 }} />
        <div className="about-content">
          <FadeIn>
            <div className="eyebrow">{language === "zh" ? "关于这份作品集" : "About this portfolio"}</div>
            <h2 className="section-heading gradient-text">{language === "zh" ? "关于我" : "About me"}</h2>
          </FadeIn>
          <AnimatedAbout />
        </div>
      </section>

      <section id="experience" className="experience-section">
        <div className="container-wide">
          <FadeIn>
            <div className="eyebrow">{language === "zh" ? "为招聘方准备" : "Built for recruiters"}</div>
            <h2 className="section-heading experience-heading">
              {language === "zh" ? "经历与技能" : "Experience"}
            </h2>
          </FadeIn>
          <div className="experience-grid">
            <FadeIn>
              <h3 className="subhead">{language === "zh" ? "经历占位" : "Experience placeholders"}</h3>
              {siteContent.experience.map((item, index) => (
                <article className="timeline-item" key={`${item.year}-${index}`}>
                  <span className="timeline-year">{item.year}</span>
                  <div>
                    <h4 className="timeline-title">{t(item.title, language)}</h4>
                    <p className="timeline-note">{t(item.note, language)}</p>
                  </div>
                </article>
              ))}
            </FadeIn>
            <FadeIn delay={0.12}>
              <h3 className="subhead">{language === "zh" ? "软件与能力" : "Tools & capabilities"}</h3>
              <div className="skills-cloud">
                {siteContent.skills.map((skill) => (
                  <span className="skill-pill" key={skill}>{skill}</span>
                ))}
              </div>
              <div className="capability-list">
                {siteContent.capabilities.map((capability, index) => (
                  <div className="capability-row" key={capability.en}>
                    <span>{t(capability, language)}</span>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <footer id="contact" className="contact-section container-wide">
        <FadeIn>
          <div className="eyebrow">{language === "zh" ? "联系占位" : "Contact placeholder"}</div>
          <h2 className="contact-title gradient-text">{t(siteContent.contact.heading, language)}</h2>
        </FadeIn>
        <div className="contact-copy">
          <p className="contact-note">{t(siteContent.contact.note, language)}</p>
          <span className="ghost-button" aria-disabled="true">
            <BriefcaseBusiness size={16} />
            {language === "zh" ? "等待真实联系方式" : "Awaiting real contact details"}
          </span>
        </div>
        <div className="footer-line">
          <span>© 2026 YOUR NAME</span>
          <span>{language === "zh" ? "首版框架 · 所有内容均为演示" : "V1 Framework · All content is demo"}</span>
        </div>
      </footer>

      <VideoModal project={activeProject} onClose={() => setActiveProject(null)} />
    </main>
  );
}
