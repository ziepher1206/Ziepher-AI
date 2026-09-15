import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { zlifePublicCta, zlifePublicNavigation } from "../lib/zlife/public-navigation";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("ZLife public launch navigation workflow", () => {
  it("keeps the builder first without homepage section anchors", () => {
    expect(zlifePublicNavigation.map((item) => item.href)).toEqual([
      "/",
      "/auth/sign-in?next=/projects",
      "/about",
      "/vision",
      "/community"
    ]);
    for (const item of zlifePublicNavigation) expect(item.href).not.toContain("#");
  });

  it("creates every public marketing page used in launch navigation", () => {
    for (const path of [
      "app/page.tsx",
      "app/about/page.tsx",
      "app/vision/page.tsx",
      "app/community/page.tsx"
    ]) expect(() => read(path)).not.toThrow();
  });

  it("keeps one consistent public navigation model for desktop and mobile", () => {
    expect(new Set(zlifePublicNavigation.map((item) => item.label)).size).toBe(zlifePublicNavigation.length);
    for (const label of ["Builder", "About", "Our Vision", "Community"]) {
      expect(zlifePublicNavigation.some((item) => item.label === label)).toBe(true);
    }
    const shell = read("components/zlife-public-shell.tsx");
    expect(shell).toContain("Primary navigation");
    expect(shell).toContain("Mobile navigation");
    expect(shell).toContain("zlifePublicNavigation");
  });

  it("uses the builder as the primary public CTA", () => {
    expect(zlifePublicCta).toEqual({
      label: "Build My Website or App",
      href: "/auth/sign-in?next=/projects"
    });
    expect(zlifePublicNavigation.some((item) => item.label === "Builder" && item.href === zlifePublicCta.href)).toBe(true);
  });

  it("turns the homepage into a builder-first gateway", () => {
    const home = read("components/zlife-marketing-home.tsx");
    for (const oldAnchor of ["#team", "#modules", "#founder", "#vision"]) expect(home).not.toContain(oldAnchor);
    expect(home).toContain("Build My Website or App");
    expect(home).toContain("/auth/sign-in?next=/projects");
  });

  it("publishes public routes in the sitemap without auth destinations", () => {
    const sitemap = read("app/sitemap.ts");
    expect(sitemap).toContain("zlifePublicRoutes");
    expect(sitemap).toContain('!route.startsWith("/auth/")');
  });
});
