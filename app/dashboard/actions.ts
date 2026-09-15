"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const moduleSchema = z.object({
  moduleKey: z.string().trim().min(1).max(80),
});

async function getWorkspaceContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) {
    throw workspaceError ?? new Error("Workspace unavailable.");
  }

  return { supabase, user, workspaceId };
}

export async function installModuleAction(formData: FormData) {
  const input = moduleSchema.parse(Object.fromEntries(formData));
  const { supabase, user, workspaceId } = await getWorkspaceContext();

  const { data: moduleRow, error: moduleError } = await supabase
    .from("zlife_module_catalog")
    .select("module_key,status")
    .eq("module_key", input.moduleKey)
    .in("status", ["available", "preview"])
    .maybeSingle();

  if (moduleError) throw moduleError;
  if (!moduleRow) throw new Error("Module is not available to install.");

  const { error } = await supabase
    .from("workspace_module_installations")
    .upsert({
      workspace_id: workspaceId,
      module_key: moduleRow.module_key,
      installed_by: user.id,
    }, { onConflict: "workspace_id,module_key" });

  if (error) throw error;
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/modules");
}

export async function removeModuleAction(formData: FormData) {
  const input = moduleSchema.parse(Object.fromEntries(formData));
  const { supabase, workspaceId } = await getWorkspaceContext();

  const { error } = await supabase
    .from("workspace_module_installations")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("module_key", input.moduleKey);

  if (error) throw error;
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/modules");
}
