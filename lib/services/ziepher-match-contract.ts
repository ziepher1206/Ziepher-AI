export const ZIEPHER_MATCH_HANDOFF_VERSION = "zlife-services-v1" as const;

export type ZLifeServiceRequestForMatch = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  serviceAddress: string | null;
  existingRelationship: boolean;
};

export type ZiepherMatchHandoffPreview = {
  version: typeof ZIEPHER_MATCH_HANDOFF_VERSION;
  source: "zlife_services";
  zlifeRequestId: string;
  request: {
    category: string;
    title: string;
    description: string | null;
    serviceAddress: string | null;
  };
  protections: {
    existingRelationship: boolean;
    marketplaceDispatchAllowed: false;
    inspectionSchedulingAllowed: false;
    billableEventConfirmed: false;
  };
};

export function createZiepherMatchHandoffPreview(
  input: ZLifeServiceRequestForMatch,
): ZiepherMatchHandoffPreview {
  return {
    version: ZIEPHER_MATCH_HANDOFF_VERSION,
    source: "zlife_services",
    zlifeRequestId: input.id,
    request: {
      category: input.category.trim(),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      serviceAddress: input.serviceAddress?.trim() || null,
    },
    protections: {
      existingRelationship: input.existingRelationship,
      marketplaceDispatchAllowed: false,
      inspectionSchedulingAllowed: false,
      billableEventConfirmed: false,
    },
  };
}
