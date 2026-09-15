import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Z-Life module launch status", () => {
  it("supports active, launch focus, and development states", () => {
    const registry = read("lib/zlife/modules.ts");
    expect(registry).toContain('"active" | "launch" | "development"');
    expect(registry).toContain('slug: "web-builder"');
    expect(registry).toContain('slug: "app-builder"');
    expect(registry.match(/status: "launch"/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("uses shared human-readable labels across module pages", () => {
    const registry = read("lib/zlife/modules.ts");
    const hub = read("app/modules/page.tsx");
    const detail = read("app/modules/[slug]/page.tsx");

    expect(registry).toContain('return "Launch Focus"');
    expect(registry).toContain('return "LAUNCHING"');
    expect(hub).toContain("zlifeModuleStatusLabel");
    expect(detail).toContain("zlifeModuleStatusLabel");
    expect(detail).toContain("First public launch path");
  });
});
