import Link from "next/link";

import BuildPreviewCard from "../build-preview-card";
import "../../../community.css";

export default function ContributorBuildPreviewPage() {
  return (
    <main className="zlife-landing zlife-community-page">
      <header className="zlife-nav">
        <Link href="/" className="zlife-brand" aria-label="Z-Life home">
          <span className="zlife-mark" aria-hidden="true"><span className="zlife-z">Z</span><span className="zlife-pulse">⌁</span><span className="zlife-life">LIFE</span></span>
          <small>by Ziepher Tech</small>
        </Link>
        <nav aria-label="Build preview navigation">
          <Link href="/community/studio">My Studio</Link>
          <Link href="/community/studio/start">Fast Start</Link>
          <Link href="/community">Community</Link>
        </nav>
      </header>

      <section className="zlife-community-hero">
        <p className="zlife-eyebrow">ZLIFE STUDIO · SAFE PREVIEW</p>
        <h1>Look at your build before you submit it.</h1>
        <p className="zlife-lede">Your preview follows the work on your ZLife pull request. Keep building and pushing changes; the preview updates without touching production.</p>
        <div className="zlife-community-flow"><span>Build</span><b>→</b><span>Push</span><b>→</b><span>Preview</span><b>→</b><span>Fix</span><b>→</b><span>Submit</span></div>
      </section>

      <section className="zlife-section">
        <BuildPreviewCard />
      </section>
    </main>
  );
}
