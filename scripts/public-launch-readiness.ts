import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function pathExists(path: string) {
  return existsSync(join(root, path));
}

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

const failures: string[] = [];
const passes: string[] = [];
const manual: string[] = [];

function requireFile(path: string) {
  if (pathExists(path)) {
    passes.push(`present: ${path}`);
  } else {
    failures.push(`missing required launch file: ${path}`);
  }
}

for (const path of [
  "CONTRIBUTING.md",
  "SECURITY.md",
  ".github/CODEOWNERS",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/ISSUE_TEMPLATE/community-task.md",
  ".github/ISSUE_TEMPLATE/bug-report.md",
  ".github/ISSUE_TEMPLATE/feature-proposal.md",
  "docs/PUBLIC-CONTRIBUTOR-LAUNCH.md",
  "docs/COMMUNITY-ROADMAP.md",
  "app/community/page.tsx",
]) {
  requireFile(path);
}

if (pathExists(".github/workflows/ci.yml")) {
  const workflow = read(".github/workflows/ci.yml");
  const checks: Array<[boolean, string, string]> = [
    [workflow.includes("pull_request:"), "CI uses pull_request for public PRs", "CI must run on pull_request"],
    [!workflow.includes("pull_request_target:"), "CI avoids pull_request_target for untrusted code", "CI must not use pull_request_target for contributor code"],
    [workflow.includes("permissions:\n  contents: read"), "CI repository permissions are read-only", "CI contents permission must remain read-only"],
    [workflow.includes("npm run smoke:contributor"), "CI runs the zero-cost contributor smoke test", "CI must run npm run smoke:contributor"],
  ];

  for (const [ok, passMessage, failureMessage] of checks) {
    (ok ? passes : failures).push(ok ? passMessage : failureMessage);
  }
} else {
  failures.push("missing .github/workflows/ci.yml");
}

if (pathExists("package.json")) {
  const packageJson = JSON.parse(read("package.json")) as {
    scripts?: Record<string, string>;
  };
  if (packageJson.scripts?.["smoke:contributor"]) {
    passes.push("package exposes smoke:contributor");
  } else {
    failures.push("package.json must expose smoke:contributor");
  }
}

const licenseCandidates = [
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "COPYING",
  "COPYING.md",
];
const license = licenseCandidates.find(pathExists);
if (license) {
  passes.push(`repository license present: ${license}`);
} else {
  failures.push("repository license / contributor-use terms are not yet selected (see issue #150)");
}

manual.push(
  "verify GitHub main protection/ruleset is enabled (issue #93)",
  "verify validate is required and main must be up to date before merge",
  "verify outside-contributor PRs require maintainer review and resolved conversations",
  "verify force-push and main deletion are blocked",
  "perform a real fork PR smoke test from an account with no production secrets",
  "confirm no public contributor can trigger production deploys, live charges, payouts, outbound communication, or paid-provider usage",
);

console.log("ZLife public contributor launch readiness\n");
for (const item of passes) console.log(`PASS   ${item}`);
for (const item of failures) console.log(`BLOCK  ${item}`);
for (const item of manual) console.log(`MANUAL ${item}`);

console.log(`\nStatic checks: ${passes.length} passed, ${failures.length} blocking.`);
console.log("Manual repository/production checks must still be completed before the public launch announcement.");

if (failures.length) process.exitCode = 1;
