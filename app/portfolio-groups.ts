import { projects, type LocalizedText, type Project } from "./content";
import portfolioGroupRows from "../content/portfolio-groups.json";

export type PortfolioGroupId =
  | "film-post"
  | "aigc"
  | "live-gifts"
  | "event-live"
  | "character-design";

export type PortfolioGroup = {
  id: PortfolioGroupId;
  index: string;
  title: LocalizedText;
  label: string;
  description: LocalizedText;
  projectSlugs: string[];
};

export const portfolioGroups: PortfolioGroup[] = portfolioGroupRows.map((group) => ({
  ...group,
  id: group.id as PortfolioGroupId,
}));

export function getPortfolioGroup(id: string) {
  return portfolioGroups.find((group) => group.id === id);
}

export function getProjectsForPortfolioGroup(group: PortfolioGroup) {
  return group.projectSlugs
    .map((slug) => projects.find((project) => project.slug === slug))
    .filter((project): project is Project => Boolean(project));
}
