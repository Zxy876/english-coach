"use client";

import { useState } from "react";
import { AuxDrawer, type AuxEvent, type AuxSentence } from "./AuxDrawer";

type SkeletonNode = {
  id: string;
  label: string;
  required: boolean;
  description: string;
};
type SkeletonPattern = { template: string; example: string };

interface SkeletonView {
  scene: string;
  registerLevel: string;
  vocabBand: string;
  plotNodes: SkeletonNode[];
  sentencePatterns: SkeletonPattern[];
}

interface Plan {
  newScene: string;
  newCharacters: string;
  keptNodes: string[];
  reusedPatterns: number[];
  notes?: string;
}

interface ExaminerQuestion {
  field: string;
  nodeId?: string;
  question: string;
  severity: "block" | "nudge";
}

interface RunnerNote { code: string; severity: string; message: string }
interface RunnerResult {
  ok: boolean;
  score: number;
  data?: Record<string, unknown> | null;
  notes: RunnerNote[];
}

interface Alignment {
  nodeId: string;
  status: "hit" | "merged" | "missing" | "extra";
  evidence: string;
  draftSpan?: string;
}
interface AlignResult {
  alignments: Alignment[];
  coverageRatio: number;
  summary: string;
}

interface Drift {
  category: string;
  nodeId: string;
  observation: string;
  question: string;
}
interface DriftResult {
  drifts: Drift[];
  overallNotes: string;
  reflection?: string | null;
}

export function RemixSurface(props: {
  sessionId: string;
  initialPhase: number;
  skeleton: SkeletonView;
  lockedNodeIds: string[];
  initialPlan: unknown;
  initialDraft: unknown;
  initialAlign: unknown;
  initialDrift: unknown;
  sentences: AuxSentence[];
  initialAuxEvents: AuxEvent[];
}) {
  const initPlan = (props.initialPlan as { plan?: Plan } | null)?.plan;
  const initDraft = (props.initialDraft as { text?: string } | null)?.text ?? "";
  const initRunner = (props.initialDraft as { runnerResult?: RunnerResult } | null)
    ?.runnerResult;

  const [phase, setPhase] = useState(props.initialPhase);

  const [plan, setPlan] = useState<Plan>(
    initPlan ?? {
      newScene: "",
      newCharacters: "",
      keptNodes: [...props.lockedNodeIds],
      reusedPatterns: [],
      notes: "",
    },
  );
  const [examiner, setExaminer] = useState<{
    ready: boolean;
    questions: ExaminerQuestion[];
    missingLocked: string[];
  } | null>(null);
  const [planBusy, setPlanBusy] = useState(false);

  const [draft, setDraft] = useState(initDraft);
  const [runner, setRunner] = useState<RunnerResult | null>(initRunner ?? null);
  const [draftBusy, setDraftBusy] = useState(false);

  const [align, setAlign] = useState<AlignResult | null>(
    props.initialAlign as AlignResult | null,
  );
  const [alignBusy, setAlignBusy] = useState(false);

  const [drift, setDrift] = useState<DriftResult | null>(
    props.initialDrift as DriftResult | null,
  );
  const [reflection, setReflection] = useState(
    (props.initialDrift as DriftResult | null)?.reflection ?? "",
  );
  const [driftBusy, setDriftBusy] = useState(false);

  async function submitPlan() {
    setPlanBusy(true);
    try {
      const res = await fetch(`/api/sessions/${props.sessionId}/plan`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      setExaminer(data);
      if (data.ready) setPhase(2);
    } finally {
      setPlanBusy(false);
    }
  }

  async function saveDraft() {
    setDraftBusy(true);
    try {
      const res = await fetch(`/api/sessions/${props.sessionId}/draft`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: draft }),
      });
      const data = await res.json();
      setRunner(data.runnerResult);
    } finally {
      setDraftBusy(false);
    }
  }

  async function runAlign() {
    setAlignBusy(true);
    try {
      const res = await fetch(`/api/sessions/${props.sessionId}/align`, {
        method: "POST",
      });
      const data = await res.json();
      setAlign(data);
      setPhase(3);
    } finally {
      setAlignBusy(false);
    }
  }

  async function runDrift() {
    setDriftBusy(true);
    try {
      const res = await fetch(`/api/sessions/${props.sessionId}/drift`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reflection }),
      });
      const data = await res.json();
      setDrift(data);
      setPhase(4);
    } finally {
      setDriftBusy(false);
    }
  }

  function toggleKeptNode(id: string) {
    if (props.lockedNodeIds.includes(id)) return; // locked
    setPlan((p) => ({
      ...p,
      keptNodes: p.keptNodes.includes(id)
        ? p.keptNodes.filter((x) => x !== id)
        : [...p.keptNodes, id],
    }));
  }

  function togglePattern(idx: number) {
    setPlan((p) => ({
      ...p,
      reusedPatterns: p.reusedPatterns.includes(idx)
        ? p.reusedPatterns.filter((x) => x !== idx)
        : [...p.reusedPatterns, idx],
    }));
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Phase tracker */}
      <div className="flex gap-2 text-xs font-mono">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => setPhase(n)}
            disabled={n > props.initialPhase && n > phase}
            className={`px-3 py-1 rounded border ${
              phase === n
                ? "bg-[#04395e] border-[#0e639c] text-white"
                : "border-[#3c3c3c] text-[#858585] hover:text-white"
            } disabled:opacity-40`}
          >
            {n}. {["Plan", "Draft", "Align", "Drift"][n - 1]}
          </button>
        ))}
      </div>

      {/* Skeleton always visible */}
      <details className="rounded border border-[#3c3c3c] p-3" open={phase === 1}>
        <summary className="cursor-pointer text-xs font-mono text-[#858585]">
          Canonical skeleton · {props.skeleton.scene} · register=
          {props.skeleton.registerLevel} · band={props.skeleton.vocabBand}
        </summary>
        <div className="mt-3 grid sm:grid-cols-2 gap-3 text-xs">
          <div>
            <div className="font-semibold mb-1">Plot nodes</div>
            <ol className="space-y-1 list-decimal pl-4">
              {props.skeleton.plotNodes.map((n) => (
                <li key={n.id}>
                  <span className={n.required ? "text-amber-300" : ""}>
                    {n.label}
                  </span>{" "}
                  <span className="text-[#858585]">[{n.id}]</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <div className="font-semibold mb-1">Sentence patterns</div>
            <ol className="space-y-1 list-decimal pl-4">
              {props.skeleton.sentencePatterns.map((p, i) => (
                <li key={i}>
                  <code className="font-mono">{p.template}</code>
                  <div className="text-[#858585]">ex: {p.example}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </details>

      {(phase === 1 || phase === 2) && (
        <AuxDrawer
          sessionId={props.sessionId}
          sentences={props.sentences}
          initialEvents={props.initialAuxEvents}
        />
      )}

      {phase === 1 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Phase 1 · Plan</h2>
          <input
            value={plan.newScene}
            onChange={(e) => setPlan({ ...plan, newScene: e.target.value })}
            placeholder="New scene (e.g. coffee shop, train station…)"
            className="w-full rounded border border-[#3c3c3c] bg-transparent px-3 py-2 text-sm"
          />
          <textarea
            value={plan.newCharacters}
            onChange={(e) => setPlan({ ...plan, newCharacters: e.target.value })}
            placeholder="New characters (name + 1-line role)"
            rows={3}
            className="w-full rounded border border-[#3c3c3c] bg-transparent px-3 py-2 text-sm font-mono"
          />
          <div className="text-xs">
            <div className="font-semibold mb-1">Plot nodes to keep</div>
            <div className="space-y-1">
              {props.skeleton.plotNodes.map((n) => {
                const locked = props.lockedNodeIds.includes(n.id);
                const checked = plan.keptNodes.includes(n.id);
                return (
                  <label key={n.id} className="flex gap-2 items-start">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked}
                      onChange={() => toggleKeptNode(n.id)}
                    />
                    <span className={locked ? "text-amber-300" : ""}>
                      {n.label} {locked && <span className="text-[10px]">(locked)</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="text-xs">
            <div className="font-semibold mb-1">Patterns to reuse</div>
            <div className="space-y-1">
              {props.skeleton.sentencePatterns.map((p, i) => (
                <label key={i} className="flex gap-2 items-start">
                  <input
                    type="checkbox"
                    checked={plan.reusedPatterns.includes(i)}
                    onChange={() => togglePattern(i)}
                  />
                  <code className="font-mono">{p.template}</code>
                </label>
              ))}
            </div>
          </div>
          <button
            onClick={submitPlan}
            disabled={planBusy}
            className="text-xs font-mono px-3 py-1 rounded bg-[#04395e] hover:bg-[#0e639c] text-white disabled:opacity-50"
          >
            {planBusy ? "examining…" : "submit plan →"}
          </button>
          {examiner && (
            <div className="rounded border border-[#3c3c3c] p-3 text-xs">
              <div className="font-semibold">
                {examiner.ready ? "✓ Plan accepted" : "Examiner questions"}
              </div>
              {examiner.missingLocked.length > 0 && (
                <div className="text-red-400 mt-1">
                  Missing required nodes: {examiner.missingLocked.join(", ")}
                </div>
              )}
              <ul className="space-y-1 mt-2">
                {examiner.questions.map((q, i) => (
                  <li key={i}>
                    <span
                      className={
                        q.severity === "block"
                          ? "text-red-400"
                          : "text-amber-300"
                      }
                    >
                      [{q.severity}]
                    </span>{" "}
                    {q.field}
                    {q.nodeId ? ` · ${q.nodeId}` : ""}: {q.question}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {phase === 2 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Phase 2 · Draft</h2>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            className="w-full rounded border border-[#3c3c3c] bg-transparent px-3 py-2 text-sm font-mono"
            placeholder="Write your remix here…"
          />
          <div className="flex gap-2">
            <button
              onClick={saveDraft}
              disabled={draftBusy || draft.trim().length === 0}
              className="text-xs font-mono px-3 py-1 rounded bg-[#04395e] hover:bg-[#0e639c] text-white disabled:opacity-50"
            >
              {draftBusy ? "checking…" : "save & check"}
            </button>
            <button
              onClick={runAlign}
              disabled={alignBusy || draft.trim().length === 0}
              className="text-xs font-mono px-3 py-1 rounded border border-[#3c3c3c] hover:bg-[#2d2d2d] disabled:opacity-50"
            >
              {alignBusy ? "aligning…" : "submit → Phase 3"}
            </button>
          </div>
          {runner && (
            <div className="rounded border border-[#3c3c3c] p-3 text-xs">
              <div>
                score: <strong>{runner.score}</strong> · ok:{" "}
                {String(runner.ok)}
              </div>
              <ul className="mt-1 space-y-1">
                {runner.notes.map((n, i) => (
                  <li key={i}>
                    <span className="text-[#858585]">[{n.severity}]</span>{" "}
                    {n.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {phase === 3 && align && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Phase 3 · Alignment</h2>
          <p className="text-xs text-[#858585]">
            coverage ratio: {align.coverageRatio.toFixed(2)} · {align.summary}
          </p>
          <table className="w-full text-xs border border-[#3c3c3c]">
            <thead className="bg-[#2d2d2d]">
              <tr>
                <th className="p-1 text-left">node</th>
                <th className="p-1 text-left">status</th>
                <th className="p-1 text-left">evidence / draft span</th>
              </tr>
            </thead>
            <tbody>
              {align.alignments.map((a, i) => (
                <tr key={i} className="border-t border-[#3c3c3c]">
                  <td className="p-1 font-mono">{a.nodeId}</td>
                  <td
                    className={`p-1 ${
                      a.status === "missing"
                        ? "text-red-400"
                        : a.status === "extra"
                        ? "text-amber-300"
                        : "text-emerald-400"
                    }`}
                  >
                    {a.status}
                  </td>
                  <td className="p-1">
                    {a.draftSpan ? `“${a.draftSpan}” — ` : ""}
                    {a.evidence}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={runDrift}
            disabled={driftBusy}
            className="text-xs font-mono px-3 py-1 rounded bg-[#04395e] hover:bg-[#0e639c] text-white disabled:opacity-50"
          >
            {driftBusy ? "analysing…" : "continue → Phase 4"}
          </button>
        </section>
      )}

      {phase === 4 && drift && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Phase 4 · Language drift</h2>
          <p className="text-xs text-[#858585]">{drift.overallNotes}</p>
          <ul className="space-y-2 text-xs">
            {drift.drifts.map((d, i) => (
              <li key={i} className="rounded border border-[#3c3c3c] p-2">
                <div className="font-mono text-[#858585]">
                  {d.category} · {d.nodeId}
                </div>
                <div className="mt-1">{d.observation}</div>
                <div className="mt-1 text-amber-300">→ {d.question}</div>
              </li>
            ))}
          </ul>
          <div>
            <div className="text-xs font-semibold mb-1">Your reflection</div>
            <textarea
              value={reflection ?? ""}
              onChange={(e) => setReflection(e.target.value)}
              rows={4}
              className="w-full rounded border border-[#3c3c3c] bg-transparent px-3 py-2 text-sm font-mono"
              placeholder="What did you notice? What would you try next time?"
            />
            <button
              onClick={runDrift}
              disabled={driftBusy}
              className="mt-2 text-xs font-mono px-3 py-1 rounded border border-[#3c3c3c] hover:bg-[#2d2d2d] disabled:opacity-50"
            >
              save reflection
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
