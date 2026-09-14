import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { acceptPublicEstimate } from "@/lib/operate/public-estimate";

type Props = { params: Promise<{ token: string }> };

export async function POST(_request: Request, { params }: Props) {
  try {
    const token = z.string().uuid().parse((await params).token);
    const jobId = await acceptPublicEstimate(token);
    return NextResponse.json({ accepted: true, jobId });
  } catch (error) {
    return apiError(error, "Unable to accept this estimate.");
  }
}
