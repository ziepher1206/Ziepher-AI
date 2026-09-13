import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";

const createLeadSchema = z
  .object({
    workspaceId: z.string().uuid(),
    contactName: z.string().trim().min(1).max(160),
    email: z.string().trim().email().max(320).optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    serviceAddress: z.string().trim().max(500).optional().or(z.literal("")),
    message: z.string().trim().max(5000).optional().or(z.literal("")),
    source: z.string().trim().max(100).default("manual")
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: "Add an email address or phone number."
  });

export async function POST(request: Request) {
  try {
    const input = createLeadSchema.parse(await request.json());
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data, error } = await supabase
      .from("leads")
      .insert({
        workspace_id: input.workspaceId,
        contact_name: input.contactName,
        email: input.email || null,
        phone: input.phone || null,
        service_address: input.serviceAddress || null,
        message: input.message || null,
        source: input.source,
        status: "new"
      })
      .select("id,contact_name,status,received_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ lead: data }, { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to create lead.");
  }
}
