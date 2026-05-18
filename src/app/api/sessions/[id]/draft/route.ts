// POST /api/sessions/[id]/draft — save draft text + run english-remix runner.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getRunner } from "@/lib/runner";
import "@/lib/runner"; // ensure side-effect registration
import type { RemixDraftData, RemixPlanData } from "@/lib/remix/types";

const BodySchema = z.object({ text: z.string() });

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body" },
      { status: 400 },
    );
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

  const draftData: RemixDraftData = {
    text: parsed.data.text,
    runnerResult,
    savedAt: new Date().toISOString(),
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
        kind: "draft_save",
        payload: { score: runnerResult.score, ok: runnerResult.ok },
      },
    }),
  ]);

  return NextResponse.json({ runnerResult });
}
