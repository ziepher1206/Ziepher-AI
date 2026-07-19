import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";
import { projectIdSchema } from "@/lib/domain/schemas";

const schema = z.object({ specVersionId: z.string().uuid() });
type Context = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const input = schema.parse(await request.json());
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { error } = await supabase.rpc("approve_project_spec", {
      p_project_id: projectId,
      p_spec_version_id: input.specVersionId
    });
    if (error) throw error;

    return NextResponse.json({ approved: true });
  } catch (error) {
    return apiError(error, "Unable to approve project specification.");
  }
}
