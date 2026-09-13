import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ estimateId: string }> };
const idSchema = z.string().uuid();
const saveSchema = z.object({
  notes: z.string().max(12000).default(""),
  taxCents: z.number().int().min(0).max(100000000),
  discountCents: z.number().int().min(0).max(100000000),
  validUntil: z.string().nullable().optional(),
  items: z.array(z.object({
    description: z.string().trim().min(1).max(500),
    quantity: z.number().positive().max(1000000),
    unitPriceCents: z.number().int().min(0).max(100000000)
  })).max(100)
});

async function supabaseForRequest() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");
  return supabase;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const estimateId = idSchema.parse((await context.params).estimateId);
    const input = saveSchema.parse(await request.json());
    const supabase = await supabaseForRequest();
    const { data, error } = await supabase.rpc("save_operate_estimate", {
      p_estimate_id: estimateId,
      p_notes: input.notes,
      p_tax_cents: input.taxCents,
      p_discount_cents: input.discountCents,
      p_valid_until: input.validUntil || null,
      p_items: input.items
    });
    if (error) throw error;
    return NextResponse.json({ estimate: data });
  } catch (error) {
    return apiError(error, "Unable to save estimate.");
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const estimateId = idSchema.parse((await context.params).estimateId);
    const body = z.object({ action: z.literal("accept") }).parse(await request.json());
    void body;
    const supabase = await supabaseForRequest();
    const { data, error } = await supabase.rpc("accept_operate_estimate", { p_estimate_id: estimateId });
    if (error) throw error;
    return NextResponse.json({ jobId: data });
  } catch (error) {
    return apiError(error, "Unable to accept estimate.");
  }
}
