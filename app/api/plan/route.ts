import { NextResponse } from "next/server";
import { z } from "zod";
import { createFreePlan } from "@/lib/ai/router";
import { projectAIContextSchema } from "@/lib/domain/schemas";

const requestSchema = z.object({
  idea: z.string().trim().min(10).max(12000),
  context: projectAIContextSchema.optional()
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const result = await createFreePlan(input.idea, input.context);

    return NextResponse.json(
      {
        plan: result.plan,
        provider: result.provider,
        model: result.model,
        chargedBuildCredits: 0
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create the plan.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
