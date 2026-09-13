import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function requireWorkspaceMember(workspaceId: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id,owner_id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (workspaceError) throw workspaceError;
  if (!workspace) throw new Error("Workspace access denied.");

  return { supabase, user, workspace };
}

export async function requireWorkspaceAdmin(workspaceId: string) {
  const context = await requireWorkspaceMember(workspaceId);
  if (context.workspace.owner_id === context.user.id) return context;

  const { data: membership, error } = await context.supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    throw new Error("Workspace administrator access required.");
  }

  return context;
}
