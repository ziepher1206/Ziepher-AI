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
        "id,name,original_idea,status,preview_url,current_version,active_spec_version_id,selected_visual_concept_id,created_at,updated_at"
      )
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ projects: data });
  } catch (error) {
    return apiError(error, "Unable to load projects.");
  }
}

export async function POST(request: Request) {
  try {
    const input = createProjectSchema.parse(await request.json());
    const { supabase } = await authenticatedClient();

    const { data, error } = await supabase.rpc(
      "create_project_with_workspace",
      {
        p_name: input.name,
        p_idea: input.idea
      }
    );

    if (error) throw error;
    return NextResponse.json({ project: data }, { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to create project.");
  }
}
