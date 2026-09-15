import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { createZiepherMatchHandoffPreview } from "@/lib/services/ziepher-match-contract";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const requestIdSchema = z.string().uuid();

export default async function ServiceMatchPreviewPage({ params }: { params: Promise<{ requestId: string }> }) {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const requestId = requestIdSchema.parse((await params).requestId);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const { data: serviceRequest, error } = await supabase
    .from("service_requests")
    .select("id,category,title,description,service_address,existing_relationship,status")
    .eq("id", requestId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw error;
  if (!serviceRequest) notFound();

  const preview = createZiepherMatchHandoffPreview({
    id: serviceRequest.id,
    category: serviceRequest.category,
    title: serviceRequest.title,
    description: serviceRequest.description,
    serviceAddress: serviceRequest.service_address,
    existingRelationship: serviceRequest.existing_relationship,
  });

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">Z-LIFE</div><div className="brand-subtitle">SERVICES · MATCH HANDOFF PREVIEW</div></div></div>
        <div className="inline-actions"><Link className="button" href="/services">Back to Services</Link><Link className="button" href="/modules/services">About module</Link></div>
      </header>
      <section style={{ display: "grid", gap: 22, maxWidth: 960 }}>
        <div>
          <p className="panel-label">Deterministic boundary preview</p>
          <h1 style={{ margin: "6px 0 8px" }}>See exactly what ZLife would hand to Ziepher Match.</h1>
          <p className="auth-copy" style={{ maxWidth: 820, margin: 0 }}>This page builds the provider payload locally from your workspace record. It does not call Ziepher Match, contact a business, schedule an inspection, or create a billable event.</p>
        </div>
        <section className="auth-card" style={{ maxWidth: "none" }}>
          <p className="panel-label">Request</p><h2 style={{ margin: "6px 0 10px" }}>{preview.request.title}</h2>
          <div style={{ display: "grid", gap: 10 }}>
            <div className="project-card" style={{ minHeight: 0 }}><strong>Category</strong><p>{preview.request.category}</p></div>
            <div className="project-card" style={{ minHeight: 0 }}><strong>Service address</strong><p>{preview.request.serviceAddress || "Not provided"}</p></div>
            <div className="project-card" style={{ minHeight: 0 }}><strong>Description</strong><p>{preview.request.description || "No extra details"}</p></div>
          </div>
        </section>
        <section className="auth-card" style={{ maxWidth: "none" }}>
          <p className="panel-label">Safety contract</p><h2 style={{ margin: "6px 0 12px" }}>All external effects remain disabled.</h2>
          <div className="project-grid" style={{ marginTop: 0 }}>
            <article className="project-card"><strong>Marketplace dispatch</strong><p>Blocked in preview</p></article>
            <article className="project-card"><strong>Inspection scheduling</strong><p>Blocked in preview</p></article>
            <article className="project-card"><strong>Billable event</strong><p>Not confirmed</p></article>
            <article className="project-card"><strong>Existing relationship</strong><p>{preview.protections.existingRelationship ? "Flagged for protection" : "Not currently flagged"}</p></article>
          </div>
        </section>
        <section className="project-card"><p className="panel-label">Contract version</p><h2>{preview.version}</h2><p>A future live adapter must accept this normalized request shape and return provider identifiers and marketplace status without granting ZLife direct access to Ziepher Match&apos;s internal database.</p></section>
      </section>
    </main>
  );
}
