// POST /api/author/exercises
// Body: {
//   lessonId, title, instructions,
//   vocabBandCap: "A1".."C2" | null,
//   lockedNodeIds: string[],
//   publish?: boolean
// }
// Creates a RemixExercise. If publish=true, sets publishedAt.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Body = z.object({
  lessonId: z.string().min(1),
  title: z.string().min(1).max(160),
  instructions: z.string().min(1).max(4000),
  vocabBandCap: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).nullable(),
  lockedNodeIds: z.array(z.string().min(1)).max(16),
  publish: z.boolean().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const lesson = await prisma.nceLesson.findUnique({
    where: { id: data.lessonId },
    include: { skeleton: true },
  });
  if (!lesson || !lesson.skeleton) {
    return NextResponse.json(
      { error: "lesson or skeleton not found" },
      { status: 404 },
    );
  }

  const skeletonNodeIds = new Set(
    (lesson.skeleton.plotNodes as Array<{ id: string }>).map((n) => n.id),
  );
  const unknown = data.lockedNodeIds.filter((id) => !skeletonNodeIds.has(id));
  if (unknown.length > 0) {
    return NextResponse.json(
      { error: `lockedNodeIds not in skeleton: ${unknown.join(", ")}` },
      { status: 400 },
    );
  }

  const exercise = await prisma.remixExercise.create({
    data: {
      lessonId: data.lessonId,
      title: data.title,
      instructions: data.instructions,
      vocabBandCap: data.vocabBandCap,
      lockedNodeIds: data.lockedNodeIds,
      publishedAt: data.publish ? new Date() : null,
    },
  });

  return NextResponse.json({ exerciseId: exercise.id });
}
