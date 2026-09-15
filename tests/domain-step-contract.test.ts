import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateDomainCandidates } from "../lib/domain/domain-candidates";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("builder domain step", () => {
  it("generates clear deterministic names with .com first", () => {
    const candidates = generateDomainCandidates({
      name: "Family Tree Service",
      businessName: "Family Tree Service",
      projectType: "website",
      limit: 8
    });

    expect(candidates[0]).toBe("familytreeservice.com");
    expect(candidates).toContain("familytreeservice.net");
    expect(new Set(candidates).size).toBe(candidates.length);
  });

  it("uses the current Vercel registrar availability and price endpoints", () => {
    const provider = read("lib/deployment/vercel-registrar.ts");
    expect(provider).toContain("/v1/registrar/domains/availability");
    expect(provider).toContain("/price");
    expect(provider).toContain("renewalPrice");
    expect(provider).not.toContain("/buy");
  });

  it("does not claim live availability when no registrar connection exists", () => {
    const route = read("app/api/projects/[projectId]/domains/suggestions/route.ts");
    expect(route).toContain("providerConfigured: false");
    expect(route).toContain("available: null");
  });

  it("puts the domain step after a built preview and keeps purchase external", () => {
    const studio = read("app/projects/[projectId]/studio/page.tsx");
    const chooser = read("components/project-domain-step.tsx");
    expect(studio).toContain("hasBuiltPreview");
    expect(studio).toContain("Choose Domain");
    expect(chooser).toContain("No purchase was made by Z-Life");
    expect(chooser).toContain("Prices can change before checkout");
  });
});
