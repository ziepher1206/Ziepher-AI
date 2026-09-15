export type BuildReferenceImage = {
  name: string;
  mimeType: string;
  url: string;
  purpose: "design_reference";
};

export const MAX_BUILD_REFERENCE_IMAGES = 4;

const SUPPORTED_VISION_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

export function canSendReferenceImageToBuildModel(mimeType: string) {
  return SUPPORTED_VISION_TYPES.has(mimeType.toLowerCase());
}
