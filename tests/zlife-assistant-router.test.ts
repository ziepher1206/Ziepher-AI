import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("central Ask Z-Life entry point", () => {
  it("provides a zero-cost front door across life and business", () => {
    const page = source("app/assistant/page.tsx");
    const router = source("components/zlife-assistant-router.tsx");
    expect(page).toContain("One front door for Z-Life");
    expect(page).toContain("Zero-cost routing first");
    expect(router).toContain("Zero-cost routing · no paid AI request");
    expect(router).toContain('href: "/operate/assistant"');
    expect(router).toContain('href: "/home"');
    expect(router).toContain('href: "/modules/money"');
    expect(router).toContain('href: "/modules/health"');
    expect(router).toContain('href: "/modules/auto"');
    expect(router).toContain('href: "/services"');
  });

  it("keeps mixed life requests together instead of forcing one module", () => {
    const router = source("components/zlife-assistant-router.tsx");
    expect(router).toContain("if (matches.length > 1)");
    expect(router).toContain('area: "My Day"');
    expect(router).toContain('href: "/dashboard"');
    expect(router).toContain("Open Today at a Glance");
    expect(router).toContain("instead of sending you into one isolated module");
  });

  it("does not pretend uncertain requests were understood", () => {
    const router = source("components/zlife-assistant-router.tsx");
    expect(router).toContain("does not have enough connected context to classify that request confidently yet");
    expect(router).toContain("rather than sending your text to a paid model without approval");
  });

  it("keeps paid business AI explicitly approval gated", () => {
    const page = source("app/assistant/page.tsx");
    expect(page).toContain("Optional paid AI explanation remains approval-gated");
    expect(page).toContain("cannot silently message customers, charge cards, publish ads, or change production");
  });
});
