import { NextResponse } from "next/server";

import { getPublicContributorSummaries } from "@/lib/community/public-summary";

export const dynamic = "force-dynamic";

export async function GET() {
  const contributors = await getPublicContributorSummaries();
  return NextResponse.json(
    { contributors },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
