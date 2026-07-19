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

  const packageJson = {
    name: plan.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "ziepher-generated-app",
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
const screens = ${json(plan.screens)};

export default function Home() {
  return (
    <main>
      <header className="nav">
        <a className="logo" href="#top">${escapeHtml(plan.title)}</a>
        <nav aria-label="Primary navigation">
          <a href="#features">Features</a>
          <a href="#experience">Experience</a>
          <button type="button">Get started</button>
        </nav>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">${escapeHtml(concept?.name ?? "Selected concept")}</p>
          <h1>${escapeHtml(plan.title)}</h1>
          <p className="lede">${escapeHtml(plan.summary)}</p>
          <div className="actions">
            <button type="button" className="primary">Start now</button>
            <a className="secondary" href="#features">Explore features</a>
          </div>
        </div>
        <aside className="signal-card" aria-label="Application overview">
          <span>Designed for</span>
          <strong>${escapeHtml(plan.targetUsers.join(" · "))}</strong>
          <div className="meter"><i /></div>
          <small>Responsive, accessible, and ready for backend integration</small>
        </aside>
      </section>

      <section id="features" className="section">
        <div className="section-heading">
          <p className="eyebrow">Core experience</p>
          <h2>Everything needed for the main outcome</h2>
        </div>
        <div className="feature-grid">
          {features.map((feature, index) => (
            <article key={feature.name}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{feature.name}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="experience" className="section experience">
        <div className="section-heading">
          <p className="eyebrow">Product map</p>
          <h2>Clear screens and purposeful workflows</h2>
        </div>
        <div className="screen-list">
          {screens.map((screen) => (
            <article key={screen.name}>
              <strong>{screen.name}</strong>
              <p>{screen.purpose}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
`.trim();

  const css = `
:root {
  --ink: #111426;
  --paper: #f6f4ef;
  --panel: rgba(255, 255, 255, .72);
  --accent: #6d4aff;
  --accent-soft: #dcd4ff;
  --line: rgba(17, 20, 38, .12);
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  color: var(--ink);
  background:
    radial-gradient(circle at 10% 0%, rgba(109, 74, 255, .17), transparent 35%),
    radial-gradient(circle at 90% 20%, rgba(57, 210, 173, .16), transparent 32%),
    var(--paper);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
button, a { font: inherit; }
a { color: inherit; text-decoration: none; }
button { border: 0; cursor: pointer; }

.nav {
  width: min(1180px, calc(100% - 32px));
  margin: 18px auto;
  padding: 12px 14px 12px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: rgba(246, 244, 239, .72);
  backdrop-filter: blur(18px);
  position: sticky;
  top: 12px;
  z-index: 5;
}
.logo { font-weight: 900; letter-spacing: -.03em; }
.nav nav { display: flex; align-items: center; gap: 18px; font-size: 14px; }
.nav button, .primary {
  padding: 11px 15px;
  border-radius: 12px;
  background: var(--ink);
  color: white;
  font-weight: 800;
}

.hero, .section {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
}
.hero {
  min-height: 650px;
  display: grid;
  grid-template-columns: 1.4fr .7fr;
  gap: 42px;
  align-items: center;
  padding: 80px 0;
}
.eyebrow {
  margin: 0 0 12px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .15em;
  text-transform: uppercase;
}
h1 {
  max-width: 900px;
  margin: 0;
  font-size: clamp(48px, 8vw, 110px);
  line-height: .88;
  letter-spacing: -.07em;
}
.lede {
  max-width: 720px;
  margin: 26px 0;
  color: #5d6172;
  font-size: clamp(17px, 2vw, 21px);
  line-height: 1.65;
}
.actions { display: flex; align-items: center; gap: 12px; }
.primary, .secondary { padding: 13px 18px; border-radius: 13px; font-weight: 800; }
.secondary { border: 1px solid var(--line); background: var(--panel); }

.signal-card {
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 28px;
  background: var(--panel);
  box-shadow: 0 28px 90px rgba(27, 24, 61, .12);
}
.signal-card span, .signal-card small {
  display: block;
  color: #6d7182;
  line-height: 1.5;
}
.signal-card strong { display: block; margin: 10px 0 26px; font-size: 24px; }
.meter { height: 9px; background: #e4e1da; border-radius: 99px; overflow: hidden; margin-bottom: 14px; }
.meter i { display: block; width: 82%; height: 100%; background: linear-gradient(90deg, var(--accent), #39d2ad); }

.section { padding: 90px 0; }
.section-heading { max-width: 760px; margin-bottom: 34px; }
h2 { margin: 0; font-size: clamp(34px, 5vw, 64px); line-height: 1; letter-spacing: -.05em; }
.feature-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.feature-grid article, .screen-list article {
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: var(--panel);
}
.feature-grid span { color: var(--accent); font-weight: 900; }
.feature-grid h3 { margin: 36px 0 10px; }
.feature-grid p, .screen-list p { color: #686d7d; line-height: 1.6; }
.screen-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }

@media (max-width: 900px) {
  .hero { grid-template-columns: 1fr; min-height: auto; }
  .feature-grid { grid-template-columns: repeat(2, 1fr); }
  .screen-list { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 620px) {
  .nav nav a { display: none; }
  .hero { padding: 48px 0; }
  .feature-grid, .screen-list { grid-template-columns: 1fr; }
  .actions { align-items: stretch; flex-direction: column; }
  .actions > * { text-align: center; }
}
`.trim();

  const previewFeatures = features
    .slice(0, 4)
    .map(
      (feature, index) => `
        <article>
          <span>0${index + 1}</span>
          <h3>${escapeHtml(feature.name)}</h3>
          <p>${escapeHtml(feature.description)}</p>
        </article>`
    )
    .join("");

  const previewHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(plan.title)}</title>
<style>
${css}
body{min-height:100vh}.hero{min-height:540px;padding-top:30px}.preview-note{position:fixed;right:14px;bottom:14px;padding:8px 11px;border-radius:99px;background:#111426;color:white;font:700 11px system-ui;z-index:10}
</style>
</head>
<body>
<header class="nav"><div class="logo">${escapeHtml(plan.title)}</div><nav><a href="#features">Features</a><button>Get started</button></nav></header>
<main>
<section class="hero">
<div><p class="eyebrow">${escapeHtml(concept?.name ?? "Selected concept")}</p><h1>${escapeHtml(plan.title)}</h1><p class="lede">${escapeHtml(plan.summary)}</p><div class="actions"><button class="primary">Start now</button><a class="secondary" href="#features">Explore</a></div></div>
<aside class="signal-card"><span>Designed for</span><strong>${escapeHtml(plan.targetUsers.join(" · "))}</strong><div class="meter"><i></i></div><small>Interactive visual build preview</small></aside>
</section>
<section id="features" class="section"><div class="section-heading"><p class="eyebrow">Core experience</p><h2>Built around the main outcome</h2></div><div class="feature-grid">${previewFeatures}</div></section>
</main>
<div class="preview-note">Ziepher generated preview</div>
</body>
</html>`;

  return {
    appName: plan.title,
    summary:
      "A complete responsive Next.js starter generated from the approved Ziepher plan.",
    files: [
      { path: "package.json", content: json(packageJson) },
      {
        path: "next.config.ts",
        content:
          'import type { NextConfig } from "next";\n\nconst config: NextConfig = { output: "standalone", poweredByHeader: false, turbopack: { root: process.cwd() } };\nexport default config;\n'
      },
      {
        path: "tsconfig.json",
        content: json({
          compilerOptions: {
            target: "ES2022",
            lib: ["dom", "dom.iterable", "es2022"],
            allowJs: false,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "react-jsx",
            incremental: true,
            plugins: [{ name: "next" }]
          },
          include: [
            "next-env.d.ts",
            "**/*.ts",
            "**/*.tsx",
            ".next/types/**/*.ts"
          ],
          exclude: ["node_modules"]
        })
      },
      {
        path: "next-env.d.ts",
        content:
          '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n'
      },
      {
        path: "app/layout.tsx",
        content:
          'import type { Metadata } from "next";\nimport "./globals.css";\n\nexport const metadata: Metadata = { title: ' +
          JSON.stringify(plan.title) +
          ", description: " +
          JSON.stringify(plan.summary.slice(0, 160)) +
          " };\n\nexport default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang=\"en\"><body>{children}</body></html>; }\n"
      },
      { path: "app/page.tsx", content: page },
      { path: "app/globals.css", content: css },
      {
        path: "README.md",
        content: `# ${plan.title}\n\nGenerated by Ziepher AI from an approved visual plan.\n\n## Run\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\nFinancial integrations are intentionally not enabled. Add Stripe or other money connections only after core testing and explicit production approval.\n`
      }
    ],
    previewHtml,
    testPlan: [
      "Run strict TypeScript validation.",
      "Run the optimized Next.js production build.",
      "Verify keyboard navigation and responsive layouts.",
      "Test all core workflows before external integrations.",
      "Add and verify financial integrations only in the final release stage."
    ],
    knownLimitations: [
      "External services use placeholders until credentials are supplied.",
      "Live financial integrations are intentionally excluded from this build."
    ]
  };
}
