import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Z-Life launch homepage", () => {
  it("keeps direct navigation on the front page", () => {
    const home = read("components/zlife-marketing-home.tsx");
    expect(home).toContain("No endless scrolling required.");
    expect(home).toContain('{ label: "Builder"');
    expect(home).toContain('{ label: "About"');
    expect(home).toContain('{ label: "Our Vision"');
    expect(home).toContain('{ label: "Community"');
  });

  it("keeps the founder story and future plan on the front page", () => {
    const home = read("components/zlife-marketing-home.tsx");
    expect(home).toContain("WHY Z-LIFE EXISTS");
    expect(home).toContain("Built by someone who got tired of needing a different app for everything.");
    expect(home).toContain("THE BIGGER Z-LIFE VISION");
    expect(home).toContain("AI Website & App Builder");
  });

  it("keeps the builder as the primary launch action", () => {
    const home = read("components/zlife-marketing-home.tsx");
    expect(home).toContain("Build My Website or App");
    expect(home).toContain('/auth/sign-in?next=/projects');
  });
});
