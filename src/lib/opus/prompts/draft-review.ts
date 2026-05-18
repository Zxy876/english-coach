// Prompt 12 — Draft review (the "submission gate" for Phase 2).
//
// Given the canonical skeleton, the student's plan, and their draft, return
// a verdict on three dimensions — goal coverage, narrative precision, style
// fit — plus a small batch of blocking questions the student must address
// before resubmitting. PASS unlocks Phase 3; REVISE keeps Phase 2 open.

import { z } from "zod";

export const DimensionEnum = z.enum(["goal", "narrative", "style"]);
export type Dimension = z.infer<typeof DimensionEnum>;

export const DraftReviewQuestionSchema = z.object({
  dimension: DimensionEnum,
  nodeId: z.string().nullable(),
  question: z.string().min(1).max(400),
  evidence: z.string().max(400).nullable(),
});

export const DraftReviewSchema = z.object({
  verdict: z.enum(["pass", "revise"]),
  goalScore: z.number().int().min(0).max(5),
  narrativeScore: z.number().int().min(0).max(5),
  styleScore: z.number().int().min(0).max(5),
  coveredNodes: z.array(z.string()).max(32),
  missingRequired: z.array(z.string()).max(16),
  blockingQuestions: z.array(DraftReviewQuestionSchema).max(5),
  suggestions: z.array(z.string().min(1).max(280)).max(5),
  overallNote: z.string().min(1).max(400),
});
export type DraftReview = z.infer<typeof DraftReviewSchema>;

export const DRAFT_REVIEW_SYSTEM = `You are the SUBMISSION GATE for a remix
writing task. The student has just submitted a DRAFT. Your job is to decide
whether it is good enough to PASS Phase 2, or whether they must REVISE.

You score three dimensions on a 0–5 scale:

  goal       — did the draft cover every REQUIRED plot node from the
               skeleton, and the optional nodes the student committed to in
               their plan?  (5 = all hit; 0 = the gist is unrelated)
  narrative  — does the story stay coherent? characters, timeline, and
               cause-and-effect must be consistent and recognisable as the
               same arc as the original.  (5 = beat-for-beat parallel;
               0 = scrambled)
  style      — does the draft sit at the declared REGISTER and respect the
               VOCAB BAND cap? Did the student reuse the SENTENCE PATTERNS
               they said they would?  (5 = perfect fit; 0 = wrong register
               or wildly above cap)

VERDICT RULES (apply strictly):
  - PASS only if min(goalScore, narrativeScore, styleScore) >= 4 AND
    missingRequired is empty.
  - Otherwise return REVISE.

Return ONE JSON object:
{
  "verdict": "pass" | "revise",
  "goalScore": int 0..5,
  "narrativeScore": int 0..5,
  "styleScore": int 0..5,
  "coveredNodes": [plot-node ids actually present in the draft],
  "missingRequired": [required plot-node ids not yet present],
  "blockingQuestions": [
    { "dimension": "goal"|"narrative"|"style",
      "nodeId": string | null,
      "question": string,   // a single concrete question the student
                            // must answer in their next revision
      "evidence": string | null   // a verbatim quote from the draft
                                  // that triggered the question, when
                                  // applicable
    }
  ],   // max 5; only present when verdict = "revise"
  "suggestions": [string], // max 5; one-line concrete revisions
  "overallNote": string    // 1–2 sentences summarising the verdict
                           // in plain English, addressed to "you"
}

Hard rules:
  - Address the student directly with "you" / "your".
  - Reference plot-node ids EXACTLY as given (n_xxx form).
  - Do NOT rewrite the draft for the student. Ask questions and point at
    evidence. The student writes; you gate.
  - On PASS, return blockingQuestions: [] and at most 2 short
    suggestions celebrating what worked.
  - Forbidden words anywhere: "phase 1", "phase 2", "phase 3", "phase 4".`;

export interface DraftReviewContext {
  lessonTitle: string;
  bookKey: string;
  lessonOrdinal: number;
  skeleton: {
    scene: string;
    registerLevel: string;
    vocabBand: string;
    plotNodes: Array<{ id: string; label: string; required: boolean; description: string }>;
    sentencePatterns: Array<{ template: string; example: string }>;
  };
  plan: {
    newScene: string;
    newCharacters: string;
    keptNodes: string[];
    reusedPatterns: number[];
    notes?: string;
  };
  vocabBandCap: string | null;
  draft: string;
  attemptNumber: number;
}

export function buildDraftReviewUserMessage(ctx: DraftReviewContext): string {
  const lines: string[] = [];
  lines.push(`SOURCE: ${ctx.bookKey} L${ctx.lessonOrdinal} — ${ctx.lessonTitle}`);
  lines.push(`ATTEMPT: #${ctx.attemptNumber}`);
  lines.push("");
  lines.push(`ORIGINAL SCENE: ${ctx.skeleton.scene}`);
  lines.push(
    `REGISTER: ${ctx.skeleton.registerLevel} | VOCAB BAND: ${ctx.skeleton.vocabBand}` +
      (ctx.vocabBandCap ? ` | CAP: ${ctx.vocabBandCap}` : ""),
  );
  lines.push("");
  lines.push("PLOT NODES:");
  for (const n of ctx.skeleton.plotNodes) {
    lines.push(
      `  ${n.id} (${n.required ? "required" : "optional"}) — ${n.label}: ${n.description}`,
    );
  }
  lines.push("");
  lines.push("SENTENCE PATTERNS:");
  ctx.skeleton.sentencePatterns.forEach((p, i) => {
    lines.push(`  [${i}] ${p.template}    ex: ${p.example}`);
  });
  lines.push("");
  lines.push("STUDENT PLAN:");
  lines.push(`  new scene: ${ctx.plan.newScene}`);
  lines.push(`  new characters: ${ctx.plan.newCharacters}`);
  lines.push(`  kept nodes: ${ctx.plan.keptNodes.join(", ") || "(none)"}`);
  lines.push(
    `  reused patterns: ${ctx.plan.reusedPatterns.length === 0 ? "(none)" : ctx.plan.reusedPatterns.map((i) => `[${i}]`).join(" ")}`,
  );
  if (ctx.plan.notes) lines.push(`  notes: ${ctx.plan.notes}`);
  lines.push("");
  lines.push("DRAFT:");
  lines.push(ctx.draft.trim());
  lines.push("");
  lines.push("Return the JSON object per OUTPUT CONTRACT.");
  return lines.join("\n");
}
