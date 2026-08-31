"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Grid2X2, List } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EditorialHeader } from "../components/EditorialHeader";
import { projects, t, type Project } from "../content";
import { useLanguage } from "../language";
import { portfolioGroups } from "../portfolio-groups";

type WorkFilter = "all" | "film" | "ai-cgi" | "motion";
type WorkView = "grid" | "list";

const filters: { id: WorkFilter; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "film", label: "FILM" },
  { id: "ai-cgi", label: "AI / CGI" },
  { id: "motion", label: "MOTION" },
];

const groupBySlug = new Map(
  portfolioGroups.flatMap((group) => group.projectSlugs.map((slug) => [slug, group.id] as const)),
);

function projectFilter(project: Project): Exclude<WorkFilter, "all"> {
  const group = groupBySlug.get(project.slug);
  if (group === "film-post") return "film";
  if (group === "aigc" || group === "character-design") return "ai-cgi";
  return "motion";
}

export function WorkIndex() {
  const { language } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [activeFilter, setActiveFilter] = useState<WorkFilter>("all");
  const [view, setView] = useState<WorkView>("grid");
  const visibleProjects = useMemo(
    () => activeFilter === "all" ? projects : projects.filter((project) => projectFilter(project) === activeFilter),
    [activeFilter],
  );

  return (
    <main className="editorial-site editorial-work-page">
      <EditorialHeader />
      <header className="editorial-work-index-head">
        <p className="editorial-overline">LIUKER / ARCHIVE</p>
        <h1>{language === "zh" ? "作品" : "Work"}</h1>
        <p className="editorial-work-index-intro">
          {language === "zh"
            ? "影像、AI/CGI 与动态设计项目的统一索引。"
            : "A unified index of film, AI/CGI and motion projects."}
        </p>
      </header>

      <section className="editorial-work-index" aria-label={language === "zh" ? "作品索引" : "Work index"}>
        <div className="editorial-work-toolbar">
          <div className="editorial-work-filters" role="group" aria-label="Work filters">
            {filters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={activeFilter === filter.id ? "is-active" : ""}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="editorial-view-toggle" role="group" aria-label="View mode">
            <button type="button" className={view === "grid" ? "is-active" : ""} onClick={() => setView("grid")} aria-label="Grid view">
              <Grid2X2 size={17} />
            </button>
            <button type="button" className={view === "list" ? "is-active" : ""} onClick={() => setView("list")} aria-label="List view">
              <List size={18} />
            </button>
          </div>
        </div>

        <motion.div
          key={`${activeFilter}-${view}`}
          className={`editorial-work-results is-${view}`}
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {visibleProjects.map((project, index) => (
            <Link className="editorial-index-project" href={`/work/${project.slug}`} key={project.slug}>
              <div className="editorial-index-media" style={{ background: project.visual }}>
                {project.poster ? <img src={project.poster} alt="" loading="lazy" decoding="async" /> : null}
              </div>
              <span className="editorial-index-number">{String(index + 1).padStart(2, "0")}</span>
              <div className="editorial-index-copy">
                <h2>{t(project.title, language)}</h2>
                <p>{t(project.category, language)} · {project.year}</p>
              </div>
              <ArrowUpRight className="editorial-index-arrow" size={25} />
            </Link>
          ))}
        </motion.div>
      </section>
    </main>
  );
}
