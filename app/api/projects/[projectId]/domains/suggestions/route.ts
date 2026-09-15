import { NextResponse } from "next/server";
import { projectIdSchema } from "@/lib/domain/schemas";
import { generateDomainCandidates } from "@/lib/domain/domain-candidates";
import { checkVercelDomains } from "@/lib/deployment/vercel-registrar";
import { apiError } from "@/lib/http";
import { getProviderConnection } from "@/lib/provider-connections/store";
import { createClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ projectId: string }> };

function projectTypeFromIdea(originalIdea: string | null): "website" | "app" {
  return /project type:\s*app\b/i.test(originalIdea ?? "") ? "app" : "website";
}

export async function GET(_request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: project, error } = await supabase
      .from("projects")
      .select("id,workspace_id,name,business_name,primary_domain,source_domain,current_version,original_idea")
      .eq("id", projectId)
      .single();
    if (error || !project?.workspace_id) throw new Error("Project not found.");

    const projectType = projectTypeFromIdea(project.original_idea);
    const candidates = generateDomainCandidates({
      name: project.name,
      businessName: project.business_name,
      projectType,
      limit: 10
    });

    const connection = await getProviderConnection(project.workspace_id, "vercel");
    const connected =
      connection?.status === "connected" && Boolean(connection.accessToken?.trim());

    if (!connected || !connection?.accessToken) {
      return NextResponse.json({
        project: {
          name: project.business_name ?? project.name,
          currentDomain: project.primary_domain ?? project.source_domain ?? null,
          currentVersion: project.current_version ?? 0,
          projectType
        },
        provider: "vercel",
        providerConfigured: false,
        checkedAt: null,
        suggestions: candidates.map((domain, index) => ({
          domain,
          available: null,
          purchasePrice: null,
          renewalPrice: null,
          years: null,
          recommended: index === 0
        }))
      });
    }

    const teamId = connection.provider_account_id?.startsWith("team_")
      ? connection.provider_account_id
      : null;
    const live = await checkVercelDomains({
      accessToken: connection.accessToken,
      domains: candidates,
      teamId
    });

    const ranked = live
      .map((item, index) => ({ ...item, originalIndex: index }))
      .sort((left, right) => {
        if (left.available !== right.available) return left.available ? -1 : 1;
        const leftCom = left.domain.endsWith(".com") ? 0 : 1;
        const rightCom = right.domain.endsWith(".com") ? 0 : 1;
        if (leftCom !== rightCom) return leftCom - rightCom;
        return left.originalIndex - right.originalIndex;
      });
    const recommendedDomain = ranked.find((item) => item.available)?.domain ?? null;

    return NextResponse.json({
      project: {
        name: project.business_name ?? project.name,
        currentDomain: project.primary_domain ?? project.source_domain ?? null,
        currentVersion: project.current_version ?? 0,
        projectType
      },
      provider: "vercel",
      providerConfigured: true,
      checkedAt: new Date().toISOString(),
      suggestions: ranked.map((item) => ({
        domain: item.domain,
        available: item.available,
        purchasePrice: item.purchasePrice,
        renewalPrice: item.renewalPrice,
        years: item.years,
        recommended: item.domain === recommendedDomain
      }))
    });
  } catch (error) {
    return apiError(error, "Unable to check matching domain names.");
  }
}
