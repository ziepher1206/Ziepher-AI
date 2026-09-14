import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { recordOperateAuditEvent } from "@/lib/operate/audit";
import { requireWorkspaceAdmin } from "@/lib/operate/workspace-auth";

const schema = z.object({
  workspaceId: z.string().uuid(),
  businessName: z.string().trim().max(160).nullable().optional(),
  phone: z.string().trim().max(80).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional().or(z.literal("")),
  websiteUrl: z.string().trim().url().max(1000).nullable().optional().or(z.literal("")),
  reviewUrl: z.string().trim().url().max(1000).nullable().optional().or(z.literal("")),
  serviceArea: z.string().trim().max(2000).nullable().optional(),
  about: z.string().trim().max(6000).nullable().optional(),
  ownerName: z.string().trim().max(160).nullable().optional(),
  yearsInBusiness: z.number().int().min(0).max(250).nullable().optional(),
  emergencyService: z.boolean().default(false),
  insuranceStatus: z.enum(["insured", "not_insured", "not_provided"]).default("not_provided"),
  licenseInsuranceNotes: z.string().trim().max(3000).nullable().optional()
});

const clean = (value: string | null | undefined) => value?.trim() || null;

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const { supabase, user } = await requireWorkspaceAdmin(input.workspaceId);

    const { data, error } = await supabase
      .from("workspace_business_profiles")
      .upsert({
        workspace_id: input.workspaceId,
        business_name: clean(input.businessName),
        phone: clean(input.phone),
        email: clean(input.email),
        website_url: clean(input.websiteUrl),
        review_url: clean(input.reviewUrl),
        service_area: clean(input.serviceArea),
        about: clean(input.about),
        owner_name: clean(input.ownerName),
        years_in_business: input.yearsInBusiness ?? null,
        emergency_service: input.emergencyService,
        insurance_status: input.insuranceStatus,
        license_insurance_notes: clean(input.licenseInsuranceNotes),
        updated_at: new Date().toISOString()
      }, { onConflict: "workspace_id" })
      .select("*")
      .single();
    if (error) throw error;

    await recordOperateAuditEvent({
      supabase,
      workspaceId: input.workspaceId,
      actorUserId: user.id,
      action: "business_profile.updated",
      entityType: "workspace_business_profile",
      metadata: {
        businessName: data.business_name,
        hasServiceArea: Boolean(data.service_area),
        emergencyService: Boolean(data.emergency_service),
        insuranceStatus: data.insurance_status
      }
    });

    return NextResponse.json({ profile: data });
  } catch (error) {
    return apiError(error, "Unable to save business profile.");
  }
}
