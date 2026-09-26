"use client";

import { ArrowUpRight, Grid2X2, List } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EditorialHeader } from "../components/EditorialHeader";
import { SplitLineReveal } from "../components/EditorialMotion";
import { projects, t, type Project } from "../content";
import { useLanguage } from "../language";
import { portfolioGroups } from "../portfolio-groups";
import archive from "../../content/work-archive.json";

type WorkFilter = string;
type WorkView = "grid" | "list";

const filters: { id: WorkFilter; label: string }[] = [
  { id: "all", label: "ALL" },
  ...archive.categories,
];

const groupBySlug = new Map(
  portfolioGroups.flatMap((group) => group.projectSlugs.map((slug) => [slug, group.id] as const)),
);

function projectFilter(project: Project): string {
  const group = groupBySlug.get(project.slug);
  return archive.categories.find((category) => category.groupIds.includes(group || ""))?.id || "unassigned";
}

export function WorkIndex() {
  const { language } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<WorkFilter>("all");
  const [view, setView] = useState<WorkView>("grid");
  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      const category = params.get("category") || "all";
      setActiveFilter(filters.some(f => f.id === category) ? category : "all");
      setView(params.get("view") === "list" ? "list" : "grid");
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  const choose = (category: string, mode: WorkView) => {
    setActiveFilter(category); setView(mode);
    const url = new URL(window.location.href);
    if(category === "all") url.searchParams.delete("category"); else url.searchParams.set("category", category);
    if(mode === "grid") url.searchParams.delete("view"); else url.searchParams.set("view", mode);
    window.history.pushState(null, "", url);
  };
  const label = (id: string) => id === "all" ? (language === "zh" ? "全部作品" : "All work") : language === "zh" ? filters.find(f => f.id === id)?.label : portfolioGroups.find(g => g.id === id)?.title.en || filters.find(f => f.id === id)?.label;
  const visibleProjects = useMemo(
    () => activeFilter === "all" ? projects : projects.filter((project) => projectFilter(project) === activeFilter),
    [activeFilter],
  );

  return (
    <main className="editorial-site editorial-work-page editorial-motion-pages">
      <EditorialHeader />
      <header className="editorial-work-index-head">
        <p className="editorial-overline"><SplitLineReveal>LIUKER / ARCHIVE</SplitLineReveal></p>
        <h1><SplitLineReveal>{language === "zh" ? "作品" : "Work"}</SplitLineReveal></h1>
        <p className="editorial-work-index-intro">
          <SplitLineReveal>{language === "zh"
            ? "影像、AI/CGI 与动态设计项目的统一索引。"
            : "A unified index of film, AI/CGI and motion projects."}</SplitLineReveal>
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
                aria-pressed={activeFilter === filter.id}
                onClick={() => choose(filter.id, view)}
              >
                {label(filter.id)} <small>{filter.id === "all" ? projects.length : projects.filter(p => projectFilter(p) === filter.id).length}</small>
              </button>
            ))}
          </div>
          <div className="editorial-view-toggle" role="group" aria-label="View mode">
            <button type="button" className={view === "grid" ? "is-active" : ""} onClick={() => choose(activeFilter, "grid")} aria-pressed={view === "grid"} aria-label={language === "zh" ? "网格视图" : "Grid view"}>
              <Grid2X2 size={17} />
            </button>
            <button type="button" className={view === "list" ? "is-active" : ""} onClick={() => choose(activeFilter, "list")} aria-pressed={view === "list"} aria-label={language === "zh" ? "列表视图" : "List view"}>
              <List size={18} />
            </button>
          </div>
        </div>
        <div className="editorial-work-summary" role="status"><span>{label(activeFilter)} · {visibleProjects.length} {language === "zh" ? "件作品" : "projects"}</span><span>{language === "zh" ? "点击作品查看详情" : "Select a project to explore"}</span></div>
        {visibleProjects.length === 0 && <div className="editorial-work-empty"><p>{language === "zh" ? "这个分类暂时没有作品。" : "No projects in this category yet."}</p><button onClick={() => choose("all", view)}>{language === "zh" ? "查看全部作品" : "View all work"}</button></div>}

        <div
          key={`${activeFilter}-${view}`}
          className={`editorial-work-results is-${view}`}
        >
          {visibleProjects.map((project, index) => (
            <Link className="editorial-index-project" href={`/work/${project.slug}`} key={project.slug}>
              <div className="editorial-index-media" style={{ background: project.visual }}>
                {project.poster ? <img src={project.poster} alt="" loading="lazy" decoding="async" /> : null}
              </div>
              <span className="editorial-index-number">{String(index + 1).padStart(2, "0")}</span>
              <div className="editorial-index-copy">
                <h2>{t(project.title, language)}</h2>
                <p>{`${t(project.category, language)} · ${project.year}`}</p>
              </div>
              <ArrowUpRight className="editorial-index-arrow" size={25} />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
