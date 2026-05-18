// Seeds one RemixExercise per NceLesson that already has a skeleton.
// Idempotent: skipped if an exercise already exists for that lesson.
//
// Usage: tsx scripts/seed-remix-exercises.ts [--force]

import { PrismaClient } from "@prisma/client";

interface SkeletonPlotNode {
  id: string;
  required: boolean;
}

async function main() {
  const force = process.argv.includes("--force");
  const prisma = new PrismaClient();
  let created = 0;
  let skipped = 0;
  try {
    const lessons = await prisma.nceLesson.findMany({
      where: { skeleton: { isNot: null } },
      include: { skeleton: true, remixExercises: true },
      orderBy: [{ bookKey: "asc" }, { ordinal: "asc" }],
    });

    for (const lesson of lessons) {
      if (lesson.remixExercises.length > 0 && !force) {
        skipped++;
        continue;
      }

      const plotNodes = (lesson.skeleton!.plotNodes as unknown as SkeletonPlotNode[]) ?? [];
      const lockedIds = plotNodes.filter((n) => n.required).map((n) => n.id);

      const exercise = await prisma.remixExercise.create({
        data: {
          lessonId: lesson.id,
          title: `Remix · ${lesson.bookKey} #${lesson.ordinal} — ${lesson.title}`,
          instructions: [
            "Read the canonical skeleton below.",
            "Plan a remix: change the scene and characters but keep the required plot nodes.",
            "Draft in Phase 2, then review the alignment and language drift in Phases 3-4.",
          ].join("\n\n"),
          vocabBandCap: lesson.skeleton!.vocabBand,
          lockedNodeIds: lockedIds,
          publishedAt: new Date(),
        },
      });
      created++;
      console.log(`  \u2713 ${lesson.bookKey} #${lesson.ordinal} -> ${exercise.id}`);
    }
    console.log(`\nDone. created=${created} skipped=${skipped}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
