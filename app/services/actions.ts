"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  category: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(4000).optional(),
  serviceAddress: z.string().trim().max(300).optional(),
});

async function requireServicesWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required.");

  const { data: workspaceId, error } = await supabase.rpc("ensure_personal_workspace");
  if (error || !workspaceId) throw error ?? new Error("Workspace unavailable.");

  return { supabase, user, workspaceId };
}

export async function addServiceRequestAction(formData: FormData) {
  const input = requestSchema.parse({
    category: formData.get("category"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    serviceAddress: formData.get("serviceAddress") || undefined,
  });

  const { supabase, user, workspaceId } = await requireServicesWorkspace();
  const { error } = await supabase.from("service_requests").insert({
    workspace_id: workspaceId,
    requested_by: user.id,
    category: input.category,
    title: input.title,
    description: input.description || null,
    service_address: input.serviceAddress || null,
    status: "requested",
    source: "zlife",
    external_provider: null,
    external_request_id: null,
    existing_relationship: false,
    billable_event_confirmed: false,
    inspection_scheduled_at: null,
  });
  if (error) throw error;

  revalidatePath("/services");
}

export async function cancelServiceRequestAction(formData: FormData) {
  const requestId = z.string().uuid().parse(formData.get("requestId"));
  const { supabase, workspaceId } = await requireServicesWorkspace();

  const { error } = await supabase
    .from("service_requests")
    .update({ status: "canceled", closed_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("workspace_id", workspaceId)
    .in("status", ["requested", "matched"]);
  if (error) throw error;

  revalidatePath("/services");
}
