import { describe, expect, it } from "vitest";
import { zlifeModuleBySlug, zlifeModules } from "../lib/zlife/modules";

describe("ZLife module registry", () => {
  it("keeps module slugs unique and every registry entry addressable", () => {
    const slugs = zlifeModules.map((module) => module.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    for (const module of zlifeModules) {
      expect(zlifeModuleBySlug.get(module.slug)).toEqual(module);
      expect(module.summary.length).toBeGreaterThan(0);
      expect(module.capabilities.length).toBeGreaterThan(0);
    }
  });

  it("keeps Tree Service inside the active Business module", () => {
    const business = zlifeModuleBySlug.get("business");

    expect(business?.status).toBe("active");
    expect(business?.launchHref).toBe("/operate");
    expect(business?.nestedLabel).toContain("Tree Service");
    expect(business?.summary).toContain("Tree Service");
  });

  it("keeps active module launch targets separate from module explanation routes", () => {
    for (const module of zlifeModules.filter((item) => item.status === "active")) {
      expect(module.launchHref).toBeTruthy();
      expect(module.launchHref).not.toBe(`/modules/${module.slug}`);
    }
  });
});
