"use client";

import Link from "next/link";

export interface CohortCard {
  exerciseId: string;
  exerciseTitle: string;
  bookKey: string;
  bookTitle: string;
  lessonOrdinal: number;
  lessonTitle: string;
  attempts: number;
  completed: number;
  completionRate: number;
  topDriftCategory: string | null;
}

export function CohortsOverview({
  summaries,
}: {
  summaries: CohortCard[];
}) {
  // 按教材分组
  const byBook = new Map<string, { title: string; cards: CohortCard[] }>();
  for (const c of summaries) {
    if (!byBook.has(c.bookKey)) {
      byBook.set(c.bookKey, { title: c.bookTitle, cards: [] });
    }
    byBook.get(c.bookKey)!.cards.push(c);
  }

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <nav className="text-xs text-[#858585] mb-4 flex gap-2">
        <Link href="/" className="hover:text-white">home</Link>
        <span>/</span>
        <span className="text-[#cccccc]">cohorts</span>
      </nav>
      <h1 className="text-2xl font-semibold mb-1">Cohorts</h1>
      <p className="text-xs text-[#858585] mb-6">
        Per-exercise attempts, completion rate, and dominant drift category.
        Click a card for the cohort narrative.
      </p>
      {summaries.length === 0 ? (
        <p className="text-sm text-[#858585]">No exercises yet.</p>
      ) : (
        <div className="space-y-6">
          {[...byBook.entries()].map(([bookKey, group]) => (
            <section key={bookKey}>
              <h2 className="text-sm font-mono text-[#cccccc] mb-2">
                {bookKey} · {group.title}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.cards.map((card) => (
                  <Link
                    key={card.exerciseId}
                    href={`/instructor/cohort/${card.exerciseId}`}
                    className="block border rounded-lg p-4 bg-[#181818] hover:bg-[#232323] transition"
                  >
                    <div className="font-semibold mb-1">
                      {card.lessonOrdinal}. {card.lessonTitle}
                    </div>
                    <div className="text-xs text-[#858585] mb-1">
                      {card.exerciseTitle}
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span>Attempts: {card.attempts}</span>
                      <span>Completed: {card.completed}</span>
                      <span>Completion: {(card.completionRate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-xs mt-1">
                      Top drift: {card.topDriftCategory ?? "-"}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
