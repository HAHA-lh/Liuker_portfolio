import { notFound } from "next/navigation";
import { getProject, projects } from "../../content";
import { WorkDetail } from "./work-detail";

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
