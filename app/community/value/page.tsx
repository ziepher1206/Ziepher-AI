import Link from "next/link";

import { getContributorValuePortfolios } from "@/lib/community/value-portfolio";
import "../community.css";
import "./value.css";

export const dynamic = "force-dynamic";

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function label(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function ContributorValuePage() {
  const portfolios = await getContributorValuePortfolios();
  const assetCount = new Set(portfolios.flatMap((portfolio) => portfolio.assets.map((asset) => asset.id))).size;
  const totalShares = portfolios.reduce((sum, portfolio) => sum + portfolio.totalEffectiveShares, 0);
  const latestSimulation = portfolios.find((portfolio) => portfolio.latestSimulation)?.latestSimulation ?? null;

  return (
    <main className="zlife-landing zlife-community-page zlife-value-page">
      <header className="zlife-nav">
        <Link href="/" className="zlife-brand" aria-label="Z-Life home">
          <span className="zlife-mark" aria-hidden="true"><span className="zlife-z">Z</span><span className="zlife-pulse">⌁</span><span className="zlife-life">LIFE</span></span>
          <small>by Ziepher Tech</small>
        </Link>
        <nav aria-label="Value portfolio navigation">
          <Link href="/community">Community</Link>
          <a href="#portfolios">Portfolios</a>
          <a href="#how-it-works">How It Works</a>
        </nav>
        <Link className="zlife-nav-cta" href="/community">Back to Community</Link>
      </header>

      <section className="zlife-community-hero zlife-value-hero">
        <p className="zlife-eyebrow">PROOF OF VALUE · SIMULATION ONLY</p>
        <h1>Your work becomes a value portfolio.</h1>
        <p className="zlife-lede">Z-Life tracks verified creation, improvement, maintenance, quality, security, adoption, and downstream dependency value so contributors can see how useful work compounds over time.</p>
        <div className="zlife-community-stats">
          <article><strong>{portfolios.length}</strong><span>Verified contributor portfolios</span></article>
          <article><strong>{assetCount}</strong><span>Active value assets represented</span></article>
          <article><strong>{totalShares.toLocaleString()}</strong><span>Current effective contribution shares</span></article>
          <article><strong>{latestSimulation ? money(latestSimulation.poolAmount, latestSimulation.currency) : "Not run"}</strong><span>Latest hypothetical reward pool</span></article>
        </div>
        <div className="zlife-value-notice">
          <strong>No real-money rights are created here.</strong>
          <span>Contribution Shares, ownership percentages, and reward amounts on this page are internal attribution and simulation data only. They are not wages, equity, securities, tokens, or guaranteed compensation.</span>
        </div>
      </section>

      <section id="portfolios" className="zlife-section">
        <div className="zlife-section-heading">
          <div><p className="zlife-kicker">CONTRIBUTOR VALUE PORTFOLIOS</p><h2>See what your contributions are becoming.</h2><p>Each portfolio is built from verified ledger records and active value assets. Maintenance shares can decay; creation and other classes follow their configured policies.</p></div>
        </div>

        <div className="zlife-value-portfolios">
          {portfolios.length ? portfolios.map((portfolio) => (
            <article className="zlife-value-portfolio" key={portfolio.contributorId}>
              <div className="zlife-value-portfolio-head">
                <div>
                  <p className="zlife-kicker">@{portfolio.githubLogin}</p>
                  <h3>{portfolio.displayName ?? portfolio.githubLogin}</h3>
                  <span>{label(portfolio.status)}</span>
                </div>
                <div className="zlife-value-total">
                  <strong>{portfolio.totalEffectiveShares.toLocaleString()}</strong>
                  <span>effective shares</span>
                </div>
              </div>

              {portfolio.latestSimulation ? (
                <div className="zlife-value-simulated">
                  <span>Latest hypothetical allocation</span>
                  <strong>{money(portfolio.latestSimulation.contributorAmount, portfolio.latestSimulation.currency)}</strong>
                  <small>from a {money(portfolio.latestSimulation.poolAmount, portfolio.latestSimulation.currency)} simulated pool</small>
                </div>
              ) : (
                <div className="zlife-value-simulated zlife-value-empty-sim">
                  <span>Hypothetical allocation</span>
                  <strong>Not simulated yet</strong>
                  <small>No completed reward simulation is available.</small>
                </div>
              )}

              <div className="zlife-value-assets">
                {portfolio.assets.length ? portfolio.assets.map((asset) => (
                  <div className="zlife-value-asset" key={asset.id}>
                    <div className="zlife-value-asset-head">
                      <div><strong>{asset.name}</strong><span>{label(asset.assetType)}{asset.moduleId ? ` · ${asset.moduleId}` : ""}</span></div>
                      <b>{asset.ownershipPercent}%</b>
                    </div>
                    <div className="zlife-value-asset-metrics">
                      <span><b>{asset.effectiveShares.toLocaleString()}</b> effective shares</span>
                      <span><b>{asset.downstreamDependencies}</b> verified downstream links</span>
                      <span><b>{asset.latestSimulatedAmount === null ? "—" : money(asset.latestSimulatedAmount)}</b> simulated allocation</span>
                    </div>
                    <div className="zlife-value-classes">
                      {Object.entries(asset.shareClasses).map(([shareClass, amount]) => (
                        <span key={shareClass}>{label(shareClass)} {amount.toLocaleString()}</span>
                      ))}
                    </div>
                  </div>
                )) : <p className="zlife-community-empty">No active verified value assets are attached to this contributor yet.</p>}
              </div>
            </article>
          )) : (
            <article className="zlife-community-empty-card"><h3>No value portfolios yet.</h3><p>The Proof of Value system will populate this page as verified contribution-share events are attached to active value assets.</p></article>
          )}
        </div>
      </section>

      <section id="how-it-works" className="zlife-section zlife-modules-section">
        <div className="zlife-section-heading"><div><p className="zlife-kicker">VALUE FLOW</p><h2>Verified work → lasting attribution → measurable value.</h2></div></div>
        <div className="zlife-community-role-grid">
          <article><span>01</span><h3>Contribute</h3><p>Code, design, research, testing, writing, translation, security, or other useful work enters the contribution ledger.</p></article>
          <article><span>02</span><h3>Verify</h3><p>Reviewed work can receive Contribution Shares tied to a specific Z-Life value asset.</p></article>
          <article><span>03</span><h3>Measure</h3><p>Usage, outcomes, reliability, savings, adoption, and other evidence influence the asset&apos;s value score.</p></article>
          <article><span>04</span><h3>Compound</h3><p>Verified downstream dependencies let foundational work receive lineage credit when later systems rely on it.</p></article>
          <article><span>05</span><h3>Simulate</h3><p>Z-Life can model hypothetical reward pools before any real compensation system is legally activated.</p></article>
        </div>
      </section>
    </main>
  );
}
