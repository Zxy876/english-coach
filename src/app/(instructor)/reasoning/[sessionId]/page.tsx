import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { RemixDraftData, RemixPlanData } from "@/lib/remix/types";

export const dynamic = "force-dynamic";

interface SkeletonNode { id: string; label: string; required: boolean; description: string }
interface SkeletonPattern { template: string; example: string }
interface Alignment { nodeId: string; status: string; evidence: string; draftSpan?: string }
interface Drift { category: string; nodeId: string; observation: string; question: string }

export default async function Page(
  ctx: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await ctx.params;
  const session = await prisma.remixSession.findUnique({
    where: { id: sessionId },
    include: {
      exercise: { include: { lesson: { include: { skeleton: true } } } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!session || !session.exercise.lesson.skeleton) notFound();

  const skeleton = session.exercise.lesson.skeleton;
  const plotNodes = skeleton.plotNodes as unknown as SkeletonNode[];
  const patterns = skeleton.sentencePatterns as unknown as SkeletonPattern[];
  const planData = session.planData as RemixPlanData | null;
  const draftData = session.draftData as RemixDraftData | null;
  const align = session.alignData as { alignments: Alignment[]; coverageRatio: number; summary: string } | null;
  const drift = session.driftData as { drifts: Drift[]; overallNotes: string; reflection?: string | null } | null;

  return (
    <main className="min-h-screen p-6 max-w-6xl mx-auto">
      <nav className="text-xs text-[#858585] mb-4 flex gap-2">
        <Link href="/live" className="hover:text-white">live</Link>
        <span>/</span>
        <span className="text-[#cccccc]">reasoning</span>
      </nav>
      <header className="mb-4">
        <h1 className="text-xl font-semibold">{session.exercise.title}</h1>
        <p className="text-xs font-mono text-[#858585] mt-1">
          student={session.studentId} · phase={session.currentPhase}
          {session.completedAt && " · completed"} · started=
          {session.startedAt.toISOString()}
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        {/* LEFT: student artifacts */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-[#cccccc]">Student artifacts</h2>

          <Card title="Plan">
            {planData ? (
              <div className="text-xs space-y-1">
                <div><strong>scene:</strong> {planData.plan.newScene}</div>
                <div><strong>characters:</strong> {planData.plan.newCharacters}</div>
                <div><strong>kept nodes:</strong> {planData.plan.keptNodes.join(", ") || "—"}</div>
                <div><strong>reused patterns:</strong> {planData.plan.reusedPatterns.join(", ") || "—"}</div>
                {planData.plan.notes && <div><strong>notes:</strong> {planData.plan.notes}</div>}
                <div className="mt-2">
                  <strong>Examiner log ({planData.examinerLog.length}):</strong>
                  <ul className="mt-1 space-y-1">
                    {planData.examinerLog.map((entry, i) => (
                      <li key={i} className="border-l-2 border-[#3c3c3c] pl-2">
                        <div className="text-[#858585]">
                          {entry.at} · ready={String(entry.ready)} · questions={entry.questions.length}
                        </div>
                        {entry.questions.slice(0, 3).map((q, j) => (
                          <div key={j}>
                            <span className={q.severity === "block" ? "text-red-400" : "text-amber-300"}>
                              [{q.severity}]
                            </span>{" "}
                            {q.field}{q.nodeId ? "·" + q.nodeId : ""}: {q.question}
                          </div>
                        ))}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : <Empty />}
          </Card>

          <Card title="Draft">
            {draftData ? (
              <div className="text-xs space-y-2">
                <div className="font-mono text-[#858585]">
                  {draftData.text.length} bytes · saved {draftData.savedAt}
                </div>
                <pre className="whitespace-pre-wrap font-mono text-[13px] border border-[#3c3c3c] p-2 rounded">{draftData.text}</pre>
              </div>
            ) : <Empty />}
          </Card>

          <Card title="Reflection">
            <div className="text-xs">
              {drift?.reflection ? drift.reflection : <Empty />}
            </div>
          </Card>

          <Card title="Events">
            <ul className="text-[11px] space-y-0.5 font-mono">
              {session.events.map((e: { id: string; createdAt: Date; kind: string }) => (
                <li key={e.id} className="text-[#858585]">
                  {e.createdAt.toISOString()} · <span className="text-[#cccccc]">{e.kind}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* RIGHT: instructor / system observations */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-[#cccccc]">System reasoning</h2>

          <Card title="Skeleton">
            <div className="text-xs">
              <div><strong>scene:</strong> {skeleton.scene}</div>
              <div><strong>register:</strong> {skeleton.registerLevel}</div>
              <div><strong>vocab band:</strong> {skeleton.vocabBand}</div>
              <div className="mt-2"><strong>plot nodes:</strong></div>
              <ol className="list-decimal pl-4">
                {plotNodes.map((n) => (
                  <li key={n.id}>
                    <span className={n.required ? "text-amber-300" : ""}>{n.label}</span>{" "}
                    <span className="text-[#858585]">[{n.id}]</span>
                  </li>
                ))}
              </ol>
              <div className="mt-2"><strong>patterns:</strong></div>
              <ol className="list-decimal pl-4 font-mono">
                {patterns.map((p, i) => <li key={i}>{p.template}</li>)}
              </ol>
            </div>
          </Card>

          <Card title="Alignment (Phase 3)">
            {align ? (
              <div className="text-xs space-y-2">
                <div className="text-[#858585]">
                  coverage={align.coverageRatio.toFixed(2)} — {align.summary}
                </div>
                <table className="w-full border border-[#3c3c3c]">
                  <thead className="bg-[#2d2d2d]">
                    <tr><th className="p-1 text-left">node</th><th className="p-1 text-left">status</th><th className="p-1 text-left">evidence</th></tr>
                  </thead>
                  <tbody>
                    {align.alignments.map((a, i) => (
                      <tr key={i} className="border-t border-[#3c3c3c]">
                        <td className="p-1 font-mono">{a.nodeId}</td>
                        <td className={`p-1 ${a.status === "missing" ? "text-red-400" : a.status === "extra" ? "text-amber-300" : "text-emerald-400"}`}>{a.status}</td>
                        <td className="p-1">{a.draftSpan ? `“${a.draftSpan}” — ` : ""}{a.evidence}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty />}
          </Card>

          <Card title="Drift (Phase 4)">
            {drift ? (
              <div className="text-xs space-y-2">
                <div className="text-[#858585]">{drift.overallNotes}</div>
                <ul className="space-y-1">
                  {drift.drifts.map((d, i) => (
                    <li key={i} className="border border-[#3c3c3c] rounded p-2">
                      <div className="font-mono text-[#858585]">{d.category} · {d.nodeId}</div>
                      <div>{d.observation}</div>
                      <div className="text-amber-300">→ {d.question}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : <Empty />}
          </Card>
        </section>
      </div>
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
  return <span className="text-[#858585] italic text-xs">— not yet —</span>;
}
