import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("owned-domain connection safety contract", () => {
  it("requires an explicit connect confirmation before attaching a domain", () => {
    const route = read("app/api/projects/[projectId]/domains/connect/route.ts");
    expect(route).toContain('confirmation: z.literal("CONNECT_DOMAIN")');
    expect(route).toContain("addVercelProjectDomain");
  });

  it("does not change DNS or publish during domain attachment", () => {
    const route = read("app/api/projects/[projectId]/domains/connect/route.ts");
    expect(route).toContain("dnsChangedByZLife: false");
    expect(route).toContain("publishedByZLife: false");
    expect(route).not.toContain("request_project_deployment");
  });

  it("keeps verification separate and exposes required DNS records", () => {
    const component = read("components/project-domain-step.tsx");
    expect(component).toContain("Connect this domain");
    expect(component).toContain("Check DNS again");
    expect(component).toContain("DNS verification needed");
    expect(component).toContain("Name/Host:");
    expect(component).toContain("Value:");
  });
});
