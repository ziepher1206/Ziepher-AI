import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const registry = readFileSync("lib/zlife/modules.ts", "utf8");
const modulesPage = readFileSync("app/modules/page.tsx", "utf8");
const moduleDetail = readFileSync("app/modules/[slug]/page.tsx", "utf8");
const marketingHome = readFileSync("components/zlife-marketing-home.tsx", "utf8");

describe("Z-Life nested module labels", () => {
  it("keeps distinct nested labels for Business and Home & Family", () => {
    expect(registry).toContain('nestedLabel: "Tree Service · Active module"');
    expect(registry).toContain('nestedLabel: "Working foundation · Tasks + maintenance"');
  });

  it("renders each module's own nested label rather than hardcoding Tree Service", () => {
    expect(modulesPage).toContain("{item.nestedLabel}");
    expect(moduleDetail).toContain("{selectedModule.nestedLabel}");
    expect(marketingHome).toContain("{item.nestedLabel}");

    expect(modulesPage).not.toContain("<strong>Tree Service</strong>");
    expect(moduleDetail).not.toContain("<strong>Tree Service</strong>");
    expect(marketingHome).not.toContain("<strong>Tree Service</strong>");
  });

  it("does not label development foundations as active nested capabilities", () => {
    expect(modulesPage).toContain('item.status === "active" ? "ACTIVE" : "WORKING"');
    expect(moduleDetail).toContain('selectedModule.status === "active" ? "ACTIVE" : "WORKING"');
    expect(modulesPage).toContain("Connected development foundation");
    expect(moduleDetail).toContain("Connected development foundation");
  });
});
