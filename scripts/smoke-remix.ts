// End-to-end smoke for the 4-phase Remix loop. Drives the real Gemini API
// (slow, costs tokens) but skips the HTTP layer — we call the same library
// functions the route handlers use, in the same order, and inspect the DB
// state at the end.
//
// Usage: tsx scripts/smoke-remix.ts [--exercise <id>]

import { PrismaClient } from "@prisma/client";
import { callOpusAndParse } from "../src/lib/opus/client";
import {
  PLAN_EXAMINER_SYSTEM,
  PlanExaminerResponseSchema,
  buildPlanExaminerUserMessage,
} from "../src/lib/opus/prompts/plan-examiner";
import {
  STRUCTURE_ALIGN_SYSTEM,
  AlignmentResponseSchema,
  buildAlignUserMessage,
} from "../src/lib/opus/prompts/structure-align";
import {
  LANGUAGE_DRIFT_SYSTEM,
  DriftResponseSchema,
  buildDriftUserMessage,
} from "../src/lib/opus/prompts/language-drift";
import { englishRemixRunner } from "../src/lib/runner/english-remix";

async function main() {
  const exerciseId = parseArg("--exercise");
  const prisma = new PrismaClient();
  try {
    const exercise = exerciseId
      ? await prisma.remixExercise.findUnique({
          where: { id: exerciseId },
          include: { lesson: { include: { skeleton: true } } },
        })
      : await prisma.remixExercise.findFirst({
          include: { lesson: { include: { skeleton: true } } },
          orderBy: { createdAt: "asc" },
        });
    if (!exercise || !exercise.lesson.skeleton) {
      throw new Error("No remix exercise (with skeleton) found. Run remix:seed first.");
    }
    const skeleton = exercise.lesson.skeleton;
    const studentId = `smoke-${Date.now()}`;

    console.log(`\n=== Smoke: ${exercise.title}`);
    console.log(`student=${studentId}`);

    const session = await prisma.remixSession.create({
      data: { exerciseId: exercise.id, studentId, currentPhase: 1 },
    });
    console.log(`session=${session.id}`);

    const plotNodes = skeleton.plotNodes as unknown as Array<{
      id: string;
      label: string;
      required: boolean;
      description: string;
    }>;
    const patterns = skeleton.sentencePatterns as unknown as Array<{
      template: string;
      example: string;
    }>;

    // ---- Phase 1: Plan ----
    const plan = {
      newScene: "A small art gallery in Lisbon at sunset.",
      newCharacters: "Marta, a curator. Tom, a lost tourist looking for the exit.",
      keptNodes: plotNodes.filter((n) => n.required).map((n) => n.id),
      reusedPatterns: patterns.length > 0 ? [0] : [],
      notes: "Keep tone polite.",
    };

    console.log("\n[Phase 1] examiner…");
    const examined = await callOpusAndParse({
      promptName: "plan-examiner",
      system: PLAN_EXAMINER_SYSTEM,
      messages: [
        {
          role: "user",
          content: buildPlanExaminerUserMessage({
            lessonTitle: exercise.lesson.title,
            skeleton: {
              scene: skeleton.scene,
              registerLevel: skeleton.registerLevel,
              plotNodes,
              sentencePatterns: patterns,
            },
            plan,
          }),
        },
      ],
      schema: PlanExaminerResponseSchema,
      maxTokens: 1500,
    });
    console.log(`  ready=${examined.ready} questions=${examined.questions.length}`);

    await prisma.remixSession.update({
      where: { id: session.id },
      data: {
        planData: { plan, examinerLog: [{ at: new Date().toISOString(), ready: examined.ready, questions: examined.questions }] } as object,
        currentPhase: 2,
      },
    });
    await prisma.remixEvent.create({
      data: { sessionId: session.id, kind: "plan_review", payload: { ready: examined.ready } as object },
    });

    // ---- Phase 2: Draft ----
    const draft = [
      "Excuse me, is this your guidebook? I found it by the entrance.",
      "Yes, that's mine — thank you so much!",
      "No problem. The exit is just past the sculpture room.",
      "Thanks again, that's very kind of you.",
    ].join(" ");

    console.log("\n[Phase 2] runner…");
    const runnerResult = await englishRemixRunner.evaluate({
      submission: draft,
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
    console.log(`  score=${runnerResult.score} ok=${runnerResult.ok}`);

    await prisma.remixSession.update({
      where: { id: session.id },
      data: {
        draftData: { text: draft, runnerResult, savedAt: new Date().toISOString() } as object,
      },
    });
    await prisma.remixEvent.create({
      data: { sessionId: session.id, kind: "draft_save", payload: { score: runnerResult.score } as object },
    });

    // ---- Phase 3: Align ----
    console.log("\n[Phase 3] structure-align…");
    const align = await callOpusAndParse({
      promptName: "structure-align",
      system: STRUCTURE_ALIGN_SYSTEM,
      messages: [
        {
          role: "user",
          content: buildAlignUserMessage({
            lessonTitle: exercise.lesson.title,
            skeleton: { plotNodes },
            draft,
          }),
        },
      ],
      schema: AlignmentResponseSchema,
      maxTokens: 2048,
    });
    console.log(`  coverage=${align.coverageRatio.toFixed(2)} alignments=${align.alignments.length}`);
    await prisma.remixSession.update({
      where: { id: session.id },
      data: { alignData: align as unknown as object, currentPhase: 3 },
    });
    await prisma.remixEvent.create({
      data: { sessionId: session.id, kind: "align", payload: { coverageRatio: align.coverageRatio } as object },
    });

    // ---- Phase 4: Drift ----
    console.log("\n[Phase 4] language-drift…");
    const drift = await callOpusAndParse({
      promptName: "language-drift",
      system: LANGUAGE_DRIFT_SYSTEM,
      messages: [
        {
          role: "user",
          content: buildDriftUserMessage({
            lessonTitle: exercise.lesson.title,
            skeleton: {
              registerLevel: skeleton.registerLevel,
              vocabBand: skeleton.vocabBand,
              sentencePatterns: patterns,
            },
            alignment: { alignments: align.alignments },
            draft,
          }),
        },
      ],
      schema: DriftResponseSchema,
      maxTokens: 2048,
    });
    console.log(`  drifts=${drift.drifts.length}`);
    await prisma.remixSession.update({
      where: { id: session.id },
      data: {
        driftData: drift as unknown as object,
        currentPhase: 4,
        completedAt: new Date(),
      },
    });
    await prisma.remixEvent.create({
      data: { sessionId: session.id, kind: "drift", payload: { drifts: drift.drifts.length } as object },
    });

    // ---- Verify ----
    const final = await prisma.remixSession.findUnique({
      where: { id: session.id },
      include: { events: true },
    });
    console.log("\n=== Final session ===");
    console.log(`phase=${final!.currentPhase} completedAt=${final!.completedAt?.toISOString()}`);
    console.log(`events: ${final!.events.map((e: { kind: string }) => e.kind).join(" → ")}`);
    console.log("OK");
  } finally {
    await prisma.$disconnect();
  }
}

function parseArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
