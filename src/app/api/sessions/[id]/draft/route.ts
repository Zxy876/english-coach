// POST /api/sessions/[id]/draft — save draft + run runner + ask Opus
// to gate the submission (R10 draft-review). The verdict ("pass" or
// "revise") replaces the old "save & check" semantics: students may
// only advance to Phase 3 after Opus returns "pass".

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getRunner } from "@/lib/runner";
import "@/lib/runner"; // ensure side-effect registration
import { callOpusAndParse } from "@/lib/opus/client";
import {
  DRAFT_REVIEW_SYSTEM,
  DraftReviewSchema,
  buildDraftReviewUserMessage,
} from "@/lib/opus/prompts/draft-review";
import type { RemixDraftData, RemixPlanData } from "@/lib/remix/types";

const BodySchema = z.object({ text: z.string().min(1) });

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const session = await prisma.remixSession.findUnique({
    where: { id },
    include: {
      exercise: { include: { lesson: { include: { skeleton: true } } } },
    },
  });
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (session.currentPhase < 2) {
    return NextResponse.json(
      { error: "Phase 2 not unlocked yet" },
      { status: 409 },
    );
  }
  const skeleton = session.exercise.lesson.skeleton;
  if (!skeleton) {
    return NextResponse.json(
      { error: "lesson has no skeleton" },
      { status: 409 },
    );
  }

  const plan = (session.planData as RemixPlanData | null)?.plan;
  if (!plan) {
    return NextResponse.json({ error: "plan missing" }, { status: 409 });
  }

  const previousDraft = session.draftData as RemixDraftData | null;
  const attemptNumber = (previousDraft?.version ?? 0) + 1;

  const runner = getRunner("english-remix");
  const runnerResult = await runner.evaluate({
    submission: parsed.data.text,
    expected: null,
    payload: {
      plan: { keptNodes: plan.keptNodes, reusedPatterns: plan.reusedPatterns },
      skeleton: {
        plotNodes: skeleton.plotNodes,
        sentencePatterns: skeleton.sentencePatterns,
        vocabBand: skeleton.vocabBand,
      },
    },
  });

  const review = await callOpusAndParse({
    promptName: "draft-review",
    system: DRAFT_REVIEW_SYSTEM,
    messages: [
      {
        role: "user",
        content: buildDraftReviewUserMessage({
          lessonTitle: session.exercise.lesson.title,
          bookKey: session.exercise.lesson.bookKey,
          lessonOrdinal: session.exercise.lesson.ordinal,
          skeleton: {
            scene: skeleton.scene,
            registerLevel: skeleton.registerLevel,
            vocabBand: skeleton.vocabBand,
            plotNodes: skeleton.plotNodes as unknown as Array<{
              id: string;
              label: string;
              required: boolean;
              description: string;
            }>,
            sentencePatterns: skeleton.sentencePatterns as unknown as Array<{
              template: string;
              example: string;
            }>,
          },
          plan,
          vocabBandCap: session.exercise.vocabBandCap ?? null,
          draft: parsed.data.text,
          attemptNumber,
        }),
      },
    ],
    schema: DraftReviewSchema,
    maxTokens: 2048,
  });

  // Server-side gate: trust the model on per-dimension scores but always
  // re-evaluate the PASS condition ourselves so a stray "verdict: pass"
  // with low scores cannot accidentally unlock Phase 3.
  const minScore = Math.min(
    review.goalScore,
    review.narrativeScore,
    review.styleScore,
  );
  const passed = minScore >= 4 && review.missingRequired.length === 0;
  const finalReview = { ...review, verdict: (passed ? "pass" : "revise") as "pass" | "revise" };

  const draftData: RemixDraftData = {
    text: parsed.data.text,
    runnerResult,
    savedAt: new Date().toISOString(),
    review: finalReview,
    version: attemptNumber,
    passed,
  };

  await prisma.$transaction([
    prisma.remixSession.update({
      where: { id },
      data: {
        draftData: draftData as unknown as object,
        lastActiveAt: new Date(),
      },
    }),
    prisma.remixEvent.create({
      data: {
        sessionId: id,
        kind: "draft_review",
        payload: {
          version: attemptNumber,
          verdict: finalReview.verdict,
          goalScore: review.goalScore,
          narrativeScore: review.narrativeScore,
          styleScore: review.styleScore,
          missingRequired: review.missingRequired,
          runnerScore: runnerResult.score,
        },
      },
    }),
  ]);

  return NextResponse.json({
    runnerResult,
    review: finalReview,
    version: attemptNumber,
    passed,
  });
}
