import Link from "next/link";
import { listCohortCards } from "@/lib/remix/cohort";

export const dynamic = "force-dynamic";

export default async function Page() {
  const cards = await listCohortCards();

  // Group by book.
  const byBook = new Map<string, { title: string; cards: typeof cards }>();
  for (const c of cards) {
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

      {cards.length === 0 ? (
        <p className="text-sm text-[#858585]">No exercises yet.</p>
      ) : (
        <div className="space-y-6">
          {[...byBook.entries()].map(([bookKey, group]) => (
            <section key={bookKey}>
              <h2 className="text-sm font-mono text-[#cccccc] mb-2">
                {bookKey} · {group.title}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.cards.map((c) => (
                  <Link
                    key={c.exerciseId}
                    href={`/cohort/${c.exerciseId}`}
                    className="block border border-[#3c3c3c] rounded p-3 hover:border-[#3794ff]"
                  >
                    <div className="text-xs font-mono text-[#858585]">
                      L{c.lessonOrdinal} · {c.lessonTitle}
                    </div>
                    <div className="text-sm font-semibold mt-1">{c.exerciseTitle}</div>
                    <div className="mt-2 text-xs font-mono flex gap-3">
                      <span>attempts={c.attempts}</span>
                      <span>completion={(c.completionRate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="mt-1 text-xs">
                      top drift:{" "}
                      {c.topDriftCategory ? (
                        <span className="text-amber-300 font-mono">{c.topDriftCategory}</span>
                      ) : (
                        <span className="text-[#858585]">—</span>
                      )}
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
