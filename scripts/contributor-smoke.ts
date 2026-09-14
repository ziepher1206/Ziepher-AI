import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { validateContributorSmoke } from "../lib/community/contributor-smoke";

function parseEnvExample(contents: string) {
  const env: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    env[key] = value;
  }

  return env;
}

const root = process.cwd();
const envExample = parseEnvExample(readFileSync(resolve(root, ".env.example"), "utf8"));
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
  scripts?: Record<string, string>;
};

const result = validateContributorSmoke({
  env: envExample,
  scripts: packageJson.scripts ?? {},
  nodeVersion: process.versions.node,
});

if (!result.ok) {
  console.error("ZLife contributor smoke test failed:");
  for (const error of result.errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("ZLife contributor smoke test passed.");
  console.log("- Community dev mode is enabled in .env.example.");
  console.log("- AI, email, SMS, payment, and notification mocks are enabled.");
  console.log("- Production/provider secrets remain blank in the default contributor environment.");
  console.log("- Required typecheck, lint, test, and build scripts are available.");
  console.log("- No paid-provider network request was made by this smoke test.");
}
