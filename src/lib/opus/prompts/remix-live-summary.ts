// Remix-flavoured single-sentence live summary used by the instructor
// dashboard. Companion to live-summary.ts (the legacy CS1 version) — kept
// separate so that prompt can stay byte-stable for any tests pinned to it.

import { z } from "zod";

export const RemixLiveSummarySchema = z.object({
  summary: z.string().min(1).max(280),
  flags: z.array(
    z.enum([
      "stuck_signal",
      "plan_loop",
      "missing_required_node",
      "drift_heavy",
      "high_performer",
      "completed",
    ]),
  ),
});
export type RemixLiveSummary = z.infer<typeof RemixLiveSummarySchema>;

export const REMIX_LIVE_SUMMARY_SYSTEM = `You generate a ONE-sentence cognitive summary for an instructor scanning a
live class doing the Remix exercise. The instructor has ~5 seconds per row to
decide whether to intervene.

Your output MUST:
- Describe what the student appears to be doing or stuck on, NOT name the
  phase number. "In phase 2" is FORBIDDEN.
- Reference concrete observations from the session (which plot node is
  missing, what drift category dominates, how long since the last save).
- Be specific enough that the instructor could walk over and say something
  useful in 30 seconds based on the summary alone.
- Stay neutral. No "should/must"; describe, don't prescribe.

Each phase has different affordances:
  Phase 1 (Plan): student fills scene/characters/keptNodes/reusedPatterns.
    Plan-examiner asks gap-filling questions. NO draft yet.
  Phase 2 (Draft): free-form writing surface with deterministic runner
    feedback after each save. NO LLM alignment yet.
  Phase 3 (Align): LLM-driven structural alignment runs.
  Phase 4 (Drift): language-drift questions surfaced; student reflects.

Flag rules (return only those that apply):
- "stuck_signal": >5 min since last activity in a phase that should be moving.
- "plan_loop": planExaminerLog has \u22653 unsuccessful submissions.
- "missing_required_node": a locked node still absent from latest draft or plan.
- "drift_heavy": Phase 4 reached and drifts.length >= 6.
- "high_performer": coverageRatio == 1.0 AND drifts.length <= 2.
- "completed": completedAt is set.

Output strict JSON:
{ "summary": "<one sentence>", "flags": ["<flag>", ...] }`;

export interface RemixLiveSummaryContext {
  studentId: string;
  exerciseTitle: string;
  currentPhase: number;
  minutesSinceLastActive: number;
  minutesInSession: number;
  completed: boolean;
  planSummary: {
    submissions: number;
    lastReady: boolean | null;
    lastQuestions: Array<{ field: string; nodeId?: string; severity: string; question: string }>;
    missingLocked: string[];
  } | null;
  draftSummary: {
    bytes: number;
    runnerScore: number | null;
    requiredCoverage: number | null;
    reusedHits: number | null;
    savedAt: string | null;
  } | null;
  alignSummary: {
    coverageRatio: number;
    missing: string[];
  } | null;
  driftSummary: {
    count: number;
    topCategories: string[];
  } | null;
  recentEvents: Array<{ kind: string; createdAt: string; payload: unknown }>;
}

export function buildRemixLiveSummaryUserMessage(ctx: RemixLiveSummaryContext): string {
  const lines: string[] = [];
  lines.push(`STUDENT: ${ctx.studentId}`);
  lines.push(`EXERCISE: ${ctx.exerciseTitle}`);
  lines.push(`CURRENT PHASE: ${ctx.currentPhase}${ctx.completed ? " (completed)" : ""}`);
  lines.push(`SINCE LAST ACTIVITY: ${ctx.minutesSinceLastActive.toFixed(1)} min`);
  lines.push(`SESSION DURATION: ${ctx.minutesInSession.toFixed(1)} min`);
  lines.push("");

  if (ctx.planSummary) {
    lines.push(`PLAN: submissions=${ctx.planSummary.submissions} lastReady=${ctx.planSummary.lastReady}`);
    if (ctx.planSummary.missingLocked.length > 0) {
      lines.push(`  missing locked nodes: ${ctx.planSummary.missingLocked.join(", ")}`);
    }
    if (ctx.planSummary.lastQuestions.length > 0) {
      lines.push(`  last examiner questions:`);
      for (const q of ctx.planSummary.lastQuestions.slice(0, 4)) {
        lines.push(`    [${q.severity}] ${q.field}${q.nodeId ? "/" + q.nodeId : ""}: ${q.question}`);
      }
    }
  }
  if (ctx.draftSummary) {
    lines.push(`DRAFT: ${ctx.draftSummary.bytes}B score=${ctx.draftSummary.runnerScore} coverage=${ctx.draftSummary.requiredCoverage} reusedHits=${ctx.draftSummary.reusedHits} savedAt=${ctx.draftSummary.savedAt}`);
  }
  if (ctx.alignSummary) {
    lines.push(`ALIGN: coverage=${ctx.alignSummary.coverageRatio.toFixed(2)} missing=[${ctx.alignSummary.missing.join(", ")}]`);
  }
  if (ctx.driftSummary) {
    lines.push(`DRIFT: count=${ctx.driftSummary.count} top=[${ctx.driftSummary.topCategories.join(", ")}]`);
  }

  lines.push("");
  lines.push("RECENT EVENTS:");
  if (ctx.recentEvents.length === 0) {
    lines.push("  (none)");
  } else {
    for (const e of ctx.recentEvents.slice(0, 8)) {
      lines.push(`  - ${e.kind} @ ${e.createdAt}: ${JSON.stringify(e.payload).slice(0, 140)}`);
    }
  }

  lines.push("");
  lines.push("Generate the summary. Output JSON.");
  return lines.join("\n");
}
