import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("central Ask Z-Life entry point", () => {
  it("keeps one simple zero-cost front door", () => {
    const page = source("app/assistant/page.tsx");
    const router = source("components/zlife-assistant-router.tsx");
    expect(page).toContain("One front door for Z-Life");
    expect(page).toContain("Tell Z-Life");
    expect(page).toContain("Zero-cost routing first");
    expect(router).toContain("No paid AI call");
    expect(router).toContain('href: "/operate"');
    expect(router).toContain('href: "/home"');
    expect(router).toContain('href: "/projects"');
  });

  it("does not route users into unfinished modules", () => {
    const router = source("components/zlife-assistant-router.tsx");
    for (const route of ["/modules/money", "/modules/health", "/modules/auto", "/modules/travel", "/modules/learning"]) {
      expect(router).not.toContain(`href: "${route}"`);
    }
    expect(router).toContain("That full module is not ready yet");
    expect(router).toContain('href: "/today"');
  });

  it("keeps mixed requests together in My Day", () => {
    const router = source("components/zlife-assistant-router.tsx");
    expect(router).toContain("if (matches.length > 1)");
    expect(router).toContain('area: "My Day"');
    expect(router).toContain("Keep it together in My Day");
  });

  it("keeps paid or consequential AI actions explicitly gated", () => {
    const page = source("app/assistant/page.tsx");
    expect(page).toContain("Optional paid AI explanation remains approval-gated");
    expect(page).toContain("does not silently message customers, charge cards, publish ads, or change production");
  });
});
