import { describe, expect, it } from "vitest";
import {
  DraftReviewSchema,
  buildDraftReviewUserMessage,
} from "@/lib/opus/prompts/draft-review";

const ctx = {
  lessonTitle: "Lesson 1",
  bookKey: "nce-1",
  lessonOrdinal: 1,
  skeleton: {
    scene: "A small theatre.",
    registerLevel: "neutral",
    vocabBand: "B1",
    plotNodes: [
      { id: "n_setup", label: "Setup", required: true, description: "Setup." },
      { id: "n_complication", label: "Complication", required: true, description: "Interruption." },
      { id: "n_payoff", label: "Payoff", required: false, description: "Resolution." },
    ],
    sentencePatterns: [
      { template: "I had + past-participle", example: "I had a wonderful seat." },
    ],
  },
  plan: {
    newScene: "A coffee shop in Paris.",
    newCharacters: "Alex, the customer; Marie, the barista.",
    keptNodes: ["n_setup", "n_complication"],
    reusedPatterns: [0],
    notes: "Keep it short.",
  },
  vocabBandCap: "B1",
  draft: "Alex walked into the café. He had a perfect table by the window…",
  attemptNumber: 1,
};

describe("draft-review schema", () => {
  it("accepts a well-formed PASS verdict", () => {
    const r = DraftReviewSchema.safeParse({
      verdict: "pass",
      goalScore: 5,
      narrativeScore: 4,
      styleScore: 4,
      coveredNodes: ["n_setup", "n_complication"],
      missingRequired: [],
      blockingQuestions: [],
      suggestions: ["Great pattern reuse on 'I had…'."],
      overallNote: "You hit every required beat and stayed in band.",
    });
    expect(r.success).toBe(true);
  });

  it("accepts a REVISE verdict with blocking questions", () => {
    const r = DraftReviewSchema.safeParse({
      verdict: "revise",
      goalScore: 2,
      narrativeScore: 3,
      styleScore: 4,
      coveredNodes: ["n_setup"],
      missingRequired: ["n_complication"],
      blockingQuestions: [
        {
          dimension: "goal",
          nodeId: "n_complication",
          question: "Where is the interruption? Show one concrete moment.",
          evidence: null,
        },
        {
          dimension: "narrative",
          nodeId: null,
          question: "Who interrupts whom — make the agent explicit.",
          evidence: "He had a perfect table by the window…",
        },
      ],
      suggestions: ["Add a 1-sentence beat where someone breaks the calm."],
      overallNote: "Strong opening — but the complication is missing.",
    });
    expect(r.success).toBe(true);
  });

  it("rejects out-of-range scores", () => {
    const r = DraftReviewSchema.safeParse({
      verdict: "pass",
      goalScore: 7,
      narrativeScore: 4,
      styleScore: 4,
      coveredNodes: [],
      missingRequired: [],
      blockingQuestions: [],
      suggestions: [],
      overallNote: "x",
    });
    expect(r.success).toBe(false);
  });

  it("rejects too many blocking questions", () => {
    const q = {
      dimension: "goal" as const,
      nodeId: null,
      question: "?",
      evidence: null,
    };
    const r = DraftReviewSchema.safeParse({
      verdict: "revise",
      goalScore: 3,
      narrativeScore: 3,
      styleScore: 3,
      coveredNodes: [],
      missingRequired: [],
      blockingQuestions: [q, q, q, q, q, q],
      suggestions: [],
      overallNote: "x",
    });
    expect(r.success).toBe(false);
  });

  it("renders a user message containing skeleton + plan + draft", () => {
    const msg = buildDraftReviewUserMessage(ctx);
    expect(msg).toContain("ATTEMPT: #1");
    expect(msg).toContain("nce-1 L1 — Lesson 1");
    expect(msg).toContain("n_setup");
    expect(msg).toContain("n_complication");
    expect(msg).toContain("CAP: B1");
    expect(msg).toContain("Alex walked into the café.");
    expect(msg).toContain("kept nodes: n_setup, n_complication");
  });
});
