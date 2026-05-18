// R1 Runner abstraction tests. Two layers:
//   1. registry semantics: register/get/duplicate guard
//   2. english-remix stub: input handling and result shape
//
// Real scoring tests for the english-remix runner land in R4 once the
// alignment pipeline is in place; here we only assert the placeholder
// contract so callers can rely on it before then.

import { beforeEach, describe, expect, it } from "vitest";
import {
  _resetRegistryForTests,
  getRunner,
  registerRunner,
  type Runner,
} from "@/lib/runner";
import { englishRemixRunner } from "@/lib/runner/english-remix";

// Each test starts from a clean registry. The module-level import above
// auto-registers the shipped runners as a side effect, so we tear that
// down explicitly here to keep cases independent.
beforeEach(() => {
  _resetRegistryForTests();
});

describe("runner registry", () => {
  it("returns the registered runner by kind", () => {
    registerRunner(englishRemixRunner);
    expect(getRunner("english-remix")).toBe(englishRemixRunner);
  });

  it("throws when looking up an unregistered kind", () => {
    expect(() => getRunner("english-remix")).toThrow(/No runner registered/);
  });

  it("rejects duplicate registration for the same kind", () => {
    registerRunner(englishRemixRunner);
    expect(() => registerRunner(englishRemixRunner)).toThrow(
      /already registered/,
    );
  });

  it("accepts an arbitrary Runner implementation", async () => {
    const stub: Runner = {
      kind: "english-dictation",
      async evaluate() {
        return { ok: true, score: 1, notes: [] };
      },
    };
    registerRunner(stub);
    const result = await getRunner("english-dictation").evaluate({
      submission: "anything",
      expected: null,
    });
    expect(result).toEqual({ ok: true, score: 1, notes: [] });
  });
});

describe("englishRemixRunner (placeholder)", () => {
  it("flags empty submissions as not-ok", async () => {
    const r = await englishRemixRunner.evaluate({
      submission: "   ",
      expected: null,
    });
    expect(r.ok).toBe(false);
    expect(r.score).toBe(0);
    expect(r.notes[0]?.severity).toBe("error");
  });

  it("counts sentences for a non-empty submission", async () => {
    const r = await englishRemixRunner.evaluate({
      submission: "The plane took off. Mr Brown was nervous!",
      expected: null,
    });
    expect(r.ok).toBe(true);
    expect(r.data?.sentenceCount).toBe(2);
    expect(r.notes[0]?.severity).toBe("info");
  });

  it("handles CJK terminators", async () => {
    const r = await englishRemixRunner.evaluate({
      submission: "\u8fd9\u662f\u4e00\u53e5\u3002\u53e6\u4e00\u53e5\uff01",
      expected: null,
    });
    expect(r.data?.sentenceCount).toBe(2);
  });
});
