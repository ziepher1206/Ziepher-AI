import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Operate setup schema contract", () => {
  it("keeps insurance status schema aligned with setup reads and writes", () => {
    const migration = read("supabase/migrations/20260914024500_business_insurance_status.sql");
    const setupPage = read("app/operate/setup/page.tsx");
    const profileRoute = read("app/api/operate/setup/business-profile/route.ts");

    expect(migration).toContain("add column if not exists insurance_status text not null default 'not_provided'");
    expect(migration).toContain("'insured', 'not_insured', 'not_provided'");
    expect(setupPage).toContain("insurance_status");
    expect(profileRoute).toContain("insurance_status: input.insuranceStatus");
    expect(profileRoute).toContain("insuranceStatus: data.insurance_status");
  });
});
