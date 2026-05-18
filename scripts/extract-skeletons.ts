// Skeleton extractor.
//
// Reads NceLesson rows from the DB, runs `skeleton-extract` against
// Gemini, validates with Zod, and upserts into `LessonSkeleton`.
// Idempotent: re-running overwrites.
//
// Usage:
//   tsx scripts/extract-skeletons.ts                          # all lessons w/o skeleton
//   tsx scripts/extract-skeletons.ts --book=NCE1              # one book
//   tsx scripts/extract-skeletons.ts --book=NCE1 --limit=5    # smoke run
//   tsx scripts/extract-skeletons.ts --force                  # re-extract even if present
//   tsx scripts/extract-skeletons.ts --lesson=<lessonId>      # single lesson by id

import { PrismaClient, type NceLesson, type NceSentence } from "@prisma/client";
import { callOpusAndParse } from "../src/lib/opus/client";
import { GEMINI_DEFAULT_MODEL } from "../src/lib/opus/providers/gemini";
import {
  SkeletonSchema,
  SKELETON_EXTRACT_SYSTEM,
  buildSkeletonExtractUserMessage,
} from "../src/lib/opus/prompts/skeleton-extract";

interface Args {
  bookKey?: string;
  limit?: number;
  force: boolean;
  lessonId?: string;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { force: false };
  for (const arg of argv) {
    if (arg.startsWith("--book=")) out.bookKey = arg.split("=")[1];
    else if (arg.startsWith("--limit=")) out.limit = Number.parseInt(arg.split("=")[1], 10);
    else if (arg === "--force") out.force = true;
    else if (arg.startsWith("--lesson=")) out.lessonId = arg.split("=")[1];
  }
  return out;
}

async function extractOne(
  prisma: PrismaClient,
  lesson: NceLesson & { sentences: NceSentence[] },
): Promise<"ok" | "skipped" | "failed"> {
  const sentences = lesson.sentences.map((s) => ({
    ordinal: s.ordinal,
    english: s.english,
    chinese: s.chinese,
  }));

  // Drop the first sentence if it is just "Lesson N" — pure metadata
  // that adds noise to the skeleton.
  const cleaned = sentences.filter(
    (s) => !/^lesson\s+\d+/i.test(s.english.trim()),
  );

  if (cleaned.length < 3) {
    console.warn(
      `  ! skip ${lesson.bookKey} #${lesson.ordinal}: only ${cleaned.length} usable sentences`,
    );
    return "skipped";
  }

  try {
    const skeleton = await callOpusAndParse({
      promptName: "skeleton-extract",
      system: SKELETON_EXTRACT_SYSTEM,
      messages: [
        {
          role: "user",
          content: buildSkeletonExtractUserMessage({
            bookKey: lesson.bookKey,
            lessonOrdinal: lesson.ordinal,
            lessonTitle: lesson.title,
            sentences: cleaned,
          }),
        },
      ],
      schema: SkeletonSchema,
      maxTokens: 4096,
    });

    await prisma.lessonSkeleton.upsert({
      where: { lessonId: lesson.id },
      create: {
        lessonId: lesson.id,
        scene: skeleton.scene,
        registerLevel: skeleton.registerLevel,
        vocabBand: skeleton.vocabBand,
        characters: skeleton.characters,
        timeline: skeleton.timeline,
        plotNodes: skeleton.plotNodes,
        sentencePatterns: skeleton.sentencePatterns,
        styleTags: skeleton.styleTags,
        model: GEMINI_DEFAULT_MODEL,
      },
      update: {
        scene: skeleton.scene,
        registerLevel: skeleton.registerLevel,
        vocabBand: skeleton.vocabBand,
        characters: skeleton.characters,
        timeline: skeleton.timeline,
        plotNodes: skeleton.plotNodes,
        sentencePatterns: skeleton.sentencePatterns,
        styleTags: skeleton.styleTags,
        model: GEMINI_DEFAULT_MODEL,
        extractedAt: new Date(),
      },
    });

    console.log(
      `  \u2713 ${lesson.bookKey} #${lesson.ordinal} — ${skeleton.plotNodes.length} nodes, ` +
        `${skeleton.sentencePatterns.length} patterns, register=${skeleton.registerLevel}, ` +
        `band=${skeleton.vocabBand}`,
    );
    return "ok";
  } catch (err) {
    console.error(
      `  \u2717 ${lesson.bookKey} #${lesson.ordinal} failed: ${(err as Error).message}`,
    );
    return "failed";
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  const stats = { ok: 0, skipped: 0, failed: 0 };

  try {
    const where: Record<string, unknown> = {};
    if (args.lessonId) where.id = args.lessonId;
    else if (args.bookKey) where.bookKey = args.bookKey;
    if (!args.force && !args.lessonId) where.skeleton = { is: null };

    const lessons = await prisma.nceLesson.findMany({
      where,
      include: { sentences: { orderBy: { ordinal: "asc" } } },
      orderBy: [{ bookKey: "asc" }, { ordinal: "asc" }],
      take: args.limit,
    });

    if (lessons.length === 0) {
      console.log("No lessons to process.");
      return;
    }

    console.log(`Extracting skeletons for ${lessons.length} lesson(s)...`);
    for (const lesson of lessons) {
      const result = await extractOne(prisma, lesson);
      stats[result]++;
    }
    console.log(
      `\nDone. ok=${stats.ok} skipped=${stats.skipped} failed=${stats.failed}`,
    );
    if (stats.failed > 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
