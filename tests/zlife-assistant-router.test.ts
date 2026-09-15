import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("central Ask Z-Life entry point", () => {
  it("keeps one obvious starting point instead of extra panels", () => {
    const page = source("app/assistant/page.tsx");
    const router = source("components/zlife-assistant-router.tsx");
    expect(page).toContain("One place to start");
    expect(page).toContain("What do you need help with?");
    expect(page).toContain("simplest working next step");
    expect(page).not.toContain("Your installed modules");
    expect(page).not.toContain("Business intelligence");
    expect(router).toContain("Help me");
    expect(router).toContain("No paid AI call");
  });

  it("routes only to working destinations", () => {
    const router = source("components/zlife-assistant-router.tsx");
    expect(router).toContain('href: "/operate/assistant"');
    expect(router).toContain('href: "/home"');
    expect(router).toContain('href: "/projects"');
    expect(router).toContain('href: "/today"');
    expect(router).not.toContain('href: "/modules/money"');
    expect(router).not.toContain('href: "/modules/health"');
    expect(router).not.toContain('href: "/modules/auto"');
  });

  it("keeps mixed life requests together instead of forcing one module", () => {
    const router = source("components/zlife-assistant-router.tsx");
    expect(router).toContain("if (matches.length > 1)");
    expect(router).toContain('area: "My Day"');
    expect(router).toContain('href: "/today"');
    expect(router).toContain("Open My Day");
  });

  it("keeps paid AI explicitly approval gated", () => {
    const page = source("app/assistant/page.tsx");
    expect(page).toContain("Optional paid AI explanation remains approval-gated");
    expect(page).toContain("cannot silently message customers, charge cards, publish ads, or change production");
  });
});
