import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";

const leadIdSchema = z.string().uuid();
const updateSchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "estimate_scheduled", "estimated", "won", "lost", "spam"])
});

type Context = { params: Promise<{ leadId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const leadId = leadIdSchema.parse((await context.params).leadId);
    const input = updateSchema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data, error } = await supabase
      .from("leads")
      .update({ status: input.status })
      .eq("id", leadId)
      .select("id,status,updated_at")
      .single();
    if (error) throw error;

    return NextResponse.json({ lead: data });
  } catch (error) {
    return apiError(error, "Unable to update lead.");
  }
}
