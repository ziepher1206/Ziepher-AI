"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const industrySchema = z.object({
  industryKey: z.string().trim().min(1).max(80),
});

export async function selectBusinessIndustryAction(formData: FormData) {
  const { industryKey } = industrySchema.parse(Object.fromEntries(formData));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: workspaceId, error: workspaceError } = await supabase.rpc("ensure_personal_workspace");
  if (workspaceError || !workspaceId) throw workspaceError ?? new Error("Workspace unavailable.");

  const { data: industry, error: industryError } = await supabase
    .from("zlife_service_industries")
    .select("industry_key,status,default_settings")
    .eq("industry_key", industryKey)
    .in("status", ["available", "preview"])
    .maybeSingle();

  if (industryError) throw industryError;
  if (!industry) throw new Error("Industry profile is not available.");

  const { error: profileError } = await supabase
    .from("workspace_business_profiles")
    .upsert({
      workspace_id: workspaceId,
      industry_key: industry.industry_key,
      industry_settings: industry.default_settings ?? {},
    }, { onConflict: "workspace_id" });

  if (profileError) throw profileError;

  const { error: installError } = await supabase
    .from("workspace_module_installations")
    .upsert({
      workspace_id: workspaceId,
      module_key: "business",
      installed_by: user.id,
      settings: { industry_profile: industry.industry_key },
    }, { onConflict: "workspace_id,module_key" });

  if (installError) throw installError;

  revalidatePath("/operate/setup");
  revalidatePath("/operate");
  revalidatePath("/dashboard");
}
