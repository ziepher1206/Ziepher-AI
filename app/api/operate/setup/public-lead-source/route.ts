import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";

const schema = z.object({
  workspaceId: z.string().uuid(),
  action: z.enum(["create", "regenerate", "toggle"]),
  sourceId: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(120).optional(),
  source: z.string().trim().min(1).max(120).optional(),
  sourceDetail: z.string().trim().max(500).nullable().optional(),
  enabled: z.boolean().optional()
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    if (input.action === "create") {
      const { data, error } = await supabase.from("operate_public_lead_sources").insert({
        workspace_id: input.workspaceId,
        label: input.label ?? "Website form",
        source: input.source ?? "Website",
        source_detail: input.sourceDetail?.trim() || null,
        enabled: true,
        created_by: user.id
      }).select("id,token,label,source,source_detail,enabled").single();
      if (error) throw error;
      return NextResponse.json({ source: data });
    }

    if (!input.sourceId) throw new Error("Source ID is required.");

    if (input.action === "regenerate") {
      const { data, error } = await supabase.from("operate_public_lead_sources")
        .update({ token: crypto.randomUUID(), updated_at: new Date().toISOString() })
        .eq("id", input.sourceId)
        .eq("workspace_id", input.workspaceId)
        .select("id,token,label,source,source_detail,enabled")
        .single();
      if (error) throw error;
      return NextResponse.json({ source: data });
    }

    const { data, error } = await supabase.from("operate_public_lead_sources")
      .update({ enabled: input.enabled ?? false, updated_at: new Date().toISOString() })
      .eq("id", input.sourceId)
      .eq("workspace_id", input.workspaceId)
      .select("id,token,label,source,source_detail,enabled")
      .single();
    if (error) throw error;
    return NextResponse.json({ source: data });
  } catch (error) {
    return apiError(error, "Unable to update public lead form.");
  }
}
