import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";

const schema = z.object({
  workspaceId: z.string().uuid(),
  source: z.string().trim().min(1).max(120),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  amountCents: z.number().int().min(0).max(1000000000),
  notes: z.string().trim().max(2000).nullable().optional()
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");
    const { data, error } = await supabase.from("marketing_source_spend").insert({
      workspace_id: input.workspaceId,
      source: input.source,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      amount_cents: input.amountCents,
      notes: input.notes?.trim() || null,
      created_by: user.id
    }).select("id").single();
    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (error) {
    return apiError(error, "Unable to record marketing spend.");
  }
}
