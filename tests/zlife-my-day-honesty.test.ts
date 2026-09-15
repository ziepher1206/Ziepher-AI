import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Z-Life My Day honesty", () => {
  it("does not show fake live totals for disconnected areas", () => {
    const page = source("app/today/page.tsx");
    expect(page).toContain('businessReady ? String(leads.count ?? 0) : "—"');
    expect(page).toContain('homeReady ? String(tasks.count ?? 0) : "—"');
    expect(page).toContain('value: "Not connected"').toBe(false);
    expect(page).toContain('"Not connected"');
  });

  it("keeps the full daily-life categories visible without pretending they are live", () => {
    const page = source("app/today/page.tsx");
    for (const label of [
      "Business",
      "Schedule",
      "Bills & payments",
      "Home & family",
      "Home maintenance",
      "Family & school",
      "Health",
      "Grocery & shopping",
      "Subscriptions due",
      "Errands",
      "Auto & vehicle",
      "Documents"
    ]) {
      expect(page).toContain(label);
    }
    expect(page).toContain("Planned daily context");
    expect(page).toContain("In development");
  });

  it("keeps Ask Z-Life as the next-step entry point", () => {
    const page = source("app/today/page.tsx");
    expect(page).toContain('href="/assistant"');
    expect(page).toContain("Ask Z-Life to help prioritize");
    expect(page).toContain("Review what changed. Plan tomorrow.");
  });
});
