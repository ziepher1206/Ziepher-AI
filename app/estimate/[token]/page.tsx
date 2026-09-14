import { notFound } from "next/navigation";
import { PublicEstimateAccept } from "@/components/public-estimate-accept";
import { getPublicEstimate } from "@/lib/operate/public-estimate";

type Props = { params: Promise<{ token: string }> };

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function PublicEstimatePage({ params }: Props) {
  const { token } = await params;
  let estimate;
  try {
    estimate = await getPublicEstimate(token);
  } catch {
    notFound();
  }

  const accepted = estimate.status === "accepted" || Boolean(estimate.acceptedAt);
  return (
    <main className="projects-page" style={{ maxWidth: 900, margin: "0 auto" }}>
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">{estimate.businessName}</div><div className="brand-subtitle">ESTIMATE · POWERED BY ZIEPHER</div></div></div>
      </header>
      <section style={{ display: "grid", gap: 20 }}>
        <article className="auth-card" style={{ maxWidth: "none" }}>
          <p className="panel-label">Estimate for {estimate.customerName}</p>
          <h1 style={{ margin: "6px 0 8px" }}>{estimate.title}</h1>
          {estimate.propertyAddress ? <p className="auth-copy" style={{ marginTop: 0 }}>{estimate.propertyAddress}</p> : null}
          {estimate.validUntil ? <p className="auth-copy">Valid through {new Date(`${estimate.validUntil}T12:00:00`).toLocaleDateString()}</p> : null}
          <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
            {estimate.items.map((item, index) => (
              <div key={`${item.description}-${index}`} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.09)" }}>
                <div><strong>{item.description}</strong><div className="auth-copy" style={{ fontSize: 13 }}>{Number(item.quantity)} × {money(item.unitPriceCents)}</div></div>
                <strong>{money(item.lineTotalCents)}</strong>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gap: 6, marginTop: 22, justifyContent: "end", minWidth: 260 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 40 }}><span>Subtotal</span><strong>{money(estimate.subtotalCents)}</strong></div>
            {estimate.taxCents ? <div style={{ display: "flex", justifyContent: "space-between", gap: 40 }}><span>Tax</span><strong>{money(estimate.taxCents)}</strong></div> : null}
            {estimate.discountCents ? <div style={{ display: "flex", justifyContent: "space-between", gap: 40 }}><span>Discount</span><strong>−{money(estimate.discountCents)}</strong></div> : null}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 40, fontSize: 22, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.18)" }}><span>Total</span><strong>{money(estimate.totalCents)}</strong></div>
          </div>
          {estimate.photos.length ? (
            <div style={{ marginTop: 22 }}>
              <p className="panel-label">Site photos</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
                {estimate.photos.map((photo) => (
                  <figure key={photo.id} className="project-card" style={{ minHeight: 0, margin: 0, padding: 10 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.caption || photo.displayName} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 10 }} />
                    <figcaption className="auth-copy" style={{ marginTop: 8, fontSize: 13 }}>{photo.caption || photo.category.replaceAll("_", " ")}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ) : null}
          {estimate.notes ? <div style={{ marginTop: 22 }}><p className="panel-label">Notes</p><p className="auth-copy" style={{ whiteSpace: "pre-wrap" }}>{estimate.notes}</p></div> : null}
        </article>
        <article className="auth-card" style={{ maxWidth: "none" }}>
          <h2 style={{ marginTop: 0 }}>{accepted ? "Estimate accepted" : "Approve this estimate"}</h2>
          <p className="auth-copy">{accepted ? "The business has your approval and can move this estimate into scheduling." : "Accepting confirms approval of the scope and price shown above. Payment is not collected on this page."}</p>
          <PublicEstimateAccept token={token} disabled={accepted} />
          {(estimate.businessPhone || estimate.businessEmail) ? <p className="auth-copy" style={{ marginBottom: 0 }}>Questions? {estimate.businessPhone ? `Call ${estimate.businessPhone}` : ""}{estimate.businessPhone && estimate.businessEmail ? " · " : ""}{estimate.businessEmail ? estimate.businessEmail : ""}</p> : null}
        </article>
      </section>
    </main>
  );
}
