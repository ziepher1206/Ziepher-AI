import { ZLifePublicShell } from "@/components/zlife-public-shell";

const areas = [
  ["Business", "Operations, customers, scheduling, growth, and industry-specific workflows."],
  ["Home & Family", "Shared household organization, routines, projects, schedules, and family coordination."],
  ["Money", "Costs, planning, decisions, and financial organization with explicit approval boundaries."],
  ["Health & Wellness", "Practical wellness organization, routines, and connected information users choose to manage."],
  ["Builders & Technology", "Websites, apps, product ideas, automation, architecture, testing, and technical work."],
  ["Services & Everyday Needs", "Practical help, service workflows, discovery, booking, and next-step guidance."]
] as const;

export default function AITeamsPage() {
  return <ZLifePublicShell><section className="zlife-section" style={{ paddingTop: 120 }}><div className="zlife-section-heading"><div><p className="zlife-kicker">DEDICATED AI SUPPORT</p><h1>An AI team for every area.</h1><p>Z-Life routes each problem to specialized AI support. Users do not need to learn a complicated agent map.</p></div></div><div className="zlife-flow-grid">{areas.map(([name, summary], index) => <article key={name}><span>{String(index + 1).padStart(2,"0")}</span><h3>{name}</h3><p>{summary}</p></article>)}</div></section></ZLifePublicShell>;
}
