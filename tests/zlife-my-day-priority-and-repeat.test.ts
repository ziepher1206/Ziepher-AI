import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Z-Life My Day prioritization", () => {
  const page = source("app/today/page.tsx");
  const actions = source("app/today/actions.ts");

  it("surfaces overdue and high-priority daily attention", () => {
    expect(page).toContain("overdueDailyItems");
    expect(page).toContain("urgentDailyItems");
    expect(page).toContain('label: "Overdue"');
    expect(page).toContain('label: "Priority"');
    expect(page).toContain(">Overdue</span>");
  });

  it("shows recurring cadence without opening the item", () => {
    expect(page).toContain("repeatLabel");
    expect(page).toContain("Repeats daily");
    expect(page).toContain("Repeats weekly");
    expect(page).toContain("Repeats monthly");
    expect(page).toContain("Repeats yearly");
    expect(page).toContain("action_href,metadata");
  });

  it("offers next-week postponing only for manual core items", () => {
    expect(page).toContain('value="next_week"');
    expect(page).toContain("Next week");
    expect(page).toContain('item.source_module === "zlife_core"');
    expect(actions).toContain('z.enum(["later_today", "tomorrow", "next_week"])');
    expect(actions).toContain('if (option === "next_week")');
  });
});
