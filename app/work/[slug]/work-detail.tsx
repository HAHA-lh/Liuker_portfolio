"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { siteContent, t, type Project } from "../../content";
import { useLanguage } from "../../language";
import { ThemeToggle } from "../../theme";

function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="language-toggle" aria-label="Language / 语言">
      <button type="button" className={language === "zh" ? "active" : ""} onClick={() => setLanguage("zh")}>中</button>
      <button type="button" className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>EN</button>
    </div>
  );
}

export function WorkDetail({ project, nextProject }: { project: Project; nextProject: Project }) {
  const { language } = useLanguage();
  const processCards = [
    {
      title: language === "zh" ? "挑战" : "Challenge",
      note: t(project.challenge, language),
    },
    {
      title: language === "zh" ? "过程" : "Process",
      note: t(project.process, language),
    },
    {
      title: language === "zh" ? "成果" : "Result",
      note: t(project.result, language),
    },
  ];

  return (
    <main className="detail-page">
      <nav className="detail-nav container-wide">
        <Link href="/#work" className="back-link">
          <ArrowLeft size={16} /> {language === "zh" ? "返回作品" : "Back to work"}
        </Link>
        <div className="brand-mark"><span className="brand-orb" />{siteContent.name}</div>
        <div className="detail-actions">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </nav>

      <header className="detail-hero container-wide">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }}>
          <div className="detail-kicker">
            <span className="meta-pill">DEMO</span>
            <span className="meta-pill">{t(project.category, language)}</span>
            <span className="meta-pill">{project.year}</span>
          </div>
          <h1 className="detail-title gradient-text">{t(project.title, language)}</h1>
        </motion.div>
        <div className="detail-summary">
          <p>{t(project.summary, language)}</p>
          <div className="detail-facts">
            <div className="fact"><span className="fact-label">{language === "zh" ? "职责" : "Role"}</span><span className="fact-value">{t(project.role, language)}</span></div>
            <div className="fact"><span className="fact-label">{language === "zh" ? "时长" : "Duration"}</span><span className="fact-value">{project.duration}</span></div>
            <div className="fact"><span className="fact-label">{language === "zh" ? "工具" : "Tools"}</span><span className="fact-value">{project.tools.join(" · ")}</span></div>
            <div className="fact"><span className="fact-label">{language === "zh" ? "状态" : "Status"}</span><span className="fact-value">{language === "zh" ? "演示占位" : "Demo placeholder"}</span></div>
          </div>
        </div>
      </header>

      <section className="container-wide">
        <div className="detail-player" style={{ "--visual-bg": project.visual } as CSSProperties}>
          <video src={project.heroVideo} poster={project.poster || undefined} controls playsInline preload="metadata" />
        </div>
      </section>

      <section className="case-section container-wide">
        <div className="case-grid">
          <span className="case-label">{language === "zh" ? "案例拆解" : "Case breakdown"}</span>
          <p className="case-copy">{t(project.challenge, language)}</p>
        </div>
        <div className="case-process">
          {processCards.map((card, index) => (
            <article className="process-card" key={card.title}>
              <div className="process-number">{String(index + 1).padStart(2, "0")}</div>
              <h2 className="process-title">{card.title}</h2>
              <p className="process-note">{card.note}</p>
            </article>
          ))}
        </div>
        <div className="media-grid">
          <div className="media-panel" style={{ "--visual-bg": project.visual } as CSSProperties}>
            <video src={project.previewVideo} muted loop playsInline preload="metadata" />
          </div>
          <div className="media-panel" style={{ "--visual-bg": project.visual } as CSSProperties}>
            <video src={project.previewVideo} muted loop playsInline preload="metadata" />
          </div>
        </div>
      </section>

      <Link className="next-project container-wide" href={`/work/${nextProject.slug}`}>
        <span className="next-label">{language === "zh" ? "下一个作品" : "Next project"}</span>
        <span className="next-title">
          {t(nextProject.title, language)} <ArrowUpRight size={48} strokeWidth={1.2} />
        </span>
      </Link>
    </main>
  );
}
