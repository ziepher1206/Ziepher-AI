import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("project type labels", () => {
  it("labels saved projects as website or app without a schema migration", () => {
    const page = read("app/projects/page.tsx");

    expect(page).toContain("original_idea");
    expect(page).toContain("project type:\\s*app");
    expect(page).toContain('return /project type:');
    expect(page).toContain(' ? "App" : "Website"');
    expect(page).toContain("<span className=\"status-pill\">{type}</span>");
  });
});
