// POST /api/author/scaffold
// Body: { lessonId: string }
// Runs the remix-scaffolding prompt against the lesson's skeleton and
// returns a draft RemixScaffold the teacher can edit.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { callOpusAndParse } from "@/lib/opus/client";
import {
  REMIX_SCAFFOLD_SYSTEM,
  RemixScaffoldSchema,
  buildRemixScaffoldUserMessage,
} from "@/lib/opus/prompts/remix-scaffolding";
import type { Skeleton } from "@/lib/opus/prompts/skeleton-extract";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { lessonId?: string } | null;
  if (!body?.lessonId) {
    return NextResponse.json({ error: "lessonId required" }, { status: 400 });
  }

  const lesson = await prisma.nceLesson.findUnique({
    where: { id: body.lessonId },
    include: { skeleton: true },
  });
  if (!lesson || !lesson.skeleton) {
    return NextResponse.json({ error: "lesson or skeleton not found" }, { status: 404 });
  }

  const skeleton: Skeleton = {
    scene: lesson.skeleton.scene,
    registerLevel: lesson.skeleton.registerLevel as Skeleton["registerLevel"],
    vocabBand: lesson.skeleton.vocabBand as Skeleton["vocabBand"],
    characters: lesson.skeleton.characters as Skeleton["characters"],
    timeline: lesson.skeleton.timeline as Skeleton["timeline"],
    plotNodes: lesson.skeleton.plotNodes as Skeleton["plotNodes"],
    sentencePatterns: lesson.skeleton.sentencePatterns as Skeleton["sentencePatterns"],
    styleTags: lesson.skeleton.styleTags as string[],
  };

  try {
    const scaffold = await callOpusAndParse({
      promptName: "remix-scaffolding",
      system: REMIX_SCAFFOLD_SYSTEM,
      messages: [
        {
          role: "user",
          content: buildRemixScaffoldUserMessage({
            lessonTitle: lesson.title,
            bookKey: lesson.bookKey,
            lessonOrdinal: lesson.ordinal,
            skeleton,
          }),
        },
      ],
      schema: RemixScaffoldSchema,
      maxTokens: 2400,
    });
    return NextResponse.json({ scaffold, skeleton });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "scaffold failed" },
      { status: 502 },
    );
  }
}
