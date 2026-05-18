import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { NcePlayer, type PlayerSentence } from "@/components/nce/NcePlayer";

export const dynamic = "force-dynamic";

export default async function Page(
  ctx: { params: Promise<{ bookKey: string; ordinal: string }> },
) {
  const { bookKey, ordinal: ordinalRaw } = await ctx.params;
  const ordinal = Number.parseInt(ordinalRaw, 10);
  if (!Number.isFinite(ordinal) || ordinal < 1) notFound();

  const lesson = await prisma.nceLesson.findUnique({
    where: { bookKey_ordinal: { bookKey: decodeURIComponent(bookKey), ordinal } },
    include: {
      book: true,
      sentences: { orderBy: { ordinal: "asc" } },
    },
  });
  if (!lesson) notFound();

  const playerSentences: PlayerSentence[] = lesson.sentences.map((s) => ({
    id: s.id,
    ordinal: s.ordinal,
    startMs: s.startMs,
    english: s.english,
    chinese: s.chinese,
  }));

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <nav className="text-xs text-[#858585] mb-4 flex gap-2">
        <Link href="/" className="hover:text-white">
          home
        </Link>
        <span>/</span>
        <Link href="/lessons" className="hover:text-white">
          lessons
        </Link>
        <span>/</span>
        <span className="text-[#cccccc]">
          {lesson.book.key} &middot; #{lesson.ordinal}
        </span>
        <span className="ml-auto">
          <Link
            href={`/lessons/${encodeURIComponent(lesson.book.key)}/${lesson.ordinal}/skeleton`}
            className="hover:text-white"
          >
            skeleton &rarr;
          </Link>
        </span>
      </nav>
      <NcePlayer
        audioUrl={lesson.audioUrl}
        sentences={playerSentences}
        lessonTitle={lesson.title}
      />
    </main>
  );
}
