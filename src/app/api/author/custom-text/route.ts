// POST /api/author/custom-text
// Body: { title: string, text: string }
//
// Teacher pastes raw English text. We split into sentences, create a
// synthetic NceLesson under bookKey="CUSTOM", run skeleton-extract, and
// return { lessonId } so the same scaffolding flow can be used.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { callOpusAndParse, MODEL } from "@/lib/opus/client";
import {
  SKELETON_EXTRACT_SYSTEM,
  SkeletonSchema,
  buildSkeletonExtractUserMessage,
} from "@/lib/opus/prompts/skeleton-extract";

const Body = z.object({
  title: z.string().min(1).max(160),
  text: z.string().min(20).max(12_000),
});

// Naive sentence splitter — good enough for ad-hoc teacher input. Strips
// blank entries and clamps to 80 sentences so we don't blow the token
// budget on long pasted essays.
function splitSentences(text: string): string[] {
  const raw = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z\u0022\u201c])/);
  return raw.map((s) => s.trim()).filter(Boolean).slice(0, 80);
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { title, text } = parsed.data;

  const sentenceStrings = splitSentences(text);
  if (sentenceStrings.length < 3) {
    return NextResponse.json(
      { error: "need at least 3 sentences after splitting" },
      { status: 400 },
    );
  }

  // Ensure the CUSTOM book exists.
  await prisma.nceBook.upsert({
    where: { key: "CUSTOM" },
    create: {
      key: "CUSTOM",
      title: "Custom teacher uploads",
      bookPath: "",
    },
    update: {},
  });

  // Pick next ordinal under CUSTOM.
  const last = await prisma.nceLesson.findFirst({
    where: { bookKey: "CUSTOM" },
    orderBy: { ordinal: "desc" },
    select: { ordinal: true },
  });
  const ordinal = (last?.ordinal ?? 0) + 1;

  const lesson = await prisma.nceLesson.create({
    data: {
      bookKey: "CUSTOM",
      ordinal,
      title,
      filename: `custom-${ordinal}`,
      audioUrl: "",
      lrcUrl: "",
      sentences: {
        create: sentenceStrings.map((s, i) => ({
          ordinal: i + 1,
          startMs: i * 5000,
          english: s,
          chinese: "",
        })),
      },
    },
  });

  const sentencesForPrompt = sentenceStrings.map((s, i) => ({
    ordinal: i + 1,
    english: s,
    chinese: "",
  }));

  try {
    const skeleton = await callOpusAndParse({
      promptName: "skeleton-extract:custom",
      system: SKELETON_EXTRACT_SYSTEM,
      messages: [
        {
          role: "user",
          content: buildSkeletonExtractUserMessage({
            bookKey: "CUSTOM",
            lessonOrdinal: ordinal,
            lessonTitle: title,
            sentences: sentencesForPrompt,
          }),
        },
      ],
      schema: SkeletonSchema,
      maxTokens: 4096,
    });

    await prisma.lessonSkeleton.create({
      data: {
        lessonId: lesson.id,
        scene: skeleton.scene,
        registerLevel: skeleton.registerLevel,
        vocabBand: skeleton.vocabBand,
        characters: skeleton.characters,
        timeline: skeleton.timeline,
        plotNodes: skeleton.plotNodes,
        sentencePatterns: skeleton.sentencePatterns,
        styleTags: skeleton.styleTags,
        model: MODEL,
      },
    });
  } catch (err) {
    // Clean up so the teacher can retry without colliding on ordinal.
    await prisma.nceLesson.delete({ where: { id: lesson.id } });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "skeleton extract failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ lessonId: lesson.id });
}
