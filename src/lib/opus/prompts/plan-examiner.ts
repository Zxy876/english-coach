// Prompt 9 — Remix Plan examiner.
//
// Adapted from maieutic's `spec-examiner` hook. Instead of grading a
// program specification, this examines whether a student's REMIX PLAN
// addresses all commitments the canonical skeleton demands.
//
// Output: list of clarifying questions (zero questions = plan is
// complete and the session can advance to Phase 2).

import { z } from "zod";

export const PlanExaminerQuestionSchema = z.object({
  nodeId: z.string().optional(),    // refers to skeleton plotNodes[].id
  field: z.enum(["scene", "characters", "keptNodes", "reusedPatterns", "other"]),
  question: z.string().min(1),
  severity: z.enum(["block", "nudge"]),
});
export type PlanExaminerQuestion = z.infer<typeof PlanExaminerQuestionSchema>;

export const PlanExaminerResponseSchema = z.object({
  questions: z.array(PlanExaminerQuestionSchema).max(8),
  ready: z.boolean(),
});
export type PlanExaminerResponse = z.infer<typeof PlanExaminerResponseSchema>;

export const PLAN_EXAMINER_SYSTEM = `You are a writing coach reviewing a student's REMIX PLAN for an English
lesson. A canonical NarrativeSkeleton describes the structural
commitments any faithful remix must hit. The student has proposed a
plan: new scene, new characters, which skeleton plot nodes they will
keep, and which sentence patterns they will reuse.

Your job: find under-specified or contradictory commitments and ask
concise clarifying questions.

OUTPUT CONTRACT — return ONE JSON object:

{
  "questions": [
    { "nodeId"?: string,
      "field": "scene"|"characters"|"keptNodes"|"reusedPatterns"|"other",
      "question": string,
      "severity": "block"|"nudge" }
  ],
  "ready": boolean
}

RULES

- "ready": true iff there are zero "block" questions AND every REQUIRED
  plot node from the skeleton appears in plan.keptNodes.
- Ask at most 5 questions. Quality > quantity.
- "block" = the plan cannot move to Phase 2 without this answer
  (e.g. required plot node not addressed, or scene contradicts the
   characters the student chose).
- "nudge" = optional polish (e.g. "you reused 0 sentence patterns —
   was that intentional?").
- Be concrete: cite the specific plot node label or field. Do NOT ask
  open-ended "have you thought about everything?" questions.
- If the plan is solid, return { "questions": [], "ready": true }.

DO NOT add prose. DO NOT use markdown.`;

export interface PlanExaminerInput {
  lessonTitle: string;
  skeleton: {
    scene: string;
    registerLevel: string;
    plotNodes: Array<{
      id: string;
      label: string;
      required: boolean;
      description: string;
    }>;
    sentencePatterns: Array<{ template: string; example: string }>;
  };
  plan: {
    newScene: string;
    newCharacters: string;
    keptNodes: string[];        // plot node ids
    reusedPatterns: number[];   // indices into skeleton.sentencePatterns
    notes?: string;
  };
}

export function buildPlanExaminerUserMessage(input: PlanExaminerInput): string {
  const reqIds = input.skeleton.plotNodes
    .filter((n) => n.required)
    .map((n) => n.id);
  const missingRequired = reqIds.filter((id) => !input.plan.keptNodes.includes(id));

  const skel = JSON.stringify(
    {
      scene: input.skeleton.scene,
      registerLevel: input.skeleton.registerLevel,
      plotNodes: input.skeleton.plotNodes,
      sentencePatterns: input.skeleton.sentencePatterns.map((p, i) => ({
        idx: i,
        ...p,
      })),
    },
    null,
    2,
  );
  const plan = JSON.stringify(input.plan, null, 2);

  return `Lesson: "${input.lessonTitle}"

SKELETON:
${skel}

STUDENT PLAN:
${plan}

Required plot nodes the plan currently omits: ${
    missingRequired.length ? missingRequired.join(", ") : "(none)"
  }

Return the examiner JSON now.`;
}
