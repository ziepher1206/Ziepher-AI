import type { AppPlan } from "./types";
import type { BuildArtifact } from "./build-types";

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function createDeterministicBuild(
  plan: AppPlan,
  visualConceptId: string
): BuildArtifact {
  const concept =
    plan.visualDirections.find((item) => item.id === visualConceptId) ??
    plan.visualDirections[0];
  const features = plan.features
    .filter((feature) => feature.priority !== "wont")
    .slice(0, 8);
  const screens = plan.screens.slice(0, 6);
  const audience = plan.targetUsers.slice(0, 3);

  const packageJson = {
    name:
      plan.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 70) || "zlife-generated-app",
    version: "1.0.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      typecheck: "tsc --noEmit"
    },
    dependencies: {
      next: "16.2.10",
      react: "19.2.7",
      "react-dom": "19.2.7"
    },
    devDependencies: {
      "@types/node": "26.1.1",
      "@types/react": "19.2.17",
      "@types/react-dom": "19.2.3",
      typescript: "6.0.3"
    }
  };

  const page = `
const features = ${json(features)};
const screens = ${json(screens)};
const audience = ${json(audience)};

export default function Home() {
  return (
    <main>
      <header className="nav">
        <a className="logo" href="#top"><span className="logo-mark">Z</span>${escapeHtml(plan.title)}</a>
        <nav aria-label="Primary navigation">
          <a href="#features">Features</a>
          <a href="#experience">Experience</a>
          <a href="#proof">Why it works</a>
          <a className="nav-cta" href="#cta">Get started</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">${escapeHtml(concept?.name ?? "Selected direction")}</p>
          <h1>${escapeHtml(plan.title)}</h1>
          <p className="lede">${escapeHtml(plan.summary)}</p>
          <div className="actions">
            <a className="primary" href="#features">Explore the experience</a>
            <a className="secondary" href="#experience">See the workflow</a>
          </div>
          <div className="audience-row" aria-label="Designed for">
            {audience.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>

        <aside className="visual-stage" aria-label="Product preview graphic">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="window-card">
            <div className="window-bar"><i/><i/><i/><span>Live concept</span></div>
            <div className="window-body">
              <div className="mini-sidebar">
                <b /> <b /> <b /> <b />
              </div>
              <div className="mini-main">
                <div className="mini-kicker" />
                <div className="mini-title" />
                <div className="mini-title short" />
                <div className="mini-actions"><i/><i/></div>
                <div className="mini-grid"><b/><b/><b/></div>
              </div>
            </div>
          </div>
          <div className="floating-stat stat-a"><strong>01</strong><span>Clear hierarchy</span></div>
          <div className="floating-stat stat-b"><strong>02</strong><span>Mobile ready</span></div>
        </aside>
      </section>

      <section className="trust-strip" id="proof">
        <span>Focused hierarchy</span><span>Responsive layout</span><span>Accessible structure</span><span>Clear calls to action</span>
      </section>

      <section id="features" className="section">
        <div className="section-heading split-heading">
          <div><p className="eyebrow">Core experience</p><h2>Built around the outcome, not a generic template.</h2></div>
          <p>The no-credit fallback still creates a deliberate visual system with depth, hierarchy, reusable sections, and room for real project media.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature, index) => (
            <article key={feature.name}>
              <div className="feature-top"><span>{String(index + 1).padStart(2, "0")}</span><i aria-hidden="true" /></div>
              <h3>{feature.name}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="showcase section" id="experience">
        <div className="showcase-visual" aria-hidden="true">
          <svg viewBox="0 0 600 460" role="img" aria-label="Layered interface illustration">
            <rect x="34" y="30" width="532" height="400" rx="34" fill="rgba(255,255,255,.82)" stroke="rgba(17,20,38,.12)"/>
            <rect x="70" y="74" width="120" height="312" rx="22" fill="#111426"/>
            <rect x="216" y="78" width="302" height="96" rx="22" fill="#ebe7ff"/>
            <rect x="216" y="194" width="142" height="160" rx="22" fill="#ffffff" stroke="rgba(17,20,38,.10)"/>
            <rect x="376" y="194" width="142" height="160" rx="22" fill="#dff8ef"/>
            <circle cx="250" cy="118" r="16" fill="#6d4aff"/>
            <rect x="282" y="106" width="180" height="12" rx="6" fill="#111426" opacity=".85"/>
            <rect x="282" y="132" width="124" height="9" rx="4.5" fill="#6d7182" opacity=".45"/>
          </svg>
        </div>
        <div className="showcase-copy">
          <p className="eyebrow">Product map</p>
          <h2>Every screen has a job.</h2>
          <div className="screen-list">
            {screens.map((screen, index) => (
              <article key={screen.name}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{screen.name}</strong><p>{screen.purpose}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section journey">
        <div className="section-heading"><p className="eyebrow">Flow</p><h2>A simple path from first impression to action.</h2></div>
        <div className="journey-grid">
          <article><span>01</span><h3>Understand</h3><p>Lead with a clear promise and visual hierarchy.</p></article>
          <article><span>02</span><h3>Explore</h3><p>Organize the strongest features into scannable sections.</p></article>
          <article><span>03</span><h3>Trust</h3><p>Reinforce the decision with proof, clarity, and consistency.</p></article>
          <article><span>04</span><h3>Act</h3><p>Finish with one obvious next step across desktop and mobile.</p></article>
        </div>
      </section>

      <section className="cta section" id="cta">
        <div><p className="eyebrow">Ready for refinement</p><h2>${escapeHtml(plan.title)}</h2><p>${escapeHtml(plan.summary)}</p></div>
        <a className="primary light" href="#top">Review from the top</a>
      </section>
    </main>
  );
}
`.trim();

  const css = `
:root{--ink:#111426;--paper:#f5f3ee;--panel:rgba(255,255,255,.78);--accent:#6d4aff;--accent2:#20b98a;--soft:#e8e2ff;--line:rgba(17,20,38,.12);--muted:#626879}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);background:radial-gradient(circle at 8% 0%,rgba(109,74,255,.18),transparent 30%),radial-gradient(circle at 94% 16%,rgba(32,185,138,.15),transparent 28%),linear-gradient(180deg,#faf8f3 0%,var(--paper) 100%);font-family:Inter,ui-sans-serif,system-ui,sans-serif}button,a{font:inherit}a{color:inherit;text-decoration:none}.nav{width:min(1180px,calc(100% - 28px));margin:14px auto;padding:10px 12px 10px 16px;display:flex;align-items:center;justify-content:space-between;border:1px solid var(--line);border-radius:18px;background:rgba(250,248,243,.78);backdrop-filter:blur(18px);position:sticky;top:10px;z-index:10}.logo{display:flex;align-items:center;gap:10px;font-weight:950;letter-spacing:-.04em}.logo-mark{display:grid;place-items:center;width:30px;height:30px;border-radius:10px;background:var(--ink);color:white;font-size:14px}.nav nav{display:flex;align-items:center;gap:18px;font-size:13px}.nav-cta,.primary{padding:11px 15px;border-radius:12px;background:var(--ink);color:white;font-weight:850}.hero,.section,.trust-strip{width:min(1180px,calc(100% - 30px));margin:0 auto}.hero{min-height:700px;display:grid;grid-template-columns:1.12fr .88fr;gap:54px;align-items:center;padding:78px 0}.eyebrow{margin:0 0 12px;color:var(--accent);font-size:11px;font-weight:950;letter-spacing:.17em;text-transform:uppercase}h1{max-width:820px;margin:0;font-size:clamp(48px,7.5vw,104px);line-height:.9;letter-spacing:-.07em}.lede{max-width:720px;margin:25px 0;color:var(--muted);font-size:clamp(17px,2vw,21px);line-height:1.65}.actions{display:flex;gap:11px;align-items:center}.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;padding:13px 18px;border-radius:13px;font-weight:850}.secondary{border:1px solid var(--line);background:var(--panel)}.audience-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:24px}.audience-row span{padding:7px 10px;border-radius:99px;border:1px solid var(--line);background:rgba(255,255,255,.58);font-size:12px;color:var(--muted)}.visual-stage{min-height:500px;position:relative;display:grid;place-items:center}.window-card{position:relative;width:min(100%,520px);border:1px solid var(--line);border-radius:30px;background:rgba(255,255,255,.86);box-shadow:0 42px 120px rgba(31,25,66,.18);overflow:hidden;transform:rotate(-2deg);z-index:2}.window-bar{height:46px;display:flex;align-items:center;gap:7px;padding:0 16px;border-bottom:1px solid var(--line)}.window-bar i{width:8px;height:8px;border-radius:50%;background:#cbc7d8}.window-bar span{margin-left:auto;font-size:10px;color:var(--muted);font-weight:800}.window-body{display:grid;grid-template-columns:86px 1fr;min-height:340px}.mini-sidebar{padding:20px 14px;background:var(--ink);display:grid;align-content:start;gap:16px}.mini-sidebar b{height:9px;border-radius:99px;background:rgba(255,255,255,.18)}.mini-main{padding:34px}.mini-kicker{width:80px;height:8px;border-radius:99px;background:var(--accent)}.mini-title{width:88%;height:26px;margin-top:18px;border-radius:8px;background:var(--ink)}.mini-title.short{width:62%;margin-top:8px}.mini-actions{display:flex;gap:8px;margin:24px 0}.mini-actions i{width:95px;height:30px;border-radius:10px;background:var(--accent)}.mini-actions i+ i{background:var(--soft)}.mini-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.mini-grid b{height:100px;border-radius:15px;background:linear-gradient(145deg,#fff,var(--soft));border:1px solid var(--line)}.orb{position:absolute;border-radius:50%;filter:blur(2px)}.orb-one{width:210px;height:210px;right:-20px;top:15px;background:rgba(109,74,255,.22)}.orb-two{width:160px;height:160px;left:0;bottom:12px;background:rgba(32,185,138,.20)}.floating-stat{position:absolute;z-index:3;padding:13px 15px;border-radius:16px;background:#111426;color:white;box-shadow:0 18px 40px rgba(17,20,38,.22)}.floating-stat strong,.floating-stat span{display:block}.floating-stat strong{font-size:20px}.floating-stat span{font-size:10px;opacity:.7}.stat-a{left:0;top:74px}.stat-b{right:-5px;bottom:72px}.trust-strip{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);border-radius:20px;overflow:hidden;background:rgba(255,255,255,.62)}.trust-strip span{padding:18px;text-align:center;font-size:12px;font-weight:800;border-right:1px solid var(--line)}.trust-strip span:last-child{border-right:0}.section{padding:96px 0}.section-heading{max-width:820px;margin-bottom:36px}.split-heading{max-width:none;display:grid;grid-template-columns:1.15fr .85fr;gap:54px;align-items:end}.split-heading>p{margin:0;color:var(--muted);line-height:1.7}h2{margin:0;font-size:clamp(36px,5vw,66px);line-height:.98;letter-spacing:-.055em}.feature-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.feature-grid article{min-height:240px;padding:20px;border:1px solid var(--line);border-radius:22px;background:var(--panel);box-shadow:0 12px 40px rgba(27,24,61,.05)}.feature-top{display:flex;align-items:center;justify-content:space-between}.feature-top span{color:var(--accent);font-weight:950}.feature-top i{width:38px;height:38px;border-radius:13px;background:linear-gradient(145deg,var(--soft),rgba(32,185,138,.22));border:1px solid var(--line)}.feature-grid h3{margin:42px 0 9px}.feature-grid p,.screen-list p,.journey-grid p{margin:0;color:var(--muted);font-size:14px;line-height:1.6}.showcase{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}.showcase-visual{padding:24px;border-radius:34px;background:linear-gradient(145deg,var(--soft),rgba(32,185,138,.18));border:1px solid var(--line)}.showcase-visual svg{width:100%;height:auto;display:block}.screen-list{display:grid;gap:9px;margin-top:26px}.screen-list article{display:grid;grid-template-columns:34px 1fr;gap:12px;padding:14px 0;border-bottom:1px solid var(--line)}.screen-list article>span{font-size:11px;color:var(--accent);font-weight:950}.screen-list strong{display:block;margin-bottom:4px}.journey-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.journey-grid article{padding:22px;border-top:2px solid var(--ink)}.journey-grid span{color:var(--accent);font-weight:950}.journey-grid h3{margin:34px 0 8px}.cta{margin-bottom:60px;padding:46px;border-radius:32px;background:var(--ink);color:white;display:flex;align-items:end;justify-content:space-between;gap:30px}.cta .eyebrow{color:#bfb2ff}.cta p{max-width:700px;color:rgba(255,255,255,.68);line-height:1.7}.primary.light{background:white;color:var(--ink);white-space:nowrap}
@media(max-width:920px){.hero,.showcase,.split-heading{grid-template-columns:1fr}.visual-stage{min-height:440px}.feature-grid,.journey-grid{grid-template-columns:repeat(2,1fr)}.trust-strip{grid-template-columns:1fr 1fr}.trust-strip span:nth-child(2){border-right:0}.trust-strip span:nth-child(-n+2){border-bottom:1px solid var(--line)}}
@media(max-width:620px){.nav nav a:not(.nav-cta){display:none}.hero{padding:48px 0;min-height:auto}.visual-stage{min-height:370px}.window-body{grid-template-columns:62px 1fr}.mini-main{padding:24px 18px}.mini-grid{grid-template-columns:1fr}.mini-grid b:nth-child(n+2){display:none}.stat-a{left:4px;top:48px}.stat-b{right:2px;bottom:42px}.feature-grid,.journey-grid,.trust-strip{grid-template-columns:1fr}.trust-strip span{border-right:0!important;border-bottom:1px solid var(--line)}.trust-strip span:last-child{border-bottom:0}.actions{align-items:stretch;flex-direction:column}.actions>*{text-align:center}.section{padding:68px 0}.cta{padding:28px;align-items:stretch;flex-direction:column}}
`.trim();

  const previewFeatures = features
    .slice(0, 4)
    .map(
      (feature, index) => `<article><div class="feature-top"><span>0${index + 1}</span><i></i></div><h3>${escapeHtml(feature.name)}</h3><p>${escapeHtml(feature.description)}</p></article>`
    )
    .join("");
  const previewScreens = screens
    .slice(0, 4)
    .map(
      (screen, index) => `<article><span>0${index + 1}</span><div><strong>${escapeHtml(screen.name)}</strong><p>${escapeHtml(screen.purpose)}</p></div></article>`
    )
    .join("");

  const previewHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(plan.title)}</title><style>${css}.preview-note{position:fixed;right:14px;bottom:14px;padding:8px 11px;border-radius:99px;background:#111426;color:white;font:700 11px system-ui;z-index:20}</style></head><body>
<header class="nav"><div class="logo"><span class="logo-mark">Z</span>${escapeHtml(plan.title)}</div><nav><a href="#features">Features</a><a href="#experience">Experience</a><a class="nav-cta" href="#features">Get started</a></nav></header>
<main><section class="hero"><div class="hero-copy"><p class="eyebrow">${escapeHtml(concept?.name ?? "Selected direction")}</p><h1>${escapeHtml(plan.title)}</h1><p class="lede">${escapeHtml(plan.summary)}</p><div class="actions"><a class="primary" href="#features">Explore the experience</a><a class="secondary" href="#experience">See the workflow</a></div><div class="audience-row">${audience.map((item)=>`<span>${escapeHtml(item)}</span>`).join("")}</div></div>
<aside class="visual-stage"><div class="orb orb-one"></div><div class="orb orb-two"></div><div class="window-card"><div class="window-bar"><i></i><i></i><i></i><span>Live concept</span></div><div class="window-body"><div class="mini-sidebar"><b></b><b></b><b></b><b></b></div><div class="mini-main"><div class="mini-kicker"></div><div class="mini-title"></div><div class="mini-title short"></div><div class="mini-actions"><i></i><i></i></div><div class="mini-grid"><b></b><b></b><b></b></div></div></div></div><div class="floating-stat stat-a"><strong>01</strong><span>Clear hierarchy</span></div><div class="floating-stat stat-b"><strong>02</strong><span>Mobile ready</span></div></aside></section>
<section class="trust-strip"><span>Focused hierarchy</span><span>Responsive layout</span><span>Accessible structure</span><span>Clear calls to action</span></section>
<section class="section" id="features"><div class="section-heading"><p class="eyebrow">Core experience</p><h2>Built around the main outcome.</h2></div><div class="feature-grid">${previewFeatures}</div></section>
<section class="showcase section" id="experience"><div class="showcase-visual"><svg viewBox="0 0 600 460" aria-label="Layered interface illustration"><rect x="34" y="30" width="532" height="400" rx="34" fill="rgba(255,255,255,.82)" stroke="rgba(17,20,38,.12)"/><rect x="70" y="74" width="120" height="312" rx="22" fill="#111426"/><rect x="216" y="78" width="302" height="96" rx="22" fill="#ebe7ff"/><rect x="216" y="194" width="142" height="160" rx="22" fill="#fff"/><rect x="376" y="194" width="142" height="160" rx="22" fill="#dff8ef"/></svg></div><div class="showcase-copy"><p class="eyebrow">Product map</p><h2>Every screen has a job.</h2><div class="screen-list">${previewScreens}</div></div></section>
<section class="section journey"><div class="section-heading"><p class="eyebrow">Flow</p><h2>A simple path from first impression to action.</h2></div><div class="journey-grid"><article><span>01</span><h3>Understand</h3><p>Lead with a clear promise and visual hierarchy.</p></article><article><span>02</span><h3>Explore</h3><p>Organize the strongest features into scannable sections.</p></article><article><span>03</span><h3>Trust</h3><p>Reinforce the decision with proof and consistency.</p></article><article><span>04</span><h3>Act</h3><p>Finish with one obvious next step.</p></article></div></section></main><div class="preview-note">Z-Life no-credit preview</div></body></html>`;

  return {
    appName: plan.title,
    summary: "A richer responsive Next.js starter generated from the approved Z-Life plan without a paid AI call.",
    files: [
      { path: "package.json", content: json(packageJson) },
      { path: "next.config.ts", content: 'import type { NextConfig } from "next";\n\nconst config: NextConfig = { output: "standalone", poweredByHeader: false, turbopack: { root: process.cwd() } };\nexport default config;\n' },
      { path: "tsconfig.json", content: json({ compilerOptions: { target: "ES2022", lib: ["dom", "dom.iterable", "es2022"], allowJs: false, skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true, module: "esnext", moduleResolution: "bundler", resolveJsonModule: true, isolatedModules: true, jsx: "react-jsx", incremental: true, plugins: [{ name: "next" }] }, include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"], exclude: ["node_modules"] }) },
      { path: "next-env.d.ts", content: '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n' },
      { path: "app/layout.tsx", content: 'import type { Metadata } from "next";\nimport "./globals.css";\n\nexport const metadata: Metadata = { title: ' + JSON.stringify(plan.title) + ", description: " + JSON.stringify(plan.summary.slice(0, 160)) + " };\n\nexport default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang=\"en\"><body>{children}</body></html>; }\n" },
      { path: "app/page.tsx", content: page },
      { path: "app/globals.css", content: css },
      { path: "README.md", content: `# ${plan.title}\n\nGenerated by Z-Life from an approved visual plan without a paid AI provider call.\n\n## Run\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\nExternal and financial integrations remain disabled until configured and explicitly approved.\n` }
    ],
    previewHtml,
    testPlan: [
      "Run strict TypeScript validation.",
      "Run the optimized Next.js production build.",
      "Verify keyboard navigation, contrast, and responsive layouts.",
      "Review hierarchy, CTA clarity, section density, and mobile stacking.",
      "Test all core workflows before external integrations."
    ],
    knownLimitations: [
      "This zero-credit scaffold uses generated interface graphics until project-owned media is supplied.",
      "External services use placeholders until credentials are supplied.",
      "Live financial integrations are intentionally excluded from this build."
    ]
  };
}
