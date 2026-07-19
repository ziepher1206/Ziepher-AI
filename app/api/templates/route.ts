import { NextResponse } from "next/server";
import { appTemplates } from "@/lib/templates/catalog";

export async function GET() {
  return NextResponse.json(
    { templates: appTemplates },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
