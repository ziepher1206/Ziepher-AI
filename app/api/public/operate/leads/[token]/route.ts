import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ token: string }> };

const bodySchema = z.object({
  submissionId: z.string().uuid(),
  contactName: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(320).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  serviceAddress: z.string().trim().max(500).optional().or(z.literal("")),
  message: z.string().trim().max(5000).optional().or(z.literal("")),
  source: z.string().trim().max(100).default("Website"),
  sourceDetail: z.string().trim().max(500).optional().or(z.literal("")),
  smsConsent: z.boolean().default(false)
}).refine((value) => Boolean(value.email || value.phone), {
  message: "Add an email address or phone number."
});

function cors(origin: string | null) {
  return {
    "access-control-allow-origin": origin || "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin"
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: cors(request.headers.get("origin")) });
}

export async function POST(request: Request, context: Context) {
  const origin = request.headers.get("origin");
  try {
    const token = z.string().uuid().parse((await context.params).token);
    const input = bodySchema.parse(await request.json());
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Lead intake is not configured.");

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await supabase.rpc("submit_public_operate_lead", {
      p_token: token,
      p_submission_id: input.submissionId,
      p_origin: origin,
      p_contact_name: input.contactName,
      p_email: input.email || null,
      p_phone: input.phone || null,
      p_service_address: input.serviceAddress || null,
      p_message: input.message || null,
      p_source: input.source,
      p_source_detail: input.sourceDetail || null,
      p_sms_consent: input.smsConsent
    });
    if (error) throw error;

    return NextResponse.json({ ok: true, leadId: data }, { status: 201, headers: cors(origin) });
  } catch (error) {
    const response = apiError(error, "Unable to submit request.");
    for (const [name, value] of Object.entries(cors(origin))) response.headers.set(name, value);
    return response;
  }
}
