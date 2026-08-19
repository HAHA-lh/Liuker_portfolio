"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import ClickSpark from "../../components/ClickSpark";
import Masonry, { type MasonryItem } from "../../components/Masonry";
import { projects, siteContent, t, type Project } from "../../content";
import { useLanguage } from "../../language";
import {
  getPortfolioGroup,
  getProjectsForPortfolioGroup,
  portfolioGroups,
  type PortfolioGroupId,
} from "../../portfolio-groups";
import { ThemeToggle } from "../../theme";

const ease = [0.25, 0.1, 0.25, 1] as const;
const masonryHeights = [520, 410, 470, 390, 540, 430, 500, 380, 460, 560];

function FieldLanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="portfolio-field-language" aria-label="Language / 语言">
      <button
        type="button"
        className={language === "zh" ? "is-active" : ""}
        onClick={() => setLanguage("zh")}
        aria-pressed={language === "zh"}
      >
        中
      </button>
      <button
        type="button"
        className={language === "en" ? "is-active" : ""}
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
      >
        EN
      </button>
    </div>
  );
}

function PortfolioVideoModal({
  project,
  onClose,
}: {
  project: Project | null;
  onClose: () => void;
}) {
  const { language } = useLanguage();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!project) return;
    document.body.classList.add("modal-open");

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;

      const panel = document.querySelector<HTMLElement>(".portfolio-field-modal .modal-panel");
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
    };

    window.addEventListener("keydown", onKey);
    window.setTimeout(() => closeRef.current?.focus(), 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open");
    };
  }, [onClose, project]);

  const stop = (event: MouseEvent<HTMLDivElement>) => event.stopPropagation();

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          className="video-modal portfolio-field-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="portfolio-field-modal-title"
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
                <h2 id="portfolio-field-modal-title" className="modal-title">
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

export function PortfolioFieldPage({ groupId }: { groupId: PortfolioGroupId }) {
  const { language } = useLanguage();
  const router = useRouter();
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const group = getPortfolioGroup(groupId) ?? portfolioGroups[0];
  const groupProjects = getProjectsForPortfolioGroup(group);
  const masonryItems: MasonryItem<Project>[] = groupProjects.map((project, index) => ({
    id: `${group.id}-${project.slug}`,
    img: project.poster || "/og.png",
    height: masonryHeights[index % masonryHeights.length],
    title: t(project.title, language),
    category: t(project.category, language),
    year: project.year,
    value: project,
  }));
  const closeModal = useCallback(() => setActiveProject(null), []);

  return (
    <ClickSpark sparkColor="#ff6a8b" sparkSize={12} sparkRadius={25} sparkCount={10} duration={480}>
      <main className="site-shell portfolio-field-shell">
        <header className="portfolio-field-nav container-wide">
          <Link href="/" className="brand-mark" aria-label="LIUKER home">
            <span className="brand-orb" />
            {siteContent.name}
          </Link>
          <div className="portfolio-field-controls">
            <Link href="/#project-field" className="portfolio-field-back">
              <ArrowLeft size={15} />
              {language === "zh" ? "返回三个方向" : "Back to three fields"}
            </Link>
            <ThemeToggle />
            <FieldLanguageToggle />
          </div>
        </header>

        <section className="portfolio-field-hero container-wide">
          <div className="portfolio-field-breadcrumb">
            <Link href="/">LIUKER</Link>
            <span>/</span>
            <Link href="/#project-field">{language === "zh" ? "三个方向" : "Three fields"}</Link>
            <span>/</span>
            <span>{group.index}</span>
          </div>

          <div className="section-lead portfolio-field-lead">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease }}
            >
              <div className="eyebrow">
                {language === "zh" ? "当前作品方向" : "Selected discipline"} · {group.index}
              </div>
              <h1 className="portfolio-field-title gradient-text">{t(group.title, language)}</h1>
              <p className="portfolio-work-description">{t(group.description, language)}</p>
            </motion.div>
            <span className="section-count">
              {groupProjects.length} / {projects.length} · {language === "zh" ? "视频作品" : "Video works"}
            </span>
          </div>

          <nav
            className="portfolio-work-tabs portfolio-field-tabs"
            aria-label={language === "zh" ? "切换作品方向" : "Switch portfolio discipline"}
          >
            {portfolioGroups.map((item) => (
              <Link
                key={item.id}
                href={`/portfolio/${item.id}`}
                className={item.id === group.id ? "is-active" : ""}
                aria-current={item.id === group.id ? "page" : undefined}
              >
                <span>{item.index}</span>
                {t(item.title, language)}
              </Link>
            ))}
          </nav>

          <Masonry
            key={`${group.id}-${language}`}
            items={masonryItems}
            onItemClick={setActiveProject}
            onDetails={(project) => router.push(`/work/${project.slug}`)}
            playLabel={language === "zh" ? "播放" : "Play"}
            detailsLabel={language === "zh" ? "案例详情" : "Case study"}
          />
        </section>

        <footer className="portfolio-field-footer container-wide">
          <Link href="/#project-field">
            <ArrowLeft size={16} />
            {language === "zh" ? "选择其他作品方向" : "Choose another discipline"}
          </Link>
          <span>© 2026 {siteContent.name}</span>
        </footer>

        <PortfolioVideoModal project={activeProject} onClose={closeModal} />
      </main>
    </ClickSpark>
  );
}
