import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";

const schema = z.object({
  accessNotes: z.string().max(4000).nullable().optional(),
  hazardNotes: z.string().max(4000).nullable().optional(),
  treeNotes: z.string().max(8000).nullable().optional()
});

type Props = { params: Promise<{ estimateId: string }> };

export async function POST(request: Request, { params }: Props) {
  try {
    const { estimateId } = await params;
    const input = schema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: estimate, error: estimateError } = await supabase
      .from("estimates")
      .select("id,workspace_id,property_id,status")
      .eq("id", estimateId)
      .single();
    if (estimateError) throw estimateError;
    if (!estimate.property_id) throw new Error("This estimate does not have a linked property.");
    if (["accepted", "declined", "expired", "canceled"].includes(estimate.status)) {
      throw new Error("This estimate is closed and its site context cannot be edited here.");
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.accessNotes !== undefined) update.access_notes = input.accessNotes?.trim() || null;
    if (input.hazardNotes !== undefined) update.hazard_notes = input.hazardNotes?.trim() || null;

    if (input.treeNotes !== undefined) {
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select("tree_notes")
        .eq("id", estimate.property_id)
        .eq("workspace_id", estimate.workspace_id)
        .single();
      if (propertyError) throw propertyError;
      const existing = property?.tree_notes && typeof property.tree_notes === "object" && !Array.isArray(property.tree_notes)
        ? property.tree_notes as Record<string, unknown>
        : {};
      update.tree_notes = { ...existing, summary: input.treeNotes?.trim() || "" };
    }

    const { error } = await supabase
      .from("properties")
      .update(update)
      .eq("id", estimate.property_id)
      .eq("workspace_id", estimate.workspace_id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Unable to save estimate site context.");
  }
}
