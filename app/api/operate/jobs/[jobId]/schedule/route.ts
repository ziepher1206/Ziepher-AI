import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";

const bodySchema = z.object({
  startsAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(1440),
  crewId: z.string().uuid().nullable().optional(),
  assignedUserId: z.string().uuid().nullable().optional()
});

type Props = { params: Promise<{ jobId: string }> };

export async function POST(request: Request, { params }: Props) {
  try {
    const { jobId } = await params;
    const input = bodySchema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data, error } = await supabase.rpc("schedule_operate_job", {
      p_job_id: jobId,
      p_starts_at: input.startsAt,
      p_duration_minutes: input.durationMinutes,
      p_crew_id: input.crewId ?? null,
      p_assigned_user_id: input.assignedUserId ?? null
    });
    if (error) throw error;

    return NextResponse.json({ appointmentId: data });
  } catch (error) {
    return apiError(error, "Unable to schedule job.");
  }
}
