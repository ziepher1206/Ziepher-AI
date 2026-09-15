import Link from "next/link";

import { ZLifeHeartbeat } from "@/components/zlife-heartbeat";
import { getPublicContributorSummaries } from "@/lib/community/public-summary";
import "./community.css";

export const dynamic = "force-dynamic";

const roles: Array<[string, string]> = [
  ["Community Member", "Discover, discuss, learn, and help shape useful work."],
  ["Contributor", "Submit useful code, documentation, design, testing, or other verified work."],
  ["Verified Contributor", "Build a history of accepted, reviewed contributions."],
  ["ZLife Developer", "Contribute consistently across product and engineering work."],
  ["Module Maintainer", "Take ongoing responsibility for a ZLife module."],
  ["Core Contributor", "Make sustained, high-impact contributions across ZLife."],
  ["Core Team", "Maintain core platform direction, security, and release responsibility."],
];

function formatRole(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function CommunityPage() {
  const contributors = await getPublicContributorSummaries();
  const verifiedPoints = contributors.reduce((sum, contributor) => sum + contributor.lifetimeScore, 0);

  return (
    <main className="zlife-landing zlife-community-page">
      <header className="zlife-nav">
        <Link href="/" className="zlife-brand" aria-label="Z-Life home">
          <span className="zlife-mark" aria-hidden="true"><span className="zlife-z">Z</span><ZLifeHeartbeat /><span className="zlife-life">LIFE</span></span>
          <small>by Ziepher Tech</small>
        </Link>
        <nav aria-label="Community navigation">
          <Link href="/">Home</Link>
          <a href="#contributors">Contributors</a>
          <Link href="/community/value">Proof of Value</Link>
          <a href="#roles">Roles</a>
          <a href="#shape">Shape Z-Life</a>
          <a href="#build">Build With Us</a>
        </nav>
        <Link className="zlife-nav-cta" href="/community/join">Help Build ZLife</Link>
      </header>

      <section className="zlife-community-hero">
        <p className="zlife-eyebrow">COMMUNITY-BUILT · ZIEPHER TECH OPERATED</p>
        <h1>Build Z-Life With Us.</h1>
        <p className="zlife-lede">Z-Life is being built in public so people around the world can contribute code, design, testing, translations, ideas, and real-world expertise without receiving access to Ziepher Tech production infrastructure.</p>
        <div className="zlife-hero-actions">
          <Link className="zlife-primary" href="/community/join">Join the ZLife Playground <span>→</span></Link>
          <a className="zlife-secondary" href="https://github.com/ziepher1206/Ziepher-AI/issues" target="_blank" rel="noreferrer">View Open Tasks</a>
          <Link className="zlife-secondary" href="/community/value">Explore Proof of Value</Link>
          <a className="zlife-secondary" href="https://github.com/ziepher1206/Ziepher-AI/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer">Contributor Guide</a>
        </div>
        <div className="zlife-community-stats">
          <article><strong>{contributors.length}</strong><span>Verified team identities</span></article>
          <article><strong>{verifiedPoints.toLocaleString()}</strong><span>Verified contribution points</span></article>
          <article><strong>5</strong><span>Tracked Z-Life modules</span></article>
          <article><strong>$0 target</strong><span>Added Ziepher Tech platform cost per contributor</span></article>
        </div>
      </section>

      <section id="contributors" className="zlife-section">
        <div className="zlife-section-heading">
          <div><p className="zlife-kicker">VERIFIED CONTRIBUTORS</p><h2>Contribution, not popularity.</h2><p>Only verified ledger data appears here. Pending activity, raw commit counts, and unreviewed work do not create public contribution value.</p></div>
        </div>
        <div className="zlife-community-contributors">
          {contributors.length ? contributors.map((contributor) => (
            <article className="zlife-community-contributor" key={contributor.githubLogin}>
              <div className="zlife-community-contributor-head">
                <div><h3>{contributor.displayName ?? contributor.githubLogin}</h3><p>@{contributor.githubLogin}</p></div>
                <span>{formatRole(contributor.status)}</span>
              </div>
              <dl>
                <div><dt>Lifetime verified score</dt><dd>{contributor.lifetimeScore.toLocaleString()}</dd></div>
                <div><dt>Last 90 days</dt><dd>{contributor.recent90DayScore.toLocaleString()}</dd></div>
                <div><dt>Lifetime contribution</dt><dd>{contributor.lifetimeContributionPercent}%</dd></div>
                <div><dt>Recent contribution</dt><dd>{contributor.recentContributionPercent}%</dd></div>
              </dl>
              {contributor.modules.length ? <div className="zlife-community-module-list">{contributor.modules.map((module) => <span key={module.id}>{module.name}: {module.score} pts · {module.contributionPercent}%</span>)}</div> : <p className="zlife-community-empty">No scored contribution events have been verified yet.</p>}
            </article>
          )) : <article className="zlife-community-empty-card"><h3>No scored contributors yet.</h3><p>The ledger is live, but Z-Life will not invent contribution history. Verified work will appear here after review.</p></article>}
        </div>
      </section>

      <section id="roles" className="zlife-section zlife-modules-section">
        <div className="zlife-section-heading"><div><p className="zlife-kicker">COMMUNITY PATH</p><h2>Earn trust through meaningful work.</h2><p>Community recognition is based on reviewed contribution and responsibility. These roles do not automatically create employment, contractor, partnership, equity, or ownership status.</p></div></div>
        <div className="zlife-community-role-grid">{roles.map(([role, description], index) => <article key={role}><span>{String(index + 1).padStart(2, "0")}</span><h3>{role}</h3><p>{description}</p></article>)}</div>
      </section>

      <section id="shape" className="zlife-section zlife-community-build">
        <div><p className="zlife-kicker">SHAPE Z-LIFE WITHOUT WRITING CODE</p><h2>Report problems. Propose ideas. Help decide what matters.</h2><p>Public participation is not limited to developers. People can report reproducible problems, propose features or new module ideas, explain real workflows, and volunteer to design, build, or test improvements.</p></div>
        <div className="zlife-hero-actions">
          <Link className="zlife-primary" href="/community/join">Enter the Playground <span>→</span></Link>
          <a className="zlife-secondary" href="https://github.com/ziepher1206/Ziepher-AI/issues/new?template=feature-proposal.md" target="_blank" rel="noreferrer">Propose an Idea</a>
          <a className="zlife-secondary" href="https://github.com/ziepher1206/Ziepher-AI/issues/new?template=bug-report.md" target="_blank" rel="noreferrer">Report a Bug</a>
        </div>
        <p className="zlife-community-empty">Never post passwords, API keys, private customer information, payment details, session tokens, or unpatched security vulnerabilities in public issues. Security reports follow the repository Security Policy.</p>
      </section>

      <section id="build" className="zlife-section zlife-community-build">
        <div><p className="zlife-kicker">BUILD WITH YOUR OWN RESOURCES</p><h2>Accept. Choose. Build. Test. Submit.</h2><p>ZLife Studio is the public front door. Contributors accept the safety rules, choose how they want to help, and then use the public repository, their own development resources, and ZLife mock-mode foundations without receiving production access.</p></div>
        <div className="zlife-community-flow"><span>Accept</span><b>→</b><span>Choose</span><b>→</b><span>Build/Test</span><b>→</b><span>Pull Request</span><b>→</b><span>CI + Visual E2E</span><b>→</b><span>Verified Value</span></div>
        <div className="zlife-hero-actions">
          <Link className="zlife-primary" href="/community/join">Help Build ZLife <span>→</span></Link>
          <a className="zlife-secondary" href="https://github.com/ziepher1206/Ziepher-AI" target="_blank" rel="noreferrer">Open Repository</a>
          <a className="zlife-secondary" href="https://github.com/ziepher1206/Ziepher-AI/security" target="_blank" rel="noreferrer">Security Policy</a>
        </div>
      </section>
    </main>
  );
}
