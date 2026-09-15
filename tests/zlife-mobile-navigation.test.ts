import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("ZLife mobile navigation", () => {
  it("keeps public multi-page destinations reachable when desktop navigation is hidden", () => {
    const shell = source("components/zlife-public-shell.tsx");
    const navigation = source("lib/zlife/public-navigation.ts");
    const styles = source("components/zlife-marketing-home.module.css");

    expect(shell).toContain('aria-label="Mobile navigation"');
    expect(shell).toContain("zlifePublicNavigation.filter");
    expect(navigation).toContain('{ label: "AI Teams", href: "/ai-teams" }');
    expect(navigation).toContain('{ label: "Modules", href: "/modules" }');
    expect(navigation).toContain('{ label: "About", href: "/about" }');
    expect(navigation).toContain('{ label: "Our Vision", href: "/vision" }');
    expect(navigation).toContain('{ label: "Community", href: "/community" }');
    expect(navigation).not.toContain('href: "#');
    expect(styles).toContain("@media (max-width: 820px)");
    expect(styles).toContain(".mobileNav");
    expect(styles).toContain("overflow-x: auto");
  });

  it("keeps only the three essential signed-in mobile destinations", () => {
    const nav = source("components/zlife-mobile-bottom-nav.tsx");
    const styles = source("components/zlife-mobile-bottom-nav.module.css");
    expect(nav).toContain('label: "Home"');
    expect(nav).toContain('label: "My Day"');
    expect(nav).toContain('label: "Ask Z-Life"');
    expect(nav).not.toContain('label: "Modules"');
    expect(nav).not.toContain('label: "More"');
    expect(styles).toContain("grid-template-columns: repeat(3");
  });

  it("mounts signed-in navigation once at the app shell and hides it on desktop", () => {
    const layout = source("app/layout.tsx");
    const styles = source("components/zlife-mobile-bottom-nav.module.css");
    expect(layout).toContain("<ZLifeMobileBottomNav />");
    expect(styles).toContain("@media (min-width: 768px)");
    expect(styles).toContain("display: none");
    expect(styles).toContain("env(safe-area-inset-bottom)");
  });
});
