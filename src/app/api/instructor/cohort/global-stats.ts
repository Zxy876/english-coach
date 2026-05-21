import { NextRequest } from "next/server";
import { getGlobalCohortStats } from "@/lib/remix/cohort-stats";

export const dynamic = "force-dynamic";

// GET /api/instructor/cohort/global-stats
export async function GET(_req: NextRequest) {
  const stats = await getGlobalCohortStats();
  return new Response(JSON.stringify(stats), {
    headers: { "content-type": "application/json" },
  });
}
