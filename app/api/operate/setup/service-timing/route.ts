import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { recordOperateAuditEvent } from "@/lib/operate/audit";
import { requireWorkspaceAdmin } from "@/lib/operate/workspace-auth";

const schema = z.object({
  workspaceId: z.string().uuid(),
  serviceId: z.string().uuid(),
  defaultDurationMinutes: z.number().int().min(15).max(1440).nullable(),
  travelBufferMinutes: z.number().int().min(0).max(240),
  preparationBufferMinutes: z.number().int().min(0).max(240),
  cleanupBufferMinutes: z.number().int().min(0).max(240)
});

export async function PATCH(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const { supabase, user } = await requireWorkspaceAdmin(input.workspaceId);
    const { data, error } = await supabase
      .from("services")
      .update({
        default_duration_minutes: input.defaultDurationMinutes,
        travel_buffer_minutes: input.travelBufferMinutes,
        preparation_buffer_minutes: input.preparationBufferMinutes,
        cleanup_buffer_minutes: input.cleanupBufferMinutes,
        updated_at: new Date().toISOString()
      })
      .eq("workspace_id", input.workspaceId)
      .eq("id", input.serviceId)
      .select("id,name,default_duration_minutes,travel_buffer_minutes,preparation_buffer_minutes,cleanup_buffer_minutes")
      .single();
    if (error) throw error;

    await recordOperateAuditEvent({
      supabase,
      workspaceId: input.workspaceId,
      actorUserId: user.id,
      action: "service.scheduling_buffers_updated",
      entityType: "service",
      entityId: input.serviceId,
      metadata: {
        durationMinutes: data.default_duration_minutes,
        travelBufferMinutes: data.travel_buffer_minutes,
        preparationBufferMinutes: data.preparation_buffer_minutes,
        cleanupBufferMinutes: data.cleanup_buffer_minutes
      }
    });

    return NextResponse.json({ service: data });
  } catch (error) {
    return apiError(error, "Unable to update service scheduling buffers.");
  }
}
