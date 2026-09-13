import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";

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

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

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
      return NextResponse.json({ membership: data });
    }

    if (input.action === "remove_member") {
      const { error } = await supabase
        .from("crew_members")
        .delete()
        .eq("workspace_id", input.workspaceId)
        .eq("crew_id", input.crewId)
        .eq("user_id", input.userId);
      if (error) throw error;
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
      return NextResponse.json({ rule: data });
    }

    const { data, error } = await supabase
      .from("availability_rules")
      .insert(values)
      .select("id,day_of_week,starts_at_local,ends_at_local,active")
      .single();
    if (error) throw error;
    return NextResponse.json({ rule: data }, { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to update crew staffing.");
  }
}
