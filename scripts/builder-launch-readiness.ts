import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";

const root = process.cwd();
const failures: string[] = [];
const passes: string[] = [];
const manual: string[] = [];

function pathExists(path: string) {
  return existsSync(join(root, path));
}

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function requireFile(path: string) {
  if (pathExists(path)) passes.push(`present: ${path}`);
  else failures.push(`missing builder launch file: ${path}`);
}

function requireText(path: string, text: string, message: string) {
  if (!pathExists(path)) {
    failures.push(`missing file for check: ${path}`);
    return;
  }
  if (read(path).includes(text)) passes.push(message);
  else failures.push(`${message} — expected text not found`);
}

for (const path of [
  "components/site-onboarding-form.tsx",
  "components/site-media-upload.tsx",
  "components/builder-progress.tsx",
  "components/site-change-request-workflow.tsx",
  "components/project-domain-step.tsx",
  "components/project-visual-quality-panel.tsx",
  "app/projects/page.tsx",
  "app/projects/[projectId]/studio/page.tsx",
  "app/projects/[projectId]/domains/page.tsx",
  "app/projects/[projectId]/publish/page.tsx",
  "tests/e2e/local-visual-smoke.mjs",
  "tests/builder-end-to-end-navigation.test.ts",
  "tests/zlife-heartbeat-branding.test.ts",
  "vercel.json"
]) requireFile(path);

requireText(
  "components/zlife-marketing-home.tsx",
  "Build My Website or App",
  "homepage exposes the primary builder CTA"
);
requireText(
  "components/builder-progress.tsx",
  "Preview & Refine",
  "builder progress includes preview/refine"
);
requireText(
  "components/builder-progress.tsx",
  "Publish Ready",
  "builder progress includes final readiness stage"
);
requireText(
  "app/projects/[projectId]/publish/page.tsx",
  "Production publish requires approval",
  "production publish remains approval-gated"
);
requireText(
  "app/projects/[projectId]/publish/page.tsx",
  "cannot approve the design for you",
  "publish readiness does not fake design approval"
);
requireText(
  "app/projects/[projectId]/studio/page.tsx",
  "@media (max-width: 720px)",
  "studio has a mobile-specific control layout"
);
requireText(
  "tests/e2e/local-visual-smoke.mjs",
  "Turn your idea into a polished website or app.",
  "local browser smoke follows the current launch-first homepage"
);

if (pathExists("vercel.json")) {
  const config = JSON.parse(read("vercel.json")) as { git?: { deploymentEnabled?: boolean } };
  if (config.git?.deploymentEnabled === false) {
    passes.push("routine Vercel Git deployments are disabled during the build-first phase");
  } else {
    failures.push("routine Vercel Git deployments must stay disabled until final preview review");
  }
}

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
function findLegacyPulse(directory: string): string[] {
  const absolute = join(root, directory);
  if (!existsSync(absolute)) return [];
  const matches: string[] = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const relative = join(directory, entry.name);
    if (entry.isDirectory()) matches.push(...findLegacyPulse(relative));
    else if (sourceExtensions.has(extname(entry.name)) && read(relative).includes("⌁")) matches.push(relative);
  }
  return matches;
}

const legacyPulse = ["app", "components", "lib"].flatMap(findLegacyPulse);
if (legacyPulse.length) failures.push(`legacy Z-Life pulse remains in: ${legacyPulse.join(", ")}`);
else passes.push("Z-Life source uses the shared ECG heartbeat instead of the legacy pulse symbol");

manual.push(
  "review Local Visual E2E screenshots at desktop and mobile sizes",
  "test a real authenticated project through Build → References → Preview/Refine → Domain → Publish Readiness",
  "verify live registrar pricing only when the connected provider is intentionally enabled",
  "run one final Vercel preview only after repository checks are green",
  "require explicit approval before production publish, domain purchase, DNS changes, or paid AI/provider use"
);

console.log("Z-Life Builder launch readiness\n");
for (const item of passes) console.log(`PASS   ${item}`);
for (const item of failures) console.log(`BLOCK  ${item}`);
for (const item of manual) console.log(`MANUAL ${item}`);
console.log(`\nStatic checks: ${passes.length} passed, ${failures.length} blocking.`);
console.log("Manual final-review items remain intentionally separate from automated checks.");
if (failures.length) process.exitCode = 1;
