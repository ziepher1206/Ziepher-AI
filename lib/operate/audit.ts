import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type AuditInput = {
  supabase: SupabaseClient;
  workspaceId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordOperateAuditEvent(input: AuditInput) {
  const { error } = await input.supabase.from("operate_audit_events").insert({
    workspace_id: input.workspaceId,
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {}
  });

  if (error) throw error;
}
