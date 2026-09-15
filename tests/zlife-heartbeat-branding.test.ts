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

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
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
    const heartbeat = read("components/zlife-heartbeat.tsx");
    expect(heartbeat).toContain('viewBox="0 0 64 24"');
    expect(heartbeat).toContain('d="M1 12h12l5-9 7 18 7-17 6 14 5-6h20"');
  });

  it("uses the shared heartbeat in the module hub brand lockup", () => {
    const hub = read("app/modules/page.tsx");
    expect(hub).toContain('import { ZLifeHeartbeat } from "@/components/zlife-heartbeat"');
    expect(hub).toContain('<ZLifeHeartbeat width={34} height={13} />');
  });

  it("keeps the shared ECG heartbeat on major branded Z-Life surfaces", () => {
    const brandedSurfaces = [
      "components/zlife-public-shell.tsx",
      "components/zlife-mobile-bottom-nav.tsx",
      "app/modules/page.tsx",
      "app/modules/[slug]/page.tsx",
      "app/dashboard/page.tsx",
      "app/dashboard/modules/page.tsx",
      "app/assistant/page.tsx",
      "app/operate/page.tsx",
      "app/operate/setup/page.tsx",
      "app/today/page.tsx",
      "app/community/page.tsx",
      "app/community/join/page.tsx",
      "app/community/review/page.tsx",
      "app/community/review/rereview/page.tsx",
      "app/community/value/page.tsx"
    ];

    const missing = brandedSurfaces.filter((path) => !read(path).includes("ZLifeHeartbeat"));
    expect(missing, `Shared heartbeat missing from: ${missing.join(", ")}`).toEqual([]);
  });
});
