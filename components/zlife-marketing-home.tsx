import Link from "next/link";
import { ZLifeProgressMeter } from "@/components/zlife-progress-meter";
import { ZLifePublicShell } from "@/components/zlife-public-shell";
import { buildProgress } from "@/lib/zlife-build-progress";

const homeDestinations = [
  {
    step: "01",
    title: "AI Teams",
    description: "Meet the specialized AI teams that help route, organize, build, and improve work across ZLife.",
    href: "/ai-teams",
    cta: "Explore AI Teams →",
    progressKey: "ai-teams",
  },
  {
    step: "02",
    title: "Modules",
    description: "Open the focused parts of ZLife for business, home, building, services, and everyday digital work.",
    href: "/modules",
    cta: "Browse Modules →",
    progressKey: "modules",
  },
  {
    step: "03",
    title: "About ZLife",
    description: "See why ZLife exists, what problem it is trying to solve, and the real-world experience behind it.",
    href: "/about",
    cta: "Read About ZLife →",
    progressKey: "about",
  },
  {
    step: "04",
    title: "Future Plan",
    description: "See the larger roadmap for turning ZLife into a connected platform built by AI and people together.",
    href: "/vision",
    cta: "See the Full Vision →",
    progressKey: "vision",
  },
  {
    step: "05",
    title: "Community",
    description: "Learn how contributors can test, improve, and help shape ZLife without needing access to protected production systems.",
    href: "/community",
    cta: "Explore Community →",
    progressKey: "community",
  }
] as const;

const futurePlan = [
  {
    step: "NOW",
    title: "Build the Core",
    description: "Finish the shared ZLife foundation, the first Tree Service workflow, and the ZLife Assistant with safe approval controls."
  },
  {
    step: "NEXT",
    title: "Connect More of Life",
    description: "Expand into Home & Family, websites and apps, services, and the other focused modules while keeping one connected account and system."
  },
  {
    step: "THEN",
    title: "Open the Playground",
    description: "Give contributors and users safe ways to build, test, suggest, and improve ZLife through controlled community workflows."
  },
  {
    step: "GOAL",
    title: "A Platform That Keeps Improving",
    description: "Use specialized AI teams, contributor input, testing, and measured feedback to continuously strengthen ZLife without taking control away from people."
  }
] as const;

export function ZLifeMarketingHome() {
  return (
    <ZLifePublicShell>
      <section className="zlife-hero">
        <div className="zlife-hero-copy">
          <p className="zlife-eyebrow">ONE PLATFORM. A BRIGHTER YOU.</p>
          <h1>Life and Business,<br /><span>Better Together.</span></h1>
          <p className="zlife-lede">Z-Life connects business, AI support, websites, apps, home, and everyday digital work without forcing users into another pile of disconnected subscriptions.</p>
          <div className="zlife-hero-actions">
            <Link className="zlife-primary" href="/auth/sign-in">Open Z-Life <span>→</span></Link>
            <Link className="zlife-secondary" href="/modules">Explore Modules</Link>
          </div>
          <div className="zlife-benefits"><span>⌁ Less overwhelm</span><span>◎ AI that works for you</span><span>▥ One connected platform</span><span>◇ Human-centered controls</span></div>
        </div>
        <div className="zlife-hero-art" role="img" aria-label="Z-Life star-filled landscape connecting life and business">
          <div className="zlife-stars" /><div className="zlife-mountain mountain-back" /><div className="zlife-mountain mountain-front" /><div className="zlife-lake" />
          <div className="zlife-vision-copy">PLAN · BUILD · ORGANIZE · SIMPLIFY · ACHIEVE · LIVE</div>
          <div className="zlife-hero-badge">Different parts of life.<br /><strong>One intelligent platform.</strong></div>
        </div>
      </section>

      <section className="zlife-section" aria-labelledby="gateway-heading">
        <div className="zlife-section-heading">
          <div>
            <p className="zlife-kicker">LIVE BUILD FEED</p>
            <h2 id="gateway-heading">See what is finished and what ZLife is building next.</h2>
            <p>Every percentage is calculated from explicit build milestones. It is a readiness signal, not a made-up time estimate.</p>
          </div>
        </div>
        <div className="zlife-flow-grid">
          {homeDestinations.map((item) => {
            const progress = buildProgress[item.progressKey];
            return (
              <article key={item.href}>
                <span>{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <ZLifeProgressMeter progress={progress} />
                <Link href={item.href}>{item.cta}</Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="zlife-founder-section" aria-labelledby="about-heading">
        <div className="zlife-founder-copy">
          <p className="zlife-kicker">ABOUT ZLIFE</p>
          <h2 id="about-heading">Built to replace digital clutter with one connected system.</h2>
          <p>ZLife started from a simple problem: everyday life and small-business work are spread across too many apps, subscriptions, dashboards, logins, and disconnected tools. The goal is not to create one more app. It is to create the connected layer that helps those pieces work together.</p>
          <p>The idea grew from real-world creative work, tree service, small-business operations, and years of using AI to plan larger projects. That experience made the bigger opportunity clear: people should be able to organize, build, improve, and run more of their digital life from one understandable place.</p>
          <p>ZLife is built by Ziepher Tech with human control at the center. AI can recommend, organize, test, and help execute safe work, but important actions, spending, and high-impact decisions stay behind clear approval boundaries.</p>
          <div className="zlife-hero-actions"><Link className="zlife-secondary" href="/about">Read the full story</Link></div>
        </div>
      </section>

      <section className="zlife-section" aria-labelledby="future-heading">
        <div className="zlife-section-heading">
          <div>
            <p className="zlife-kicker">THE FUTURE PLAN</p>
            <h2 id="future-heading">Build the foundation first, then let the platform grow around it.</h2>
            <p>ZLife is being built in stages so each new area connects to the same core instead of becoming another separate product.</p>
          </div>
          <Link href="/vision">View the complete roadmap →</Link>
        </div>
        <div className="zlife-flow-grid">
          {futurePlan.map((item) => (
            <article key={item.step}>
              <span>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </ZLifePublicShell>
  );
}
