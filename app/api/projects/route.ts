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

    const { data: createdProject, error } = await supabase.rpc(
      "create_project_with_workspace",
      {
        p_name: input.name,
        p_idea: input.idea
      }
    );

    if (error) throw error;
    if (!createdProject?.id) throw new Error("Project creation returned no id.");

    if (input.domain || input.businessName) {
      const { data: updatedProject, error: updateError } = await supabase
        .from("projects")
        .update({
          business_name: input.businessName ?? input.name,
          source_domain: input.domain ?? null,
          primary_domain: input.domain ?? null,
          website_connection_mode: input.domain ? "public_import" : null,
          scan_status: input.domain ? "pending" : "not_scanned"
        })
        .eq("id", createdProject.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return NextResponse.json({ project: updatedProject }, { status: 201 });
    }

    return NextResponse.json({ project: createdProject }, { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to add website.");
  }
}
