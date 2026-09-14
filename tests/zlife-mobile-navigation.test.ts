import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("ZLife mobile navigation", () => {
  it("keeps core landing destinations reachable when desktop navigation is hidden", () => {
    const page = source("components/zlife-marketing-home.tsx");
    const styles = source("components/zlife-marketing-home.module.css");

    expect(page).toContain('aria-label="Mobile navigation"');
    expect(page).toContain('href="#team"');
    expect(page).toContain('href="#modules"');
    expect(page).toContain('href="#vision"');
    expect(page).toContain('href="/community"');
    expect(styles).toContain("@media (max-width: 820px)");
    expect(styles).toContain(".mobileNav");
    expect(styles).toContain("overflow-x: auto");
  });
});
