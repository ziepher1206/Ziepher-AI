import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OperateEstimateEditor } from "@/components/operate-estimate-editor";
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
    .select("id,title,notes,status,tax_cents,discount_cents,subtotal_cents,total_cents,valid_until,scheduled_at,customers(display_name,email,phone),properties(address_line_1,city,region,postal_code)")
    .eq("id", estimateId)
    .maybeSingle();
  if (error) throw error;
  if (!estimate) notFound();

  const { data: items, error: itemsError } = await supabase
    .from("estimate_line_items")
    .select("description,quantity,unit_price_cents,position")
    .eq("estimate_id", estimateId)
    .order("position", { ascending: true });
  if (itemsError) throw itemsError;

  const customer = Array.isArray(estimate.customers) ? estimate.customers[0] : estimate.customers;
  const property = Array.isArray(estimate.properties) ? estimate.properties[0] : estimate.properties;

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
          items={(items ?? []).map((item) => ({ description: item.description, quantity: Number(item.quantity), unitPriceCents: item.unit_price_cents }))}
        />
      </section>
    </main>
  );
}
