import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["start", "pause", "resume"]) }),
  z.object({ action: z.literal("complete"), finalValueCents: z.number().int().min(0).max(100_000_000).nullable().optional() })
]);

type Props = { params: Promise<{ jobId: string }> };

export async function POST(request: Request, { params }: Props) {
  try {
    const { jobId } = await params;
    const input = bodySchema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    if (input.action === "complete") {
      const { data, error } = await supabase.rpc("complete_operate_job", {
        p_job_id: jobId,
        p_final_value_cents: input.finalValueCents ?? null
      });
      if (error) throw error;
      return NextResponse.json({ invoiceId: data });
    }

    const { data, error } = await supabase.rpc("set_operate_job_execution_state", {
      p_job_id: jobId,
      p_action: input.action
    });
    if (error) throw error;
    return NextResponse.json({ job: data });
  } catch (error) {
    return apiError(error, "Unable to update job.");
  }
}
