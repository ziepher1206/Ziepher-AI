import Link from "next/link";
import { zlifeModules } from "@/lib/zlife/modules";
import styles from "./zlife-marketing-home.module.css";

const aiAreas = [
  ["Business", "Operations, customers, scheduling, growth, and industry-specific workflows."],
  ["Home & Family", "Shared household organization, routines, projects, schedules, and family coordination."],
  ["Money", "Costs, planning, decisions, and financial organization with explicit approval boundaries."],
  ["Health & Wellness", "Practical wellness organization, routines, and connected information users choose to manage."],
  ["Builders & Technology", "Websites, apps, product ideas, automation, architecture, testing, and technical work."],
  ["Services & Everyday Needs", "Practical help, service workflows, discovery, booking, and next-step guidance."],
] as const;

function ZMark() {
  return (
    <span className="zlife-mark" aria-hidden="true">
      <span className="zlife-z">Z</span><span className="zlife-pulse">⌁</span><span className="zlife-life">LIFE</span>
    </span>
  );
}

export function ZLifeMarketingHome() {
  return (
    <main className="zlife-landing">
      <a className={styles.skipLink} href="#main-content">Skip to main content</a>
      <header className="zlife-nav">
        <Link href="/" className="zlife-brand" aria-label="Z-Life home"><ZMark /><small>by Ziepher Tech</small></Link>
        <nav aria-label="Primary navigation"><a href="#home">Home</a><a href="#team">AI Teams</a><a href="#modules">Modules</a><a href="#founder">About</a><a href="#vision">Our Vision</a><Link href="/community">Community</Link></nav>
        <Link className="zlife-nav-cta" href="/auth/sign-in">Open Z-Life</Link>
      </header>
      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        <a href="#team">AI Teams</a><a href="#modules">Modules</a><a href="#founder">About</a><a href="#vision">Our Vision</a><Link href="/community">Community</Link>
      </nav>

      <section id="main-content" className="zlife-hero" tabIndex={-1}>
        <div className="zlife-hero-copy" id="home">
          <p className="zlife-eyebrow">ONE PLATFORM. A BRIGHTER YOU.</p>
          <h1>Life and Business,<br /><span>Better Together.</span></h1>
          <p className="zlife-lede">Z-Life is a unified AI platform for life, business, websites, apps, and everyday operations — powered by specialized AI support working together instead of another pile of disconnected apps.</p>
          <div className="zlife-hero-actions"><Link className="zlife-primary" href="/auth/sign-in">Open Z-Life <span>→</span></Link><a className="zlife-secondary" href="#modules">Explore Modules</a></div>
          <div className="zlife-benefits"><span>⌁ Less overwhelm</span><span>◎ AI that works for you</span><span>▥ One connected platform</span><span>◇ Private and human-centered</span></div>
        </div>
        <div className="zlife-hero-art" role="img" aria-label="Z-Life vision showing a star-filled landscape connecting life and business">
          <div className="zlife-stars" /><div className="zlife-mountain mountain-back" /><div className="zlife-mountain mountain-front" /><div className="zlife-lake" />
          <div className="zlife-vision-copy">PLAN · BUILD · ORGANIZE · SIMPLIFY · ACHIEVE · LIVE</div>
          <div className="zlife-hero-badge">Different parts of life.<br /><strong>One intelligent platform.</strong></div>
        </div>
      </section>

      <section id="team" className="zlife-section" aria-labelledby="team-heading">
        <div className="zlife-section-heading"><div><p className="zlife-kicker">DEDICATED AI SUPPORT</p><h2 id="team-heading">An AI team for every area.</h2><p>You do not need to learn which agent does what. Z-Life routes the problem to specialized AI support built for that area.</p></div></div>
        <div className={styles.areaGrid}>
          {aiAreas.map(([name, summary], index) => (
            <article className={styles.areaCard} key={name}>
              <div className={styles.robotIcon} aria-hidden="true"><span>◎</span><b>{String(index + 1).padStart(2, "0")}</b></div>
              <h3>{name}</h3><p>{summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="modules" className="zlife-section zlife-modules-section" aria-labelledby="modules-heading">
        <div className="zlife-section-heading"><div><p className="zlife-kicker">Z-LIFE MODULES</p><h2 id="modules-heading">One platform. Specialized modules.</h2><p>Every module connects to the same Z-Life identity, assistant, permissions, and account.</p></div></div>
        <div className="zlife-module-grid">
          {zlifeModules.map((item) => (
            <Link aria-label={`${item.name}. ${item.status === "active" ? "Active module" : "In development"}.`} className={`zlife-module-card ${item.status === "active" ? "is-active" : ""} ${item.nestedLabel ? "has-nested" : ""}`} href={`/modules/${item.slug}`} key={item.slug}>
              <div className="zlife-module-brand"><span className="module-z">Z</span><span>Z-LIFE</span></div>
              <div className="zlife-module-main"><span className="zlife-module-icon" aria-hidden="true">{item.icon}</span><div><h3>{item.shortName}</h3><p>{item.description}</p></div></div>
              {item.nestedLabel ? <div className="zlife-nested-module"><span aria-hidden="true">▲</span><div><strong>Tree Service</strong><small>First active business vertical</small></div><b>ACTIVE</b></div> : null}
              <span className={`zlife-status ${item.status === "active" ? "is-active" : ""}`}>{item.status === "active" ? "Active Module" : "In Development"}</span>
            </Link>
          ))}
        </div>
      </section>

      <section id="vision" className="zlife-section zlife-vision-section" aria-labelledby="vision-heading">
        <div className="zlife-section-heading"><div><p className="zlife-kicker">HOW IT WORKS</p><h2 id="vision-heading">Everything works together.</h2></div></div>
        <div className="zlife-flow-grid"><article><span>01</span><h3>Dedicated AI Teams</h3><p>Specialized AI support handles the problems and decisions in each part of Z-Life.</p></article><article><span>02</span><h3>AI Assistant</h3><p>Your central guide surfaces what matters and connects you to the right module and next action.</p></article><article><span>03</span><h3>Z-Life Modules</h3><p>Business, builders, Home & Family, money, services, and future modules share one connected platform.</p></article><article><span>04</span><h3>A Better Tomorrow</h3><p>Less fragmentation, clearer work, simpler tools, and practical AI built around real people.</p></article></div>
      </section>

      <section id="founder" className="zlife-founder-section" aria-labelledby="founder-heading">
        <div className="zlife-founder-copy">
          <p className="zlife-kicker">ABOUT THE FOUNDER</p>
          <h2 id="founder-heading">I don’t want to build another app people have to add to the pile. I want to simplify the pile.</h2>
          <p>I didn’t come from a traditional tech background. For many years I was a tattoo artist. It was creative, personal work and a major part of my life. When hand tremors made it impossible to keep pursuing tattooing the same way, I had to find a new direction.</p>
          <p>That led me into tree service — a completely different world of physical work, crews, equipment, customers, estimates, scheduling, weather, long days, and all the everyday problems small businesses deal with while still trying to get the actual work done.</p>
          <p>I had already become a heavy AI user while tattooing. At first I used it for simple things like creating Facebook ads. Then I started using it to plan larger projects, explore ideas, organize systems, and take those ideas in directions I could not have built alone before.</p>
          <p>For a while, I was still thinking small. Then I started seeing the bigger picture: we have an app for everything, a subscription for everything, and a growing list of charges many of us barely recognize because the billing name does not even match the product we remember signing up for.</p>
          <p><strong>Why does our digital world have to be this complicated?</strong> That question became the foundation for Ziepher Tech and Z-Life.</p>
          <div className="zlife-founder-points"><span>Tattoo artist → creator</span><span>Tree service → real-world operator</span><span>AI user → builder</span><span>Z-Life → one connected platform</span></div>
        </div>
        <aside className={styles.founderIdentity} aria-label="Founder identity">
          <div className={styles.founderRobot} aria-hidden="true">◎</div>
          <p className="zlife-kicker">FOUNDER & BUILDER</p>
          <h3>Brian Lehmann</h3>
          <p>Ziepher Tech · Z-Life</p>
          <small>Building practical technology from real-world problems, one connected system at a time.</small>
        </aside>
      </section>

      <section className="zlife-section" aria-labelledby="community-value-heading">
        <div className="zlife-section-heading"><div><p className="zlife-kicker">BUILT FROM THE GROUND UP — BY ANYONE</p><h2 id="community-value-heading">A platform people can help build, improve, and grow with.</h2><p>Z-Life is designed so useful contributions can come from anywhere in the world — not only from a closed internal development team.</p></div><Link href="/community">Explore the community →</Link></div>
        <div className="zlife-flow-grid">
          <article><span>01</span><h3>Anyone Can Contribute</h3><p>Developers, designers, researchers, testers, writers, translators, business owners, and everyday users can contribute ideas, fixes, features, workflows, documentation, testing, and improvements.</p></article>
          <article><span>02</span><h3>Proof of Value</h3><p>Meaningful work can be tracked through Z-Life’s Value Graph: who created it, who improved it, who maintains it, how it is used, and whether it creates measurable value for people and the platform.</p></article>
          <article><span>03</span><h3>Contribution Shares</h3><p>Verified contributors can receive internal Contribution Shares tied to the components they help create or improve. They are not cryptocurrency or publicly traded tokens; they are a way to attribute real platform value.</p></article>
          <article><span>04</span><h3>Value Can Keep Paying</h3><p>When revenue is allocated to the contributor economy, rewards can follow measured value. Creation shares can remain durable, maintenance rewards depend on continued work, and usage or outcome rewards can rise or fall with real adoption.</p></article>
        </div>
        <div className="zlife-flow-grid">
          <article><span>05</span><h3>Value Lineage</h3><p>If a future Z-Life module depends on something you helped create, the system can preserve that lineage so foundational work may receive a small share of downstream value instead of disappearing from the record.</p></article>
          <article><span>06</span><h3>More Than Code</h3><p>Security, reliability, accessibility, design, research, documentation, translation, testing, industry knowledge, and useful user insight can all create measurable value.</p></article>
          <article><span>07</span><h3>Build a Track Record</h3><p>A person can start as a normal user and build a contribution history based on what they actually helped improve — not where they went to school or who they already knew.</p></article>
          <article><span>08</span><h3>Grow With Z-Life</h3><p>The long-term goal is a simpler digital world where users are not only customers. They can help shape the platform and have a path to benefit when their work continues creating value.</p></article>
        </div>
      </section>

      <section className={styles.ziepherBand} aria-labelledby="ziepher-company-heading">
        <div><p className="zlife-kicker">BUILT BY ZIEPHER TECH</p><h2 id="ziepher-company-heading">Z-Life is the platform. Ziepher Tech is the company building it.</h2><p>Ziepher Tech continues building websites, apps, and connected business systems while Z-Life grows into the larger unified platform.</p></div>
        <div className="zlife-hero-actions"><Link className="zlife-primary" href="/projects">Build With Z-Life <span>→</span></Link><Link className="zlife-secondary" href="/community">Help Build Z-Life</Link></div>
      </section>

      <footer className="zlife-footer"><div className="zlife-footer-brand"><ZMark /><small>by Ziepher Tech</small><p>Technology for a more human tomorrow.</p></div><div className="zlife-footer-links"><a href="#home">Home</a><a href="#team">AI Teams</a><a href="#modules">Modules</a><a href="#founder">About</a><a href="#vision">Our Vision</a><Link href="/community">Community</Link></div><div className="zlife-footer-mantra"><strong>PEOPLE</strong><strong>TOOLS</strong><strong>PROGRESS</strong><span>A BRIGHTER TOMORROW</span></div></footer>
    </main>
  );
}
