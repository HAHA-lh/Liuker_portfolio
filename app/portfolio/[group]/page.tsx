import { notFound } from "next/navigation";
import { getPortfolioGroup, portfolioGroups } from "../../portfolio-groups";
import { PortfolioFieldPage } from "./portfolio-field-page";

export function generateStaticParams() {
  return portfolioGroups.map((group) => ({ group: group.id }));
}

export default async function PortfolioGroupPage({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const { group: groupId } = await params;
  const group = getPortfolioGroup(groupId);
  if (!group) notFound();

  return <PortfolioFieldPage groupId={group.id} />;
}
