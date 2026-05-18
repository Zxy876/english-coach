// Given a NarrativeSkeleton + lesson title, propose a default Remix
// exercise: title, instructions (markdown), suggested vocabBandCap, and
// the set of plot-node IDs that should be locked (required).
//
// The teacher will then hand-edit and publish. The LLM is here to remove
// the cold-start friction, not to make final decisions.

import { z } from "zod";
import type { Skeleton } from "./skeleton-extract";

export const RemixScaffoldSchema = z.object({
  title: z.string().min(1).max(120),
  instructions: z.string().min(1).max(2000),
  vocabBandCap: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).nullable(),
  lockedNodeIds: z.array(z.string().min(1)).max(8),
  rationale: z.string().min(1).max(600),
});
export type RemixScaffold = z.infer<typeof RemixScaffoldSchema>;

export const REMIX_SCAFFOLD_SYSTEM = `You design Remix exercises. Given a NarrativeSkeleton and the source
lesson title, propose:

- A short, vivid exercise title (e.g. "Lesson 1 — Recast the conversation
  on a night train").
- Markdown "instructions" the student will read: 2–4 short paragraphs
  describing what to remix (scene/characters can change), what MUST stay
  (the locked plot nodes), and any tone constraints (register / vocab
  band).
- A suggested vocabBandCap. Default to the skeleton's vocabBand. Use a
  HIGHER cap only when the skeleton clearly under-uses the band.
- A list of plot-node IDs that should be LOCKED (required to appear in
  every student's remix). Lock all nodes marked required:true in the
  skeleton, PLUS any non-required node that, if dropped, would dissolve
  the structural lesson. Cap at 8.
- A 1–3 sentence "rationale" explaining why these nodes were locked and
  what kind of variation is intentionally left open.

Rules:
- Reference node IDs verbatim from the skeleton.
- Do not invent nodes that aren't in the skeleton.
- Instructions speak directly to the student ("You"). Do not address the
  teacher.
- Keep instructions concrete and short. No filler about "have fun".

Output strict JSON.`;

export interface RemixScaffoldInput {
  lessonTitle: string;
  bookKey: string;
  lessonOrdinal: number;
  skeleton: Skeleton;
}

export function buildRemixScaffoldUserMessage(input: RemixScaffoldInput): string {
  const { lessonTitle, bookKey, lessonOrdinal, skeleton } = input;
  const lines: string[] = [];
  lines.push(`SOURCE: ${bookKey} L${lessonOrdinal} — ${lessonTitle}`);
  lines.push(`SCENE: ${skeleton.scene}`);
  lines.push(`REGISTER: ${skeleton.registerLevel} | VOCAB BAND: ${skeleton.vocabBand}`);
  lines.push("");
  lines.push("CHARACTERS:");
  for (const c of skeleton.characters) {
    lines.push(`  - ${c.role}: ${c.description}`);
  }
  lines.push("");
  lines.push("PLOT NODES:");
  for (const n of skeleton.plotNodes) {
    lines.push(`  - ${n.id} (${n.required ? "required" : "optional"}) — ${n.label}: ${n.description}`);
  }
  lines.push("");
  lines.push("SENTENCE PATTERNS:");
  for (const p of skeleton.sentencePatterns) {
    lines.push(`  - ${p.template}  // e.g. "${p.example}"`);
  }
  if (skeleton.styleTags.length > 0) {
    lines.push("");
    lines.push(`STYLE TAGS: ${skeleton.styleTags.join(", ")}`);
  }
  lines.push("");
  lines.push("Output the scaffold JSON.");
  return lines.join("\n");
}
