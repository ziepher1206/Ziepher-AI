import Link from "next/link";
import { ZLifePublicShell } from "@/components/zlife-public-shell";

const launchSteps = [
  {
    step: "01",
    title: "Tell Z-Life what you want",
    description: "Describe the website or app in plain English. Start with an idea, a business, or an existing website."
  },
  {
    step: "02",
    title: "Upload anything useful",
    description: "Add logos, photos, screenshots, mockups, and design references so the build looks like what you actually pictured."
  },
  {
    step: "03",
    title: "Preview and refine",
    description: "Z-Life builds the first version, shows it visually, and lets you request changes in normal language until it feels right."
  },
  {
    step: "04",
    title: "Choose a domain",
    description: "After approval, Z-Life will surface matching domain options with availability, purchase pricing, and renewal pricing."
  },
  {
    step: "05",
    title: "Publish when ready",
    description: "Review the final checklist and publish only after you approve it. Technical details stay out of the way unless you want them."
  }
] as const;

const futurePlan = [
  {
    step: "FIRST",
    title: "AI Website & App Builder",
    description: "The first public Z-Life product is the guided builder: idea to visual build to domain to publish."
  },
  {
    step: "NEXT",
    title: "Business + Everyday Life",
    description: "Once the builder is excellent, Z-Life expands the same simple experience into business operations, home, family, and daily planning."
  },
  {
    step: "LATER",
    title: "One Connected Platform",
    description: "More modules connect into the same account, assistant, data layer, and transparent cost system instead of becoming disconnected apps."
  }
] as const;

export function ZLifeMarketingHome() {
  return (
    <ZLifePublicShell>
      <section className="zlife-hero">
        <div className="zlife-hero-copy">
          <p className="zlife-eyebrow">Z-LIFE AI WEBSITE & APP BUILDER</p>
          <h1>Turn your idea into a polished website or app.<br /><span>Without the technical mess.</span></h1>
          <p className="zlife-lede">Describe what you want, upload photos or screenshots you want Z-Life to follow, review a real preview, ask for changes, choose a domain, and publish when you are ready.</p>
          <div className="zlife-hero-actions">
            <Link className="zlife-primary" href="/auth/sign-in?next=/projects">Build My Website or App <span>→</span></Link>
            <Link className="zlife-secondary" href="/about">Why Z-Life exists</Link>
          </div>
          <div className="zlife-benefits"><span>✓ Plain-English setup</span><span>✓ Upload your own visuals</span><span>✓ Preview before publishing</span><span>✓ No surprise actions</span></div>
        </div>
        <div className="zlife-hero-art" role="img" aria-label="Z-Life visual builder journey from idea to published website or app">
          <div className="zlife-stars" /><div className="zlife-mountain mountain-back" /><div className="zlife-mountain mountain-front" /><div className="zlife-lake" />
          <div className="zlife-vision-copy">IDEA · REFERENCES · BUILD · PREVIEW · REFINE · DOMAIN · PUBLISH</div>
          <div className="zlife-hero-badge">One guided flow.<br /><strong>From idea to launch.</strong></div>
        </div>
      </section>

      <section className="zlife-section" aria-labelledby="launch-flow-heading">
        <div className="zlife-section-heading">
          <div>
            <p className="zlife-kicker">HOW IT WORKS</p>
            <h2 id="launch-flow-heading">Build → Preview → Perfect it → Domain → Publish.</h2>
            <p>Z-Life keeps the main path simple. GitHub, hosting, deployment settings, and other technical controls stay available as advanced details instead of blocking normal users.</p>
          </div>
        </div>
        <div className="zlife-flow-grid">
          {launchSteps.map((item) => (
            <article key={item.step}>
              <span>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="zlife-founder-section" aria-labelledby="builder-quality-heading">
        <div className="zlife-founder-copy">
          <p className="zlife-kicker">BUILT AROUND YOUR VISION</p>
          <h2 id="builder-quality-heading">Your screenshot should be a reference, not a suggestion Z-Life ignores.</h2>
          <p>Upload the photos you want used, your logo, screenshots of layouts you like, or a mockup you already have. Z-Life is being built to preserve the hierarchy, visual direction, spacing, imagery, and detail that made you choose those references in the first place.</p>
          <p>After the first build, you should not have to restart. Ask for changes in normal language, compare desktop and mobile previews, and keep refining the same project until it is ready.</p>
          <div className="zlife-hero-actions"><Link className="zlife-primary" href="/auth/sign-in?next=/projects">Start a Build</Link></div>
        </div>
      </section>

      <section className="zlife-section" aria-labelledby="future-heading">
        <div className="zlife-section-heading">
          <div>
            <p className="zlife-kicker">THE BIGGER Z-LIFE VISION</p>
            <h2 id="future-heading">Launch one excellent product first, then connect more of life around it.</h2>
            <p>The Website & App Builder is the first launch. The broader Z-Life platform remains the long-term direction without cluttering the first experience.</p>
          </div>
          <Link href="/vision">See the full vision →</Link>
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
