// english-read-aloud runner. The student is shown a canonical sentence and
// reads it aloud; the ASR transcript is submitted. Differs from shadowing in
// that the text is visible during reading (cold reading vs imitation) and
// the runner enforces a per-sentence cooldown to discourage instant
// re-attempts that game the score.
//
// payload:
//   { referenceText: string, sentenceId?: string, lastAttemptMs?: number }

import type { Runner, RunnerInput, RunnerNote, RunnerResult } from "./types";
import { similarity } from "./similarity";

interface ReadAloudPayload {
  referenceText: string;
  sentenceId?: string;
  lastAttemptMs?: number;
  cooldownMs?: number;
}

const DEFAULT_COOLDOWN_MS = 15_000;

export const englishReadAloudRunner: Runner = {
  kind: "english-read-aloud",
  async evaluate(input: RunnerInput): Promise<RunnerResult> {
    const submission = input.submission.trim();
    const payload = input.payload as ReadAloudPayload | undefined;
    if (!payload?.referenceText) {
      return {
        ok: false,
        score: 0,
        notes: [{ severity: "error", message: "Missing referenceText for read-aloud." }],
      };
    }

    const cooldown = payload.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    if (payload.lastAttemptMs !== undefined) {
      const elapsed = Date.now() - payload.lastAttemptMs;
      if (elapsed < cooldown) {
        const wait = Math.ceil((cooldown - elapsed) / 1000);
        return {
          ok: false,
          score: 0,
          notes: [{ severity: "warn", message: `Cooldown active — wait ${wait}s before re-reading.` }],
        };
      }
    }

    if (submission.length === 0) {
      return {
        ok: false,
        score: 0,
        notes: [{ severity: "error", message: "No transcript captured." }],
      };
    }

    const score = Math.round(similarity(payload.referenceText, submission) * 100) / 100;
    const notes: RunnerNote[] = [];
    if (score >= 0.95) notes.push({ severity: "info", message: "Read aloud accurately." });
    else if (score >= 0.8) notes.push({ severity: "info", message: `Score ${score.toFixed(2)} — close to canonical.` });
    else notes.push({ severity: "warn", message: `Score ${score.toFixed(2)} — check pronunciation of any flagged words.` });

    return {
      ok: score >= 0.7,
      score,
      notes,
      data: {
        sentenceId: payload.sentenceId,
        attemptedAt: Date.now(),
      },
    };
  },
};
