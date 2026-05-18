// english-dictation runner. Caller plays a sentence (TTS), student types
// what they heard, the runner scores both token-level similarity and
// exact-string fidelity.
//
// payload:
//   { referenceText: string, sentenceId?: string }

import type { Runner, RunnerInput, RunnerNote, RunnerResult } from "./types";
import { similarity, tokenise } from "./similarity";

interface DictationPayload {
  referenceText: string;
  sentenceId?: string;
}

export const englishDictationRunner: Runner = {
  kind: "english-dictation",
  async evaluate(input: RunnerInput): Promise<RunnerResult> {
    const submission = input.submission.trim();
    const payload = input.payload as DictationPayload | undefined;
    if (!payload?.referenceText) {
      return {
        ok: false,
        score: 0,
        notes: [{ severity: "error", message: "Missing referenceText for dictation." }],
      };
    }
    if (submission.length === 0) {
      return {
        ok: false,
        score: 0,
        notes: [{ severity: "error", message: "No transcription provided." }],
      };
    }

    const score = Math.round(similarity(payload.referenceText, submission) * 100) / 100;
    const refTokens = tokenise(payload.referenceText);
    const subTokens = tokenise(submission);
    const exact = payload.referenceText.trim() === submission;

    const notes: RunnerNote[] = [];
    if (exact) {
      notes.push({ severity: "info", message: "Perfect transcription." });
    } else if (score >= 0.9) {
      notes.push({ severity: "info", message: `Close (${score.toFixed(2)}). Minor word-level differences.` });
    } else if (score >= 0.6) {
      notes.push({ severity: "warn", message: `Partial (${score.toFixed(2)}). Listen again and check word order.` });
    } else {
      notes.push({ severity: "warn", message: `Low similarity (${score.toFixed(2)}). Replay the sentence and try again.` });
    }

    return {
      ok: score >= 0.6,
      score,
      notes,
      data: {
        sentenceId: payload.sentenceId,
        exact,
        referenceTokenCount: refTokens.length,
        submissionTokenCount: subTokens.length,
      },
    };
  },
};
