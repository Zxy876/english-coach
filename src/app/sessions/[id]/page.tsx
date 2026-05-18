import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { RemixSurface } from "./RemixSurface";

export const dynamic = "force-dynamic";

export default async function Page(
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = await prisma.remixSession.findUnique({
    where: { id },
    include: {
      exercise: {
        include: { lesson: { include: { skeleton: true, book: true } } },
      },
    },
  });
  if (!session || !session.exercise.lesson.skeleton) notFound();

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <nav className="text-xs text-[#858585] mb-4 flex gap-2">
        <Link href="/" className="hover:text-white">home</Link>
        <span>/</span>
        <Link href="/exercises" className="hover:text-white">exercises</Link>
        <span>/</span>
        <span className="text-[#cccccc]">session</span>
      </nav>
      <h1 className="text-xl font-semibold">{session.exercise.title}</h1>
      <p className="text-xs text-[#858585] mt-1 font-mono">
        student: {session.studentId} · session: {session.id.slice(0, 8)}…
      </p>
      <RemixSurface
        sessionId={session.id}
        initialPhase={session.currentPhase}
        skeleton={{
          scene: session.exercise.lesson.skeleton.scene,
          registerLevel: session.exercise.lesson.skeleton.registerLevel,
          vocabBand: session.exercise.lesson.skeleton.vocabBand,
          plotNodes: session.exercise.lesson.skeleton.plotNodes as unknown as Array<{
            id: string;
            label: string;
            required: boolean;
            description: string;
          }>,
          sentencePatterns:
            session.exercise.lesson.skeleton.sentencePatterns as unknown as Array<{
              template: string;
              example: string;
            }>,
        }}
        lockedNodeIds={session.exercise.lockedNodeIds as string[]}
        initialPlan={session.planData}
        initialDraft={session.draftData}
        initialAlign={session.alignData}
        initialDrift={session.driftData}
      />
    </main>
  );
}
