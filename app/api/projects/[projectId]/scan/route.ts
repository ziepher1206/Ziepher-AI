import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";
import { projectIdSchema } from "@/lib/domain/schemas";
import { scanWebsite } from "@/lib/site-scan";

export const runtime = "nodejs";

type Context = { params: Promise<{ projectId: string }> };

export async function POST(_request: Request, context: Context) {
  let projectId: string | undefined;
  let supabase: Awaited<ReturnType<typeof createClient>> | undefined;

  try {
    projectId = projectIdSchema.parse((await context.params).projectId);
    supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: project, error } = await supabase
      .from("projects")
      .select("id,source_domain,primary_domain")
      .eq("id", projectId)
      .single();

    if (error || !project) throw new Error("Website not found.");
    const domain = project.source_domain ?? project.primary_domain;
    if (!domain) throw new Error("Connect a source domain before scanning.");

    const { error: scanningError } = await supabase
      .from("projects")
      .update({ scan_status: "scanning" })
      .eq("id", projectId);
    if (scanningError) throw scanningError;

    const health = await scanWebsite(domain);
    const scannedAt = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from("projects")
      .update({
        scan_status: "complete",
        last_scanned_at: scannedAt,
        website_health: health
      })
      .eq("id", projectId)
      .select("id,scan_status,last_scanned_at,website_health")
      .single();

    if (updateError) throw updateError;
    return NextResponse.json({ project: updated, health });
  } catch (error) {
    if (supabase && projectId) {
      await supabase
        .from("projects")
        .update({ scan_status: "failed" })
        .eq("id", projectId);
    }
    return apiError(error, "Unable to scan website.");
  }
}
