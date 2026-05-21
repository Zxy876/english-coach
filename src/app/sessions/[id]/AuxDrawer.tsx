"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface AuxSentence {
  id: string;
  ordinal: number;
  english: string;
  chinese: string;
}

export interface AuxEvent {
  id: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

type Mode = "dictation" | "shadowing" | "read-aloud";

const MODE_LABEL: Record<Mode, string> = {
  dictation: "Dictation",
  shadowing: "Shadowing",
  "read-aloud": "Read aloud",
};

const RUNNER_KIND: Record<Mode, string> = {
  dictation: "english-dictation",
  shadowing: "english-shadowing",
  "read-aloud": "english-read-aloud",
};

interface RunnerResult {
  ok: boolean;
  score: number;
  notes: Array<{ severity: string; message: string }>;
  data?: Record<string, unknown>;
}

export function AuxDrawer(props: {
  sessionId: string;
  sentences: AuxSentence[];
  initialEvents: AuxEvent[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("dictation");
  const [activeIdx, setActiveIdx] = useState(0);
  const [submission, setSubmission] = useState("");
  const [result, setResult] = useState<RunnerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<AuxEvent[]>(props.initialEvents);
  const lastAttemptRef = useRef<Record<string, number>>({});

  // 健壮性防御：sentences 为空或 activeIdx 越界直接兜底
  if (!props.sentences || props.sentences.length === 0 || activeIdx >= props.sentences.length) {
    return <div className="text-red-400 text-xs">No sentences available for this session.</div>;
  }

  const active = props.sentences[activeIdx];

  const ttsAvailable = useMemo(
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    [],
  );

  // Reset submission/result when switching sentence/mode.
  useEffect(() => {
    setSubmission("");
    setResult(null);
  }, [activeIdx, mode]);

  function playReference() {
    if (!ttsAvailable || !active) return;
    const utter = new SpeechSynthesisUtterance(active.english);
    utter.lang = "en-US";
    utter.rate = mode === "shadowing" ? 0.95 : 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  async function submit() {
    if (!active || submission.trim().length === 0) return;
    setBusy(true);
    try {
      const key = `${mode}:${active.id}`;
      const lastAttemptMs = lastAttemptRef.current[key];
      const res = await fetch(`/api/sessions/${props.sessionId}/aux`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: RUNNER_KIND[mode],
          submission,
          payload: {
            referenceText: active.english,
            sentenceId: active.id,
            lastAttemptMs,
          },
        }),
      });
      const data = (await res.json()) as { result: RunnerResult };
      setResult(data.result);
      lastAttemptRef.current[key] = Date.now();
      setEvents((prev) => [
        {
          id: `local-${Date.now()}`,
          createdAt: new Date().toISOString(),
          payload: {
            training: RUNNER_KIND[mode],
            sentenceId: active.id,
            referenceText: active.english,
            submission,
            score: data.result.score,
            ok: data.result.ok,
          },
        },
        ...prev,
      ].slice(0, 10));
    } finally {
      setBusy(false);
    }
  }

  if (props.sentences.length === 0) return null;

  return (
    <div className="border border-[#3c3c3c] rounded">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-3 py-2 text-xs font-mono text-[#cccccc] hover:bg-[#2d2d2d] flex justify-between"
      >
        <span>
          {open ? "▾" : "▸"} Aux training drawer ·{" "}
          {events.length} recent attempt(s)
        </span>
        <span className="text-[#858585]">
          {MODE_LABEL[mode]} · sentence {activeIdx + 1}/{props.sentences.length}
        </span>
      </button>
      {open && (
        <div className="p-3 space-y-3 border-t border-[#3c3c3c]">
          <div className="flex gap-2 text-xs font-mono">
            {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2 py-1 rounded border ${
                  mode === m
                    ? "bg-[#04395e] border-[#0e639c] text-white"
                    : "border-[#3c3c3c] text-[#858585] hover:text-white"
                }`}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>

          <div className="flex gap-2 text-xs items-center">
            <button
              onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
              disabled={activeIdx === 0}
              className="font-mono px-2 py-0.5 border border-[#3c3c3c] rounded disabled:opacity-40"
            >
              ←
            </button>
            <button
              onClick={() =>
                setActiveIdx((i) => Math.min(props.sentences.length - 1, i + 1))
              }
              disabled={activeIdx === props.sentences.length - 1}
              className="font-mono px-2 py-0.5 border border-[#3c3c3c] rounded disabled:opacity-40"
            >
              →
            </button>
            <span className="text-[#858585] font-mono">
              #{active.ordinal}
            </span>
          </div>

          <div className="rounded border border-[#3c3c3c] p-2 text-sm">
            {mode === "dictation" ? (
              <span className="text-[#858585] italic">
                Sentence hidden. Press play, then type what you hear.
              </span>
            ) : (
              <>
                <div>{active.english}</div>
                {active.chinese && (
                  <div className="text-xs text-[#858585] mt-1">{active.chinese}</div>
                )}
              </>
            )}
          </div>

          <div className="flex gap-2 text-xs">
            <button
              onClick={playReference}
              disabled={!ttsAvailable}
              className="font-mono px-2 py-1 rounded bg-[#04395e] hover:bg-[#0e639c] text-white disabled:opacity-50"
            >
              ▶ play
            </button>
            {!ttsAvailable && (
              <span className="text-[#858585]">TTS unavailable in this browser.</span>
            )}
          </div>

          <textarea
            value={submission}
            onChange={(e) => setSubmission(e.target.value)}
            rows={3}
            placeholder={
              mode === "dictation"
                ? "Type the sentence you heard…"
                : mode === "shadowing"
                ? "Type what you said (or paste ASR transcript)…"
                : "Type the sentence you read aloud…"
            }
            className="w-full rounded border border-[#3c3c3c] bg-transparent px-2 py-1 text-sm font-mono"
          />

          <button
            onClick={submit}
            disabled={busy || submission.trim().length === 0}
            className="text-xs font-mono px-3 py-1 rounded bg-[#04395e] hover:bg-[#0e639c] text-white disabled:opacity-50"
          >
            {busy ? "scoring…" : "score"}
          </button>

          {result && (
            <div className="text-xs rounded border border-[#3c3c3c] p-2">
              <div>
                score: <strong>{result.score}</strong> · ok: {String(result.ok)}
              </div>
              <ul className="mt-1 space-y-0.5">
                {result.notes.map((n, i) => (
                  <li key={i}>
                    <span className="text-[#858585]">[{n.severity}]</span> {n.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {events.length > 0 && (
            <div className="text-xs">
              <div className="font-semibold mb-1">Recent attempts (回灌素材)</div>
              <ul className="space-y-1">
                {events.slice(0, 5).map((e) => (
                  <li key={e.id} className="font-mono text-[#858585]">
                    {String(e.payload.training).replace("english-", "")} · #
                    {String(e.payload.sentenceId ?? "?").slice(0, 6)} · score=
                    {String(e.payload.score)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
