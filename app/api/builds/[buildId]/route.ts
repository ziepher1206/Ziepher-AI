import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";

type Context = { params: Promise<{ buildId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const buildId = z.string().uuid().parse((await context.params).buildId);
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: build, error } = await supabase
      .from("build_jobs")
      .select(
        "id,project_id,status,quality_mode,reserved_credits,finalized_credits,model_provider,model_name,failure_message,created_at,started_at,completed_at"
      )
      .eq("id", buildId)
      .single();

    if (error) throw error;

    const { data: steps, error: stepsError } = await supabase
      .from("build_steps")
      .select(
        "id,sequence,step_type,status,model_provider,model_name,actual_cost_usd,result,started_at,completed_at"
      )
      .eq("build_job_id", buildId)
      .order("sequence");

    if (stepsError) throw stepsError;
    return NextResponse.json({ build, steps });
  } catch (error) {
    return apiError(error, "Unable to load build.");
  }
}
