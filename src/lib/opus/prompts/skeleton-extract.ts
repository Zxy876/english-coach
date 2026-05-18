// Prompt 8 — Canonical Skeleton extraction.
//
// Inputs:  one NCE lesson (full English transcript joined sentence-by-
//          sentence; Chinese is provided for disambiguation only).
// Output:  structured `NarrativeSkeleton` consumed by the R4 remix loop
//          as the "reference answer". Strict Zod validation.
//
// Design notes:
// - We deliberately keep the schema small. Anything that the remix loop
//   does not yet consume (e.g. discourse markers, prosody) is omitted to
//   avoid teaching the model to hallucinate categories.
// - `vocabBand` is CEFR. `registerLevel` is a 4-way enum. Both are also
//   re-checked at align time (R4).
// - The skeleton must be reconstructible from the source text alone —
//   never invent facts about characters that the lesson does not state.

import { z } from "zod";

// Character mentioned in the lesson. `role` is the *narrative* role
// (narrator, primary speaker, etc.), not a profession.
export const CharacterSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  description: z.string().min(1),
});
export type SkeletonCharacter = z.infer<typeof CharacterSchema>;

// One beat in the lesson's timeline. `sentenceOrdinals` are 1-based
// indices into the source transcript so R4 can locate the supporting
// span when aligning student output.
export const TimelineBeatSchema = z.object({
  ordinal: z.number().int().positive(),
  summary: z.string().min(1),
  sentenceOrdinals: z.array(z.number().int().positive()).min(1),
});
export type SkeletonTimelineBeat = z.infer<typeof TimelineBeatSchema>;

// Plot node = a structural commitment the remix must hit (e.g. "the
// stranger introduces themselves"). Distinct from timeline beats: a beat
// is descriptive, a node is contractual.
export const PlotNodeSchema = z.object({
  id: z.string().min(1), // stable slug, e.g. "greeting"
  label: z.string().min(1), // human-readable
  required: z.boolean(), // hard vs soft constraint for remix
  description: z.string().min(1),
});
export type SkeletonPlotNode = z.infer<typeof PlotNodeSchema>;

// Sentence pattern = a syntactic skeleton with named slots. Example:
// template "{subject} {modal} {verb} {object}?", example pulled verbatim
// from the lesson. Slots use `{name}` and may have a trailing `?` for
// optional.
export const SentencePatternSchema = z.object({
  template: z.string().min(1),
  example: z.string().min(1),
  notes: z.string().optional(),
});
export type SkeletonSentencePattern = z.infer<typeof SentencePatternSchema>;

export const SkeletonSchema = z.object({
  scene: z.string().min(1),
  registerLevel: z.enum(["casual", "neutral", "formal", "literary"]),
  vocabBand: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  characters: z.array(CharacterSchema).min(1).max(8),
  timeline: z.array(TimelineBeatSchema).min(1).max(20),
  plotNodes: z.array(PlotNodeSchema).min(1).max(12),
  sentencePatterns: z.array(SentencePatternSchema).min(1).max(10),
  styleTags: z.array(z.string().min(1)).min(1).max(8),
});
export type Skeleton = z.infer<typeof SkeletonSchema>;

export const SKELETON_EXTRACT_SYSTEM = `You are an applied-linguistics assistant. The user gives you one short
lesson from a graded English reader ("New Concept English"). Your job is
to extract a structured NarrativeSkeleton that another model will later
use as a reference for grading student remixes.

OUTPUT CONTRACT

Return ONE JSON object. No prose, no code fences. The JSON must match
this shape exactly:

{
  "scene": string,                         // one-sentence setting
  "registerLevel": "casual"|"neutral"|"formal"|"literary",
  "vocabBand": "A1"|"A2"|"B1"|"B2"|"C1"|"C2",
  "characters": [
    { "name": string, "role": string, "description": string }
  ],                                       // 1..8
  "timeline": [
    { "ordinal": number,
      "summary": string,
      "sentenceOrdinals": [number, ...] } // 1-based indices into transcript
  ],                                       // 1..20
  "plotNodes": [
    { "id": string, "label": string,
      "required": boolean, "description": string }
  ],                                       // 1..12 ; "id" is a stable slug
  "sentencePatterns": [
    { "template": string, "example": string, "notes"?: string }
  ],                                       // 1..10
  "styleTags": [string]                    // 1..8 ; e.g. "dialogue-heavy"
}

EXTRACTION RULES

- Use ONLY facts present in the English transcript. Do not invent
  professions, ages, or motivations the text does not state.
- "scene" must be a single sentence in plain English.
- "registerLevel": pick one register that best matches the bulk of the
  text. Dialogue often pushes this toward "casual".
- "vocabBand": estimate the highest CEFR level a learner needs to read
  the text comfortably. NCE1 lessons are typically A1/A2; NCE4 may reach
  B2/C1.
- "characters": include narrator only if explicitly named or addressed.
- "timeline": ordered narrative beats. Each beat must cite at least one
  sentenceOrdinal it summarizes.
- "plotNodes": the structural commitments a faithful remix must satisfy.
  "required: true" = remix MUST hit this; "required: false" = optional.
  "id" is a short snake_case slug, unique within the lesson.
- "sentencePatterns": pick the 3–8 most teachable syntactic templates.
  Use {curly} placeholders for slots; trailing ? marks an optional slot.
  Each pattern must include a verbatim "example" from the transcript.
- "styleTags": short kebab-case labels, e.g. "dialogue-heavy",
  "present-simple", "polite-request".

DO NOT include any field not listed above. DO NOT wrap the JSON in
markdown. DO NOT add commentary.`;

export interface SkeletonExtractInput {
  bookKey: string;
  lessonOrdinal: number;
  lessonTitle: string;
  sentences: Array<{ ordinal: number; english: string; chinese: string }>;
}

export function buildSkeletonExtractUserMessage(
  input: SkeletonExtractInput,
): string {
  const transcript = input.sentences
    .map((s) => {
      const zh = s.chinese ? `   // ${s.chinese}` : "";
      return `[${s.ordinal}] ${s.english}${zh}`;
    })
    .join("\n");

  return `Lesson: ${input.bookKey} #${input.lessonOrdinal} — "${input.lessonTitle}"

Transcript (English, with Chinese gloss for disambiguation only):

${transcript}

Return the NarrativeSkeleton JSON now.`;
}
