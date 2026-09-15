import Link from "next/link";
import { ZLifePublicShell } from "@/components/zlife-public-shell";
import { zlifeModules } from "@/lib/zlife/modules";

export function ZLifeMarketingHome() {
  const activeModules = zlifeModules.filter((item) => item.status === "active");

  return (
    <ZLifePublicShell>
      <section className="zlife-hero">
        <div className="zlife-hero-copy">
          <p className="zlife-eyebrow">ONE PLATFORM. A BRIGHTER YOU.</p>
          <h1>Life and Business,<br /><span>Better Together.</span></h1>
          <p className="zlife-lede">Z-Life connects business, AI support, websites, apps, home, and everyday digital work without forcing users into another pile of disconnected subscriptions.</p>
          <div className="zlife-hero-actions"><Link className="zlife-primary" href="/auth/sign-in">Open Z-Life <span>→</span></Link><Link className="zlife-secondary" href="/modules">Explore Modules</Link></div>
          <div className="zlife-benefits"><span>⌁ Less overwhelm</span><span>◎ AI that works for you</span><span>▥ One connected platform</span><span>◇ Human-centered controls</span></div>
        </div>
        <div className="zlife-hero-art" role="img" aria-label="Z-Life star-filled landscape connecting life and business">
          <div className="zlife-stars" /><div className="zlife-mountain mountain-back" /><div className="zlife-mountain mountain-front" /><div className="zlife-lake" />
          <div className="zlife-vision-copy">PLAN · BUILD · ORGANIZE · SIMPLIFY · ACHIEVE · LIVE</div>
          <div className="zlife-hero-badge">Different parts of life.<br /><strong>One intelligent platform.</strong></div>
        </div>
      </section>

      <section className="zlife-section" aria-labelledby="gateway-heading">
        <div className="zlife-section-heading"><div><p className="zlife-kicker">WHAT Z-LIFE IS</p><h2 id="gateway-heading">One platform with focused places to go.</h2><p>The homepage stays simple. Each major area now has its own page so visitors can understand Z-Life without scrolling through the entire company story at once.</p></div></div>
        <div className="zlife-flow-grid"><article><span>01</span><h3>AI Teams</h3><p>See the specialized AI support areas and how Z-Life routes work.</p><Link href="/ai-teams">Explore AI Teams →</Link></article><article><span>02</span><h3>Modules</h3><p>Browse the active and developing modules inside the Z-Life platform.</p><Link href="/modules">Browse modules →</Link></article><article><span>03</span><h3>Our Vision</h3><p>Understand the long-term connected-platform goal and automation model.</p><Link href="/vision">Read the vision →</Link></article><article><span>04</span><h3>Community</h3><p>Learn how people can contribute, test, improve, and help shape Z-Life.</p><Link href="/community">Explore community →</Link></article></div>
      </section>

      <section className="zlife-section zlife-modules-section" aria-labelledby="modules-heading">
        <div className="zlife-section-heading"><div><p className="zlife-kicker">ACTIVE NOW</p><h2 id="modules-heading">Start with what already works.</h2><p>Tree Service is the first active business vertical, and the AI Assistant is an active Z-Life module.</p></div><Link href="/modules">View all modules →</Link></div>
        <div className="zlife-module-grid">{activeModules.map((item) => <Link aria-label={`${item.name}. ${item.status === "active" ? "Active module" : "In development"}.`} className="zlife-module-card is-active" href={`/modules/${item.slug}`} key={item.slug}><div className="zlife-module-brand"><span className="module-z">Z</span><span>Z-LIFE</span></div><div className="zlife-module-main"><span className="zlife-module-icon" aria-hidden="true">{item.icon}</span><div><h3>{item.shortName}</h3><p>{item.description}</p></div></div>{item.nestedLabel ? <div className="zlife-nested-module"><span aria-hidden="true">▲</span><div><strong>{item.nestedLabel}</strong><small>Connected working capability</small></div><b>ACTIVE</b></div> : null}<span className="zlife-status is-active">Active Module</span></Link>)}</div>
      </section>

      <section className="zlife-founder-section" aria-labelledby="founder-heading">
        <div className="zlife-founder-copy"><p className="zlife-kicker">BUILT FROM REAL-WORLD PROBLEMS</p><h2 id="founder-heading">From tattooing, to tree service, to building a simpler digital system.</h2><p>Z-Life grew from firsthand experience with creative work, small-business operations, AI, and the frustration of managing too many disconnected tools.</p><div className="zlife-hero-actions"><Link className="zlife-secondary" href="/about">Read the founder story</Link><Link className="zlife-secondary" href="/vision">See where Z-Life is going</Link></div></div>
      </section>
    </ZLifePublicShell>
  );
}
