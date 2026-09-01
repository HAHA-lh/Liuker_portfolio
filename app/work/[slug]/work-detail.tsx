"use client";

import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import LazyVideo from "../../components/LazyVideo";
import { EditorialHeader } from "../../components/EditorialHeader";
import { CounterMediaReveal, MediaScrollExit, SplitLineReveal } from "../../components/EditorialMotion";
import { t, type Project } from "../../content";
import { useLanguage } from "../../language";

export function WorkDetail({ project, nextProject }: { project: Project; nextProject: Project }) {
  const { language } = useLanguage();

  return (
    <main className="editorial-site editorial-detail editorial-motion-pages">
      <EditorialHeader />
      <header className="editorial-detail-hero">
        <Link href="/work" className="editorial-back-link">
          <ArrowLeft size={17} /> <SplitLineReveal>{language === "zh" ? "全部作品" : "All work"}</SplitLineReveal>
        </Link>
        <div className="editorial-detail-title-row">
          <p className="editorial-overline"><SplitLineReveal>{`${t(project.category, language)} / ${project.year}`}</SplitLineReveal></p>
          <h1><SplitLineReveal>{t(project.title, language)}</SplitLineReveal></h1>
        </div>
        <div className="editorial-detail-intro">
          <p><SplitLineReveal>{t(project.summary, language)}</SplitLineReveal></p>
          <dl>
            <div><dt>{language === "zh" ? "职责" : "Role"}</dt><dd>{t(project.role, language)}</dd></div>
            <div><dt>{language === "zh" ? "时长" : "Runtime"}</dt><dd>{project.duration}</dd></div>
            <div><dt>{language === "zh" ? "工具" : "Tools"}</dt><dd>{project.tools.join(" / ")}</dd></div>
          </dl>
        </div>
      </header>

      <MediaScrollExit className="editorial-detail-poster">
        <CounterMediaReveal direction="bottom" background={project.visual}>
        {project.poster ? <img src={project.poster} alt="" fetchPriority="high" /> : null}
        </CounterMediaReveal>
      </MediaScrollExit>

      <section className="editorial-detail-story">
        <div className="editorial-detail-story-row">
          <span><SplitLineReveal>01 / CONCEPT</SplitLineReveal></span>
          <p><SplitLineReveal>{t(project.challenge, language)}</SplitLineReveal></p>
        </div>
        <div className="editorial-detail-story-row">
          <span><SplitLineReveal>02 / PROCESS</SplitLineReveal></span>
          <p><SplitLineReveal>{t(project.process, language)}</SplitLineReveal></p>
        </div>
        <div className="editorial-detail-story-row">
          <span><SplitLineReveal>03 / RESULT</SplitLineReveal></span>
          <p><SplitLineReveal>{t(project.result, language)}</SplitLineReveal></p>
        </div>
      </section>

      <section className="editorial-detail-frames">
        <div className="editorial-detail-section-title">
          <span>04</span>
          <h2>{language === "zh" ? "精选画面" : "Selected Frames"}</h2>
        </div>
        <div className="editorial-frame-grid">
          <MediaScrollExit className="editorial-frame editorial-frame-wide">
            <CounterMediaReveal direction="left" background={project.visual}>
            {project.poster ? <img src={project.poster} alt="" loading="lazy" decoding="async" /> : null}
            </CounterMediaReveal>
          </MediaScrollExit>
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
            rootMargin="180px 0px"
            unloadOnExit
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
