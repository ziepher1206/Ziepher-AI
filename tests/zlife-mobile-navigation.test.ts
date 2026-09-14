import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("ZLife mobile navigation", () => {
  it("keeps the same multi-page destinations reachable when desktop navigation is hidden", () => {
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
});
