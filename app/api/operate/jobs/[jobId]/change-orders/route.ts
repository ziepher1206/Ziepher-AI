import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  description: z.string().trim().min(1).max(4000),
  amountCents: z.number().int().min(0).max(100_000_000),
  approved: z.boolean().default(false),
  approvalMethod: z.enum(["customer_in_person", "customer_phone", "customer_email", "other"]).nullable().optional()
}).refine((value) => !value.approved || Boolean(value.approvalMethod), {
  message: "Choose how the customer approved this change."
});

const updateSchema = z.object({
  changeOrderId: z.string().uuid(),
  status: z.enum(["approved", "rejected", "canceled"]),
  approvalMethod: z.enum(["customer_in_person", "customer_phone", "customer_email", "other"]).nullable().optional()
}).refine((value) => value.status !== "approved" || Boolean(value.approvalMethod), {
  message: "Choose how the customer approved this change."
});

type Props = { params: Promise<{ jobId: string }> };

export async function POST(request: Request, { params }: Props) {
  try {
    const { jobId } = await params;
    const input = createSchema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: job, error: jobError } = await supabase.from("jobs").select("id,workspace_id,status").eq("id", jobId).single();
    if (jobError) throw jobError;
    if (["completed", "canceled"].includes(job.status)) throw new Error("Change orders cannot be added to a closed job.");

    const { data, error } = await supabase.from("operate_job_change_orders").insert({
      workspace_id: job.workspace_id,
      job_id: job.id,
      description: input.description,
      amount_cents: input.amountCents,
      status: input.approved ? "approved" : "draft",
      approval_method: input.approved ? input.approvalMethod : null,
      approved_at: input.approved ? new Date().toISOString() : null,
      created_by: user.id
    }).select("id,description,amount_cents,status,approval_method,approved_at,created_at").single();
    if (error) throw error;
    return NextResponse.json({ changeOrder: data }, { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to save change order.");
  }
}

export async function PATCH(request: Request, { params }: Props) {
  try {
    const { jobId } = await params;
    const input = updateSchema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: job, error: jobError } = await supabase.from("jobs").select("id,workspace_id,status").eq("id", jobId).single();
    if (jobError) throw jobError;
    if (["completed", "canceled"].includes(job.status)) throw new Error("Change orders cannot be changed after the job is closed.");

    const values = input.status === "approved"
      ? { status: input.status, approval_method: input.approvalMethod, approved_at: new Date().toISOString() }
      : { status: input.status, approval_method: null, approved_at: null };
    const { data, error } = await supabase.from("operate_job_change_orders")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("workspace_id", job.workspace_id)
      .eq("job_id", job.id)
      .eq("id", input.changeOrderId)
      .select("id,description,amount_cents,status,approval_method,approved_at,created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ changeOrder: data });
  } catch (error) {
    return apiError(error, "Unable to update change order.");
  }
}
