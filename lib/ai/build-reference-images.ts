import { createAdminClient } from "@/lib/supabase/admin";

export type BuildReferenceImage = {
  name: string;
  mimeType: string;
  url: string;
  purpose: "design_reference";
};

export const MAX_BUILD_REFERENCE_IMAGES = 4;
const REFERENCE_URL_TTL_SECONDS = 15 * 60;

const SUPPORTED_VISION_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

export function canSendReferenceImageToBuildModel(mimeType: string) {
  return SUPPORTED_VISION_TYPES.has(mimeType.toLowerCase());
}

export async function loadBuildReferenceImages(projectId: string) {
  const supabase = createAdminClient();
  const { data: assets, error } = await supabase
    .from("media_assets")
    .select("display_name,mime_type,storage_bucket,storage_path,provenance,created_at")
    .eq("project_id", projectId)
    .eq("usage_status", "available")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;

  const references = (assets ?? [])
    .filter((asset) => {
      const provenance = asset.provenance;
      return (
        provenance &&
        typeof provenance === "object" &&
        "purpose" in provenance &&
        provenance.purpose === "design_reference" &&
        typeof asset.mime_type === "string" &&
        canSendReferenceImageToBuildModel(asset.mime_type)
      );
    })
    .slice(0, MAX_BUILD_REFERENCE_IMAGES);

  const signed = await Promise.all(
    references.map(async (asset) => {
      if (!asset.storage_bucket || !asset.storage_path || !asset.mime_type) return null;
      const { data, error: signedError } = await supabase.storage
        .from(asset.storage_bucket)
        .createSignedUrl(asset.storage_path, REFERENCE_URL_TTL_SECONDS);
      if (signedError || !data?.signedUrl) return null;

      return {
        name: asset.display_name ?? "Design reference",
        mimeType: asset.mime_type,
        url: data.signedUrl,
        purpose: "design_reference" as const
      };
    })
  );

  return signed.filter((item): item is BuildReferenceImage => Boolean(item));
}
