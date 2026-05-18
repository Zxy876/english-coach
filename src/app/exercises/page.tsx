// Lists all RemixExercises grouped by book/lesson. "Start" → POSTs to
// /api/exercises/[id]/start and routes the student to the session page.

import Link from "next/link";
import { prisma } from "@/lib/db";
import { StartButton } from "./StartButton";

export const dynamic = "force-dynamic";

export default async function Page() {
  const exercises = await prisma.remixExercise.findMany({
    where: { publishedAt: { not: null } },
    include: { lesson: { include: { book: true } } },
    orderBy: [{ lesson: { bookKey: "asc" } }, { lesson: { ordinal: "asc" } }],
  });

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <nav className="text-xs text-[#858585] mb-4 flex gap-2">
        <Link href="/" className="hover:text-white">home</Link>
        <span>/</span>
        <span className="text-[#cccccc]">exercises</span>
      </nav>
      <h1 className="text-2xl font-semibold mb-4">Remix exercises</h1>
      {exercises.length === 0 ? (
        <p className="text-sm text-[#858585]">
          No exercises yet. Run{" "}
          <code className="font-mono">npm run remix:seed</code> after
          extracting skeletons.
        </p>
      ) : (
        <ul className="space-y-2">
          {exercises.map((ex) => (
            <li
              key={ex.id}
              className="rounded border border-[#3c3c3c] p-3 flex items-center justify-between gap-3"
            >
              <div>
                <div className="text-sm">{ex.title}</div>
                <div className="text-xs text-[#858585] font-mono mt-0.5">
                  band cap: {ex.vocabBandCap ?? "—"} ·{" "}
                  {(ex.lockedNodeIds as string[]).length} locked nodes
                </div>
              </div>
              <StartButton exerciseId={ex.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
