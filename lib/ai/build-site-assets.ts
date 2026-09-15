import { createAdminClient } from "@/lib/supabase/admin";

export type BuildSiteAsset = {
  id: string;
  name: string;
  mimeType: string;
  storageBucket: string;
  storagePath: string;
  publicPath: string;
  summary?: string | null;
  tags?: string[] | null;
  sizeBytes?: number | null;
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

function originalSizeBytes(provenance: unknown) {
  if (
    provenance &&
    typeof provenance === "object" &&
    "original_size_bytes" in provenance &&
    typeof provenance.original_size_bytes === "number" &&
    Number.isFinite(provenance.original_size_bytes)
  ) {
    return Math.max(0, provenance.original_size_bytes);
  }
  return null;
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return null;
  const tags = value.filter((item): item is string => typeof item === "string").slice(0, 12);
  return tags.length ? tags : null;
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

export async function loadBuildSiteAssets(projectId: string) {
  const supabase = createAdminClient();
  const { data: assets, error } = await supabase
    .from("media_assets")
    .select("id,display_name,mime_type,storage_bucket,storage_path,provenance,ai_tags,ai_summary,created_at")
    .eq("project_id", projectId)
    .eq("usage_status", "available")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const selected: BuildSiteAsset[] = [];
  let knownBytes = 0;

  for (const asset of assets ?? []) {
    if (selected.length >= MAX_BUILD_SITE_ASSETS) break;
    if (!isSitePhotoPurpose(asset.provenance)) continue;
    if (
      typeof asset.id !== "string" ||
      typeof asset.mime_type !== "string" ||
      !asset.mime_type.toLowerCase().startsWith("image/") ||
      typeof asset.storage_bucket !== "string" ||
      typeof asset.storage_path !== "string"
    ) {
      continue;
    }

    const sizeBytes = originalSizeBytes(asset.provenance);
    if (sizeBytes !== null && knownBytes + sizeBytes > MAX_BUILD_SITE_ASSET_BYTES) continue;
    if (sizeBytes !== null) knownBytes += sizeBytes;

    selected.push({
      id: asset.id,
      name: asset.display_name ?? "Project photo",
      mimeType: asset.mime_type,
      storageBucket: asset.storage_bucket,
      storagePath: asset.storage_path,
      publicPath: publicPathForSiteAsset(asset.id, asset.mime_type),
      summary: typeof asset.ai_summary === "string" ? asset.ai_summary : null,
      tags: normalizeTags(asset.ai_tags),
      sizeBytes
    });
  }

  return selected;
}
