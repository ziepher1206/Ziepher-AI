import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { recordOperateAuditEvent } from "@/lib/operate/audit";
import { requireWorkspaceAdmin } from "@/lib/operate/workspace-auth";

const createSchema = z.object({
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
  label: z.string().trim().min(1).max(160).default("Website lead form"),
  allowedOrigin: z.string().trim().max(500).nullable().optional()
});

const revokeSchema = z.object({
  workspaceId: z.string().uuid(),
  tokenId: z.string().uuid()
});

export async function POST(request: Request) {
  try {
    const input = createSchema.parse(await request.json());
    const { supabase, user } = await requireWorkspaceAdmin(input.workspaceId);
    const { data: tokenId, error } = await supabase.rpc("create_operate_lead_intake_token", {
      p_workspace_id: input.workspaceId,
      p_project_id: input.projectId ?? null,
      p_label: input.label,
      p_allowed_origin: input.allowedOrigin || null,
      p_expires_at: null
    });
    if (error) throw error;

    const { data: token, error: tokenError } = await supabase
      .from("operate_lead_intake_tokens")
      .select("id,token,label,allowed_origin,project_id,expires_at,revoked_at,created_at")
      .eq("workspace_id", input.workspaceId)
      .eq("id", tokenId)
      .single();
    if (tokenError) throw tokenError;

    await recordOperateAuditEvent({
      supabase,
      workspaceId: input.workspaceId,
      actorUserId: user.id,
      action: "lead_intake_token.created",
      entityType: "operate_lead_intake_token",
      entityId: token.id,
      metadata: { label: token.label, projectId: token.project_id, allowedOrigin: token.allowed_origin }
    });

    return NextResponse.json({ token }, { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to create lead intake token.");
  }
}

export async function DELETE(request: Request) {
  try {
    const input = revokeSchema.parse(await request.json());
    const { supabase, user } = await requireWorkspaceAdmin(input.workspaceId);

    const { data: existing, error: existingError } = await supabase
      .from("operate_lead_intake_tokens")
      .select("id,label,project_id,allowed_origin,revoked_at")
      .eq("workspace_id", input.workspaceId)
      .eq("id", input.tokenId)
      .single();
    if (existingError) throw existingError;

    const { error } = await supabase.rpc("revoke_operate_lead_intake_token", { p_token_id: input.tokenId });
    if (error) throw error;

    await recordOperateAuditEvent({
      supabase,
      workspaceId: input.workspaceId,
      actorUserId: user.id,
      action: "lead_intake_token.revoked",
      entityType: "operate_lead_intake_token",
      entityId: input.tokenId,
      metadata: { label: existing.label, projectId: existing.project_id, allowedOrigin: existing.allowed_origin }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Unable to revoke lead intake token.");
  }
}
