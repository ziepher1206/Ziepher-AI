import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/http";

type Props = { params: Promise<{ estimateId: string }> };

export async function POST(_request: Request, { params }: Props) {
  try {
    const estimateId = z.string().uuid().parse((await params).estimateId);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");
    const { data: token, error } = await supabase.rpc("create_operate_estimate_share_link", { p_estimate_id: estimateId });
    if (error) throw error;
    return NextResponse.json({ token });
  } catch (error) {
    return apiError(error, "Unable to create approval link.");
  }
}
