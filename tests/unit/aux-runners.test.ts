import { describe, expect, it } from "vitest";
import { englishDictationRunner } from "@/lib/runner/english-dictation";
import { englishShadowingRunner } from "@/lib/runner/english-shadowing";
import { englishReadAloudRunner } from "@/lib/runner/english-read-aloud";
import { editDistance, similarity, tokenise } from "@/lib/runner/similarity";

describe("similarity util", () => {
  it("returns 1 for identical strings (case/punctuation insensitive)", () => {
    expect(similarity("Hello, world!", "hello world")).toBe(1);
  });

  it("returns 0 for fully disjoint strings", () => {
    expect(similarity("alpha", "zulu")).toBe(0);
  });

  it("returns partial similarity for one-word edits", () => {
    const s = similarity("the cat sat on the mat", "the cat sat on a mat");
    expect(s).toBeGreaterThan(0.7);
    expect(s).toBeLessThan(1);
  });

  it("tokenises and computes edit distance correctly", () => {
    expect(editDistance(tokenise("a b c"), tokenise("a x c"))).toBe(1);
  });
});

describe("english-dictation runner", () => {
  it("rejects empty payload", async () => {
    const r = await englishDictationRunner.evaluate({
      submission: "anything",
      expected: null,
    });
    expect(r.ok).toBe(false);
    expect(r.notes[0]?.severity).toBe("error");
  });

  it("flags perfect transcription", async () => {
    const r = await englishDictationRunner.evaluate({
      submission: "Excuse me, is this your handbag?",
      expected: null,
      payload: { referenceText: "Excuse me, is this your handbag?" },
    });
    expect(r.score).toBe(1);
    expect(r.data?.exact).toBe(true);
  });

  it("scores partial transcripts and warns", async () => {
    const r = await englishDictationRunner.evaluate({
      submission: "excuse me is this handbag",
      expected: null,
      payload: { referenceText: "Excuse me, is this your handbag?" },
    });
    expect(r.score).toBeLessThan(1);
    expect(r.score).toBeGreaterThan(0.5);
  });
});

describe("english-shadowing runner", () => {
  it("rewards close transcripts with good rhythm", async () => {
    const r = await englishShadowingRunner.evaluate({
      submission: "excuse me is this your handbag",
      expected: null,
      payload: { referenceText: "Excuse me, is this your handbag?" },
    });
    expect(r.ok).toBe(true);
    expect(r.score).toBeGreaterThan(0.8);
  });

  it("warns when student utterance is much shorter", async () => {
    const r = await englishShadowingRunner.evaluate({
      submission: "handbag",
      expected: null,
      payload: {
        referenceText: "Excuse me, is this your handbag madam?",
      },
    });
    expect(r.notes.some((n) => /missing/i.test(n.message))).toBe(true);
  });
});

describe("english-read-aloud runner", () => {
  it("scores accurate reading", async () => {
    const r = await englishReadAloudRunner.evaluate({
      submission: "The bus is leaving soon.",
      expected: null,
      payload: { referenceText: "The bus is leaving soon." },
    });
    expect(r.score).toBe(1);
    expect(r.ok).toBe(true);
  });

  it("enforces cooldown between attempts", async () => {
    const r = await englishReadAloudRunner.evaluate({
      submission: "The bus is leaving soon.",
      expected: null,
      payload: {
        referenceText: "The bus is leaving soon.",
        lastAttemptMs: Date.now() - 1_000,
        cooldownMs: 15_000,
      },
    });
    expect(r.ok).toBe(false);
    expect(r.notes[0]?.message).toMatch(/cooldown/i);
  });
});
