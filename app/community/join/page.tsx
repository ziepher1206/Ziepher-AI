import Link from "next/link";
import { ContributorJoinClient } from "./join-client";
import "../community.css";

export default function ContributorJoinPage() {
  return (
    <main className="zlife-landing zlife-community-page">
      <header className="zlife-nav">
        <Link href="/" className="zlife-brand" aria-label="Z-Life home">
          <span className="zlife-mark" aria-hidden="true"><span className="zlife-z">Z</span><span className="zlife-pulse">⌁</span><span className="zlife-life">LIFE</span></span>
          <small>by Ziepher Tech</small>
        </Link>
        <nav aria-label="Contributor onboarding navigation">
          <Link href="/community">Community</Link>
          <Link href="/community/value">Proof of Value</Link>
        </nav>
      </header>

      <section className="zlife-community-hero" style={{ maxWidth: 980, margin: "0 auto" }}>
        <p className="zlife-eyebrow">ZLIFE CONTRIBUTOR ENTRY</p>
        <h1>One click to join the build.</h1>
        <p className="zlife-lede">Read the community rules, accept them, and enter the ZLife Studio playground. No production credentials or customer data are exposed to public contributors.</p>
      </section>

      <section className="zlife-section" style={{ maxWidth: 980, margin: "0 auto" }}>
        <ContributorJoinClient />
      </section>
    </main>
  );
}
