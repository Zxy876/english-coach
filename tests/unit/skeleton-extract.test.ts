import { describe, expect, it } from "vitest";
import {
  SkeletonSchema,
  buildSkeletonExtractUserMessage,
} from "@/lib/opus/prompts/skeleton-extract";

const VALID = {
  scene: "Two strangers at a coat-check counter.",
  registerLevel: "casual",
  vocabBand: "A1",
  characters: [
    { name: "Speaker A", role: "polite stranger", description: "approaches the counter" },
    { name: "Speaker B", role: "owner of the handbag", description: "responds with thanks" },
  ],
  timeline: [
    { ordinal: 1, summary: "A greets B and asks about the bag.", sentenceOrdinals: [1, 2] },
    { ordinal: 2, summary: "B confirms ownership and thanks A.", sentenceOrdinals: [3, 4] },
  ],
  plotNodes: [
    { id: "greeting", label: "Greeting", required: true, description: "A initiates contact." },
    { id: "thanks", label: "Closing thanks", required: false, description: "B closes politely." },
  ],
  sentencePatterns: [
    { template: "Excuse me, is this your {object}?", example: "Excuse me, is this your handbag?" },
  ],
  styleTags: ["dialogue-heavy", "polite-request"],
} as const;

describe("SkeletonSchema", () => {
  it("accepts a well-formed skeleton", () => {
    const r = SkeletonSchema.safeParse(VALID);
    expect(r.success).toBe(true);
  });

  it("rejects invalid registerLevel", () => {
    const r = SkeletonSchema.safeParse({ ...VALID, registerLevel: "sarcastic" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid vocabBand", () => {
    const r = SkeletonSchema.safeParse({ ...VALID, vocabBand: "X1" });
    expect(r.success).toBe(false);
  });

  it("requires at least one character", () => {
    const r = SkeletonSchema.safeParse({ ...VALID, characters: [] });
    expect(r.success).toBe(false);
  });

  it("requires at least one sentenceOrdinal per beat", () => {
    const bad = { ...VALID, timeline: [{ ordinal: 1, summary: "x", sentenceOrdinals: [] }] };
    const r = SkeletonSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("requires plotNode.required to be boolean", () => {
    const bad = {
      ...VALID,
      plotNodes: [
        { id: "x", label: "x", required: "yes" as unknown as boolean, description: "x" },
      ],
    };
    const r = SkeletonSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });
});

describe("buildSkeletonExtractUserMessage", () => {
  it("formats transcript with 1-based ordinals and Chinese gloss", () => {
    const msg = buildSkeletonExtractUserMessage({
      bookKey: "NCE1",
      lessonOrdinal: 1,
      lessonTitle: "Excuse Me",
      sentences: [
        { ordinal: 1, english: "Excuse me!", chinese: "打扰一下！" },
        { ordinal: 2, english: "Yes?", chinese: "" },
      ],
    });
    expect(msg).toContain("NCE1 #1");
    expect(msg).toContain('"Excuse Me"');
    expect(msg).toContain("[1] Excuse me!   // 打扰一下！");
    expect(msg).toContain("[2] Yes?");
    // No gloss when chinese is empty.
    expect(msg).not.toContain("[2] Yes?   //");
  });
});
