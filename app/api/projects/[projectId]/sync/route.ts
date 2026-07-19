import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";
import {
  projectIdSchema,
  projectSyncPatchSchema
} from "@/lib/domain/schemas";
import { parseProjectSyncState } from "@/lib/sync/project-state";

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

export async function GET(request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const afterValue = new URL(request.url).searchParams.get("afterRevision");
    const afterRevision = Math.max(0, Number(afterValue ?? "0") || 0);
    const supabase = await authenticatedClient();

    const { data: rawSnapshot, error } = await supabase.rpc(
      "get_project_sync_state",
      { p_project_id: projectId }
    );
    if (error) throw new Error(error.message);

    const snapshot = firstRow(rawSnapshot);
    if (!snapshot) throw new Error("Project not found.");

    const { data: events, error: eventsError } = await supabase
      .from("project_sync_events")
      .select(
        "event_id,base_revision,revision,event_type,patch,device_id,created_at"
      )
      .eq("project_id", projectId)
      .gt("revision", afterRevision)
      .order("revision", { ascending: true })
      .limit(250);
    if (eventsError) throw new Error(eventsError.message);

    return NextResponse.json(
      {
        snapshot: {
          ...snapshot,
          state: parseProjectSyncState(snapshot.state)
        },
        events: events ?? []
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return apiError(error, "Unable to load shared project state.");
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const input = projectSyncPatchSchema.parse(await request.json());
    const supabase = await authenticatedClient();

    const { data, error } = await supabase.rpc("apply_project_sync_patch", {
      p_project_id: projectId,
      p_base_revision: input.baseRevision,
      p_event_id: input.eventId,
      p_device_id: input.deviceId,
      p_event_type: input.eventType,
      p_patch: input.patch
    });

    if (error) {
      if (error.message.includes("SYNC_CONFLICT:")) {
        const currentRevision = Number(
          error.message.match(/SYNC_CONFLICT:(\d+)/)?.[1] ?? "0"
        );
        return NextResponse.json(
          { error: "Project state changed on another device.", currentRevision },
          { status: 409 }
        );
      }
      throw new Error(error.message);
    }

    const snapshot = firstRow(data);
    if (!snapshot) throw new Error("Project not found.");

    return NextResponse.json({
      snapshot: {
        ...snapshot,
        state: parseProjectSyncState(snapshot.state)
      }
    });
  } catch (error) {
    return apiError(error, "Unable to synchronize project state.");
  }
}
