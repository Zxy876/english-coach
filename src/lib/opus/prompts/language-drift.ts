// Prompt 11 — Language Drift.
//
// Adapted from maieutic's `intent-diff`. Given the alignment from
// `structure-align`, plus the draft and the skeleton's sentence
// patterns, ask neutral, node-level questions that surface where the
// student's language drifted from canonical patterns: tense mismatches,
// register shifts, vocab-band violations, missed pattern reuse.

import { z } from "zod";

export const LanguageDriftSchema = z.object({
  nodeId: z.string(),                  // skeleton node id, or "draft" for global
  category: z.enum([
    "tense",
    "register",
    "vocab-band",
    "pattern-reuse",
    "collocation",
    "other",
  ]),
  draftSpan: z.string().optional(),
  canonical: z.string().optional(),    // suggested canonical phrasing
  question: z.string().min(1),         // neutral question to student
});
export type LanguageDrift = z.infer<typeof LanguageDriftSchema>;

export const DriftResponseSchema = z.object({
  drifts: z.array(LanguageDriftSchema).max(10),
  overallNotes: z.string().min(1),
});
export type DriftResponse = z.infer<typeof DriftResponseSchema>;

export const LANGUAGE_DRIFT_SYSTEM = `You are a writing coach reviewing where a student's REMIX DRAFT
diverges from the LANGUAGE patterns of a canonical lesson. You receive:

- skeleton.sentencePatterns: templates the canonical text uses
- skeleton.registerLevel + vocabBand: target register / CEFR ceiling
- alignment.alignments: node-by-node mapping (already computed)
- draft: the student's text

OUTPUT CONTRACT — return ONE JSON object:

{
  "drifts": [
    { "nodeId": string,
      "category": "tense"|"register"|"vocab-band"|"pattern-reuse"|"collocation"|"other",
      "draftSpan"?: string,
      "canonical"?: string,
      "question": string }
  ],
  "overallNotes": string
}

RULES

- At most 8 drift entries. Pick the ones that matter pedagogically.
- "question" must be NEUTRAL and OPEN: invite the student to explain
  their choice, not "fix this". E.g. "You used 'gonna' here while the
  lesson stays in formal register — what made you switch?".
- "canonical" is OPTIONAL: provide a near-equivalent sentence in the
  lesson's register if the drift is structural.
- Use "nodeId": "draft" for global observations (e.g. overall tense
  consistency across the whole draft).
- Do NOT mark every minor difference — only ones a learner can act on.
- Do NOT moralize. No "should", no "must". Use "what / how / why".

DO NOT add prose outside the JSON.`;

export interface DriftInput {
  lessonTitle: string;
  skeleton: {
    registerLevel: string;
    vocabBand: string;
    sentencePatterns: Array<{ template: string; example: string }>;
  };
  alignment: { alignments: Array<{ nodeId: string; status: string; draftSpan?: string }> };
  draft: string;
}

export function buildDriftUserMessage(input: DriftInput): string {
  return `Lesson: "${input.lessonTitle}"

TARGET REGISTER: ${input.skeleton.registerLevel}
TARGET VOCAB BAND: ${input.skeleton.vocabBand}
CANONICAL SENTENCE PATTERNS:
${JSON.stringify(input.skeleton.sentencePatterns, null, 2)}

ALIGNMENT (node-level):
${JSON.stringify(input.alignment.alignments, null, 2)}

STUDENT DRAFT:
"""
${input.draft}
"""

Return the drift JSON now.`;
}
