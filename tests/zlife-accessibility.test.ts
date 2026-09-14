import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("ZLife landing accessibility", () => {
  it("provides skip navigation and visible keyboard focus treatment", () => {
    const page = source("components/zlife-marketing-home.tsx");
    const styles = source("components/zlife-marketing-home.module.css");

    expect(page).toContain('href="#main-content"');
    expect(page).toContain("Skip to main content");
    expect(page).toContain('id="main-content"');
    expect(page).toContain('id="home"');
    expect(page).toContain('href="#home"');
    expect(styles).toContain(":focus-visible");
    expect(styles).toContain("outline: 3px solid");
  });

  it("adds accessible labels to major visual and module regions", () => {
    const page = source("components/zlife-marketing-home.tsx");

    expect(page).toContain('role="img"');
    expect(page).toContain('aria-labelledby="modules-heading"');
    expect(page).toContain('aria-labelledby="team-heading"');
    expect(page).toContain('aria-labelledby="vision-heading"');
    expect(page).toContain('aria-label={`${item.name}. ${item.status === "active" ? "Active module" : "In development"}.`}');
  });
});
