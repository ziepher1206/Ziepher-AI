import Link from "next/link";
import "../community.css";
import StudioWorkspaceClient from "./workspace-client";

const paths = [
  ["Build a feature", "Choose an open product task, work in a fork or sandbox branch, and submit a pull request."],
  ["Test ZLife", "Run the localhost visual workflow, reproduce bugs, and report exact steps and screenshots."],
  ["Improve design", "Propose clearer interfaces, mobile fixes, accessibility improvements, or better onboarding."],
  ["Share expertise", "Explain real industry workflows so ZLife can turn domain knowledge into better software."],
  ["Translate", "Help make ZLife understandable to more people without changing product behavior."],
  ["Report a problem", "Submit a reproducible bug without exposing private data or secrets."],
] as const;

export default function CommunityStudioPage() {
  return (
    <main className="zlife-landing zlife-community-page">
      <header className="zlife-nav">
        <Link href="/" className="zlife-brand" aria-label="Z-Life home">
          <span className="zlife-mark" aria-hidden="true"><span className="zlife-z">Z</span><span className="zlife-pulse">⌁</span><span className="zlife-life">LIFE</span></span>
          <small>by Ziepher Tech</small>
        </Link>
        <nav aria-label="ZLife Studio navigation">
          <Link href="/community">Community</Link>
          <Link href="/community/value">Proof of Value</Link>
          <a href="https://github.com/ziepher1206/Ziepher-AI/issues" target="_blank" rel="noreferrer">Open Tasks</a>
        </nav>
      </header>

      <section className="zlife-community-hero">
        <p className="zlife-eyebrow">ZLIFE STUDIO · PUBLIC PLAYGROUND</p>
        <h1>Choose how you want to help.</h1>
        <p className="zlife-lede">ZLife Studio is the safe public entry point for people and AI-assisted builders to improve the company together. Public work stays isolated from production until it passes the release gates.</p>
        <div className="zlife-community-flow"><span>Choose</span><b>→</b><span>Build/Test</span><b>→</b><span>Submit</span><b>→</b><span>CI + Visual E2E</span><b>→</b><span>Review</span><b>→</b><span>Verified Value</span></div>
      </section>

      <section className="zlife-section">
        <StudioWorkspaceClient />
      </section>

      <section className="zlife-section">
        <div className="zlife-section-heading"><div><p className="zlife-kicker">CONTRIBUTION PATHS</p><h2>You do not need to be a programmer.</h2><p>Pick the kind of work you are good at. ZLife can turn useful human expertise, testing, design, and code into structured product improvements.</p></div></div>
        <div className="zlife-community-role-grid">
          {paths.map(([title, description], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="zlife-section zlife-community-build">
        <div>
          <p className="zlife-kicker">START BUILDING</p>
          <h2>The playground is open; production is not.</h2>
          <p>Use the public repository, mock providers, localhost visual testing, and your own development resources. No contributor needs Ziepher Tech production secrets to begin.</p>
        </div>
        <div className="zlife-hero-actions">
          <a className="zlife-primary" href="https://github.com/ziepher1206/Ziepher-AI/issues" target="_blank" rel="noreferrer">Choose an Open Task <span>→</span></a>
          <a className="zlife-secondary" href="https://github.com/ziepher1206/Ziepher-AI" target="_blank" rel="noreferrer">Open the ZLife Repository</a>
          <a className="zlife-secondary" href="https://github.com/ziepher1206/Ziepher-AI/blob/main/docs/START-HERE-CONTRIBUTORS.md" target="_blank" rel="noreferrer">Builder Setup</a>
          <Link className="zlife-secondary" href="/community/value">How Value Is Measured</Link>
        </div>
        <p className="zlife-community-empty">Paid contributor rewards and subscription billing are not activated by this screen. When those programs launch, their terms, eligibility, payout logic, and pricing must be published separately before money changes hands.</p>
      </section>
    </main>
  );
}
