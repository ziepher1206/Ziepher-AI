import { describe, expect, it } from "vitest";
import { zlifePublicCta, zlifePublicNavigation } from "../lib/zlife/public-navigation";

describe("ZLife public multi-page navigation workflow", () => {
  it("uses dedicated routes instead of homepage section anchors", () => {
    expect(zlifePublicNavigation.map((item) => item.href)).toEqual([
      "/",
      "/ai-teams",
      "/modules",
      "/about",
      "/vision",
      "/community"
    ]);
    for (const item of zlifePublicNavigation) expect(item.href).not.toContain("#");
  });

  it("keeps one consistent public navigation model for desktop and mobile", () => {
    expect(new Set(zlifePublicNavigation.map((item) => item.label)).size).toBe(zlifePublicNavigation.length);
    expect(zlifePublicNavigation.some((item) => item.label === "Modules")).toBe(true);
    expect(zlifePublicNavigation.some((item) => item.label === "AI Teams")).toBe(true);
    expect(zlifePublicNavigation.some((item) => item.label === "About")).toBe(true);
    expect(zlifePublicNavigation.some((item) => item.label === "Our Vision")).toBe(true);
    expect(zlifePublicNavigation.some((item) => item.label === "Community")).toBe(true);
  });

  it("keeps the application CTA separate from marketing navigation", () => {
    expect(zlifePublicCta).toEqual({ label: "Open Z-Life", href: "/auth/sign-in" });
    expect(zlifePublicNavigation.map((item) => item.href)).not.toContain(zlifePublicCta.href);
  });

  it("supports the intended module drill-down and natural back path", () => {
    const modulesRoute = zlifePublicNavigation.find((item) => item.label === "Modules");
    expect(modulesRoute?.href).toBe("/modules");
    const exampleModuleRoute = "/modules/business";
    expect(exampleModuleRoute.startsWith(`${modulesRoute?.href}/`)).toBe(true);
  });
});
