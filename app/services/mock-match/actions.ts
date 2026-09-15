"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const requestIdSchema = z.string().uuid();
const stageSchema = z.enum(["matched", "inspection_scheduled"]);

function assertMockMatchEnabled() {
  if (process.env.ZLIFE_DEV_MODE !== "true" || process.env.ZLIFE_MOCK_MATCH !== "true") {
    throw new Error("Mock Ziepher Match is disabled outside the explicit development mock environment.");
  }
}

export async function advanceMockMatchAction(formData: FormData) {
  assertMockMatchEnabled();

  const requestId = requestIdSchema.parse(formData.get("requestId"));
  const stage = stageSchema.parse(formData.get("stage"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required.");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc(
    "ensure_personal_workspace",
  );
  if (workspaceError || !workspaceId) {
    throw workspaceError ?? new Error("Workspace unavailable.");
  }

  const { data: current, error: currentError } = await supabase
    .from("service_requests")
    .select("id,status,external_provider,external_request_id,billable_event_confirmed")
    .eq("id", requestId)
    .eq("workspace_id", workspaceId)
    .single();
  if (currentError || !current) throw currentError ?? new Error("Service request not found.");
  if (["closed", "canceled"].includes(current.status)) {
    throw new Error("Terminal service requests cannot be advanced by the mock adapter.");
  }
  if (current.billable_event_confirmed) {
    throw new Error("Mock Match cannot modify a request that has a confirmed billable event.");
  }
  if (current.external_provider && current.external_provider !== "ziepher_match_mock") {
    throw new Error("A request linked to a real provider cannot be taken over by the mock adapter.");
  }

  const update = stage === "matched"
    ? {
        external_provider: "ziepher_match_mock",
        external_request_id: current.external_request_id ?? `mock-${requestId}`,
        status: "matched",
        billable_event_confirmed: false,
        inspection_scheduled_at: null,
      }
    : {
        external_provider: "ziepher_match_mock",
        external_request_id: current.external_request_id ?? `mock-${requestId}`,
        status: "inspection_scheduled",
        billable_event_confirmed: false,
        inspection_scheduled_at: new Date().toISOString(),
      };

  const { error: updateError } = await supabase
    .from("service_requests")
    .update(update)
    .eq("id", requestId)
    .eq("workspace_id", workspaceId);
  if (updateError) throw updateError;

  revalidatePath("/services");
  revalidatePath("/services/mock-match");
}
