import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("public launch readiness checker", () => {
  it("checks local contributor safety and licensing gates without provider calls", () => {
    const script = read("scripts/public-launch-readiness.ts");

    expect(script).toContain("pull_request_target:");
    expect(script).toContain("npm run smoke:contributor");
    expect(script).toContain("repository license / contributor-use terms are not yet selected");
    expect(script).toContain("verify GitHub main protection/ruleset is enabled");
    expect(script).not.toContain("fetch(");
  });

  it("exposes the readiness command and documents its manual limits", () => {
    const packageJson = read("package.json");
    const launch = read("docs/PUBLIC-CONTRIBUTOR-LAUNCH.md");

    expect(packageJson).toContain('"check:public-launch": "tsx scripts/public-launch-readiness.ts"');
    expect(launch).toContain("npm run check:public-launch");
    expect(launch).toContain("issue #150");
    expect(launch).toContain("replace the manual GitHub and production-boundary checks");
  });
});
