"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface LessonOpt { id: string; label: string }
interface SkeletonNode { id: string; label: string; required: boolean }
interface Skeleton {
  scene: string;
  registerLevel: string;
  vocabBand: string;
  plotNodes: SkeletonNode[];
}
interface Scaffold {
  title: string;
  instructions: string;
  vocabBandCap: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
  lockedNodeIds: string[];
  rationale: string;
}

const BANDS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export function AuthoringConsole({ lessons }: { lessons: LessonOpt[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"nce" | "custom">("nce");
  const [lessonId, setLessonId] = useState<string>(lessons[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [skeleton, setSkeleton] = useState<Skeleton | null>(null);
  const [scaffold, setScaffold] = useState<Scaffold | null>(null);

  // custom-text tab state
  const [customTitle, setCustomTitle] = useState("");
  const [customText, setCustomText] = useState("");

  async function runScaffold(id: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/author/scaffold", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lessonId: id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "scaffold failed");
      setSkeleton(data.skeleton as Skeleton);
      setScaffold(data.scaffold as Scaffold);
    } catch (e) {
      setError(e instanceof Error ? e.message : "scaffold failed");
    } finally {
      setBusy(false);
    }
  }

  async function publish(asDraft: boolean) {
    if (!scaffold || !lessonId) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/author/exercises", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lessonId,
          title: scaffold.title,
          instructions: scaffold.instructions,
          vocabBandCap: scaffold.vocabBandCap,
          lockedNodeIds: scaffold.lockedNodeIds,
          publish: !asDraft,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "publish failed");
      router.push("/exercises");
    } catch (e) {
      setError(e instanceof Error ? e.message : "publish failed");
      setBusy(false);
    }
  }

  async function uploadCustomText() {
    if (!customTitle.trim() || !customText.trim()) {
      setError("Title and text are both required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/author/custom-text", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: customTitle, text: customText }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "custom-text failed");
      // Jump into the NCE flow targeting the new lesson.
      setTab("nce");
      setLessonId(data.lessonId);
      await runScaffold(data.lessonId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "custom-text failed");
    } finally {
      setBusy(false);
    }
  }

  function toggleLock(nodeId: string) {
    if (!scaffold) return;
    const set = new Set(scaffold.lockedNodeIds);
    if (set.has(nodeId)) set.delete(nodeId);
    else set.add(nodeId);
    setScaffold({ ...scaffold, lockedNodeIds: [...set] });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-[#3c3c3c]">
        <TabBtn active={tab === "nce"} onClick={() => setTab("nce")}>From NCE lesson</TabBtn>
        <TabBtn active={tab === "custom"} onClick={() => setTab("custom")}>From custom text</TabBtn>
      </div>

      {tab === "nce" ? (
        <div className="space-y-3">
          <label className="text-xs flex gap-2 items-center">
            <span className="text-[#858585]">lesson:</span>
            <select
              value={lessonId}
              onChange={(e) => {
                setLessonId(e.target.value);
                setSkeleton(null);
                setScaffold(null);
              }}
              className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-xs flex-1"
            >
              {lessons.length === 0 ? (
                <option value="">— no lessons with skeletons yet —</option>
              ) : (
                lessons.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))
              )}
            </select>
            <button
              onClick={() => runScaffold(lessonId)}
              disabled={!lessonId || busy}
              className="px-3 py-1 border border-[#3794ff] text-[#3794ff] rounded text-xs disabled:opacity-50"
            >
              {busy ? "…" : "Draft with model"}
            </button>
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Lesson title (e.g. The night train)"
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-sm"
          />
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Paste English text (at least 3 sentences)…"
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-2 text-sm font-mono h-48"
          />
          <button
            onClick={uploadCustomText}
            disabled={busy}
            className="px-3 py-1 border border-[#3794ff] text-[#3794ff] rounded text-xs disabled:opacity-50"
          >
            {busy ? "Extracting skeleton…" : "Extract skeleton + draft"}
          </button>
        </div>
      )}

      {error && (
        <div className="border border-red-500 rounded p-2 text-xs text-red-400">{error}</div>
      )}

      {scaffold && skeleton && (
        <section className="space-y-4 border-t border-[#3c3c3c] pt-4">
          <div className="text-xs text-[#858585]">
            <strong className="text-[#cccccc]">Rationale:</strong> {scaffold.rationale}
          </div>

          <Field label="Title">
            <input
              value={scaffold.title}
              onChange={(e) => setScaffold({ ...scaffold, title: e.target.value })}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-sm"
            />
          </Field>

          <Field label="Instructions (markdown, shown to student)">
            <textarea
              value={scaffold.instructions}
              onChange={(e) => setScaffold({ ...scaffold, instructions: e.target.value })}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-2 text-sm font-mono h-40"
            />
          </Field>

          <Field label={`Vocab band cap (skeleton suggests ${skeleton.vocabBand})`}>
            <div className="flex gap-1 text-xs">
              <Pill
                active={scaffold.vocabBandCap === null}
                onClick={() => setScaffold({ ...scaffold, vocabBandCap: null })}
              >
                none
              </Pill>
              {BANDS.map((b) => (
                <Pill
                  key={b}
                  active={scaffold.vocabBandCap === b}
                  onClick={() => setScaffold({ ...scaffold, vocabBandCap: b })}
                >
                  {b}
                </Pill>
              ))}
            </div>
          </Field>

          <Field label={`Locked plot nodes (${scaffold.lockedNodeIds.length})`}>
            <ul className="space-y-1 text-xs">
              {skeleton.plotNodes.map((n) => {
                const locked = scaffold.lockedNodeIds.includes(n.id);
                return (
                  <li key={n.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={locked}
                      onChange={() => toggleLock(n.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-mono text-[#858585]">{n.id}</span>{" "}
                      <span className={n.required ? "text-amber-300" : ""}>{n.label}</span>
                      {n.required && <span className="ml-1 text-[#858585]">(required)</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Field>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => publish(true)}
              disabled={busy}
              className="px-3 py-1 border border-[#3c3c3c] rounded text-xs disabled:opacity-50"
            >
              Save as draft
            </button>
            <button
              onClick={() => publish(false)}
              disabled={busy}
              className="px-3 py-1 border border-emerald-500 text-emerald-300 rounded text-xs disabled:opacity-50"
            >
              {busy ? "…" : "Publish"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-mono text-[#858585] mb-1">{label}</div>
      {children}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs border-b-2 -mb-px ${active ? "border-[#3794ff] text-white" : "border-transparent text-[#858585]"}`}
    >
      {children}
    </button>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded border ${active ? "border-[#3794ff] text-[#3794ff]" : "border-[#3c3c3c] text-[#858585]"}`}
    >
      {children}
    </button>
  );
}
