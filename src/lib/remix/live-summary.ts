// Builds the RemixLiveSummaryContext from a session row + recent events,
// and provides a tiny in-memory cache so we only re-prompt when the
// session has changed since the last summary.

import type { RemixEvent, RemixSession, RemixExercise, NceLesson, LessonSkeleton } from "@prisma/client";
import { callOpusAndParse } from "@/lib/opus/client";
import {
  REMIX_LIVE_SUMMARY_SYSTEM,
  RemixLiveSummarySchema,
  buildRemixLiveSummaryUserMessage,
  type RemixLiveSummary,
  type RemixLiveSummaryContext,
} from "@/lib/opus/prompts/remix-live-summary";
import type { RemixPlanData, RemixDraftData } from "@/lib/remix/types";

export type SessionForSummary = RemixSession & {
  exercise: RemixExercise & {
    lesson: NceLesson & { skeleton: LessonSkeleton | null };
  };
  events: RemixEvent[];
};

interface CacheEntry {
  lastActiveAt: number;
  summary: RemixLiveSummary;
}

const CACHE = new Map<string, CacheEntry>();

export function buildSummaryContext(session: SessionForSummary): RemixLiveSummaryContext {
  const now = Date.now();
  const lastActive = session.lastActiveAt.getTime();
  const startedAt = session.startedAt.getTime();

  const planData = session.planData as RemixPlanData | null;
  const planSummary = planData
    ? {
        submissions: planData.examinerLog.length,
        lastReady: planData.examinerLog.at(-1)?.ready ?? null,
        lastQuestions:
          planData.examinerLog.at(-1)?.questions.map((q) => ({
            field: q.field,
            nodeId: q.nodeId,
            severity: q.severity,
            question: q.question,
          })) ?? [],
        missingLocked: lastMissingLocked(session.events),
      }
    : null;

  const draftData = session.draftData as RemixDraftData | null;
  const runnerData = (draftData?.runnerResult as { score?: number | null; data?: { requiredCoverage?: number; reusedHits?: number } } | undefined) ?? undefined;
  const draftSummary = draftData
    ? {
        bytes: draftData.text.length,
        runnerScore: runnerData?.score ?? null,
        requiredCoverage: runnerData?.data?.requiredCoverage ?? null,
        reusedHits: runnerData?.data?.reusedHits ?? null,
        savedAt: draftData.savedAt ?? null,
      }
    : null;

  const align = session.alignData as { coverageRatio: number; alignments: Array<{ nodeId: string; status: string }> } | null;
  const alignSummary = align
    ? {
        coverageRatio: align.coverageRatio,
        missing: align.alignments.filter((a) => a.status === "missing").map((a) => a.nodeId),
      }
    : null;

  const drift = session.driftData as { drifts: Array<{ category: string }> } | null;
  const driftSummary = drift
    ? {
        count: drift.drifts.length,
        topCategories: topCategories(drift.drifts),
      }
    : null;

  return {
    studentId: session.studentId,
    exerciseTitle: session.exercise.title,
    currentPhase: session.currentPhase,
    completed: session.completedAt !== null,
    minutesSinceLastActive: (now - lastActive) / 60_000,
    minutesInSession: (now - startedAt) / 60_000,
    planSummary,
    draftSummary,
    alignSummary,
    driftSummary,
    recentEvents: session.events.slice(0, 8).map((e) => ({
      kind: e.kind,
      createdAt: e.createdAt.toISOString(),
      payload: e.payload,
    })),
  };
}

function lastMissingLocked(events: RemixEvent[]): string[] {
  for (const e of events) {
    if (e.kind !== "plan_review") continue;
    const p = e.payload as { missingLocked?: string[] } | null;
    if (p?.missingLocked) return p.missingLocked;
  }
  return [];
}

function topCategories(drifts: Array<{ category: string }>): string[] {
  const counts = new Map<string, number>();
  for (const d of drifts) counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);
}

export async function getLiveSummary(session: SessionForSummary): Promise<RemixLiveSummary> {
  const lastActive = session.lastActiveAt.getTime();
  const cached = CACHE.get(session.id);
  if (cached && cached.lastActiveAt === lastActive) {
    return cached.summary;
  }

  const ctx = buildSummaryContext(session);
  const summary = await callOpusAndParse({
    promptName: "remix-live-summary",
    system: REMIX_LIVE_SUMMARY_SYSTEM,
    messages: [{ role: "user", content: buildRemixLiveSummaryUserMessage(ctx) }],
    schema: RemixLiveSummarySchema,
    maxTokens: 600,
  });

  CACHE.set(session.id, { lastActiveAt: lastActive, summary });
  return summary;
}

export function _resetSummaryCacheForTests() {
  CACHE.clear();
}
