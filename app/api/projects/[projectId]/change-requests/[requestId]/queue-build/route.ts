import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { projectIdSchema } from "@/lib/domain/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const requestIdSchema = z.string().uuid();
type Context = { params: Promise<{ projectId: string; requestId: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    if (process.env.SITE_REFINER_PAID_BUILDS_ENABLED !== "true") {
      throw new Error(
        "AI build execution is disabled by the SiteRefiner owner. No build credits or provider usage were started."
      );
    }

    const params = await context.params;
    const projectId = projectIdSchema.parse(params.projectId);
    const requestId = requestIdSchema.parse(params.requestId);
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single();
    if (projectError || !project) throw new Error("Project not found.");

    const admin = createAdminClient();
    const { data: changeRequest, error: requestError } = await admin
      .from("site_change_requests")
      .select("id,status,spec_version_id,build_job_id,change_metadata")
      .eq("id", requestId)
      .eq("project_id", projectId)
      .single();
    if (requestError || !changeRequest) throw new Error("Change request not found.");
    if (changeRequest.build_job_id) {
      return NextResponse.json({
        changeRequest: {
          id: changeRequest.id,
          status: changeRequest.status,
          buildJobId: changeRequest.build_job_id
        }
      });
    }
    if (changeRequest.status !== "proposal_ready" || !changeRequest.spec_version_id) {
      throw new Error("A generated proposal must be ready before a build can be approved.");
    }

    const { error: approvalError } = await supabase.rpc("approve_project_spec", {
      p_project_id: projectId,
      p_spec_version_id: changeRequest.spec_version_id
    });
    if (approvalError) throw approvalError;

    const { data: buildJobId, error: buildError } = await supabase.rpc(
      "queue_build_job",
      {
        p_project_id: projectId,
        p_spec_version_id: changeRequest.spec_version_id,
        p_quality_mode: "balanced"
      }
    );
    if (buildError) throw buildError;

    const existingMetadata =
      changeRequest.change_metadata && typeof changeRequest.change_metadata === "object"
        ? changeRequest.change_metadata
        : {};

    const { data: updated, error: updateError } = await admin
      .from("site_change_requests")
      .update({
        status: "build_queued",
        build_job_id: buildJobId,
        change_metadata: {
          ...existingMetadata,
          build_quality_mode: "balanced",
          build_approved_by: user.id,
          build_approved_at: new Date().toISOString()
        }
      })
      .eq("id", requestId)
      .eq("project_id", projectId)
      .select("id,status,spec_version_id,build_job_id")
      .single();
    if (updateError) throw updateError;

    return NextResponse.json({ changeRequest: updated }, { status: 202 });
  } catch (error) {
    return apiError(error, "Unable to approve and queue the SiteRefiner build.");
  }
}
