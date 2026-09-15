import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Z-Life My Day postpone controls", () => {
  it("lets manual core items move later without touching source modules", () => {
    const actions = source("app/today/actions.ts");
    expect(actions).toContain("postponeDailyItemAction");
    expect(actions).toContain('z.enum(["later_today", "tomorrow", "next_week"])');
    expect(actions).toContain('item.source_module !== "zlife_core"');
    expect(actions).toContain("Open the source module to reschedule this connected item.");
    expect(actions).toContain("last_postponed_at");
    expect(actions).toContain("last_postpone_choice");
  });

  it("offers fast everyday postpone controls in My Day", () => {
    const page = source("app/today/page.tsx");
    expect(page).toContain("postponeDailyItemAction");
    expect(page).toContain('value="later_today"');
    expect(page).toContain('value="tomorrow"');
    expect(page).toContain(">+3h<");
    expect(page).toContain(">Tomorrow<");
  });

  it("keeps connected records owned by their source workflow", () => {
    const page = source("app/today/page.tsx");
    expect(page).toContain("Open source to reschedule or complete");
    expect(page).toContain('item.source_module === "zlife_core"');
  });
});
