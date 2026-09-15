import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { createZiepherMatchHandoffPreview } from "@/lib/services/ziepher-match-contract";

const previewPage = readFileSync("app/services/[requestId]/match-preview/page.tsx", "utf8");
const servicesPage = readFileSync("app/services/page.tsx", "utf8");
const contract = readFileSync("lib/services/ziepher-match-contract.ts", "utf8");

describe("ZLife Services Ziepher Match handoff preview", () => {
  it("normalizes a versioned handoff without enabling external effects", () => {
    expect(createZiepherMatchHandoffPreview({
      id: "request-1",
      category: " Tree Service ",
      title: " Remove limb ",
      description: " Storm damage ",
      serviceAddress: " 123 Main St ",
      existingRelationship: true,
    })).toEqual({
      version: "zlife-services-v1",
      source: "zlife_services",
      zlifeRequestId: "request-1",
      request: {
        category: "Tree Service",
        title: "Remove limb",
        description: "Storm damage",
        serviceAddress: "123 Main St",
      },
      protections: {
        existingRelationship: true,
        marketplaceDispatchAllowed: false,
        inspectionSchedulingAllowed: false,
        billableEventConfirmed: false,
      },
    });
  });

  it("keeps the contract provider-neutral and network-free", () => {
    expect(contract).not.toContain("fetch(");
    expect(contract).not.toContain("axios");
    expect(contract).not.toContain("STRIPE");
    expect(contract).not.toContain("TWILIO");
    expect(contract).toContain("marketplaceDispatchAllowed: false");
    expect(contract).toContain("inspectionSchedulingAllowed: false");
    expect(contract).toContain("billableEventConfirmed: false");
  });

  it("requires auth and workspace ownership before previewing a request", () => {
    expect(previewPage).toContain('redirect("/auth/sign-in")');
    expect(previewPage).toContain("supabase.auth.getUser()");
    expect(previewPage).toContain('.eq("workspace_id", workspaceId)');
    expect(previewPage).toContain("createZiepherMatchHandoffPreview");
  });

  it("states that preview is not dispatch, scheduling, or billing", () => {
    expect(previewPage).toContain("does not call Ziepher Match, contact a business, schedule an inspection, or create a billable event");
    expect(previewPage).toContain("Marketplace dispatch");
    expect(previewPage).toContain("Blocked in preview");
    expect(servicesPage).toContain("Preview Match handoff");
  });
});
