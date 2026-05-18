// POST /api/sessions/[id]/drift — run language-drift, advance phase to 4 (done).
//
// Body: { reflection?: string }   (optional student reflection captured at submit)

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { callOpusAndParse } from "@/lib/opus/client";
import {
  DriftResponseSchema,
  LANGUAGE_DRIFT_SYSTEM,
  buildDriftUserMessage,
} from "@/lib/opus/prompts/language-drift";
import type { RemixDraftData } from "@/lib/remix/types";

const BodySchema = z.object({ reflection: z.string().optional() });

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  const reflection = parsed.success ? parsed.data.reflection : undefined;

  const session = await prisma.remixSession.findUnique({
    where: { id },
    include: {
      exercise: { include: { lesson: { include: { skeleton: true } } } },
    },
  });
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });
  const skeleton = session.exercise.lesson.skeleton;
  if (!skeleton) {
    return NextResponse.json(
      { error: "lesson has no skeleton" },
      { status: 409 },
    );
  }
  const draft = (session.draftData as RemixDraftData | null)?.text;
  const alignment = session.alignData as
    | { alignments: Array<{ nodeId: string; status: string; draftSpan?: string }> }
    | null;
  if (!draft || !alignment) {
    return NextResponse.json(
      { error: "draft or alignment missing" },
      { status: 409 },
    );
  }

  const result = await callOpusAndParse({
    promptName: "language-drift",
    system: LANGUAGE_DRIFT_SYSTEM,
    messages: [
      {
        role: "user",
        content: buildDriftUserMessage({
          lessonTitle: session.exercise.lesson.title,
          skeleton: {
            registerLevel: skeleton.registerLevel,
            vocabBand: skeleton.vocabBand,
            sentencePatterns: skeleton.sentencePatterns as unknown as Array<{
              template: string;
              example: string;
            }>,
          },
          alignment,
          draft,
        }),
      },
    ],
    schema: DriftResponseSchema,
    maxTokens: 2048,
  });

  const driftData = { ...result, reflection: reflection ?? null };

  await prisma.$transaction([
    prisma.remixSession.update({
      where: { id },
      data: {
        driftData: driftData as unknown as object,
        currentPhase: 4,
        completedAt: new Date(),
        lastActiveAt: new Date(),
      },
    }),
    prisma.remixEvent.create({
      data: {
        sessionId: id,
        kind: "drift",
        payload: { drifts: result.drifts.length },
      },
    }),
  ]);

  return NextResponse.json(driftData);
}
