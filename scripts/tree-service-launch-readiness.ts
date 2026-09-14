import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const passes: string[] = [];
const failures: string[] = [];
const manual: string[] = [];

function pathExists(path: string) {
  return existsSync(join(root, path));
}

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function requireFile(path: string) {
  if (pathExists(path)) passes.push(`present: ${path}`);
  else failures.push(`missing Tree Service launch file: ${path}`);
}

for (const path of [
  "docs/TREE-SERVICE-LAUNCH-READINESS.md",
  "docs/ZIEPHER-TREE-SERVICE-LAUNCH.md",
  "tests/tree-service-launch-readiness.test.ts",
  "tests/operate-phase1-foundation.test.ts",
  "tests/tree-service-phase2-lead-intake.test.ts",
  "tests/tree-service-phase3-estimates-scheduling.test.ts",
  "tests/tree-service-phase4-jobs-crew.test.ts",
  "tests/operate-phase5-invoices-stripe.test.ts",
  "tests/operate-phase6-growth.test.ts",
  "tests/operate-phase7-assistant.test.ts",
  "app/operate/page.tsx",
  "app/operate/leads/page.tsx",
  "app/operate/estimates/page.tsx",
  "app/operate/calendar/page.tsx",
  "app/operate/invoices/page.tsx",
  "app/operate/growth/page.tsx",
  "app/operate/assistant/page.tsx",
]) requireFile(path);

if (pathExists(".github/workflows/ci.yml")) {
  const ci = read(".github/workflows/ci.yml");
  const checks: Array<[boolean, string, string]> = [
    [ci.includes("npm run smoke:contributor"), "CI runs contributor safety smoke", "CI must run contributor safety smoke"],
    [ci.includes("npm run typecheck"), "CI runs typecheck", "CI must run typecheck"],
    [ci.includes("npm run lint"), "CI runs lint", "CI must run lint"],
    [ci.includes("npm test"), "CI runs test suite", "CI must run tests"],
    [ci.includes("npm run build"), "CI runs production build", "CI must run production build"],
    [ci.includes("npm audit --audit-level=moderate"), "CI runs dependency audit", "CI must run moderate dependency audit"],
  ];
  for (const [ok, passMessage, failureMessage] of checks) {
    (ok ? passes : failures).push(ok ? passMessage : failureMessage);
  }
} else failures.push("missing CI workflow");

if (pathExists("lib/stripe/operate-payment-config.ts") && pathExists("lib/stripe/operate-payment-events.ts")) {
  const config = read("lib/stripe/operate-payment-config.ts");
  const events = read("lib/stripe/operate-payment-events.ts");
  if (config.includes("sk_test_") && events.includes("Live Stripe events are disabled")) {
    passes.push("Tree Service payments remain test-mode guarded");
  } else {
    failures.push("Tree Service payment test-mode guard is missing or changed");
  }
} else failures.push("missing Tree Service Stripe safety files");

if (pathExists("app/operate/assistant/page.tsx")) {
  const assistant = read("app/operate/assistant/page.tsx");
  if (assistant.includes("read-only and deterministic") && assistant.includes("require explicit approval")) {
    passes.push("Assistant remains read-only/approval-gated for launch");
  } else {
    failures.push("Assistant launch safety language changed; review autonomous-action boundary");
  }
}

if (pathExists("docs/TREE-SERVICE-LAUNCH-READINESS.md")) {
  const readiness = read("docs/TREE-SERVICE-LAUNCH-READINESS.md");
  if (readiness.includes("broad production-customer launch is **not yet approved**")) {
    passes.push("launch document still blocks broad production-customer launch");
  } else {
    failures.push("launch document no longer contains the explicit broad-launch block");
  }
}

manual.push(
  "complete an authenticated end-to-end run from lead through Stripe test payment and growth follow-up",
  "complete a two-user/two-workspace tenant-isolation exercise including attempted cross-workspace reads/writes",
  "deliver actual Stripe test webhooks for successful, partial/stage, repeated, refunded, and canceled paths",
  "verify Supabase backup/restore against an approved restore target",
  "perform a production rollback drill for the current Vercel app",
  "complete a human review of RLS, privileged RPCs, secrets, public endpoints, and payment/webhook boundaries",
  "obtain appropriate review of privacy, terms, billing, refund, and other customer-facing legal language",
  "complete a controlled tree-service pilot before broad customer launch",
);

console.log("ZLife Tree Service launch readiness\n");
for (const item of passes) console.log(`PASS   ${item}`);
for (const item of failures) console.log(`BLOCK  ${item}`);
for (const item of manual) console.log(`MANUAL ${item}`);
console.log(`\nStatic checks: ${passes.length} passed, ${failures.length} blocking.`);
console.log("Manual/pilot gates remain mandatory even when all static checks pass.");

if (failures.length) process.exitCode = 1;
