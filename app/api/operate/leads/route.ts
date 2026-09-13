import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { recordOperateAuditEvent } from "@/lib/operate/audit";
import { requireWorkspaceMember } from "@/lib/operate/workspace-auth";

const createLeadSchema = z
  .object({
    workspaceId: z.string().uuid(),
    contactName: z.string().trim().min(1).max(160),
    email: z.string().trim().email().max(320).optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    serviceAddress: z.string().trim().max(500).optional().or(z.literal("")),
    message: z.string().trim().max(5000).optional().or(z.literal("")),
    source: z.string().trim().min(1).max(100).default("Manual / Offline"),
    sourceDetail: z.string().trim().max(500).optional().or(z.literal(""))
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: "Add an email address or phone number."
  });

export async function POST(request: Request) {
  try {
    const input = createLeadSchema.parse(await request.json());
    const { supabase, user } = await requireWorkspaceMember(input.workspaceId);

    const { data, error } = await supabase
      .from("leads")
      .insert({
        workspace_id: input.workspaceId,
        contact_name: input.contactName,
        email: input.email || null,
        phone: input.phone || null,
        service_address: input.serviceAddress || null,
        message: input.message || null,
        source: input.source,
        source_detail: input.sourceDetail || null,
        status: "new"
      })
      .select("id,contact_name,status,source,source_detail,received_at")
      .single();

    if (error) throw error;

    await recordOperateAuditEvent({
      supabase,
      workspaceId: input.workspaceId,
      actorUserId: user.id,
      action: "lead.created",
      entityType: "lead",
      entityId: data.id,
      metadata: { source: data.source, sourceDetail: data.source_detail }
    });

    return NextResponse.json({ lead: data }, { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to create lead.");
  }
}
