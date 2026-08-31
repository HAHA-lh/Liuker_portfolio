import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProject, projects } from "../../content";
import { WorkDetail } from "./work-detail";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return { title: "Project not found — LIUKER" };
  const title = `${project.title.zh} — LIUKER`;
  const description = project.summary.zh;
  const images = project.poster ? [{ url: new URL(project.poster, "https://liuker-portfolio.vercel.app").href }] : [];
  return {
    title, description,
    openGraph: { title, description, type: "website", images },
    twitter: { card: images.length ? "summary_large_image" : "summary", title, description, images: images.map(image => image.url) },
  };
}

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export default async function WorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  const index = projects.findIndex((item) => item.slug === project.slug);
  const nextProject = projects[(index + 1) % projects.length];
  return <WorkDetail project={project} nextProject={nextProject} />;
}
