import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Z-Life modules page", () => {
  it("renders each module's own nested label instead of hardcoding Tree Service", () => {
    const page = source("app/modules/page.tsx");
    const detail = source("app/modules/[slug]/page.tsx");
    expect(page).toContain("{item.nestedLabel}");
    expect(page).toContain('item.slug === "business"');
    expect(page).toContain("Industry profile inside Z-Life Business");
    expect(page).toContain("Working foundation inside this module");
    expect(detail).toContain("{selectedModule.nestedLabel}");
    expect(detail).toContain('selectedModule.slug === "business"');
    expect(detail).toContain("Industry profile inside the shared Service Business OS");
    expect(page).not.toContain("<strong>Tree Service</strong>");
    expect(detail).not.toContain("<strong>Tree Service</strong>");
    expect(page).not.toContain("First active business vertical");
    expect(detail).not.toContain("First active business vertical");
  });

  it("keeps Business positioned as the shared service-business OS", () => {
    const modules = source("lib/zlife/modules.ts");
    expect(modules).toContain("One adaptive operating system for service businesses");
    expect(modules).toContain("Tree Service · First active industry profile");
    expect(modules).toContain("Pressure Washing");
    expect(modules).toContain("HVAC");
  });
});
