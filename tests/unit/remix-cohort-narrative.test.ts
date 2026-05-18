import { describe, expect, it } from "vitest";
import {
  RemixCohortNarrativeSchema,
  buildRemixCohortNarrativeUserMessage,
  type RemixCohortDigest,
} from "@/lib/opus/prompts/remix-cohort-narrative";

const digest: RemixCohortDigest = {
  exerciseTitle: "Lesson 1 — A private conversation (remix)",
  bookKey: "NCE1",
  lessonOrdinal: 1,
  attempts: 8,
  completed: 6,
  averagePhaseReached: 3.6,
  averageAlignCoverage: 0.78,
  averageDriftCount: 4.2,
  topMissingNodes: [
    { nodeId: "n_climax", label: "Climax", count: 5 },
    { nodeId: "n_resolution", label: "Resolution", count: 3 },
  ],
  driftCategoryHistogram: [
    { category: "tense", count: 11 },
    { category: "register", count: 6 },
  ],
  sampleDrifts: [
    { studentId: "stu-1", category: "tense", nodeId: "n_climax", observation: "Used present-tense narration." },
  ],
  sampleHighPerformers: [
    { studentId: "stu-3", coverage: 1.0, driftCount: 1 },
  ],
};

describe("remix-cohort-narrative schema", () => {
  it("accepts a well-formed narrative", () => {
    const r = RemixCohortNarrativeSchema.safeParse({
      headline: "Tense drift dominates; alignment otherwise strong.",
      classSummary: "Across 8 sessions, 5 students dropped past-tense agreement on the climax node...",
      driftPatterns: [
        {
          pattern: "Past-tense agreement breakdown at climax",
          category: "tense",
          affectedStudents: 5,
          evidence: "5 of 8 students switched to present tense after the dialogue insertion.",
          suggestion: "Add a focused 5-minute warm-up reviewing past tense narration before next lesson.",
        },
      ],
      recommendedMicroLesson: null,
      brightSpots: ["3 students achieved full structural coverage with ≤2 drifts."],
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown drift category", () => {
    const r = RemixCohortNarrativeSchema.safeParse({
      headline: "x",
      classSummary: "x",
      driftPatterns: [
        {
          pattern: "x",
          category: "made-up-category",
          affectedStudents: 1,
          evidence: "x",
          suggestion: "x",
        },
      ],
      recommendedMicroLesson: null,
      brightSpots: [],
    });
    expect(r.success).toBe(false);
  });
});

describe("buildRemixCohortNarrativeUserMessage", () => {
  it("renders header line + book/lesson coords", () => {
    const msg = buildRemixCohortNarrativeUserMessage(digest);
    expect(msg).toContain("NCE1 L1");
    expect(msg).toContain("ATTEMPTS: 8 | COMPLETED: 6");
    expect(msg).toContain("AVG PHASE REACHED: 3.60");
    expect(msg).toContain("AVG ALIGN COVERAGE: 0.78");
  });

  it("lists missing nodes with labels", () => {
    const msg = buildRemixCohortNarrativeUserMessage(digest);
    expect(msg).toContain("n_climax (Climax) — 5 students");
  });

  it("falls back to '(none)' for empty sections", () => {
    const msg = buildRemixCohortNarrativeUserMessage({
      ...digest,
      topMissingNodes: [],
      driftCategoryHistogram: [],
      sampleDrifts: [],
      sampleHighPerformers: [],
    });
    expect(msg).toContain("TOP MISSING REQUIRED NODES:\n  (none)");
    expect(msg).toContain("DRIFT CATEGORY HISTOGRAM:\n  (none)");
  });
});
