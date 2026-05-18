// english-shadowing runner. Student listens to a reference sentence and
// re-utters it; the browser ASR transcript is sent up as `submission`.
// We score by token similarity plus a basic "rhythm" proxy = ratio of
// submission token count to reference token count (clamped to [0, 1]).
//
// payload:
//   { referenceText: string, sentenceId?: string, durationMs?: number }

import type { Runner, RunnerInput, RunnerNote, RunnerResult } from "./types";
import { similarity, tokenise } from "./similarity";

interface ShadowingPayload {
  referenceText: string;
  sentenceId?: string;
  durationMs?: number;
}

export const englishShadowingRunner: Runner = {
  kind: "english-shadowing",
  async evaluate(input: RunnerInput): Promise<RunnerResult> {
    const submission = input.submission.trim();
    const payload = input.payload as ShadowingPayload | undefined;
    if (!payload?.referenceText) {
      return {
        ok: false,
        score: 0,
        notes: [{ severity: "error", message: "Missing referenceText for shadowing." }],
      };
    }
    if (submission.length === 0) {
      return {
        ok: false,
        score: 0,
        notes: [{ severity: "error", message: "No ASR transcript provided." }],
      };
    }

    const sim = similarity(payload.referenceText, submission);
    const refTokens = tokenise(payload.referenceText).length;
    const subTokens = tokenise(submission).length;

    // Rhythm score: penalises both omissions and run-on filler.
    const ratio = refTokens === 0 ? 1 : Math.min(subTokens, refTokens) / Math.max(subTokens, refTokens);
    const score = Math.round((sim * 0.7 + ratio * 0.3) * 100) / 100;

    const notes: RunnerNote[] = [];
    notes.push({
      severity: "info",
      message: `Similarity ${sim.toFixed(2)}, rhythm ${ratio.toFixed(2)}.`,
    });
    if (subTokens < refTokens * 0.6) {
      notes.push({ severity: "warn", message: "Several words missing — slow down and articulate each one." });
    } else if (subTokens > refTokens * 1.4) {
      notes.push({ severity: "warn", message: "Extra filler words detected — try to match the reference rhythm." });
    }

    return {
      ok: score >= 0.5,
      score,
      notes,
      data: {
        sentenceId: payload.sentenceId,
        similarity: sim,
        rhythm: ratio,
        refTokens,
        subTokens,
        durationMs: payload.durationMs,
      },
    };
  },
};
