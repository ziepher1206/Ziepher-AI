import { NextResponse } from "next/server";
import { z } from "zod";
import { domainSchema, projectIdSchema } from "@/lib/domain/schemas";
import {
  addVercelProjectDomain,
  getVercelProjectDomain,
  verifyVercelProjectDomain
} from "@/lib/deployment/vercel-project-domains";
import { apiError } from "@/lib/http";
import { getProviderConnection } from "@/lib/provider-connections/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const connectSchema = z.object({
  domain: domainSchema,
  confirmation: z.literal("CONNECT_DOMAIN")
});

const verifySchema = z.object({
  domain: domainSchema,
  action: z.literal("verify")
});

type Context = { params: Promise<{ projectId: string }> };

async function projectAccess(context: Context) {
  const projectId = projectIdSchema.parse((await context.params).projectId);
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");

  const { data: project, error } = await supabase
    .from("projects")
    .select("id,workspace_id,vercel_project_id,vercel_project_name,vercel_org_id,primary_domain")
    .eq("id", projectId)
    .single();
  if (error || !project?.workspace_id) throw new Error("Project not found.");
  if (!project.vercel_project_id && !project.vercel_project_name) {
    throw new Error("Choose a Vercel deployment target before connecting a domain.");
  }

  const connection = await getProviderConnection(project.workspace_id, "vercel");
  if (connection?.status !== "connected" || !connection.accessToken?.trim()) {
    throw new Error("Connect Vercel before connecting a domain.");
  }

  const teamId = project.vercel_org_id?.startsWith("team_")
    ? project.vercel_org_id
    : connection.provider_account_id?.startsWith("team_")
      ? connection.provider_account_id
      : null;

  return {
    projectId,
    project,
    accessToken: connection.accessToken,
    projectRef: project.vercel_project_id ?? project.vercel_project_name,
    teamId
  };
}

export async function GET(request: Request, context: Context) {
  try {
    const { accessToken, projectRef, teamId } = await projectAccess(context);
    const domain = domainSchema.parse(new URL(request.url).searchParams.get("domain"));
    const status = await getVercelProjectDomain({
      accessToken,
      projectIdOrName: projectRef,
      domain,
      teamId
    });
    return NextResponse.json({ domain: status });
  } catch (error) {
    return apiError(error, "Unable to check the project domain.");
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const body = await request.json();
    const { projectId, accessToken, projectRef, teamId } = await projectAccess(context);

    if (body?.action === "verify") {
      const input = verifySchema.parse(body);
      const status = await verifyVercelProjectDomain({
        accessToken,
        projectIdOrName: projectRef,
        domain: input.domain,
        teamId
      });
      return NextResponse.json({ domain: status });
    }

    const input = connectSchema.parse(body);
    const status = await addVercelProjectDomain({
      accessToken,
      projectIdOrName: projectRef,
      domain: input.domain,
      teamId
    });

    const admin = createAdminClient();
    const { error: saveError } = await admin
      .from("projects")
      .update({ primary_domain: input.domain, updated_at: new Date().toISOString() })
      .eq("id", projectId);
    if (saveError) throw saveError;

    return NextResponse.json({
      domain: status,
      connected: true,
      dnsChangedByZLife: false,
      publishedByZLife: false
    });
  } catch (error) {
    return apiError(error, "Unable to connect the domain.");
  }
}
