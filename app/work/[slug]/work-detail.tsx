"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import LazyVideo from "../../components/LazyVideo";
import { EditorialHeader } from "../../components/EditorialHeader";
import { t, type Project } from "../../content";
import { useLanguage } from "../../language";

function DetailReveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reducedMotion ? false : { opacity: 0, y: 30 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function WorkDetail({ project, nextProject }: { project: Project; nextProject: Project }) {
  const { language } = useLanguage();

  return (
    <main className="editorial-site editorial-detail">
      <EditorialHeader />
      <header className="editorial-detail-hero">
        <Link href="/work" className="editorial-back-link">
          <ArrowLeft size={17} /> {language === "zh" ? "全部作品" : "All work"}
        </Link>
        <div className="editorial-detail-title-row">
          <p className="editorial-overline">{t(project.category, language)} / {project.year}</p>
          <h1>{t(project.title, language)}</h1>
        </div>
        <div className="editorial-detail-intro">
          <p>{t(project.summary, language)}</p>
          <dl>
            <div><dt>{language === "zh" ? "职责" : "Role"}</dt><dd>{t(project.role, language)}</dd></div>
            <div><dt>{language === "zh" ? "时长" : "Runtime"}</dt><dd>{project.duration}</dd></div>
            <div><dt>{language === "zh" ? "工具" : "Tools"}</dt><dd>{project.tools.join(" / ")}</dd></div>
          </dl>
        </div>
      </header>

      <section className="editorial-detail-poster" style={{ background: project.visual } as CSSProperties}>
        {project.poster ? <img src={project.poster} alt="" fetchPriority="high" /> : null}
      </section>

      <section className="editorial-detail-story">
        <DetailReveal className="editorial-detail-story-row">
          <span>01 / CONCEPT</span>
          <p>{t(project.challenge, language)}</p>
        </DetailReveal>
        <DetailReveal className="editorial-detail-story-row">
          <span>02 / PROCESS</span>
          <p>{t(project.process, language)}</p>
        </DetailReveal>
        <DetailReveal className="editorial-detail-story-row">
          <span>03 / RESULT</span>
          <p>{t(project.result, language)}</p>
        </DetailReveal>
      </section>

      <section className="editorial-detail-frames">
        <div className="editorial-detail-section-title">
          <span>04</span>
          <h2>{language === "zh" ? "精选画面" : "Selected Frames"}</h2>
        </div>
        <div className="editorial-frame-grid">
          <div className="editorial-frame editorial-frame-wide" style={{ background: project.visual }}>
            {project.poster ? <img src={project.poster} alt="" loading="lazy" decoding="async" /> : null}
          </div>
          <div className="editorial-frame editorial-frame-color" style={{ background: project.visual }} aria-hidden="true" />
        </div>
      </section>

      <section className="editorial-final-film">
        <div className="editorial-detail-section-title">
          <span>05</span>
          <h2>{language === "zh" ? "最终影片" : "Final Film"}</h2>
        </div>
        <div className="editorial-final-player" style={{ background: project.visual }}>
          <LazyVideo
            src={project.heroVideo}
            poster={project.poster || undefined}
            controls
            playsInline
            preloadWhenVisible="metadata"
            rootMargin="700px 0px"
          />
        </div>
      </section>

      <Link className="editorial-next-project" href={`/work/${nextProject.slug}`}>
        <span>{language === "zh" ? "下一个作品" : "Next project"}</span>
        <strong>{t(nextProject.title, language)}</strong>
        <ArrowUpRight size={54} strokeWidth={1.1} />
      </Link>
    </main>
  );
}
