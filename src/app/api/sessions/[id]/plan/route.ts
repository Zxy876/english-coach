// POST /api/sessions/[id]/plan — save Plan, run examiner, decide phase advance.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { callOpusAndParse } from "@/lib/opus/client";
import {
  PLAN_EXAMINER_SYSTEM,
  PlanExaminerResponseSchema,
  buildPlanExaminerUserMessage,
} from "@/lib/opus/prompts/plan-examiner";
import type { RemixPlanData, RemixPlan } from "@/lib/remix/types";

const BodySchema = z.object({
  plan: z.object({
    newScene: z.string().min(1),
    newCharacters: z.string().min(1),
    keptNodes: z.array(z.string()),
    reusedPatterns: z.array(z.number().int()),
    notes: z.string().optional(),
  }),
});

interface SkeletonNode {
  id: string;
  label: string;
  required: boolean;
  description: string;
}
interface SkeletonPattern {
  template: string;
  example: string;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", issues: parsed.error.issues },
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
  if (!session.exercise.lesson.skeleton) {
    return NextResponse.json(
      { error: "lesson has no skeleton" },
      { status: 409 },
    );
  }

  const skeleton = session.exercise.lesson.skeleton;
  const plan: RemixPlan = parsed.data.plan;

  const examined = await callOpusAndParse({
    promptName: "plan-examiner",
    system: PLAN_EXAMINER_SYSTEM,
    messages: [
      {
        role: "user",
        content: buildPlanExaminerUserMessage({
          lessonTitle: session.exercise.lesson.title,
          skeleton: {
            scene: skeleton.scene,
            registerLevel: skeleton.registerLevel,
            plotNodes: skeleton.plotNodes as unknown as SkeletonNode[],
            sentencePatterns: skeleton.sentencePatterns as unknown as SkeletonPattern[],
          },
          plan,
        }),
      },
    ],
    schema: PlanExaminerResponseSchema,
    maxTokens: 1500,
  });

  // Server enforces required-node coverage regardless of model verdict.
  const lockedIds = (session.exercise.lockedNodeIds as string[]) ?? [];
  const missingLocked = lockedIds.filter((n) => !plan.keptNodes.includes(n));
  const hardReady = examined.ready && missingLocked.length === 0;

  const existing = (session.planData as RemixPlanData | null) ?? {
    plan,
    examinerLog: [],
  };
  const planData: RemixPlanData = {
    plan,
    examinerLog: [
      ...existing.examinerLog,
      {
        at: new Date().toISOString(),
        ready: hardReady,
        questions: examined.questions,
      },
    ],
  };

  await prisma.$transaction([
    prisma.remixSession.update({
      where: { id },
      data: {
        planData: planData as unknown as object,
        currentPhase: hardReady ? Math.max(2, session.currentPhase) : 1,
        lastActiveAt: new Date(),
      },
    }),
    prisma.remixEvent.create({
      data: {
        sessionId: id,
        kind: "plan_review",
        payload: {
          ready: hardReady,
          questionsCount: examined.questions.length,
          missingLocked,
        },
      },
    }),
  ]);

  return NextResponse.json({
    ready: hardReady,
    questions: examined.questions,
    missingLocked,
  });
}
