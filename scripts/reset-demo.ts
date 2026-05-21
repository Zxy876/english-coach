// scripts/reset-demo.ts
//
// Idempotent demo data reset. Assumes:
//   - NCE ingest has been run (`npm run nce:ingest`)
//   - At least one lesson has a LessonSkeleton (`npm run skeleton:extract`)
//   - At least one RemixExercise has been published (`npm run remix:seed`)
//
// What it does:
//   1. Wipes ALL RemixSession + RemixEvent rows (NCE content and skeletons
//      stay; published exercises stay).
//   2. Picks the first *published* RemixExercise (or, if none exist, the
//      first RemixExercise — and publishes it).
//   3. Seeds 3 demo students on that exercise with synthesized phase data
//      so /live, /reasoning, /cohort all light up immediately:
//        - alice: completed (phase 4 done, low drift)
//        - bob:   on phase 3 (align) with high drift, currently active
//        - carol: stuck in phase 1 (plan) — missing a required node
//
// Run:  npm run reset-demo

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type PlotNode = { id: string; label: string; required: boolean };

async function main() {
  console.log("[reset-demo] clearing remix sessions…");
  // RemixEvent cascades via session deletion.
  await prisma.remixEvent.deleteMany({});
  await prisma.remixSession.deleteMany({});

  let exercise = await prisma.remixExercise.findFirst({
    where: { publishedAt: { not: null } },
    include: { lesson: { include: { skeleton: true } } },
    orderBy: [{ createdAt: "asc" }],
  });
  if (!exercise) {
    exercise = await prisma.remixExercise.findFirst({
      include: { lesson: { include: { skeleton: true } } },
      orderBy: [{ createdAt: "asc" }],
    });
    if (exercise && !exercise.publishedAt) {
      await prisma.remixExercise.update({
        where: { id: exercise.id },
        data: { publishedAt: new Date() },
      });
    }
  }
  if (!exercise) {
    throw new Error(
      "No RemixExercise found. Run `npm run nce:ingest`, " +
        "`npm run skeleton:extract`, and `npm run remix:seed` first.",
    );
  }
  if (!exercise.lesson.skeleton) {
    throw new Error(
      `Lesson ${exercise.lessonId} has no skeleton — run skeleton:extract.`,
    );
  }

  const plotNodes = exercise.lesson.skeleton.plotNodes as PlotNode[];
  const requiredIds = plotNodes.filter((n: PlotNode) => n.required).map((n: PlotNode) => n.id);
  const allIds = plotNodes.map((n: PlotNode) => n.id);
  console.log(
    `[reset-demo] using exercise "${exercise.title}" ` +
      `(lesson ${exercise.lesson.bookKey} L${exercise.lesson.ordinal}, ` +
      `${plotNodes.length} plot nodes, ${requiredIds.length} required).`,
  );

  // ── Student 1: Alice — completed ────────────────────────────────────────
  await seedSession({
    exerciseId: exercise.id,
    studentId: "alice",
    currentPhase: 4,
    startedMinutesAgo: 90,
    lastActiveMinutesAgo: 12,
    completed: true,
    plan: {
      scene: "A small bookstore café on a rainy Sunday afternoon.",
      characters: [
        { name: "Narrator", role: "protagonist" },
        { name: "Mira", role: "fellow customer" },
      ],
      keptNodes: allIds,
      reusedPatterns: ["I had + past-participle"],
      examinerLog: [
        { turn: 1, examiner: "Which required nodes will you keep?", student: "All of them." },
        { turn: 2, examiner: "Why this scene?", student: "I want the same private-overhearing dynamic." },
      ],
    },
    draftText:
      "I had taken a small table by the window. Two strangers behind me were arguing about a novel they had both just finished.",
    align: {
      coverage: 1,
      missingRequired: [],
      perNode: plotNodes.map((n) => ({ id: n.id, satisfied: true, evidence: "covered" })),
    },
    drift: {
      drifts: [
        { category: "vocab-band", note: "used 'taken' (B1) — within cap", severity: "low" },
      ],
      reflection: "Followed the skeleton closely; only stylistic drift.",
    },
  });

  // ── Student 2: Bob — phase 3 with high drift ────────────────────────────
  await seedSession({
    exerciseId: exercise.id,
    studentId: "bob",
    currentPhase: 3,
    startedMinutesAgo: 25,
    lastActiveMinutesAgo: 1,
    completed: false,
    plan: {
      scene: "A loud sports bar during the final minutes of a match.",
      characters: [{ name: "Narrator", role: "protagonist" }],
      keptNodes: requiredIds,
      reusedPatterns: [],
      examinerLog: [
        { turn: 1, examiner: "How will the overhearing work in a loud bar?", student: "Maybe a lull in the noise." },
      ],
    },
    draftText:
      "Yo so I was at the bar right and these dudes behind me would NOT shut up about their fantasy league lol.",
    align: {
      coverage: 0.6,
      missingRequired: requiredIds.slice(-1),
      perNode: plotNodes.map((n, i) => ({
        id: n.id,
        satisfied: i < plotNodes.length - 1,
        evidence: i < plotNodes.length - 1 ? "present" : "missing",
      })),
    },
    drift: null,
  });

  // ── Student 3: Carol — stuck in plan ────────────────────────────────────
  await seedSession({
    exerciseId: exercise.id,
    studentId: "carol",
    currentPhase: 1,
    startedMinutesAgo: 8,
    lastActiveMinutesAgo: 0,
    completed: false,
    plan: {
      scene: "",
      characters: [],
      keptNodes: requiredIds.slice(0, Math.max(0, requiredIds.length - 1)),
      reusedPatterns: [],
      examinerLog: [
        { turn: 1, examiner: "Pick a scene and list the required nodes you'll keep.", student: "Not sure yet." },
        { turn: 2, examiner: "Which required node is hardest to relocate? Why?", student: "(no answer)" },
      ],
    },
    draftText: null,
    align: null,
    drift: null,
  });

  console.log("[reset-demo] done. Seeded 3 demo students: alice, bob, carol.");
}

type SeedArgs = {
  exerciseId: string;
  studentId: string;
  currentPhase: number;
  startedMinutesAgo: number;
  lastActiveMinutesAgo: number;
  completed: boolean;
  plan: unknown;
  draftText: string | null;
  align: unknown;
  drift: unknown;
};

async function seedSession(a: SeedArgs) {
  const now = Date.now();
  const startedAt = new Date(now - a.startedMinutesAgo * 60_000);
  const lastActiveAt = new Date(now - a.lastActiveMinutesAgo * 60_000);
  const completedAt = a.completed ? lastActiveAt : null;

  const session = await prisma.remixSession.create({
    data: {
      exerciseId: a.exerciseId,
      studentId: a.studentId,
      currentPhase: a.currentPhase,
      startedAt,
      lastActiveAt,
      completedAt,
      planData: a.plan as never,
      draftData: a.draftText
        ? ({
            text: a.draftText,
            savedAt: lastActiveAt.toISOString(),
            // Seeded demo drafts are considered passed so demo flows can
            // advance to Phase 3+ without re-asking Opus.
            version: 1,
            passed: a.currentPhase >= 3,
            review:
              a.currentPhase >= 3
                ? {
                    verdict: "pass",
                    goalScore: 5,
                    narrativeScore: 4,
                    styleScore: 4,
                    coveredNodes: [],
                    missingRequired: [],
                    blockingQuestions: [],
                    suggestions: [],
                    overallNote: "(seeded) draft accepted in demo data.",
                  }
                : undefined,
          } as never)
        : undefined,
      alignData: (a.align ?? undefined) as never,
      driftData: (a.drift ?? undefined) as never,
    },
  });

  const events: { kind: string; payload: unknown; createdAt: Date }[] = [
    { kind: "plan_review", payload: { ok: a.currentPhase > 1 }, createdAt: startedAt },
  ];
  if (a.draftText) {
    events.push({
      kind: "draft_save",
      payload: { length: a.draftText.length },
      createdAt: new Date(startedAt.getTime() + 4 * 60_000),
    });
  }
  if (a.align) {
    events.push({
      kind: "align",
      payload: a.align as unknown,
      createdAt: new Date(startedAt.getTime() + 8 * 60_000),
    });
  }
  if (a.drift) {
    events.push({
      kind: "drift",
      payload: a.drift as unknown,
      createdAt: lastActiveAt,
    });
  }
  for (const e of events) {
    await prisma.remixEvent.create({
      data: {
        sessionId: session.id,
        kind: e.kind,
        payload: e.payload as never,
        createdAt: e.createdAt,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
