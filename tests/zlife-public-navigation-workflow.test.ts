import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { zlifePublicCta, zlifePublicNavigation } from "../lib/zlife/public-navigation";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

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

  it("creates every dedicated public page before launch", () => {
    for (const path of [
      "app/page.tsx",
      "app/ai-teams/page.tsx",
      "app/modules/page.tsx",
      "app/about/page.tsx",
      "app/vision/page.tsx",
      "app/community/page.tsx"
    ]) expect(() => read(path)).not.toThrow();
  });

  it("keeps one consistent public navigation model for desktop and mobile", () => {
    expect(new Set(zlifePublicNavigation.map((item) => item.label)).size).toBe(zlifePublicNavigation.length);
    for (const label of ["Modules", "AI Teams", "About", "Our Vision", "Community"]) {
      expect(zlifePublicNavigation.some((item) => item.label === label)).toBe(true);
    }
    const shell = read("components/zlife-public-shell.tsx");
    expect(shell).toContain("Primary navigation");
    expect(shell).toContain("Mobile navigation");
    expect(shell).toContain("zlifePublicNavigation");
  });

  it("keeps the application CTA separate from marketing navigation", () => {
    expect(zlifePublicCta).toEqual({ label: "Open Z-Life", href: "/auth/sign-in" });
    expect(zlifePublicNavigation.map((item) => item.href)).not.toContain(zlifePublicCta.href);
  });

  it("turns the homepage into a concise gateway instead of an anchor-driven mega page", () => {
    const home = read("components/zlife-marketing-home.tsx");
    for (const oldAnchor of ["#team", "#modules", "#founder", "#vision"]) expect(home).not.toContain(oldAnchor);
    for (const href of ["/ai-teams", "/modules", "/about", "/vision", "/community"]) {
      expect(home).toContain(`href: "${href}"`);
    }
    expect(home).toContain("homeDestinations.map");
    expect(home).toContain("href={item.href}");
  });

  it("supports module drill-down and a stable /modules fallback while preserving browser back", () => {
    const modulesRoute = zlifePublicNavigation.find((item) => item.label === "Modules");
    expect(modulesRoute?.href).toBe("/modules");
    const backLink = read("components/zlife-module-back-link.tsx");
    expect(backLink).toContain('router.back()');
    expect(backLink).toContain('href="/modules"');
    expect(backLink).not.toContain('/#modules');
  });

  it("publishes all public routes in the sitemap", () => {
    const sitemap = read("app/sitemap.ts");
    expect(sitemap).toContain("zlifePublicRoutes");
  });
});
