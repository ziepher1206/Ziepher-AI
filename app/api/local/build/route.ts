import { NextResponse } from "next/server";
import { z } from "zod";
import { appPlanSchema } from "@/lib/ai/types";
import { generateLocalApplication } from "@/lib/local-build/generator";
import { projectAIContextSchema } from "@/lib/domain/schemas";

const requestSchema = z.object({
  idea: z.string().trim().min(3).max(12000),
  plan: appPlanSchema,
  conceptId: z.string().min(1).max(80),
  qualityMode: z.enum(["economy", "balanced", "best"]).default("balanced"),
  context: projectAIContextSchema.optional()
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const result = generateLocalApplication(input);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to build the local app.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
