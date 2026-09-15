import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("ZLife public accessibility", () => {
  it("provides skip navigation and visible keyboard focus treatment in the shared shell", () => {
    const shell = source("components/zlife-public-shell.tsx");
    const styles = source("components/zlife-marketing-home.module.css");

    expect(shell).toContain('href="#main-content"');
    expect(shell).toContain("Skip to main content");
    expect(shell).toContain('id="main-content"');
    expect(styles).toContain(":focus-visible");
    expect(styles).toContain("outline: 3px solid");
  });

  it("adds accessible labels to the home visual and major homepage regions", () => {
    const page = source("components/zlife-marketing-home.tsx");

    expect(page).toContain('role="img"');
    expect(page).toContain('aria-label="Z-Life star-filled landscape connecting life and business"');
    expect(page).toContain('aria-labelledby="gateway-heading"');
    expect(page).toContain('id="gateway-heading"');
    expect(page).toContain('aria-labelledby="about-heading"');
    expect(page).toContain('id="about-heading"');
    expect(page).toContain('aria-labelledby="future-heading"');
    expect(page).toContain('id="future-heading"');
  });
});
