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
lesson title, propose a JSON object with these EXACT fields:

{
  "title": "short exercise title",
  "instructions": "markdown text for students",
  "vocabBandCap": "A1|A2|B1|B2|C1|C2 or null",
  "lockedNodeIds": ["node_id_1", "node_id_2", ...],
  "rationale": "why these nodes are locked"
}

Field specifications:
- title: Short, vivid exercise title (max 120 chars), e.g. "Lesson 14 — The Silent Hitchhiker"
- instructions: 2–4 short paragraphs of markdown, describing what to remix (scene/characters can change), what MUST stay (the locked plot nodes), and any tone constraints
- vocabBandCap: Suggested vocabulary level cap, or null. Use the skeleton's vocabBand as default.
- lockedNodeIds: Array of plot-node IDs (as strings) from the PLOT NODES list below. Lock all nodes marked required:true, plus any others essential to the structure. Max 8 IDs.
- rationale: 1–3 sentences explaining the lock choices and what variation is left open

Rules:
- Use the exact field names shown above: title, instructions, vocabBandCap, lockedNodeIds, rationale
- Copy plot-node IDs EXACTLY as shown in the PLOT NODES section below
- Do not invent nodes not in the skeleton
- Instructions speak directly to the student ("You"), not the teacher
- Keep instructions concrete. No "have fun" filler.

Output ONLY the JSON object, no code fences or extra text.`;

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
