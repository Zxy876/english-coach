import { NextRequest } from "next/server";
import { createRemixReview, listRemixReviews } from "@/lib/remix/review";
import { getUserIdFromCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/instructor/review/remix?remixSessionId=xxx
export async function GET(req: NextRequest) {
  const remixSessionId = req.nextUrl.searchParams.get("remixSessionId");
  if (!remixSessionId) {
    return new Response(JSON.stringify({ error: "Missing remixSessionId" }), { status: 400 });
  }
  const reviews = await listRemixReviews(remixSessionId);
  return new Response(JSON.stringify(reviews), {
    headers: { "content-type": "application/json" },
  });
}

// POST /api/instructor/review/remix { remixSessionId, score, comment, tags }
export async function POST(req: NextRequest) {
  const userId = getUserIdFromCookie();
  if (!userId) {
    return new Response(JSON.stringify({ error: "No permission" }), { status: 403 });
  }
  const { remixSessionId, score, comment, tags } = await req.json();
  if (!remixSessionId) {
    return new Response(JSON.stringify({ error: "Missing remixSessionId" }), { status: 400 });
  }
  const review = await createRemixReview({ remixSessionId, userId, score, comment, tags });
  return new Response(JSON.stringify(review), {
    headers: { "content-type": "application/json" },
  });
}
