import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicEstimateItem = {
  description: string;
  quantity: number | string;
  unitPriceCents: number;
  lineTotalCents: number;
};

export type PublicEstimatePhoto = {
  id: string;
  category: string;
  caption: string | null;
  displayName: string;
  url: string;
};

export type PublicEstimatePayload = {
  estimateId: string;
  title: string;
  notes: string | null;
  status: string;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  validUntil: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  customerName: string;
  propertyAddress: string | null;
  businessName: string;
  businessPhone: string | null;
  businessEmail: string | null;
  items: PublicEstimateItem[];
  photos: PublicEstimatePhoto[];
};

export async function getPublicEstimate(token: string): Promise<PublicEstimatePayload> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_public_operate_estimate", { p_token: token });
  if (error || !data) throw error ?? new Error("Estimate unavailable.");

  const payload = data as Omit<PublicEstimatePayload, "photos">;
  const { data: media, error: mediaError } = await supabase
    .from("operate_estimate_media")
    .select("id,category,caption,display_name,storage_bucket,storage_path")
    .eq("estimate_id", payload.estimateId)
    .order("created_at", { ascending: true });
  if (mediaError) throw mediaError;

  const photos = await Promise.all((media ?? []).map(async (item) => {
    const { data: signed, error: signError } = await supabase.storage
      .from(item.storage_bucket)
      .createSignedUrl(item.storage_path, 60 * 15);
    if (signError || !signed?.signedUrl) return null;
    return {
      id: item.id,
      category: item.category,
      caption: item.caption,
      displayName: item.display_name,
      url: signed.signedUrl
    } satisfies PublicEstimatePhoto;
  }));

  return { ...payload, photos: photos.filter((photo): photo is PublicEstimatePhoto => photo !== null) };
}

export async function acceptPublicEstimate(token: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("accept_public_operate_estimate", { p_token: token });
  if (error || !data) throw error ?? new Error("Estimate acceptance failed.");
  return data as string;
}
