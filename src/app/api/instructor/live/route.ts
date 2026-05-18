// GET /api/instructor/live — SSE stream emitting one JSON event per session
// every ~5s. Each event includes the session metadata + a cached/refreshed
// remix-live-summary sentence + flags. Clients render this as a live class
// table.
//
// Note: this hits the LLM only when a session's lastActiveAt has changed
// since the previous emission (see getLiveSummary cache), so an idle class
// is essentially free.

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getLiveSummary, type SessionForSummary } from "@/lib/remix/live-summary";

export const dynamic = "force-dynamic";

const TICK_MS = 5_000;
const MAX_SESSIONS = 50;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const exerciseId = url.searchParams.get("exerciseId") ?? undefined;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      req.signal.addEventListener("abort", () => {
        closed = true;
      });

      function send(data: unknown) {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      // Open with a hello so clients know they're connected.
      send({ kind: "hello", at: new Date().toISOString() });

      while (!closed) {
        try {
          const sessions = (await prisma.remixSession.findMany({
            where: exerciseId ? { exerciseId } : undefined,
            orderBy: { lastActiveAt: "desc" },
            take: MAX_SESSIONS,
            include: {
              exercise: { include: { lesson: { include: { skeleton: true } } } },
              events: { orderBy: { createdAt: "desc" }, take: 8 },
            },
          })) as SessionForSummary[];

          for (const s of sessions) {
            if (closed) break;
            let summary;
            try {
              summary = await getLiveSummary(s);
            } catch (err) {
              summary = {
                summary: `(summary unavailable: ${err instanceof Error ? err.message : "error"})`,
                flags: [],
              };
            }
            send({
              kind: "session",
              sessionId: s.id,
              studentId: s.studentId,
              exerciseId: s.exerciseId,
              exerciseTitle: s.exercise.title,
              currentPhase: s.currentPhase,
              completed: s.completedAt !== null,
              lastActiveAt: s.lastActiveAt.toISOString(),
              startedAt: s.startedAt.toISOString(),
              summary: summary.summary,
              flags: summary.flags,
            });
          }
          send({ kind: "tick", at: new Date().toISOString() });
        } catch (err) {
          send({
            kind: "error",
            message: err instanceof Error ? err.message : "stream error",
          });
        }

        await new Promise((r) => setTimeout(r, TICK_MS));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
