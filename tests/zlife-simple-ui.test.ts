import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("simplified Z-Life interface", () => {
  it("keeps unfinished modules out of the signed-in module picker", () => {
    const page = source("app/dashboard/modules/page.tsx");
    expect(page).toContain('.eq("status", "available")');
    expect(page).not.toContain('.in("status", ["available", "preview"])');
    expect(page).toContain("Only working modules are shown here");
    expect(page).toContain("New modules will appear here only when there is something useful you can actually do with them");
  });

  it("keeps quick add simple by default", () => {
    const form = source("components/zlife-quick-add.tsx");
    expect(form).toContain("Type it once. Everything else is optional.");
    expect(form).toContain("More options");
    expect(form).toContain('type="hidden" name="itemKind" value="task"');
    expect(form).toContain('type="hidden" name="priority" value="normal"');
    expect(form).toContain('type="hidden" name="repeat" value="once"');
  });

  it("keeps Ask Z-Life focused on one request box and working destinations", () => {
    const page = source("app/assistant/page.tsx");
    const router = source("components/zlife-assistant-router.tsx");
    expect(page).toContain("what you need");
    expect(router).toContain("Show me where to go");
    expect(router).toContain("My Day");
    expect(router).not.toContain('href: "/modules/health"');
    expect(router).not.toContain('href: "/modules/money"');
  });
});
