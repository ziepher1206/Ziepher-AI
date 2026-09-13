import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { recordOperateAuditEvent } from "@/lib/operate/audit";
import { requireWorkspaceAdmin } from "@/lib/operate/workspace-auth";

const createSchema = z.object({
  workspaceId: z.string().uuid(),
  resourceType: z.enum(["workspace", "crew"]),
  crewId: z.string().uuid().nullable().optional(),
  mode: z.enum(["open", "block"]),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  note: z.string().trim().max(500).optional().or(z.literal(""))
}).refine((value) => value.resourceType !== "crew" || !!value.crewId, {
  message: "Crew is required for a crew override."
}).refine((value) => new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(), {
  message: "End time must be later than start time."
});

const deleteSchema = z.object({
  workspaceId: z.string().uuid(),
  overrideId: z.string().uuid()
});

export async function POST(request: Request) {
  try {
    const input = createSchema.parse(await request.json());
    const { supabase, user } = await requireWorkspaceAdmin(input.workspaceId);

    const { data, error } = await supabase
      .from("schedule_overrides")
      .insert({
        workspace_id: input.workspaceId,
        resource_type: input.resourceType,
        resource_user_id: null,
        resource_crew_id: input.resourceType === "crew" ? input.crewId : null,
        mode: input.mode,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        note: input.note || null,
        created_by: user.id
      })
      .select("id,resource_type,resource_crew_id,mode,starts_at,ends_at,note")
      .single();
    if (error) throw error;
    await recordOperateAuditEvent({
      supabase,
      workspaceId: input.workspaceId,
      actorUserId: user.id,
      action: "schedule_override.created",
      entityType: "schedule_override",
      entityId: data.id,
      metadata: {
        resourceType: input.resourceType,
        crewId: input.crewId ?? null,
        mode: input.mode,
        startsAt: input.startsAt,
        endsAt: input.endsAt
      }
    });
    return NextResponse.json({ override: data }, { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to save schedule exception.");
  }
}

export async function DELETE(request: Request) {
  try {
    const input = deleteSchema.parse(await request.json());
    const { supabase, user } = await requireWorkspaceAdmin(input.workspaceId);

    const { data: existing, error: existingError } = await supabase
      .from("schedule_overrides")
      .select("id,resource_type,resource_crew_id,mode,starts_at,ends_at")
      .eq("workspace_id", input.workspaceId)
      .eq("id", input.overrideId)
      .maybeSingle();
    if (existingError) throw existingError;

    const { error } = await supabase
      .from("schedule_overrides")
      .delete()
      .eq("workspace_id", input.workspaceId)
      .eq("id", input.overrideId);
    if (error) throw error;
    await recordOperateAuditEvent({
      supabase,
      workspaceId: input.workspaceId,
      actorUserId: user.id,
      action: "schedule_override.deleted",
      entityType: "schedule_override",
      entityId: input.overrideId,
      metadata: existing ?? {}
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Unable to remove schedule exception.");
  }
}
