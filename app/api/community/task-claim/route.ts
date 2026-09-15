import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { getStudioTasks } from "@/lib/community/studio-tasks";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const REPOSITORY = "ziepher1206/Ziepher-AI";

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server-side contributor sync is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { taskId?: unknown } | null;
  const taskId = typeof body?.taskId === "string" ? body.taskId.trim().slice(0, 80) : "";
  if (!taskId) return NextResponse.json({ error: "Task is required." }, { status: 400 });

  const tasks = await getStudioTasks();
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return NextResponse.json({ error: "That Studio task is no longer available." }, { status: 409 });

  const admin = createAdminClient();
  const { data: existingContributor, error: contributorError } = await admin
    .from("community_contributors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (contributorError) return NextResponse.json({ error: "Could not load contributor identity." }, { status: 500 });

  let contributorId = existingContributor?.id ?? null;
  if (!contributorId) {
    const metadataName = typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;
    const created = await admin
      .from("community_contributors")
      .insert({ user_id: user.id, display_name: metadataName, status: "community_member", is_verified: false })
      .select("id")
      .single();
    if (created.error) return NextResponse.json({ error: "Could not create contributor identity." }, { status: 500 });
    contributorId = created.data.id;
  }

  const { data: activeClaim, error: activeClaimError } = await admin
    .from("contribution_events")
    .select("id")
    .eq("contributor_id", contributorId)
    .eq("repository", REPOSITORY)
    .eq("contribution_type", "task_claim")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeClaimError) return NextResponse.json({ error: "Could not load active task claim." }, { status: 500 });

  const now = new Date().toISOString();
  const payload = {
    source: "zlife_studio",
    repository: REPOSITORY,
    github_issue_id: task.issueNumber,
    description: `Claimed Studio task: ${task.title}`,
    impact_score: 0,
    difficulty_score: 0,
    scope_score: 0,
    maintenance_score: 0,
    quality_score: 0,
    status: "pending",
    metadata: {
      studio_task_id: task.id,
      task_title: task.title,
      task_url: task.github,
      claim_state: "active",
      claimed_at: now,
    },
    updated_at: now,
  };

  const result = activeClaim
    ? await admin
        .from("contribution_events")
        .update(payload)
        .eq("id", activeClaim.id)
        .select("id, github_issue_id, description, metadata, created_at, updated_at")
        .single()
    : await admin
        .from("contribution_events")
        .insert({ contributor_id: contributorId, contribution_type: "task_claim", ...payload })
        .select("id, github_issue_id, description, metadata, created_at, updated_at")
        .single();

  if (result.error) return NextResponse.json({ error: "Could not save Studio task claim." }, { status: 500 });
  return NextResponse.json({ claim: result.data });
}
