// POST /api/sessions/[id]/align — run structure-align, advance phase to 3.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { callOpusAndParse } from "@/lib/opus/client";
import {
  AlignmentResponseSchema,
  STRUCTURE_ALIGN_SYSTEM,
  buildAlignUserMessage,
} from "@/lib/opus/prompts/structure-align";
import type { RemixDraftData } from "@/lib/remix/types";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

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
  if (!draft) {
    return NextResponse.json({ error: "draft missing" }, { status: 409 });
  }

  const result = await callOpusAndParse({
    promptName: "structure-align",
    system: STRUCTURE_ALIGN_SYSTEM,
    messages: [
      {
        role: "user",
        content: buildAlignUserMessage({
          lessonTitle: session.exercise.lesson.title,
          skeleton: {
            plotNodes: skeleton.plotNodes as unknown as Array<{
              id: string;
              label: string;
              required: boolean;
              description: string;
            }>,
          },
          draft,
        }),
      },
    ],
    schema: AlignmentResponseSchema,
    maxTokens: 2048,
  });

  await prisma.$transaction([
    prisma.remixSession.update({
      where: { id },
      data: {
        alignData: result as unknown as object,
        currentPhase: Math.max(3, session.currentPhase),
        lastActiveAt: new Date(),
      },
    }),
    prisma.remixEvent.create({
      data: {
        sessionId: id,
        kind: "align",
        payload: { coverageRatio: result.coverageRatio, nodes: result.alignments.length },
      },
    }),
  ]);

  return NextResponse.json(result);
}
