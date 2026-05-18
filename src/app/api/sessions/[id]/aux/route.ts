// POST /api/sessions/[id]/aux — invoke an aux-training runner and log the
// result as a RemixEvent. The drawer uses this for dictation/shadowing/
// read-aloud submissions; the result also gets surfaced back into Phase 1
// notes by reading recent aux_training events.
//
// Body: {
//   kind: "english-dictation" | "english-shadowing" | "english-read-aloud",
//   submission: string,
//   payload: { referenceText, sentenceId?, durationMs?, lastAttemptMs? }
// }

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getRunner, isRunnerKind } from "@/lib/runner";
import "@/lib/runner";

const BodySchema = z.object({
  kind: z.string(),
  submission: z.string(),
  payload: z.object({
    referenceText: z.string().min(1),
    sentenceId: z.string().optional(),
    durationMs: z.number().optional(),
    lastAttemptMs: z.number().optional(),
  }),
});

const AUX_KINDS = new Set([
  "english-dictation",
  "english-shadowing",
  "english-read-aloud",
]);

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { kind, submission, payload } = parsed.data;
  if (!isRunnerKind(kind) || !AUX_KINDS.has(kind)) {
    return NextResponse.json({ error: `unsupported aux kind: ${kind}` }, { status: 400 });
  }

  const session = await prisma.remixSession.findUnique({ where: { id } });
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });

  const runner = getRunner(kind);
  const result = await runner.evaluate({
    submission,
    expected: payload.referenceText,
    payload,
  });

  await prisma.$transaction([
    prisma.remixEvent.create({
      data: {
        sessionId: id,
        kind: "aux_training",
        payload: {
          training: kind,
          sentenceId: payload.sentenceId ?? null,
          referenceText: payload.referenceText,
          submission,
          score: result.score,
          ok: result.ok,
        } as object,
      },
    }),
    prisma.remixSession.update({
      where: { id },
      data: { lastActiveAt: new Date() },
    }),
  ]);

  return NextResponse.json({ result });
}
