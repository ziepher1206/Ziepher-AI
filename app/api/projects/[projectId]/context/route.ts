import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";
import {
  projectAIContextSchema,
  projectIdSchema
} from "@/lib/domain/schemas";
import { parseProjectSyncState } from "@/lib/sync/project-state";

const updateSchema = z.object({
  baseRevision: z.number().int().min(0),
  eventId: z.string().uuid(),
  deviceId: z.string().trim().min(8).max(200),
  context: projectAIContextSchema
});

type Context = { params: Promise<{ projectId: string }> };

function firstRow<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");
  return supabase;
}

export async function GET(_request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const supabase = await authenticatedClient();
    const { data, error } = await supabase.rpc("get_project_sync_state", {
      p_project_id: projectId
    });
    if (error) throw new Error(error.message);
    const snapshot = firstRow(data);
    if (!snapshot) throw new Error("Project not found.");
    const state = parseProjectSyncState(snapshot.state);

    return NextResponse.json({
      context: state.aiContext,
      revision: snapshot.revision,
      updatedAt: snapshot.updated_at
    });
  } catch (error) {
    return apiError(error, "Unable to load built-in AI context.");
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const input = updateSchema.parse(await request.json());
    const supabase = await authenticatedClient();
    const { data, error } = await supabase.rpc("apply_project_sync_patch", {
      p_project_id: projectId,
      p_base_revision: input.baseRevision,
      p_event_id: input.eventId,
      p_device_id: input.deviceId,
      p_event_type: "context.patch",
      p_patch: { aiContext: input.context }
    });
    if (error) {
      if (error.message.includes("SYNC_CONFLICT:")) {
        return NextResponse.json(
          { error: "Project context changed on another device." },
          { status: 409 }
        );
      }
      throw new Error(error.message);
    }
    const snapshot = firstRow(data);
    const state = parseProjectSyncState(snapshot?.state);
    return NextResponse.json({
      context: state.aiContext,
      revision: snapshot?.revision,
      updatedAt: snapshot?.updated_at
    });
  } catch (error) {
    return apiError(error, "Unable to save built-in AI context.");
  }
}
