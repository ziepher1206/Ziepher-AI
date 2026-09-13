import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Context = { params: Promise<{ leadId: string }> };

const bodySchema = z.object({
  title: z.string().trim().min(1).max(180),
  startsAt: z.string().datetime({ offset: true }),
  durationMinutes: z.number().int().min(15).max(1440).default(60)
});

export async function POST(request: Request, context: Context) {
  try {
    const leadId = z.string().uuid().parse((await context.params).leadId);
    const input = bodySchema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data, error } = await supabase.rpc("convert_operate_lead_to_estimate", {
      p_lead_id: leadId,
      p_title: input.title,
      p_starts_at: input.startsAt,
      p_duration_minutes: input.durationMinutes
    });
    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.estimate_id || !result?.appointment_id) {
      throw new Error("Estimate scheduling did not return a complete result.");
    }

    return NextResponse.json({
      customerId: result.customer_id,
      propertyId: result.property_id,
      estimateId: result.estimate_id,
      appointmentId: result.appointment_id,
      status: "estimate_scheduled"
    }, { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to schedule estimate.");
  }
}
