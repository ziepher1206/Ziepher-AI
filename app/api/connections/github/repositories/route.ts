import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUsableGitHubAccessToken } from "@/lib/provider-connections/github-oauth";
import { listWritableGitHubRepositories } from "@/lib/source-control/github-repositories";
import { apiError } from "@/lib/http";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: workspace, error } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!workspace?.id) {
      return NextResponse.json({ repositories: [] });
    }

    const accessToken = await getUsableGitHubAccessToken(workspace.id);
    const repositories = await listWritableGitHubRepositories(accessToken);
    return NextResponse.json({ repositories });
  } catch (error) {
    return apiError(error, "Unable to load GitHub repositories.");
  }
}
