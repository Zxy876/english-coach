// POST /api/exercises/[id]/start — create a new RemixSession and return its id.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const exercise = await prisma.remixExercise.findUnique({ where: { id } });
  if (!exercise) {
    return NextResponse.json({ error: "exercise not found" }, { status: 404 });
  }

  const studentId = `student-${Math.random().toString(36).slice(2, 8)}`;
  const session = await prisma.remixSession.create({
    data: {
      exerciseId: exercise.id,
      studentId,
      currentPhase: 1,
    },
  });
  return NextResponse.json({ sessionId: session.id, studentId });
}
