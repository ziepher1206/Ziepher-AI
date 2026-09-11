import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { normalizeSourceArchiveEntry } from "../lib/source-control/source-archive";

describe("source archive validation", () => {
  it("normalizes tar root prefixes", () => {
    expect(normalizeSourceArchiveEntry("./app/page.tsx")).toBe("app/page.tsx");
    expect(normalizeSourceArchiveEntry("./app/")).toBe("app");
    expect(normalizeSourceArchiveEntry("./")).toBe("");
  });

  it("rejects traversal, absolute paths, backslashes, and control characters", () => {
    expect(() => normalizeSourceArchiveEntry("../secret")).toThrow("Unsafe source archive path");
    expect(() => normalizeSourceArchiveEntry("/etc/passwd")).toThrow("Unsafe source archive path");
    expect(() => normalizeSourceArchiveEntry("app\\page.tsx")).toThrow("Unsafe source archive path");
    expect(() => normalizeSourceArchiveEntry("app/evil\nname.tsx")).toThrow("Unsafe source archive path");
  });
});
