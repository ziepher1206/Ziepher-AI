import { NextResponse } from "next/server";
import { z } from "zod";
import { projectIdSchema } from "@/lib/domain/schemas";
import { apiError } from "@/lib/http";
import { getUsableGitHubAccessToken } from "@/lib/provider-connections/github-oauth";
import { getGitHubRepositoryMetadata } from "@/lib/source-control/github-repositories";
import { createClient } from "@/lib/supabase/server";

const repositoryInputSchema = z.object({
  repositoryFullName: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/)
});

type Context = { params: Promise<{ projectId: string }> };

type ProjectBindingRow = {
  id: string;
  owner_id: string;
  workspace_id: string | null;
  repository_full_name: string | null;
  repository_default_branch: string | null;
  repository_url: string | null;
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
      "id,owner_id,workspace_id,repository_full_name,repository_default_branch,repository_url"
    )
    .eq("id", projectId)
    .single();
  if (error) throw error;

  return {
    supabase,
    user,
    project: data as ProjectBindingRow
  };
}

async function assertCanManageRepository(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  project: ProjectBindingRow
) {
  if (project.owner_id === userId) return;
  if (!project.workspace_id) throw new Error("Project repository access denied.");

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", project.workspace_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;

  if (!data || !["owner", "admin", "builder"].includes(data.role)) {
    throw new Error("Project repository access denied.");
  }
}

export async function GET(_request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const { project } = await loadProject(projectId);
    return NextResponse.json({
      repository: project.repository_full_name
        ? {
            fullName: project.repository_full_name,
            defaultBranch: project.repository_default_branch,
            url: project.repository_url
          }
        : null
    });
  } catch (error) {
    return apiError(error, "Unable to load project repository.");
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const input = repositoryInputSchema.parse(await request.json());
    const { supabase, user, project } = await loadProject(projectId);
    await assertCanManageRepository(supabase, user.id, project);

    if (!project.workspace_id) {
      throw new Error("Project must belong to a workspace before connecting GitHub.");
    }

    const accessToken = await getUsableGitHubAccessToken(project.workspace_id);
    const repository = await getGitHubRepositoryMetadata(
      accessToken,
      input.repositoryFullName
    );

    if (repository.archived || repository.disabled) {
      throw new Error("Archived or disabled repositories cannot be used for builds.");
    }
    if (!repository.canPush) {
      throw new Error("The connected GitHub account does not have push access to this repository.");
    }

    const { error } = await supabase
      .from("projects")
      .update({
        repository_full_name: repository.fullName,
        repository_default_branch: repository.defaultBranch,
        repository_url: repository.url
      })
      .eq("id", projectId);
    if (error) throw error;

    return NextResponse.json({ repository });
  } catch (error) {
    return apiError(error, "Unable to connect project repository.");
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const { supabase, user, project } = await loadProject(projectId);
    await assertCanManageRepository(supabase, user.id, project);

    const { error } = await supabase
      .from("projects")
      .update({
        repository_full_name: null,
        repository_default_branch: null,
        repository_url: null
      })
      .eq("id", projectId);
    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error, "Unable to disconnect project repository.");
  }
}
