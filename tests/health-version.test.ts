import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("health endpoint version", () => {
  it("reports the package version instead of a stale hard-coded fallback", () => {
    const route = read("app/api/health/route.ts");
    const packageJson = JSON.parse(read("package.json")) as { version: string };

    expect(route).toContain('import packageJson from "@/package.json";');
    expect(route).toContain("version: packageJson.version");
    expect(route).not.toContain('?? "0.4.0"');
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
