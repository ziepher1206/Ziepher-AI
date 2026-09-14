import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OperateEstimateEditor } from "@/components/operate-estimate-editor";
import { OperateEstimatePhotoUpload } from "@/components/operate-estimate-photo-upload";
import { OperateEstimateShareLink } from "@/components/operate-estimate-share-link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

type Props = { params: Promise<{ estimateId: string }> };

export default async function OperateEstimatePage({ params }: Props) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  const { estimateId } = await params;

  const { data: estimate, error } = await supabase
    .from("estimates")
    .select("id,workspace_id,property_id,title,notes,status,tax_cents,discount_cents,subtotal_cents,total_cents,valid_until,scheduled_at,customers(display_name,email,phone),properties(address_line_1,city,region,postal_code)")
    .eq("id", estimateId)
    .maybeSingle();
  if (error) throw error;
  if (!estimate) notFound();

  const [
    { data: items, error: itemsError },
    { data: media, error: mediaError }
  ] = await Promise.all([
    supabase
      .from("estimate_line_items")
      .select("description,quantity,unit_price_cents,position")
      .eq("estimate_id", estimateId)
      .order("position", { ascending: true }),
    supabase
      .from("operate_estimate_media")
      .select("id,category,caption,display_name,storage_bucket,storage_path,created_at")
      .eq("workspace_id", estimate.workspace_id)
      .eq("estimate_id", estimateId)
      .order("created_at", { ascending: true })
  ]);
  if (itemsError) throw itemsError;
  if (mediaError) throw mediaError;

  const photos = await Promise.all((media ?? []).map(async (photo) => {
    const { data: signed } = await supabase.storage.from(photo.storage_bucket).createSignedUrl(photo.storage_path, 60 * 15);
    return signed?.signedUrl ? {
      id: photo.id,
      url: signed.signedUrl,
      category: photo.category,
      caption: photo.caption,
      displayName: photo.display_name
    } : null;
  }));

  const customer = Array.isArray(estimate.customers) ? estimate.customers[0] : estimate.customers;
  const property = Array.isArray(estimate.properties) ? estimate.properties[0] : estimate.properties;
  const shareClosed = ["accepted", "declined", "expired", "canceled"].includes(estimate.status);
  const estimateItems = (items ?? []).map((item) => ({ description: item.description, quantity: Number(item.quantity), unitPriceCents: item.unit_price_cents }));

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">ZIEPHER</div><div className="brand-subtitle">ESTIMATE</div></div></div>
        <div className="inline-actions"><Link className="button" href="/operate/estimates">All estimates</Link><Link className="button" href="/operate">Dashboard</Link></div>
      </header>
      <section style={{ display: "grid", gap: 22 }}>
        <div>
          <p className="panel-label">{customer?.display_name ?? "Customer"}</p>
          <h1 style={{ margin: "6px 0 8px" }}>{estimate.title}</h1>
          <p className="auth-copy" style={{ margin: 0 }}>
            {[property?.address_line_1, property?.city, property?.region, property?.postal_code].filter(Boolean).join(", ") || "Property address not added"}
            {estimate.scheduled_at ? ` · ${new Date(estimate.scheduled_at).toLocaleString()}` : ""}
          </p>
        </div>
        <OperateEstimateEditor
          estimateId={estimate.id}
          status={estimate.status}
          notes={estimate.notes ?? ""}
          taxCents={estimate.tax_cents ?? 0}
          discountCents={estimate.discount_cents ?? 0}
          validUntil={estimate.valid_until}
          items={estimateItems}
        />
        <OperateEstimatePhotoUpload
          workspaceId={estimate.workspace_id}
          estimateId={estimate.id}
          propertyId={estimate.property_id}
          photos={photos.filter((photo): photo is NonNullable<typeof photo> => photo !== null)}
        />
        <OperateEstimateShareLink estimateId={estimate.id} disabled={shareClosed || (estimate.total_cents ?? 0) <= 0} />
      </section>
    </main>
  );
}
