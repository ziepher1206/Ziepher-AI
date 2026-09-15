import { NextResponse } from "next/server";

import {
  assistantActionSignalSchema,
  assistantAutomationEventKey,
  assistantEntityTarget,
  safeAssistantActions,
} from "@/lib/operate/assistant-action-queue";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = assistantActionSignalSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid assistant action request." }, { status: 400 });
  }

  const { data: workspaceId, error: workspaceError } = await supabase.rpc(
    "ensure_personal_workspace",
  );
  if (workspaceError || !workspaceId) {
    return NextResponse.json(
      { error: workspaceError?.message ?? "Workspace unavailable." },
      { status: 500 },
    );
  }

  const target = assistantEntityTarget(parsed.data.kind);
  const { data: entity, error: entityError } = await supabase
    .from(target.table)
    .select("id")
    .eq("id", parsed.data.entityId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (entityError) {
    return NextResponse.json({ error: entityError.message }, { status: 500 });
  }
  if (!entity) {
    return NextResponse.json({ error: "Action target not found in this workspace." }, { status: 404 });
  }

  const actions = safeAssistantActions(parsed.data);
  if (!actions.length) {
    return NextResponse.json(
      {
        error:
          "This signal has no automatic internal action. Approval-gated and external actions cannot be queued here.",
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const rows = actions.map((action) => ({
    workspace_id: workspaceId,
    event_key: assistantAutomationEventKey(action.type, action.entityId),
    event_type: action.type,
    entity_type: target.entityType,
    entity_id: action.entityId,
    status: "pending",
    risk_level: "internal",
    attempts: 0,
    max_attempts: 3,
    next_attempt_at: now,
    payload: {
      source: "zlife_assistant",
      signal_kind: parsed.data.kind,
      requested_by: user.id,
      reason: action.reason,
    },
    result: {},
    updated_at: now,
  }));

  const { error: queueError } = await admin
    .from("operate_automation_events")
    .upsert(rows, {
      onConflict: "workspace_id,event_key",
      ignoreDuplicates: true,
    });

  if (queueError) {
    return NextResponse.json({ error: queueError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    queued: rows.map((row) => ({
      eventKey: row.event_key,
      eventType: row.event_type,
      risk: row.risk_level,
    })),
    blockedClasses: ["approval", "external"],
  });
}
