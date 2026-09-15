import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("publish readiness flow", () => {
  it("checks preview, review tools, domain, and deployment target", () => {
    const page = read("app/projects/[projectId]/publish/page.tsx");
    expect(page).toContain('label: "Preview"');
    expect(page).toContain('label: "Design review tools"');
    expect(page).toContain('label: "Domain"');
    expect(page).toContain('label: "Deployment target"');
  });

  it("does not pretend design review means approval", () => {
    const page = read("app/projects/[projectId]/publish/page.tsx");
    expect(page).toContain("it does not mean you already approved it");
    expect(page).toContain("cannot approve the design for you");
    expect(page).toContain("Your final approval is where you confirm the design");
  });

  it("keeps production release disabled and approval-only", () => {
    const page = read("app/projects/[projectId]/publish/page.tsx");
    expect(page).toContain("Production publish requires approval");
    expect(page).toContain("disabled");
    expect(page).toContain("publish the website/app, spend credits, buy a domain, or change DNS");
  });

  it("connects the domain step to the final readiness screen", () => {
    const domains = read("app/projects/[projectId]/domains/page.tsx");
    expect(domains).toContain("/publish");
    expect(domains).toContain("Continue to Publish Readiness");
  });
});
