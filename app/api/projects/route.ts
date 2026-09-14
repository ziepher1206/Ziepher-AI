import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";
import { createProjectSchema } from "@/lib/domain/schemas";

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("Authentication required.");
  return { supabase, user };
}

export async function GET() {
  try {
    const { supabase } = await authenticatedClient();
    const { data, error } = await supabase
      .from("projects")
      .select(
        "id,name,business_name,source_domain,primary_domain,website_platform,website_connection_mode,scan_status,last_scanned_at,website_health,original_idea,status,preview_url,current_version,active_spec_version_id,selected_visual_concept_id,created_at,updated_at"
      )
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ projects: data });
  } catch (error) {
    return apiError(error, "Unable to load websites.");
  }
}

export async function POST(request: Request) {
  try {
    const input = createProjectSchema.parse(await request.json());
    const { supabase } = await authenticatedClient();

    if (input.domain || input.businessName) {
      if (!input.domain) {
        throw new Error("A website domain is required for website onboarding.");
      }

      const { data: createdWebsiteProject, error: websiteError } = await supabase.rpc(
        "create_website_project_with_workspace",
        {
          p_name: input.name,
          p_idea: input.idea,
          p_business_name: input.businessName ?? input.name,
          p_domain: input.domain
        }
      );

      if (websiteError) throw websiteError;
      if (!createdWebsiteProject?.id) {
        throw new Error("Website creation returned no id.");
      }

      return NextResponse.json({ project: createdWebsiteProject }, { status: 201 });
    }

    const { data: createdProject, error } = await supabase.rpc(
      "create_project_with_workspace",
      {
        p_name: input.name,
        p_idea: input.idea
      }
    );

    if (error) throw error;
    if (!createdProject?.id) throw new Error("Project creation returned no id.");

    return NextResponse.json({ project: createdProject }, { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to add website.");
  }
}
