import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("public contributor safety", () => {
  it("keeps fork PR CI on pull_request with read-only repository permissions", () => {
    const workflow = read(".github/workflows/ci.yml");

    expect(workflow).toContain("pull_request:");
    expect(workflow).not.toContain("pull_request_target:");
    expect(workflow).toContain("permissions:\n  contents: read");
  });

  it("keeps public contributor production boundaries documented", () => {
    const contributing = read("CONTRIBUTING.md");
    const security = read("SECURITY.md");
    const launchGate = read("docs/PUBLIC-CONTRIBUTOR-LAUNCH.md");

    expect(contributing).toContain("work from forks or contributor branches");
    expect(contributing).toContain("No community contributor may deploy directly to production");
    expect(security).toContain("Public contributors must not have automatic production deployment access");
    expect(launchGate).toContain("Public contributors work through forks and pull requests");
    expect(launchGate).toContain("Contribution Ledger ingestion remains pending by default");
  });

  it("keeps ownership and review surfaces declared", () => {
    const codeowners = read(".github/CODEOWNERS");
    const prTemplate = read(".github/PULL_REQUEST_TEMPLATE.md");

    expect(codeowners).toContain("* @ziepher1206");
    expect(codeowners).toContain("/supabase/migrations/ @ziepher1206");
    expect(codeowners).toContain("/lib/community/ @ziepher1206");
    expect(prTemplate).toContain("I did not include production secrets or credentials");
    expect(prTemplate).toContain("Contribution credit is verified by maintainers");
  });
});
