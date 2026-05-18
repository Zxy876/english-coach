import { describe, expect, it } from "vitest";
import {
  RemixLiveSummarySchema,
  buildRemixLiveSummaryUserMessage,
  type RemixLiveSummaryContext,
} from "@/lib/opus/prompts/remix-live-summary";

const baseCtx: RemixLiveSummaryContext = {
  studentId: "stu-1",
  exerciseTitle: "Lesson 1 — A private conversation (remix)",
  currentPhase: 2,
  minutesSinceLastActive: 1.3,
  minutesInSession: 8.4,
  completed: false,
  planSummary: {
    submissions: 2,
    lastReady: true,
    lastQuestions: [],
    missingLocked: [],
  },
  draftSummary: {
    bytes: 430,
    runnerScore: 0.62,
    requiredCoverage: 0.66,
    reusedHits: 2,
    savedAt: "2025-01-01T00:00:00.000Z",
  },
  alignSummary: null,
  driftSummary: null,
  recentEvents: [
    { kind: "draft_save", createdAt: "2025-01-01T00:00:00Z", payload: { bytes: 430 } },
    { kind: "plan_review", createdAt: "2024-12-31T23:55:00Z", payload: { ready: true } },
  ],
};

describe("remix-live-summary schema", () => {
  it("accepts a valid summary", () => {
    const ok = RemixLiveSummarySchema.safeParse({
      summary: "Student is filling out the draft and has hit two of three required nodes.",
      flags: ["stuck_signal"],
    });
    expect(ok.success).toBe(true);
  });

  it("rejects unknown flags", () => {
    const bad = RemixLiveSummarySchema.safeParse({
      summary: "x",
      flags: ["not_a_flag"],
    });
    expect(bad.success).toBe(false);
  });

  it("rejects summaries above 280 chars", () => {
    const tooLong = RemixLiveSummarySchema.safeParse({
      summary: "x".repeat(281),
      flags: [],
    });
    expect(tooLong.success).toBe(false);
  });

  it("requires a non-empty summary", () => {
    const empty = RemixLiveSummarySchema.safeParse({ summary: "", flags: [] });
    expect(empty.success).toBe(false);
  });
});

describe("buildRemixLiveSummaryUserMessage", () => {
  it("includes student identity, phase, and timing", () => {
    const msg = buildRemixLiveSummaryUserMessage(baseCtx);
    expect(msg).toContain("STUDENT: stu-1");
    expect(msg).toContain("CURRENT PHASE: 2");
    expect(msg).toContain("SINCE LAST ACTIVITY:");
    expect(msg).toContain("SESSION DURATION:");
  });

  it("renders plan + draft sections when present", () => {
    const msg = buildRemixLiveSummaryUserMessage(baseCtx);
    expect(msg).toContain("PLAN: submissions=2");
    expect(msg).toContain("DRAFT: 430B");
  });

  it("falls back to '(none)' for empty recent events", () => {
    const msg = buildRemixLiveSummaryUserMessage({ ...baseCtx, recentEvents: [] });
    expect(msg).toContain("RECENT EVENTS:");
    expect(msg).toContain("(none)");
  });
});
