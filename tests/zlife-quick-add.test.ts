import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Z-Life My Day quick add", () => {
  it("keeps the default interaction to one required field", () => {
    const form = source("components/zlife-quick-add.tsx");
    expect(form).toContain("What do you need to remember?");
    expect(form).toContain("Type it once. Everything else is optional.");
    expect(form).toContain('name="title" required');
    expect(form).toContain(">Add</button>");
    expect(form).toContain("More options");
    expect(form).toContain("No setup required");
  });

  it("keeps advanced everyday categories available without putting them in the way", () => {
    const form = source("components/zlife-quick-add.tsx");
    for (const label of [
      "Appointment",
      "Reminder",
      "Payment due",
      "Subscription due",
      "School activity",
      "Grocery / shopping",
      "Errand",
      "Health",
      "Business",
      "Auto / vehicle",
      "Document / paperwork",
      "Family"
    ]) {
      expect(form).toContain(label);
    }
    expect(form).toContain("<details");
  });

  it("defaults a simple submission safely", () => {
    const action = source("app/today/actions.ts");
    expect(action).toContain('itemKind: formData.get("itemKind") || "task"');
    expect(action).toContain('priority: formData.get("priority") || "normal"');
    expect(action).toContain('repeat: formData.get("repeat") || "once"');
    expect(action).toContain('.from("zlife_daily_items").insert');
    expect(action).toContain('source_module: "zlife_core"');
  });

  it("still supports recurring reminders when advanced options are used", () => {
    const form = source("components/zlife-quick-add.tsx");
    const action = source("app/today/actions.ts");
    expect(form).toContain('name="repeat"');
    expect(form).toContain("Every day");
    expect(form).toContain("Every week");
    expect(form).toContain("Every month");
    expect(form).toContain("Every year");
    expect(action).toContain("nextFutureOccurrence");
    expect(action).toContain("completed_count");
  });

  it("only renders quick add when the daily stream schema is available", () => {
    const page = source("app/today/page.tsx");
    expect(page).toContain("dailyStreamReady ?");
    expect(page).toContain("<ZLifeQuickAdd />");
  });
});
