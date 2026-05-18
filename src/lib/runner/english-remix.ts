// English remix runner (R4). Replaces the R1 placeholder.
//
// Inputs (passed via RunnerInput):
//   - submission: student draft text
//   - payload: { plan, skeleton }
//
// Computes deterministic heuristics that DON'T require an LLM call:
//   - sentence count
//   - required-plot-node lexical coverage (label/id token appears in draft)
//   - reused-pattern keyword hit rate
//   - vocab-band proxy: average sentence length flagged when >> cap
//
// The LLM-driven structural alignment runs separately via the
// `/api/sessions/[id]/align` endpoint.

import type { Runner, RunnerInput, RunnerResult, RunnerNote } from "./types";

interface RemixPayloadPlotNode {
  id: string;
  label: string;
  required: boolean;
}
interface RemixPayloadPattern {
  template: string;
  example: string;
}
interface RemixPayload {
  plan: {
    keptNodes: string[];
    reusedPatterns: number[];
  };
  skeleton: {
    plotNodes: RemixPayloadPlotNode[];
    sentencePatterns: RemixPayloadPattern[];
    vocabBand?: string;
  };
}

export const englishRemixRunner: Runner = {
  kind: "english-remix",
  async evaluate(input: RunnerInput): Promise<RunnerResult> {
    const submission = input.submission.trim();
    if (submission.length === 0) {
      return {
        ok: false,
        score: 0,
        notes: [
          { severity: "error", message: "Empty remix — write at least one sentence." },
        ],
      };
    }

    const payload = input.payload as RemixPayload | undefined;
    const sentences = splitSentences(submission);
    const notes: RunnerNote[] = [];

    if (!payload) {
      return {
        ok: true,
        score: null,
        notes: [
          { severity: "info", message: `Counted ${sentences.length} sentence(s).` },
        ],
        data: { sentenceCount: sentences.length },
      };
    }

    const draftLower = submission.toLowerCase();

    const requiredNodes = payload.skeleton.plotNodes.filter((n) => n.required);
    const keptRequiredHits = requiredNodes.filter(
      (n) =>
        payload.plan.keptNodes.includes(n.id) && nodeMentioned(n, draftLower),
    );
    const requiredCoverage =
      requiredNodes.length === 0
        ? 1
        : keptRequiredHits.length / requiredNodes.length;

    if (requiredCoverage < 1) {
      const missing = requiredNodes
        .filter((n) => !keptRequiredHits.includes(n))
        .map((n) => n.label);
      notes.push({
        severity: "warn",
        message: `Required plot nodes not yet evident in draft: ${missing.join(", ")}`,
      });
    }

    const reusedHits = payload.plan.reusedPatterns.filter((idx) => {
      const p = payload.skeleton.sentencePatterns[idx];
      if (!p) return false;
      const keyword = patternKeyword(p.template);
      return keyword.length > 0 && draftLower.includes(keyword.toLowerCase());
    }).length;
    const reusedTotal = payload.plan.reusedPatterns.length;
    if (reusedTotal > 0 && reusedHits < reusedTotal) {
      notes.push({
        severity: "info",
        message: `Reused patterns evidence: ${reusedHits}/${reusedTotal} keyword(s) detected in draft.`,
      });
    }

    const avgLen = avgWordCount(sentences);
    const cap = vocabBandCap(payload.skeleton.vocabBand);
    if (cap && avgLen > cap) {
      notes.push({
        severity: "warn",
        message: `Average sentence length ${avgLen.toFixed(
          1,
        )} words exceeds typical ${payload.skeleton.vocabBand} cap (~${cap}).`,
      });
    }

    const reusedScore = reusedTotal === 0 ? 1 : reusedHits / reusedTotal;
    const score =
      Math.round((requiredCoverage * 0.7 + reusedScore * 0.3) * 100) / 100;

    return {
      ok: notes.every((n) => n.severity !== "error"),
      score,
      notes,
      data: {
        sentenceCount: sentences.length,
        requiredCoverage,
        reusedHits,
        reusedTotal,
        avgSentenceWords: avgLen,
      },
    };
  },
};

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?\u3002\uff01\uff1f]+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function nodeMentioned(node: RemixPayloadPlotNode, draftLower: string): boolean {
  const candidates = [
    node.id.replace(/_/g, " "),
    ...node.label.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
  ];
  return candidates.some((c) => c.length > 0 && draftLower.includes(c));
}

function patternKeyword(template: string): string {
  const tokens = template.replace(/\{[^}]+\}\??/g, " ").split(/\s+/);
  return tokens.find((t) => /^[a-zA-Z]{3,}$/.test(t)) ?? "";
}

function avgWordCount(sentences: string[]): number {
  if (sentences.length === 0) return 0;
  const total = sentences.reduce((acc, s) => acc + s.split(/\s+/).length, 0);
  return total / sentences.length;
}

function vocabBandCap(band: string | undefined): number | null {
  switch (band) {
    case "A1":
      return 12;
    case "A2":
      return 16;
    case "B1":
      return 20;
    case "B2":
      return 26;
    default:
      return null;
  }
}
