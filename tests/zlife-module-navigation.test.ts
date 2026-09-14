import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("ZLife module navigation", () => {
  it("returns to same-origin history and falls back to the modules section", () => {
    const backLink = source("components/zlife-module-back-link.tsx");

    expect(backLink).toContain("previousUrl.origin === window.location.origin");
    expect(backLink).toContain("router.back()");
    expect(backLink).toContain('href="/#modules"');
  });

  it("uses the history-aware control throughout module detail pages", () => {
    const page = source("app/modules/[slug]/page.tsx");

    expect(page).toContain("ZLifeModuleBackLink");
    expect(page).not.toContain('<Link href="/#modules">← Back to modules</Link>');
  });
});
