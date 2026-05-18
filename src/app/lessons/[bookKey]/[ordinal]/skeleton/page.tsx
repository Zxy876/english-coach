import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type {
  SkeletonCharacter,
  SkeletonPlotNode,
  SkeletonSentencePattern,
  SkeletonTimelineBeat,
} from "@/lib/opus/prompts/skeleton-extract";

export const dynamic = "force-dynamic";

export default async function Page(ctx: {
  params: Promise<{ bookKey: string; ordinal: string }>;
}) {
  const { bookKey, ordinal: ordinalRaw } = await ctx.params;
  const ordinal = Number.parseInt(ordinalRaw, 10);
  if (!Number.isFinite(ordinal) || ordinal < 1) notFound();

  const lesson = await prisma.nceLesson.findUnique({
    where: {
      bookKey_ordinal: { bookKey: decodeURIComponent(bookKey), ordinal },
    },
    include: { skeleton: true, book: true },
  });
  if (!lesson) notFound();

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <nav className="text-xs text-[#858585] mb-4 flex gap-2">
        <Link href="/" className="hover:text-white">home</Link>
        <span>/</span>
        <Link href="/lessons" className="hover:text-white">lessons</Link>
        <span>/</span>
        <Link
          href={`/lessons/${encodeURIComponent(lesson.book.key)}/${lesson.ordinal}`}
          className="hover:text-white"
        >
          {lesson.book.key} #{lesson.ordinal}
        </Link>
        <span>/</span>
        <span className="text-[#cccccc]">skeleton</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-xl font-semibold">{lesson.title}</h1>
        <p className="text-xs text-[#858585] font-mono mt-1">canonical skeleton (R3)</p>
      </header>

      {!lesson.skeleton ? (
        <div className="rounded border border-[#3c3c3c] p-4 text-sm text-[#cccccc]">
          No skeleton has been extracted yet.
          <div className="text-xs text-[#858585] font-mono mt-2">
            $ npm run skeleton:extract -- --lesson={lesson.id}
          </div>
        </div>
      ) : (
        <SkeletonView skeleton={lesson.skeleton} />
      )}
    </main>
  );
}

function SkeletonView({
  skeleton,
}: {
  skeleton: {
    scene: string;
    registerLevel: string;
    vocabBand: string;
    characters: unknown;
    timeline: unknown;
    plotNodes: unknown;
    sentencePatterns: unknown;
    styleTags: unknown;
    model: string;
    extractedAt: Date;
  };
}) {
  const characters = skeleton.characters as SkeletonCharacter[];
  const timeline = skeleton.timeline as SkeletonTimelineBeat[];
  const plotNodes = skeleton.plotNodes as SkeletonPlotNode[];
  const patterns = skeleton.sentencePatterns as SkeletonSentencePattern[];
  const tags = skeleton.styleTags as string[];

  return (
    <div className="space-y-6 text-sm">
      <section>
        <h2 className="font-mono text-xs text-[#858585] mb-1">scene</h2>
        <p>{skeleton.scene}</p>
        <div className="mt-2 flex gap-2 flex-wrap text-xs">
          <Tag>register: {skeleton.registerLevel}</Tag>
          <Tag>vocab: {skeleton.vocabBand}</Tag>
          {tags.map((t) => (
            <Tag key={t}>#{t}</Tag>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-mono text-xs text-[#858585] mb-2">characters</h2>
        <ul className="space-y-1">
          {characters.map((c) => (
            <li key={c.name}>
              <span className="font-semibold">{c.name}</span>{" "}
              <span className="text-[#858585]">({c.role})</span> — {c.description}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-mono text-xs text-[#858585] mb-2">timeline</h2>
        <ol className="space-y-1 list-decimal list-inside">
          {timeline.map((b) => (
            <li key={b.ordinal}>
              {b.summary}{" "}
              <span className="text-[#858585] font-mono text-xs">
                [{b.sentenceOrdinals.join(",")}]
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="font-mono text-xs text-[#858585] mb-2">plot nodes</h2>
        <ul className="space-y-2">
          {plotNodes.map((n) => (
            <li key={n.id} className="border-l-2 border-[#3c3c3c] pl-3">
              <div>
                <span className="font-semibold">{n.label}</span>{" "}
                <span className="font-mono text-xs text-[#858585]">#{n.id}</span>{" "}
                {n.required ? (
                  <span className="text-xs text-[#f48771]">required</span>
                ) : (
                  <span className="text-xs text-[#858585]">optional</span>
                )}
              </div>
              <div className="text-[#cccccc]">{n.description}</div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-mono text-xs text-[#858585] mb-2">sentence patterns</h2>
        <ul className="space-y-2">
          {patterns.map((p, i) => (
            <li key={i} className="border-l-2 border-[#3c3c3c] pl-3">
              <div className="font-mono text-[#9cdcfe]">{p.template}</div>
              <div className="text-[#cccccc]">e.g. &ldquo;{p.example}&rdquo;</div>
              {p.notes && (
                <div className="text-xs text-[#858585] mt-0.5">{p.notes}</div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <footer className="text-xs text-[#858585] font-mono pt-4 border-t border-[#3c3c3c]">
        model: {skeleton.model} \u00b7 extracted: {skeleton.extractedAt.toISOString()}
      </footer>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-[#2a2d2e] px-2 py-0.5 font-mono">{children}</span>
  );
}
