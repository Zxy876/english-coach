// Remix-flavoured cohort narrative. Sibling of cohort-narrative.ts (the
// legacy CS1 prompt) — kept separate so the CS1 prompt stays byte-stable
// for any tests pinned to it.

import { z } from "zod";

export const RemixCohortNarrativeSchema = z.object({
  headline: z.string().min(1).max(280),
  classSummary: z.string().min(1).max(800),
  driftPatterns: z
    .array(
      z.object({
        pattern: z.string().min(1).max(160),
        category: z.enum([
          "tense",
          "register",
          "vocab-band",
          "pattern-reuse",
          "collocation",
          "structure",
          "other",
        ]),
        affectedStudents: z.number().int().min(0),
        evidence: z.string().min(1).max(400),
        suggestion: z.string().min(1).max(400),
      }),
    )
    .max(8),
  recommendedMicroLesson: z
    .object({
      title: z.string().min(1).max(120),
      rationale: z.string().min(1).max(400),
    })
    .nullable(),
  brightSpots: z.array(z.string().min(1).max(240)).max(5),
});
export type RemixCohortNarrative = z.infer<typeof RemixCohortNarrativeSchema>;

export const REMIX_COHORT_NARRATIVE_SYSTEM = `You are an experienced English teacher reviewing one Remix exercise across
a whole class. You receive an aggregated digest: how many students
attempted, how many completed, what drift categories appeared most often,
the most frequently missed required plot nodes, and a sample of
representative drift observations from individual sessions.

Your job: write a structured cohort narrative that helps the teacher decide
what to address BEFORE the next class meeting.

Rules:
- Ground every claim in the digest. Do not invent students or evidence.
- Quantify when possible ("6 of 8 students dropped past-tense agreement on
  node n_climax").
- "recommendedMicroLesson" should be null when the cohort is performing
  well — do not invent remediation that isn't warranted.
- Stay descriptive. Teachers, not students, are the audience.
- "brightSpots" must be genuine evidence of strength, max 5; return [] if
  none.
- Do not pad with generalities about pedagogy or language learning.
- If the sample is too small (fewer than 3 completed sessions), say so in
  classSummary and keep driftPatterns short.

Output strict JSON matching the schema.`;

export interface RemixCohortDigest {
  exerciseTitle: string;
  bookKey: string;
  lessonOrdinal: number;
  attempts: number;
  completed: number;
  averagePhaseReached: number;
  averageAlignCoverage: number | null;
  averageDriftCount: number | null;
  topMissingNodes: Array<{ nodeId: string; label: string; count: number }>;
  driftCategoryHistogram: Array<{ category: string; count: number }>;
  sampleDrifts: Array<{
    studentId: string;
    category: string;
    nodeId: string;
    observation: string;
  }>;
  sampleHighPerformers: Array<{ studentId: string; coverage: number; driftCount: number }>;
}

export function buildRemixCohortNarrativeUserMessage(d: RemixCohortDigest): string {
  const lines: string[] = [];
  lines.push(`EXERCISE: ${d.exerciseTitle} (${d.bookKey} L${d.lessonOrdinal})`);
  lines.push(`ATTEMPTS: ${d.attempts} | COMPLETED: ${d.completed}`);
  lines.push(`AVG PHASE REACHED: ${d.averagePhaseReached.toFixed(2)}`);
  if (d.averageAlignCoverage !== null) {
    lines.push(`AVG ALIGN COVERAGE: ${d.averageAlignCoverage.toFixed(2)}`);
  }
  if (d.averageDriftCount !== null) {
    lines.push(`AVG DRIFT COUNT: ${d.averageDriftCount.toFixed(2)}`);
  }

  lines.push("");
  lines.push("TOP MISSING REQUIRED NODES:");
  if (d.topMissingNodes.length === 0) lines.push("  (none)");
  for (const m of d.topMissingNodes) {
    lines.push(`  - ${m.nodeId} (${m.label}) — ${m.count} students`);
  }

  lines.push("");
  lines.push("DRIFT CATEGORY HISTOGRAM:");
  if (d.driftCategoryHistogram.length === 0) lines.push("  (none)");
  for (const c of d.driftCategoryHistogram) {
    lines.push(`  - ${c.category}: ${c.count}`);
  }

  lines.push("");
  lines.push("SAMPLE DRIFT OBSERVATIONS:");
  if (d.sampleDrifts.length === 0) lines.push("  (none)");
  for (const s of d.sampleDrifts.slice(0, 12)) {
    lines.push(`  - [${s.studentId}] ${s.category}@${s.nodeId}: ${s.observation}`);
  }

  if (d.sampleHighPerformers.length > 0) {
    lines.push("");
    lines.push("HIGH PERFORMERS:");
    for (const h of d.sampleHighPerformers) {
      lines.push(`  - ${h.studentId}: coverage=${h.coverage.toFixed(2)} drifts=${h.driftCount}`);
    }
  }

  lines.push("");
  lines.push("Generate the cohort narrative. Output JSON.");
  return lines.join("\n");
}
