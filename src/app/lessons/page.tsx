// Lessons index. Lists every NCE book with its lesson roster. Renders a
// gentle hint if `npm run nce:ingest` hasn't been run yet.

import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  const books = await prisma.nceBook.findMany({
    orderBy: { key: "asc" },
    include: {
      lessons: {
        orderBy: { ordinal: "asc" },
        select: { id: true, ordinal: true, title: true },
      },
    },
  });

  if (books.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-3 text-center">
          <div className="text-xs text-muted-foreground font-mono">R2</div>
          <h1 className="text-xl font-semibold">No lessons ingested yet</h1>
          <p className="text-sm text-muted-foreground">
            Run <code className="font-mono">npm run nce:ingest</code> to
            populate the catalogue (add{" "}
            <code className="font-mono">-- NCE1 --limit-lessons=5</code> for a
            quick smoke load).
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <header className="mb-6">
        <Link href="/" className="text-xs text-[#858585] hover:text-white">
          &larr; home
        </Link>
        <h1 className="text-2xl font-semibold mt-2">New Concept English</h1>
        <p className="text-sm text-muted-foreground">
          Pick a lesson to listen, read along, and (in R4+) write a remix.
        </p>
      </header>
      <div className="space-y-8">
        {books.map((book) => (
          <section key={book.key}>
            <h2 className="text-base font-mono text-[#cccccc] mb-2">
              {book.key} &middot; {book.title}
              {book.bookLevel && (
                <span className="ml-2 text-xs text-[#858585]">
                  ({book.bookLevel})
                </span>
              )}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {book.lessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={`/lessons/${encodeURIComponent(book.key)}/${lesson.ordinal}`}
                    className="block rounded px-3 py-2 text-sm hover:bg-[#2a2d2e]"
                  >
                    <span className="text-[#858585] font-mono mr-2">
                      {lesson.ordinal.toString().padStart(3, "0")}
                    </span>
                    {lesson.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
