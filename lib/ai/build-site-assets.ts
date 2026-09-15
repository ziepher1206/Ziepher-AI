export type BuildSiteAsset = {
  id: string;
  name: string;
  mimeType: string;
  storageBucket: string;
  storagePath: string;
  publicPath: string;
  summary?: string | null;
  tags?: string[] | null;
};

export const MAX_BUILD_SITE_ASSETS = 12;
export const MAX_BUILD_SITE_ASSET_BYTES = 100 * 1024 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif"
};

export function isSitePhotoPurpose(provenance: unknown) {
  return Boolean(
    provenance &&
      typeof provenance === "object" &&
      "purpose" in provenance &&
      provenance.purpose === "site_photo"
  );
}

export function extensionForSiteAsset(mimeType: string) {
  return EXTENSION_BY_MIME[mimeType.toLowerCase()] ?? "bin";
}

export function publicPathForSiteAsset(id: string, mimeType: string) {
  return `/project-media/${id}.${extensionForSiteAsset(mimeType)}`;
}

export function formatSiteAssetManifest(assets: BuildSiteAsset[]) {
  if (!assets.length) return "No approved project photos were packaged for this build.";

  return assets
    .map((asset, index) => {
      const context = [
        asset.summary ? `summary: ${asset.summary}` : null,
        asset.tags?.length ? `tags: ${asset.tags.join(", ")}` : null
      ]
        .filter(Boolean)
        .join("; ");
      return `${index + 1}. ${asset.name} -> ${asset.publicPath}${context ? ` (${context})` : ""}`;
    })
    .join("\n");
}
