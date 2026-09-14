import Image from "next/image";
import Link from "next/link";
import { ziepherAgents } from "@/lib/agents/registry";
import { founderCardImage } from "@/lib/founder-card-image";
import { zlifeModules } from "@/lib/zlife/modules";

const team = ziepherAgents.slice(0, 8);

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
      <header className="zlife-nav">
        <Link href="/" className="zlife-brand" aria-label="Z-Life home"><ZMark /><small>by Ziepher Tech</small></Link>
        <nav aria-label="Primary navigation"><a href="#home">Home</a><a href="#team">AI Team</a><a href="#modules">Modules</a><a href="#vision">Our Vision</a><Link href="/community">Community</Link></nav>
        <Link className="zlife-nav-cta" href="/auth/sign-in">Open Z-Life</Link>
      </header>

      <section id="home" className="zlife-hero">
        <div className="zlife-hero-copy">
          <p className="zlife-eyebrow">ONE PLATFORM. A BRIGHTER YOU.</p>
          <h1>Life and Business,<br /><span>Better Together.</span></h1>
          <p className="zlife-lede">Z-Life is a unified AI platform for life, business, websites, apps, and everyday operations — powered by specialized AI agents working as one team.</p>
          <div className="zlife-hero-actions"><Link className="zlife-primary" href="/auth/sign-in">Open Z-Life <span>→</span></Link><a className="zlife-secondary" href="#modules">Explore Modules</a></div>
          <div className="zlife-benefits"><span>⌁ Less overwhelm</span><span>◎ AI that works for you</span><span>▥ One connected platform</span><span>◇ Private and human-centered</span></div>
        </div>
        <div className="zlife-hero-art" aria-label="Z-Life vision">
          <div className="zlife-stars" /><div className="zlife-mountain mountain-back" /><div className="zlife-mountain mountain-front" /><div className="zlife-lake" />
          <div className="zlife-vision-copy">PLAN · BUILD · ORGANIZE · SIMPLIFY · ACHIEVE · LIVE</div>
          <div className="zlife-hero-badge">Different parts of life.<br /><strong>One intelligent platform.</strong></div>
        </div>
      </section>

      <section id="team" className="zlife-section">
        <div className="zlife-section-heading"><div><p className="zlife-kicker">AI TEAM</p><h2>Meet the AI Team</h2><p>Specialized agents with clear roles, working together inside Z-Life.</p></div><Link href="/team">Meet the full team →</Link></div>
        <div className="zlife-team-grid">
          {team.map((agent, index) => (
            <article className="zlife-agent-card" key={agent.id}>
              <div className={`zlife-agent-avatar avatar-${index + 1}`}><span>{agent.name.slice(0, 1)}</span></div>
              <div className="zlife-agent-copy"><h3>{agent.name}</h3><p className="zlife-agent-role">{agent.title}</p><p>{agent.mission}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section id="modules" className="zlife-section zlife-modules-section">
        <div className="zlife-section-heading"><div><p className="zlife-kicker">Z-LIFE MODULES</p><h2>One platform. Specialized modules.</h2><p>Every module starts with the Z-Life identity and connects back to the same assistant, data, and account.</p></div></div>
        <div className="zlife-module-grid">
          {zlifeModules.map((item) => (
            <Link className={`zlife-module-card ${item.status === "active" ? "is-active" : ""} ${item.nestedLabel ? "has-nested" : ""}`} href={`/modules/${item.slug}`} key={item.slug}>
              <div className="zlife-module-brand"><span className="module-z">Z</span><span>Z-LIFE</span></div>
              <div className="zlife-module-main"><span className="zlife-module-icon">{item.icon}</span><div><h3>{item.shortName}</h3><p>{item.description}</p></div></div>
              {item.nestedLabel ? <div className="zlife-nested-module"><span>▲</span><div><strong>Tree Service</strong><small>First active business vertical</small></div><b>ACTIVE</b></div> : null}
              <span className={`zlife-status ${item.status === "active" ? "is-active" : ""}`}>{item.status === "active" ? "Active Module" : "In Development"}</span>
            </Link>
          ))}
        </div>
      </section>

      <section id="vision" className="zlife-section zlife-vision-section">
        <div className="zlife-section-heading"><div><p className="zlife-kicker">HOW IT WORKS</p><h2>Everything works together.</h2></div></div>
        <div className="zlife-flow-grid"><article><span>01</span><h3>The AI Team</h3><p>Specialists handle product, architecture, design, engineering, operations, security, growth, and industry knowledge.</p></article><article><span>02</span><h3>AI Assistant</h3><p>Your central guide surfaces what matters and connects you to the right module and next action.</p></article><article><span>03</span><h3>Z-Life Modules</h3><p>Business, builders, home, money, family, services, and future modules share one connected platform.</p></article><article><span>04</span><h3>A Better Tomorrow</h3><p>Less fragmentation, clearer work, simpler tools, and practical AI built around real people.</p></article></div>
      </section>

      <section className="zlife-founder-section" aria-labelledby="founder-heading">
        <div className="zlife-founder-copy"><p className="zlife-kicker">FOUNDER SPOTLIGHT</p><h2 id="founder-heading">Built by a real person solving real problems.</h2><p>Brian Lehmann is the founder and builder behind Ziepher Tech and Z-Life. The platform is being built step by step around practical workflows, low-cost automation, and tools that reduce unnecessary complexity.</p><div className="zlife-founder-points"><span>Vision + product direction</span><span>Websites, apps + business systems</span><span>Tree Service first launch focus</span><span>Practical, cost-aware automation</span></div></div>
        <div className="zlife-founder-image-shell"><Image src={founderCardImage} alt="Brian Lehmann, founder and builder of Ziepher Tech and Z-Life" width={180} height={316} unoptimized /><div className="zlife-founder-tint" /></div>
      </section>

      <footer className="zlife-footer"><div className="zlife-footer-brand"><ZMark /><small>by Ziepher Tech</small><p>Technology for a more human tomorrow.</p></div><div className="zlife-footer-links"><a href="#home">Home</a><a href="#team">AI Team</a><a href="#modules">Modules</a><a href="#vision">Our Vision</a><Link href="/community">Community</Link></div><div className="zlife-footer-mantra"><strong>PEOPLE</strong><strong>TOOLS</strong><strong>PROGRESS</strong><span>A BRIGHTER TOMORROW</span></div></footer>
    </main>
  );
}
