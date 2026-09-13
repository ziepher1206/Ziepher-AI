import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";

const schema = z.object({
  workspaceId: z.string().uuid(),
  businessName: z.string().trim().max(160).nullable().optional(),
  phone: z.string().trim().max(80).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional().or(z.literal("")),
  websiteUrl: z.string().trim().url().max(1000).nullable().optional().or(z.literal("")),
  serviceArea: z.string().trim().max(2000).nullable().optional(),
  about: z.string().trim().max(6000).nullable().optional(),
  ownerName: z.string().trim().max(160).nullable().optional(),
  yearsInBusiness: z.number().int().min(0).max(250).nullable().optional(),
  emergencyService: z.boolean().default(false),
  licenseInsuranceNotes: z.string().trim().max(3000).nullable().optional()
});

const clean = (value: string | null | undefined) => value?.trim() || null;

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data, error } = await supabase
      .from("workspace_business_profiles")
      .upsert({
        workspace_id: input.workspaceId,
        business_name: clean(input.businessName),
        phone: clean(input.phone),
        email: clean(input.email),
        website_url: clean(input.websiteUrl),
        service_area: clean(input.serviceArea),
        about: clean(input.about),
        owner_name: clean(input.ownerName),
        years_in_business: input.yearsInBusiness ?? null,
        emergency_service: input.emergencyService,
        license_insurance_notes: clean(input.licenseInsuranceNotes),
        updated_at: new Date().toISOString()
      }, { onConflict: "workspace_id" })
      .select("*")
      .single();
    if (error) throw error;

    return NextResponse.json({ profile: data });
  } catch (error) {
    return apiError(error, "Unable to save business profile.");
  }
}
