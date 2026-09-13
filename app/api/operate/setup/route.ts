import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";

const createSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("service"),
    workspaceId: z.string().uuid(),
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    defaultDurationMinutes: z.number().int().min(15).max(1440).nullable().optional(),
    preparationBufferMinutes: z.number().int().min(0).max(240).default(0),
    cleanupBufferMinutes: z.number().int().min(0).max(240).default(0),
    basePriceCents: z.number().int().min(0).max(100_000_000).nullable().optional()
  }),
  z.object({
    type: z.literal("crew"),
    workspaceId: z.string().uuid(),
    name: z.string().trim().min(1).max(160)
  })
]);

const updateSchema = z.object({
  workspaceId: z.string().uuid(),
  entity: z.enum(["service", "crew"]),
  id: z.string().uuid(),
  active: z.boolean()
});

export async function POST(request: Request) {
  try {
    const input = createSchema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    if (input.type === "crew") {
      const { data, error } = await supabase
        .from("crews")
        .insert({ workspace_id: input.workspaceId, name: input.name })
        .select("id,name,active")
        .single();
      if (error) throw error;
      return NextResponse.json({ crew: data }, { status: 201 });
    }

    const { data, error } = await supabase
      .from("services")
      .insert({
        workspace_id: input.workspaceId,
        name: input.name,
        description: input.description || null,
        default_duration_minutes: input.defaultDurationMinutes ?? null,
        preparation_buffer_minutes: input.preparationBufferMinutes,
        cleanup_buffer_minutes: input.cleanupBufferMinutes,
        base_price_cents: input.basePriceCents ?? null
      })
      .select("id,name,active")
      .single();
    if (error) throw error;
    return NextResponse.json({ service: data }, { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to save business setup.");
  }
}

export async function PATCH(request: Request) {
  try {
    const input = updateSchema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const table = input.entity === "service" ? "services" : "crews";
    const { data, error } = await supabase
      .from(table)
      .update({ active: input.active, updated_at: new Date().toISOString() })
      .eq("workspace_id", input.workspaceId)
      .eq("id", input.id)
      .select("id,active")
      .single();
    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (error) {
    return apiError(error, "Unable to update business setup.");
  }
}
