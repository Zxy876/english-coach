import { NextRequest } from "next/server";
import { listCohortCards } from "@/lib/remix/cohort";

export const dynamic = "force-dynamic";

// GET /api/instructor/cohort/cards
export async function GET(_req: NextRequest) {
  const cards = await listCohortCards();
  return new Response(JSON.stringify(cards), {
    headers: { "content-type": "application/json" },
  });
}
