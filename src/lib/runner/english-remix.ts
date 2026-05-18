// Placeholder English remix runner. Real implementation lands in R4 \u2014 at
// that point this file gets replaced with the full alignment + drift
// extraction pipeline (canonical-vs-remix diff, language drift scoring via
// the Opus prompt rewrite in `src/lib/opus/prompts/intent-diff.ts`).
//
// For R1 the runner just echoes a deterministic stub so downstream wiring
// (registry lookup, session event persistence, UI rendering) can be built
// and tested against a real `Runner` implementation rather than a mock
// scattered across test files.

import type { Runner, RunnerInput, RunnerResult } from "./types";

export const englishRemixRunner: Runner = {
  kind: "english-remix",
  async evaluate(input: RunnerInput): Promise<RunnerResult> {
    const submission = input.submission.trim();
    if (submission.length === 0) {
      return {
        ok: false,
        score: 0,
        notes: [
          {
            severity: "error",
            message: "Empty remix \u2014 write at least one sentence.",
          },
        ],
      };
    }

    // Stub heuristic: just count sentences and report a placeholder note.
    // R4 swaps this for the real alignment pass.
    const sentences = submission
      .split(/[.!?\u3002\uff01\uff1f]+/u)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return {
      ok: true,
      score: null,
      notes: [
        {
          severity: "info",
          message:
            `Placeholder runner: counted ${sentences.length} sentence(s). ` +
            "Skeleton-aware scoring lands in round R4.",
        },
      ],
      data: { sentenceCount: sentences.length },
    };
  },
};
