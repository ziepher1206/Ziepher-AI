import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError } from "@/lib/http";

type Props = { params: Promise<{ token: string }> };

const submissionSchema = z.object({
  submissionId: z.string().uuid(),
  contactName: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(320).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  serviceAddress: z.string().trim().max(500).optional().or(z.literal("")),
  message: z.string().trim().max(5000).optional().or(z.literal("")),
  website: z.string().max(0).optional().or(z.literal(""))
}).refine((value) => Boolean(value.email || value.phone), {
  message: "Add an email address or phone number."
});

async function sourceForToken(token: string) {
  const admin = createAdminClient();
  const { data: source, error } = await admin
    .from("operate_public_lead_sources")
    .select("id,workspace_id,label,source,source_detail,enabled")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  if (!source?.enabled) return null;
  return { admin, source };
}

export async function GET(_request: Request, { params }: Props) {
  try {
    const token = z.string().uuid().parse((await params).token);
    const resolved = await sourceForToken(token);
    if (!resolved) return NextResponse.json({ error: "Request form not found." }, { status: 404 });
    const { admin, source } = resolved;
    const { data: profile, error } = await admin
      .from("workspace_business_profiles")
      .select("business_name,phone,email,service_area,emergency_service")
      .eq("workspace_id", source.workspace_id)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({
      label: source.label,
      businessName: profile?.business_name ?? "Tree Service",
      businessPhone: profile?.phone ?? null,
      businessEmail: profile?.email ?? null,
      serviceArea: profile?.service_area ?? null,
      emergencyService: profile?.emergency_service ?? false
    });
  } catch (error) {
    return apiError(error, "Unable to load request form.");
  }
}

export async function POST(request: Request, { params }: Props) {
  try {
    const token = z.string().uuid().parse((await params).token);
    const input = submissionSchema.parse(await request.json());
    if (input.website) return NextResponse.json({ received: true }, { status: 202 });

    const resolved = await sourceForToken(token);
    if (!resolved) return NextResponse.json({ error: "Request form not found." }, { status: 404 });
    const { admin, source } = resolved;

    const { data: existing, error: existingError } = await admin
      .from("leads")
      .select("id")
      .eq("workspace_id", source.workspace_id)
      .eq("public_submission_id", input.submissionId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return NextResponse.json({ received: true, leadId: existing.id, duplicate: true });

    const { data: lead, error } = await admin
      .from("leads")
      .insert({
        workspace_id: source.workspace_id,
        contact_name: input.contactName,
        email: input.email || null,
        phone: input.phone || null,
        service_address: input.serviceAddress || null,
        message: input.message || null,
        source: source.source,
        source_detail: source.source_detail || source.label,
        status: "new",
        public_submission_id: input.submissionId,
        sms_consent: false,
        sms_consent_at: null
      })
      .select("id")
      .single();
    if (error?.code === "23505") {
      const { data: duplicate } = await admin
        .from("leads")
        .select("id")
        .eq("workspace_id", source.workspace_id)
        .eq("public_submission_id", input.submissionId)
        .maybeSingle();
      return NextResponse.json({ received: true, leadId: duplicate?.id ?? null, duplicate: true });
    }
    if (error) throw error;
    return NextResponse.json({ received: true, leadId: lead.id, duplicate: false }, { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to submit service request.");
  }
}
