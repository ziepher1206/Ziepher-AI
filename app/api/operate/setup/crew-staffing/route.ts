import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { recordOperateAuditEvent } from "@/lib/operate/audit";
import { requireWorkspaceAdmin } from "@/lib/operate/workspace-auth";

const inputSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("assign_member"),
    workspaceId: z.string().uuid(),
    crewId: z.string().uuid(),
    userId: z.string().uuid(),
    isLead: z.boolean().default(false)
  }),
  z.object({
    action: z.literal("remove_member"),
    workspaceId: z.string().uuid(),
    crewId: z.string().uuid(),
    userId: z.string().uuid()
  }),
  z.object({
    action: z.literal("set_timezone"),
    workspaceId: z.string().uuid(),
    timezone: z.string().trim().min(1).max(100)
  }),
  z.object({
    action: z.literal("set_hours"),
    workspaceId: z.string().uuid(),
    crewId: z.string().uuid(),
    dayOfWeek: z.number().int().min(0).max(6),
    active: z.boolean(),
    startsAtLocal: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    endsAtLocal: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional()
  }).refine((value) => !value.active || (value.startsAtLocal && value.endsAtLocal), {
    message: "Start and end times are required for an active work day."
  })
]);

function isValidTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    const { supabase, user } = await requireWorkspaceAdmin(input.workspaceId);

    if (input.action === "set_timezone") {
      if (!isValidTimeZone(input.timezone)) throw new Error("Choose a valid timezone.");
      const { data, error } = await supabase
        .from("workspaces")
        .update({ timezone: input.timezone })
        .eq("id", input.workspaceId)
        .select("id,timezone")
        .single();
      if (error) throw error;
      await recordOperateAuditEvent({
        supabase,
        workspaceId: input.workspaceId,
        actorUserId: user.id,
        action: "workspace.timezone_updated",
        entityType: "workspace",
        entityId: data.id,
        metadata: { timezone: data.timezone }
      });
      return NextResponse.json({ workspace: data });
    }

    if (input.action === "assign_member") {
      const { data, error } = await supabase
        .from("crew_members")
        .upsert({
          workspace_id: input.workspaceId,
          crew_id: input.crewId,
          user_id: input.userId,
          is_lead: input.isLead,
          updated_at: new Date().toISOString()
        }, { onConflict: "crew_id,user_id" })
        .select("id,crew_id,user_id,is_lead")
        .single();
      if (error) throw error;
      await recordOperateAuditEvent({
        supabase,
        workspaceId: input.workspaceId,
        actorUserId: user.id,
        action: "crew.member_assigned",
        entityType: "crew_member",
        entityId: data.id,
        metadata: { crewId: input.crewId, userId: input.userId, isLead: input.isLead }
      });
      return NextResponse.json({ membership: data });
    }

    if (input.action === "remove_member") {
      const { data: membership, error: findError } = await supabase
        .from("crew_members")
        .select("id")
        .eq("workspace_id", input.workspaceId)
        .eq("crew_id", input.crewId)
        .eq("user_id", input.userId)
        .maybeSingle();
      if (findError) throw findError;
      const { error } = await supabase
        .from("crew_members")
        .delete()
        .eq("workspace_id", input.workspaceId)
        .eq("crew_id", input.crewId)
        .eq("user_id", input.userId);
      if (error) throw error;
      await recordOperateAuditEvent({
        supabase,
        workspaceId: input.workspaceId,
        actorUserId: user.id,
        action: "crew.member_removed",
        entityType: "crew_member",
        entityId: membership?.id ?? null,
        metadata: { crewId: input.crewId, userId: input.userId }
      });
      return NextResponse.json({ ok: true });
    }

    const { data: existing, error: existingError } = await supabase
      .from("availability_rules")
      .select("id")
      .eq("workspace_id", input.workspaceId)
      .eq("resource_type", "crew")
      .eq("resource_crew_id", input.crewId)
      .eq("day_of_week", input.dayOfWeek)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;

    if (!input.active) {
      if (existing?.id) {
        const { error } = await supabase
          .from("availability_rules")
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq("workspace_id", input.workspaceId)
          .eq("id", existing.id);
        if (error) throw error;
      }
      await recordOperateAuditEvent({
        supabase,
        workspaceId: input.workspaceId,
        actorUserId: user.id,
        action: "crew.hours_updated",
        entityType: "availability_rule",
        entityId: existing?.id ?? null,
        metadata: { crewId: input.crewId, dayOfWeek: input.dayOfWeek, active: false }
      });
      return NextResponse.json({ ok: true });
    }

    if (!input.startsAtLocal || !input.endsAtLocal || input.endsAtLocal <= input.startsAtLocal) {
      throw new Error("End time must be later than start time.");
    }

    const values = {
      workspace_id: input.workspaceId,
      resource_type: "crew",
      resource_user_id: null,
      resource_crew_id: input.crewId,
      day_of_week: input.dayOfWeek,
      starts_at_local: input.startsAtLocal,
      ends_at_local: input.endsAtLocal,
      active: true,
      updated_at: new Date().toISOString()
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from("availability_rules")
        .update(values)
        .eq("workspace_id", input.workspaceId)
        .eq("id", existing.id)
        .select("id,day_of_week,starts_at_local,ends_at_local,active")
        .single();
      if (error) throw error;
      await recordOperateAuditEvent({
        supabase,
        workspaceId: input.workspaceId,
        actorUserId: user.id,
        action: "crew.hours_updated",
        entityType: "availability_rule",
        entityId: data.id,
        metadata: { crewId: input.crewId, dayOfWeek: input.dayOfWeek, startsAtLocal: input.startsAtLocal, endsAtLocal: input.endsAtLocal, active: true }
      });
      return NextResponse.json({ rule: data });
    }

    const { data, error } = await supabase
      .from("availability_rules")
      .insert(values)
      .select("id,day_of_week,starts_at_local,ends_at_local,active")
      .single();
    if (error) throw error;
    await recordOperateAuditEvent({
      supabase,
      workspaceId: input.workspaceId,
      actorUserId: user.id,
      action: "crew.hours_created",
      entityType: "availability_rule",
      entityId: data.id,
      metadata: { crewId: input.crewId, dayOfWeek: input.dayOfWeek, startsAtLocal: input.startsAtLocal, endsAtLocal: input.endsAtLocal, active: true }
    });
    return NextResponse.json({ rule: data }, { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to update crew staffing.");
  }
}
