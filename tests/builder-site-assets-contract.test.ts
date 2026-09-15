import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_BUILD_SITE_ASSETS,
  MAX_BUILD_SITE_ASSET_BYTES,
  publicPathForSiteAsset
} from "../lib/ai/build-site-assets";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("builder packaged project-media contract", () => {
  it("uses stable local public paths instead of expiring storage URLs", () => {
    expect(publicPathForSiteAsset("11111111-1111-1111-1111-111111111111", "image/jpeg"))
      .toBe("/project-media/11111111-1111-1111-1111-111111111111.jpg");
    expect(MAX_BUILD_SITE_ASSETS).toBe(12);
    expect(MAX_BUILD_SITE_ASSET_BYTES).toBe(100 * 1024 * 1024);
  });

  it("packages approved site photos into the generated app public directory", () => {
    const files = read("lib/runner/files.ts");
    expect(files).toContain("loadBuildSiteAssets");
    expect(files).toContain("publicRoot");
    expect(files).toContain("download(asset.storagePath)");
    expect(files).toContain("writeFile(destination, bytes)");
  });

  it("teaches both generation and repair to preserve packaged media", () => {
    const prompts = read("lib/ai/build-prompts.ts");
    expect(prompts).toContain("APPROVED PROJECT MEDIA");
    expect(prompts).toContain("stable local application paths");
    expect(prompts).toContain("Do not reference storage-provider signed URLs");
    expect(prompts).toContain("Preserve references to approved packaged project media");
  });
});
