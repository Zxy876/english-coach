import { describe, expect, it } from "vitest";
import {
  RemixScaffoldSchema,
  buildRemixScaffoldUserMessage,
} from "@/lib/opus/prompts/remix-scaffolding";

const skeleton = {
  scene: "A private conversation in a London theatre.",
  registerLevel: "neutral" as const,
  vocabBand: "B1" as const,
  characters: [
    { name: "Narrator", role: "protagonist", description: "The speaker." },
  ],
  timeline: [
    { ordinal: 1, summary: "Sit down behind two ladies.", sentenceOrdinals: [1, 2] },
  ],
  plotNodes: [
    { id: "n_setup", label: "Setup", required: true, description: "Setup." },
    { id: "n_complication", label: "Complication", required: true, description: "Interruption." },
    { id: "n_payoff", label: "Payoff", required: false, description: "Resolution." },
  ],
  sentencePatterns: [
    { template: "I had + past-participle", example: "I had a wonderful seat." },
  ],
  styleTags: ["anecdotal"],
};

describe("remix-scaffolding schema", () => {
  it("accepts a well-formed scaffold", () => {
    const r = RemixScaffoldSchema.safeParse({
      title: "Lesson 1 — Recast the conversation",
      instructions: "You'll keep the setup and complication but swap the setting.",
      vocabBandCap: "B1",
      lockedNodeIds: ["n_setup", "n_complication"],
      rationale: "Locked the two required nodes; left payoff open for variation.",
    });
    expect(r.success).toBe(true);
  });

  it("rejects bad vocabBandCap", () => {
    const r = RemixScaffoldSchema.safeParse({
      title: "x",
      instructions: "x",
      vocabBandCap: "B7",
      lockedNodeIds: [],
      rationale: "x",
    });
    expect(r.success).toBe(false);
  });

  it("allows null vocabBandCap", () => {
    const r = RemixScaffoldSchema.safeParse({
      title: "x",
      instructions: "x",
      vocabBandCap: null,
      lockedNodeIds: [],
      rationale: "x",
    });
    expect(r.success).toBe(true);
  });
});

describe("buildRemixScaffoldUserMessage", () => {
  it("includes source coords, scene, and all plot nodes", () => {
    const msg = buildRemixScaffoldUserMessage({
      lessonTitle: "A private conversation",
      bookKey: "NCE1",
      lessonOrdinal: 1,
      skeleton,
    });
    expect(msg).toContain("NCE1 L1 — A private conversation");
    expect(msg).toContain("REGISTER: neutral | VOCAB BAND: B1");
    expect(msg).toContain("n_setup (required)");
    expect(msg).toContain("n_payoff (optional)");
    expect(msg).toContain("STYLE TAGS: anecdotal");
  });
});
