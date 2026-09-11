import { NextResponse } from "next/server";
import { z } from "zod";
import { getVercelProjectTarget } from "@/lib/deployment/vercel-projects";
import { projectIdSchema } from "@/lib/domain/schemas";
import { apiError } from "@/lib/http";
import { getUsableVercelConnection } from "@/lib/provider-connections/vercel";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  projectIdOrName: z.string().trim().min(1).max(255)
});

type Context = { params: Promise<{ projectId: string }> };

type ProjectRow = {
  id: string;
  owner_id: string;
  workspace_id: string | null;
  vercel_project_id: string | null;
  vercel_project_name: string | null;
  vercel_org_id: string | null;
};

async function loadProject(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");

  const { data, error } = await supabase
    .from("projects")
    .select(
      "id,owner_id,workspace_id,vercel_project_id,vercel_project_name,vercel_org_id"
    )
    .eq("id", projectId)
    .single();
  if (error || !data) throw new Error("Project not found.");

  return { supabase, user, project: data as ProjectRow };
}

async function assertCanManageDeploymentTarget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  project: ProjectRow
) {
  if (project.owner_id === userId) return;
  if (!project.workspace_id) {
    throw new Error("Only a project owner or workspace admin can change deployment infrastructure.");
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", project.workspace_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;

  if (!data || !["owner", "admin"].includes(data.role)) {
    throw new Error("Only a project owner or workspace admin can change deployment infrastructure.");
  }
}

function publicTarget(project: ProjectRow) {
  if (!project.vercel_project_id || !project.vercel_project_name || !project.vercel_org_id) {
    return null;
  }
  return {
    id: project.vercel_project_id,
    name: project.vercel_project_name,
    orgId: project.vercel_org_id
  };
}

export async function GET(_request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const { project } = await loadProject(projectId);
    return NextResponse.json({ target: publicTarget(project) });
  } catch (error) {
    return apiError(error, "Unable to load Vercel deployment target.");
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const input = inputSchema.parse(await request.json());
    const { supabase, user, project } = await loadProject(projectId);
    await assertCanManageDeploymentTarget(supabase, user.id, project);

    if (!project.workspace_id) {
      throw new Error("This project has no workspace deployment connection.");
    }

    const vercel = await getUsableVercelConnection(project.workspace_id);
    const target = await getVercelProjectTarget(
      vercel.accessToken,
      input.projectIdOrName,
      vercel.teamId
    );

    if (vercel.teamId && target.orgId !== vercel.teamId) {
      throw new Error("Vercel returned a project outside the connected workspace team.");
    }

    const { error } = await supabase
      .from("projects")
      .update({
        vercel_project_id: target.id,
        vercel_project_name: target.name,
        vercel_org_id: target.orgId
      })
      .eq("id", projectId);

    if (error?.code === "23505") {
      throw new Error("That Vercel project is already bound to another Ziepher project.");
    }
    if (error) throw error;

    return NextResponse.json({ target });
  } catch (error) {
    return apiError(error, "Unable to bind Vercel deployment target.");
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const { supabase, user, project } = await loadProject(projectId);
    await assertCanManageDeploymentTarget(supabase, user.id, project);

    const { error } = await supabase
      .from("projects")
      .update({
        vercel_project_id: null,
        vercel_project_name: null,
        vercel_org_id: null
      })
      .eq("id", projectId);
    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error, "Unable to disconnect Vercel deployment target.");
  }
}
