import { NextResponse } from "next/server";
import { isSupabaseConfigured, stripeIsEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "ziepher-ai",
      version: process.env.npm_package_version ?? "0.4.0",
      timestamp: new Date().toISOString(),
      capabilities: {
        supabase: isSupabaseConfigured(),
        googleAI: Boolean(process.env.GOOGLE_AI_API_KEY),
        openAI: Boolean(process.env.OPENAI_API_KEY),
        stripe: stripeIsEnabled(),
        vercelDeployments:
          process.env.VERCEL_DEPLOYMENTS_ENABLED === "true"
      }
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
