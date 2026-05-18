// Prompt 10 — Structure align.
//
// Given a canonical skeleton (especially its plotNodes) and a student's
// remix draft, produce node-level mappings: which plot nodes did the
// student hit, which did they merge, which did they drop?

import { z } from "zod";

export const NodeAlignmentSchema = z.object({
  nodeId: z.string(),
  status: z.enum(["hit", "merged", "missing", "extra"]),
  draftSpan: z.string().optional(),     // verbatim quote (if hit/merged)
  comment: z.string().min(1),
  mergedWith: z.array(z.string()).optional(), // other nodeIds (when merged)
});
export type NodeAlignment = z.infer<typeof NodeAlignmentSchema>;

export const AlignmentResponseSchema = z.object({
  alignments: z.array(NodeAlignmentSchema).min(1),
  coverageRatio: z.number().min(0).max(1),  // hit_or_merged / total_required
  summary: z.string().min(1),
});
export type AlignmentResponse = z.infer<typeof AlignmentResponseSchema>;

export const STRUCTURE_ALIGN_SYSTEM = `You compare a student's REMIX DRAFT to a canonical NarrativeSkeleton at
the level of individual PLOT NODES (not sentences).

Inputs you receive:
- skeleton.plotNodes: the structural commitments
- draft: the student's text

OUTPUT CONTRACT — return ONE JSON object:

{
  "alignments": [
    { "nodeId": string,
      "status": "hit"|"merged"|"missing"|"extra",
      "draftSpan"?: string,
      "comment": string,
      "mergedWith"?: [string] }
  ],
  "coverageRatio": number,        // 0..1, hits_or_merged / total_required_nodes
  "summary": string               // 1-2 sentence overview
}

RULES

- Produce ONE alignment entry per skeleton node (any status).
- Add additional "extra" entries (nodeId = "extra:<short_label>") for
  meaningful new beats the student introduced. Do not over-report
  cosmetic additions.
- "draftSpan": verbatim quote (\u22641 sentence). Omit when status is "missing".
- "merged": one draft span covers multiple skeleton nodes. List the others
  in "mergedWith".
- "comment": 1 sentence describing what the student did with this node.
- coverageRatio counts how many REQUIRED nodes ended up "hit" or "merged".

DO NOT add prose. DO NOT use markdown.`;

export interface AlignInput {
  lessonTitle: string;
  skeleton: {
    plotNodes: Array<{
      id: string;
      label: string;
      required: boolean;
      description: string;
    }>;
  };
  draft: string;
}

export function buildAlignUserMessage(input: AlignInput): string {
  const nodes = JSON.stringify(input.skeleton.plotNodes, null, 2);
  return `Lesson: "${input.lessonTitle}"

SKELETON PLOT NODES:
${nodes}

STUDENT DRAFT:
"""
${input.draft}
"""

Return the alignment JSON now.`;
}
