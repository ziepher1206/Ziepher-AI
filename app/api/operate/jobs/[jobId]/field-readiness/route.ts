import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";

const equipmentValues = ["chipper", "bucket_truck", "crane", "stump_grinder", "mini_skid", "trailer", "climbing_gear", "traffic_control"] as const;

const schema = z.object({
  accessNotes: z.string().max(4000).nullable().optional(),
  hazardNotes: z.string().max(4000).nullable().optional(),
  treeNotes: z.string().max(8000).nullable().optional(),
  jobNotes: z.string().max(8000).nullable().optional(),
  requiredEquipment: z.array(z.enum(equipmentValues)).max(equipmentValues.length).optional(),
  powerLineHazard: z.boolean().optional(),
  trafficControlRequired: z.boolean().optional(),
  structureRisk: z.boolean().optional(),
  weatherSensitive: z.boolean().optional(),
  completionWorkVerified: z.boolean().optional(),
  completionCleanupVerified: z.boolean().optional(),
  completionNotes: z.string().max(4000).nullable().optional()
});

type Props = { params: Promise<{ jobId: string }> };

export async function POST(request: Request, { params }: Props) {
  try {
    const { jobId } = await params;
    const input = schema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id,workspace_id,property_id,status")
      .eq("id", jobId)
      .single();
    if (jobError) throw jobError;
    if (["completed", "canceled"].includes(job.status)) throw new Error("This job can no longer be edited.");

    const jobUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.jobNotes !== undefined) jobUpdate.description = input.jobNotes?.trim() || null;
    if (input.requiredEquipment !== undefined) jobUpdate.required_equipment = input.requiredEquipment;
    if (input.powerLineHazard !== undefined) jobUpdate.power_line_hazard = input.powerLineHazard;
    if (input.trafficControlRequired !== undefined) jobUpdate.traffic_control_required = input.trafficControlRequired;
    if (input.structureRisk !== undefined) jobUpdate.structure_risk = input.structureRisk;
    if (input.weatherSensitive !== undefined) jobUpdate.weather_sensitive = input.weatherSensitive;
    if (input.completionWorkVerified !== undefined) jobUpdate.completion_work_verified = input.completionWorkVerified;
    if (input.completionCleanupVerified !== undefined) jobUpdate.completion_cleanup_verified = input.completionCleanupVerified;
    if (input.completionNotes !== undefined) jobUpdate.completion_notes = input.completionNotes?.trim() || null;

    if (Object.keys(jobUpdate).length > 1) {
      const { error } = await supabase
        .from("jobs")
        .update(jobUpdate)
        .eq("id", job.id)
        .eq("workspace_id", job.workspace_id);
      if (error) throw error;
    }

    if (job.property_id && (input.accessNotes !== undefined || input.hazardNotes !== undefined || input.treeNotes !== undefined)) {
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.accessNotes !== undefined) update.access_notes = input.accessNotes?.trim() || null;
      if (input.hazardNotes !== undefined) update.hazard_notes = input.hazardNotes?.trim() || null;
      if (input.treeNotes !== undefined) {
        const { data: property, error: propertyError } = await supabase
          .from("properties")
          .select("tree_notes")
          .eq("id", job.property_id)
          .eq("workspace_id", job.workspace_id)
          .single();
        if (propertyError) throw propertyError;
        const existing = property?.tree_notes && typeof property.tree_notes === "object" && !Array.isArray(property.tree_notes)
          ? property.tree_notes as Record<string, unknown>
          : {};
        const value = input.treeNotes?.trim();
        update.tree_notes = { ...existing, summary: value || "" };
      }
      const { error } = await supabase
        .from("properties")
        .update(update)
        .eq("id", job.property_id)
        .eq("workspace_id", job.workspace_id);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Unable to update field information.");
  }
}
