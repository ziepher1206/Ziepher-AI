import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const roots = ["app", "components", "lib"];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".md"]);

function extension(path: string) {
  const index = path.lastIndexOf(".");
  return index === -1 ? "" : path.slice(index);
}

function filesUnder(path: string): string[] {
  return readdirSync(path).flatMap((name) => {
    const full = join(path, name);
    const stats = statSync(full);
    if (stats.isDirectory()) return filesUnder(full);
    return sourceExtensions.has(extension(full)) ? [full] : [];
  });
}

describe("Z-Life heartbeat branding", () => {
  it("uses the ECG heartbeat instead of the legacy text pulse everywhere", () => {
    const offenders = roots
      .flatMap((root) => filesUnder(join(process.cwd(), root)))
      .filter((file) => readFileSync(file, "utf8").includes("⌁"))
      .map((file) => relative(process.cwd(), file));

    expect(offenders, `Legacy pulse remains in: ${offenders.join(", ")}`).toEqual([]);
  });

  it("keeps one shared SVG heartbeat component", () => {
    const heartbeat = readFileSync(join(process.cwd(), "components/zlife-heartbeat.tsx"), "utf8");
    expect(heartbeat).toContain('viewBox="0 0 64 24"');
    expect(heartbeat).toContain('d="M1 12h12l5-9 7 18 7-17 6 14 5-6h20"');
  });

  it("uses the shared heartbeat in the module hub brand lockup", () => {
    const hub = readFileSync(join(process.cwd(), "app/modules/page.tsx"), "utf8");
    expect(hub).toContain('import { ZLifeHeartbeat } from "@/components/zlife-heartbeat"');
    expect(hub).toContain('<ZLifeHeartbeat width={34} height={13} />');
  });
});
