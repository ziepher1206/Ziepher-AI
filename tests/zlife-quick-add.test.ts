import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Z-Life My Day quick add", () => {
  it("supports the everyday categories requested for one daily workspace", () => {
    const form = source("components/zlife-quick-add.tsx");
    for (const label of [
      "Task",
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
    expect(form).toContain("Add to My Day");
    expect(form).toContain("no paid AI call");
  });

  it("validates and writes manual items inside the current workspace", () => {
    const action = source("app/today/actions.ts");
    expect(action).toContain("dailyItemSchema");
    expect(action).toContain('ensure_personal_workspace');
    expect(action).toContain('.from("zlife_daily_items").insert');
    expect(action).toContain('source_module: "zlife_core"');
    expect(action).toContain('created_by: user.id');
    expect(action).toContain('revalidatePath("/today")');
  });

  it("supports recurring reminders without needing another module", () => {
    const form = source("components/zlife-quick-add.tsx");
    const action = source("app/today/actions.ts");
    expect(form).toContain('name="repeat"');
    expect(form).toContain("Every day");
    expect(form).toContain("Every week");
    expect(form).toContain("Every month");
    expect(form).toContain("Every year");
    expect(action).toContain('repeatOptions = ["once", "daily", "weekly", "monthly", "yearly"]');
    expect(action).toContain("Choose a date and time for recurring My Day items.");
    expect(action).toContain("nextFutureOccurrence");
    expect(action).toContain("last_completed_at");
    expect(action).toContain("completed_count");
  });

  it("only renders quick add when the daily stream schema is available", () => {
    const page = source("app/today/page.tsx");
    expect(page).toContain("dailyStreamReady ?");
    expect(page).toContain("<ZLifeQuickAdd />");
  });

  it("allows only manual core items to be completed from My Day", () => {
    const action = source("app/today/actions.ts");
    const page = source("app/today/page.tsx");
    expect(action).toContain("completeDailyItemAction");
    expect(action).toContain('item.source_module !== "zlife_core"');
    expect(action).toContain('update({ status: "done" })');
    expect(page).toContain('item.source_module === "zlife_core"');
    expect(page).toContain("Open source to complete");
  });
});
