import Link from "next/link";
import { notFound } from "next/navigation";
import { buildCohortDigest } from "@/lib/remix/cohort";
import { callOpusAndParse } from "@/lib/opus/client";
import {
  REMIX_COHORT_NARRATIVE_SYSTEM,
  RemixCohortNarrativeSchema,
  buildRemixCohortNarrativeUserMessage,
  type RemixCohortNarrative,
} from "@/lib/opus/prompts/remix-cohort-narrative";

export const dynamic = "force-dynamic";

export default async function Page(
  ctx: { params: Promise<{ exerciseId: string }> },
) {
  const { exerciseId } = await ctx.params;
  const digest = await buildCohortDigest(exerciseId);
  if (!digest) notFound();

  let narrative: RemixCohortNarrative | null = null;
  let narrativeError: string | null = null;
  if (digest.attempts === 0) {
    narrativeError = "No sessions yet for this exercise.";
  } else {
    try {
      narrative = await callOpusAndParse({
        promptName: "remix-cohort-narrative",
        system: REMIX_COHORT_NARRATIVE_SYSTEM,
        messages: [{ role: "user", content: buildRemixCohortNarrativeUserMessage(digest) }],
        schema: RemixCohortNarrativeSchema,
        maxTokens: 1800,
      });
    } catch (err) {
      narrativeError = err instanceof Error ? err.message : "narrative unavailable";
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <nav className="text-xs text-[#858585] mb-4 flex gap-2">
        <Link href="/cohorts" className="hover:text-white">cohorts</Link>
        <span>/</span>
        <span className="text-[#cccccc]">{digest.exerciseTitle}</span>
      </nav>

      <header className="mb-4">
        <h1 className="text-xl font-semibold">{digest.exerciseTitle}</h1>
        <p className="text-xs font-mono text-[#858585] mt-1">
          {digest.bookKey} L{digest.lessonOrdinal} · attempts={digest.attempts} ·
          completed={digest.completed} · avg-phase={digest.averagePhaseReached.toFixed(2)}
          {digest.averageAlignCoverage !== null && (
            <> · avg-coverage={digest.averageAlignCoverage.toFixed(2)}</>
          )}
          {digest.averageDriftCount !== null && (
            <> · avg-drifts={digest.averageDriftCount.toFixed(1)}</>
          )}
        </p>
      </header>

      {narrativeError ? (
        <div className="border border-[#3c3c3c] rounded p-3 text-xs text-[#858585]">
          {narrativeError}
        </div>
      ) : narrative ? (
        <section className="space-y-4">
          <Card title="Headline">
            <p className="text-sm">{narrative.headline}</p>
          </Card>
          <Card title="Class summary">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{narrative.classSummary}</p>
          </Card>
          <Card title={`Drift patterns (${narrative.driftPatterns.length})`}>
            {narrative.driftPatterns.length === 0 ? (
              <Empty />
            ) : (
              <ul className="space-y-3">
                {narrative.driftPatterns.map((d, i) => (
                  <li key={i} className="border-l-2 border-[#3c3c3c] pl-3 text-xs">
                    <div className="font-mono text-[#858585]">
                      {d.category} · affects {d.affectedStudents}
                    </div>
                    <div className="text-sm font-semibold mt-0.5">{d.pattern}</div>
                    <div className="mt-1"><strong>evidence:</strong> {d.evidence}</div>
                    <div className="mt-1 text-amber-300"><strong>suggestion:</strong> {d.suggestion}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {narrative.recommendedMicroLesson && (
            <Card title="Recommended micro-lesson">
              <div className="text-xs">
                <div className="font-semibold text-sm">{narrative.recommendedMicroLesson.title}</div>
                <div className="mt-1">{narrative.recommendedMicroLesson.rationale}</div>
              </div>
            </Card>
          )}
          {narrative.brightSpots.length > 0 && (
            <Card title="Bright spots">
              <ul className="text-xs space-y-1 list-disc pl-4">
                {narrative.brightSpots.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </Card>
          )}
        </section>
      ) : null}

      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold text-[#cccccc]">Raw digest</h2>
        <Card title={`Top missing required nodes (${digest.topMissingNodes.length})`}>
          {digest.topMissingNodes.length === 0 ? (
            <Empty />
          ) : (
            <table className="w-full text-xs border border-[#3c3c3c]">
              <thead className="bg-[#2d2d2d]">
                <tr><th className="p-1 text-left">node</th><th className="p-1 text-left">label</th><th className="p-1 text-right">count</th></tr>
              </thead>
              <tbody>
                {digest.topMissingNodes.map((m) => (
                  <tr key={m.nodeId} className="border-t border-[#3c3c3c]">
                    <td className="p-1 font-mono">{m.nodeId}</td>
                    <td className="p-1">{m.label}</td>
                    <td className="p-1 font-mono text-right">{m.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title="Drift category histogram">
          {digest.driftCategoryHistogram.length === 0 ? (
            <Empty />
          ) : (
            <ul className="text-xs font-mono space-y-0.5">
              {digest.driftCategoryHistogram.map((c) => (
                <li key={c.category}>
                  {c.category.padEnd(16, " ")} {"█".repeat(Math.min(c.count, 24))} {c.count}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#3c3c3c] rounded">
      <div className="px-3 py-1 border-b border-[#3c3c3c] bg-[#252526] text-xs font-mono">
        {title}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function Empty() {
  return <span className="text-[#858585] italic text-xs">— no data —</span>;
}
