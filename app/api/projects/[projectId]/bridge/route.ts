import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";
import {
  bridgeRegistrationSchema,
  projectIdSchema
} from "@/lib/domain/schemas";

type Context = { params: Promise<{ projectId: string }> };

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
    const { data, error } = await supabase
      .from("project_bridge_devices")
      .select(
        "id,device_id,device_name,platform,bridge_version,workspace_hint,capabilities,last_seen_at"
      )
      .eq("project_id", projectId)
      .order("last_seen_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ devices: data ?? [] });
  } catch (error) {
    return apiError(error, "Unable to load desktop bridge devices.");
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const input = bridgeRegistrationSchema.parse(await request.json());
    const supabase = await authenticatedClient();
    const { data, error } = await supabase.rpc(
      "register_project_bridge_device",
      {
        p_project_id: projectId,
        p_device_id: input.deviceId,
        p_device_name: input.deviceName,
        p_platform: input.platform,
        p_bridge_version: input.bridgeVersion,
        p_workspace_hint: input.workspaceHint ?? "",
        p_capabilities: input.capabilities
      }
    );
    if (error) throw new Error(error.message);
    return NextResponse.json({ device: data }, { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to register desktop bridge.");
  }
}
