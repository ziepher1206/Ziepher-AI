import { NextResponse } from "next/server";
import { projectIdSchema } from "@/lib/domain/schemas";
import { apiError } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ projectId: string }> };

type StepResult = {
  knownLimitations?: unknown;
};

function parseWarnings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && item.startsWith("Visual QA (")
  );
}

function scoreFromWarnings(warnings: string[]) {
  for (const warning of warnings) {
    const match = warning.match(/^Visual QA \((\d{1,3})\/100\):/);
    if (match) return Math.max(0, Math.min(100, Number(match[1])));
  }
  return null;
}

function cleanWarning(warning: string) {
  return warning.replace(/^Visual QA \(\d{1,3}\/100\):\s*/, "");
}

export async function GET(_request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: build, error: buildError } = await supabase
      .from("build_jobs")
      .select("id,status,created_at,completed_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (buildError) throw buildError;

    if (!build?.id) {
      return NextResponse.json({
        build: null,
        score: null,
        warnings: [],
        ready: false
      });
    }

    const { data: step, error: stepError } = await supabase
      .from("build_steps")
      .select("result,completed_at")
      .eq("build_job_id", build.id)
      .eq("step_type", "generate")
      .order("sequence", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (stepError) throw stepError;

    const result = (step?.result ?? {}) as StepResult;
    const rawWarnings = parseWarnings(result.knownLimitations);
    const score = scoreFromWarnings(rawWarnings);

    return NextResponse.json({
      build: {
        id: build.id,
        status: build.status,
        createdAt: build.created_at,
        completedAt: build.completed_at ?? null
      },
      score,
      warnings: rawWarnings.map(cleanWarning),
      ready: build.status === "completed" || build.status === "succeeded"
    });
  } catch (error) {
    return apiError(error, "Unable to load visual quality results.");
  }
}
