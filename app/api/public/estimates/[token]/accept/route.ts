import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { publicSupabaseRpc } from "@/lib/public-supabase-rpc";

type Props = { params: Promise<{ token: string }> };

export async function POST(_request: Request, { params }: Props) {
  try {
    const token = z.string().uuid().parse((await params).token);
    const jobId = await publicSupabaseRpc<string>("accept_public_operate_estimate", { p_token: token });
    return NextResponse.json({ accepted: true, jobId });
  } catch (error) {
    return apiError(error, "Unable to accept this estimate.");
  }
}
