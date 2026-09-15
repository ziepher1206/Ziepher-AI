import Link from "next/link";

import ContributorPathGuide from "../contributor-path-guide";
import "../../community.css";

export default function ContributorFastStartPage() {
  return (
    <main className="zlife-landing zlife-community-page">
      <header className="zlife-nav">
        <Link href="/" className="zlife-brand" aria-label="Z-Life home">
          <span className="zlife-mark" aria-hidden="true"><span className="zlife-z">Z</span><span className="zlife-pulse">⌁</span><span className="zlife-life">LIFE</span></span>
          <small>by Ziepher Tech</small>
        </Link>
        <nav aria-label="Contributor start navigation">
          <Link href="/community">Community</Link>
          <Link href="/community/studio/preview">Preview My Build</Link>
          <Link href="/community/join">Change path</Link>
        </nav>
      </header>

      <section className="zlife-community-hero">
        <p className="zlife-eyebrow">ZLIFE CONTRIBUTOR START</p>
        <h1>Start with what you already know.</h1>
        <p className="zlife-lede">You do not need to understand all of ZLife. Your chosen path gives you a short starting workflow, then Studio lets you pick one useful problem at a time.</p>
      </section>

      <section className="zlife-section">
        <ContributorPathGuide />
        <div className="zlife-hero-actions" style={{ marginTop: 20 }}>
          <Link className="zlife-primary" href="/community/studio">Open My Studio <span>→</span></Link>
          <Link className="zlife-secondary" href="/community/studio/preview">Preview My Build</Link>
          <Link className="zlife-secondary" href="/community/join">Choose a different path</Link>
        </div>
      </section>
    </main>
  );
}
