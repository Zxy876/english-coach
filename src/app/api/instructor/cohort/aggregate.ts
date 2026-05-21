import { NextRequest } from "next/server";
import { buildCohortDigest } from "@/lib/remix/cohort";

export const dynamic = "force-dynamic";

// GET /api/instructor/cohort/aggregate?exerciseId=xxx
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const exerciseId = url.searchParams.get("exerciseId");
  if (!exerciseId) {
    return new Response(JSON.stringify({ error: "Missing exerciseId" }), { status: 400 });
  }
  const digest = await buildCohortDigest(exerciseId);
  if (!digest) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }
  return new Response(JSON.stringify(digest), {
    headers: { "content-type": "application/json" },
  });
}
