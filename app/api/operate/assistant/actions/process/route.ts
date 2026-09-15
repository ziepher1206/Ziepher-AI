import { NextResponse } from "next/server";
import { z } from "zod";

import {
  assistantWorkerBoundaryMessage,
  growthPreparationSummary,
  isSupportedAssistantInternalEvent,
} from "@/lib/operate/assistant-internal-worker";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ eventId: z.string().uuid() });

type EventRow = {
  id: string;
  workspace_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  status: string;
  risk_level: string;
  attempts: number;
  max_attempts: number;
  payload: Record<string, unknown> | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid automation event id is required." }, { status: 400 });
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

  const { data: rawEvent, error: eventError } = await supabase
    .from("operate_automation_events")
    .select("id,workspace_id,event_type,entity_type,entity_id,status,risk_level,attempts,max_attempts,payload")
    .eq("id", parsed.data.eventId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });
  if (!rawEvent) return NextResponse.json({ error: "Automation event not found." }, { status: 404 });

  const event = rawEvent as EventRow;
  if (event.risk_level !== "internal") {
    return NextResponse.json({ error: "Only internal events can run in this worker." }, { status: 403 });
  }
  if (!event.entity_id) {
    return NextResponse.json({ error: "Automation event is missing its target record." }, { status: 400 });
  }
  if (!["pending", "failed"].includes(event.status)) {
    return NextResponse.json({ error: `Event is already ${event.status}.` }, { status: 409 });
  }
  if (event.attempts >= event.max_attempts) {
    await admin
      .from("operate_automation_events")
      .update({
        status: "blocked",
        last_error: "Maximum internal-worker attempts reached.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id)
      .eq("workspace_id", workspaceId);
    return NextResponse.json({ error: "Maximum attempts reached." }, { status: 409 });
  }

  if (!isSupportedAssistantInternalEvent(event.event_type)) {
    const reason = assistantWorkerBoundaryMessage(event.event_type);
    await admin
      .from("operate_automation_events")
      .update({
        status: "blocked",
        last_error: reason,
        result: { blocked: true, reason },
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id)
      .eq("workspace_id", workspaceId);
    return NextResponse.json({ error: reason, blocked: true }, { status: 400 });
  }

  const startedAt = new Date().toISOString();
  const nextAttempt = event.attempts + 1;
  const { data: claimed, error: claimError } = await admin
    .from("operate_automation_events")
    .update({
      status: "processing",
      attempts: nextAttempt,
      last_error: null,
      updated_at: startedAt,
    })
    .eq("id", event.id)
    .eq("workspace_id", workspaceId)
    .eq("status", event.status)
    .select("id")
    .maybeSingle();
  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 });
  if (!claimed) return NextResponse.json({ error: "Automation event was claimed elsewhere." }, { status: 409 });

  try {
    let result: Record<string, unknown>;

    if (event.event_type === "qualify_lead") {
      const { data: lead, error: leadError } = await admin
        .from("leads")
        .select("id,status,contact_name,email,phone")
        .eq("id", event.entity_id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (leadError) throw leadError;
      if (!lead) throw new Error("Lead not found in this workspace.");

      if (lead.status === "new") {
        const { error: updateError } = await admin
          .from("leads")
          .update({ status: "qualified", updated_at: new Date().toISOString() })
          .eq("id", lead.id)
          .eq("workspace_id", workspaceId)
          .eq("status", "new");
        if (updateError) throw updateError;
        result = {
          outcome: "lead_qualified",
          leadId: lead.id,
          contactName: lead.contact_name,
          externalActionTaken: false,
        };
      } else {
        result = {
          outcome: "no_change",
          reason: `Lead is already ${lead.status}.`,
          leadId: lead.id,
          externalActionTaken: false,
        };
      }
    } else if (event.event_type === "prepare_review_followup") {
      const { data: review, error: reviewError } = await admin
        .from("operate_review_requests")
        .select("id,status,message,review_url")
        .eq("id", event.entity_id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (reviewError) throw reviewError;
      if (!review) throw new Error("Review draft not found in this workspace.");

      if (review.status === "draft") {
        const { error: readyError } = await admin
          .from("operate_review_requests")
          .update({ status: "ready", updated_at: new Date().toISOString() })
          .eq("id", review.id)
          .eq("workspace_id", workspaceId)
          .eq("status", "draft");
        if (readyError) throw readyError;
      }
      result = {
        outcome: review.status === "draft" ? "review_draft_ready" : "no_change",
        reviewRequestId: review.id,
        messagePrepared: Boolean(review.message?.trim()),
        reviewUrlPresent: Boolean(review.review_url),
        sent: false,
        externalActionTaken: false,
      };
    } else {
      const { data: campaign, error: campaignError } = await admin
        .from("marketing_campaigns")
        .select("id,name,status,ends_at,campaign_metadata")
        .eq("id", event.entity_id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (campaignError) throw campaignError;
      if (!campaign) throw new Error("Campaign not found in this workspace.");

      const existing = campaign.campaign_metadata && typeof campaign.campaign_metadata === "object"
        ? campaign.campaign_metadata as Record<string, unknown>
        : {};
      const preparation = {
        prepared_at: new Date().toISOString(),
        prepared_by: "zlife_assistant_internal_worker",
        summary: growthPreparationSummary({ name: campaign.name, endsAt: campaign.ends_at }),
        published: false,
        paid_spend_started: false,
      };
      const { error: campaignUpdateError } = await admin
        .from("marketing_campaigns")
        .update({
          campaign_metadata: { ...existing, assistant_preparation: preparation },
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id)
        .eq("workspace_id", workspaceId);
      if (campaignUpdateError) throw campaignUpdateError;
      result = {
        outcome: "growth_action_prepared",
        campaignId: campaign.id,
        preparation,
        externalActionTaken: false,
      };
    }

    const completedAt = new Date().toISOString();
    const { error: completeError } = await admin
      .from("operate_automation_events")
      .update({
        status: "completed",
        result: {
          ...result,
          completed_at: completedAt,
          worker: "zlife_assistant_internal_v1",
        },
        last_error: null,
        updated_at: completedAt,
      })
      .eq("id", event.id)
      .eq("workspace_id", workspaceId)
      .eq("status", "processing");
    if (completeError) throw completeError;

    return NextResponse.json({ ok: true, eventId: event.id, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const exhausted = nextAttempt >= event.max_attempts;
    await admin
      .from("operate_automation_events")
      .update({
        status: exhausted ? "blocked" : "failed",
        last_error: message.slice(0, 1000),
        next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id)
      .eq("workspace_id", workspaceId);
    return NextResponse.json(
      { error: message, status: exhausted ? "blocked" : "failed" },
      { status: 500 },
    );
  }
}
