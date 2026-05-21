// Aggregates RemixSessions for a single exercise into a digest the
// cohort-narrative prompt can chew on, and provides a helper to fetch the
// per-exercise card stats for the cohorts index.

import { prisma } from "@/lib/db";
import type { RemixCohortDigest } from "@/lib/opus/prompts/remix-cohort-narrative";

interface SkeletonNode { id: string; label: string; required: boolean }
interface AlignmentRow { nodeId: string; status: string }
interface DriftRow { category: string; nodeId: string; observation: string }

export async function buildCohortDigest(exerciseId: string): Promise<RemixCohortDigest | null> {
  const exercise = await prisma.remixExercise.findUnique({
    where: { id: exerciseId },
    include: {
      lesson: { include: { skeleton: true, book: true } },
      sessions: true,
    },
  });
  if (!exercise || !exercise.lesson.skeleton) return null;

  const nodes = exercise.lesson.skeleton.plotNodes as unknown as SkeletonNode[];
  const nodeLabel = new Map(nodes.map((n) => [n.id, n.label]));
  const requiredNodeIds = new Set(nodes.filter((n) => n.required).map((n) => n.id));

  const sessions = exercise.sessions;
  const completed = sessions.filter((s: { completedAt: Date | null }) => s.completedAt !== null);

  let coverageSum = 0;
  let coverageN = 0;
  let driftSum = 0;
  let driftN = 0;
  const missingCounts = new Map<string, number>();
  const driftCategoryCounts = new Map<string, number>();
  const sampleDrifts: RemixCohortDigest["sampleDrifts"] = [];
  const sampleHighPerformers: RemixCohortDigest["sampleHighPerformers"] = [];

  for (const s of sessions) {
    const align = s.alignData as { coverageRatio: number; alignments: AlignmentRow[] } | null;
    const drift = s.driftData as { drifts: DriftRow[] } | null;
    if (align) {
      coverageSum += align.coverageRatio;
      coverageN += 1;
      for (const a of align.alignments) {
        if (a.status === "missing" && requiredNodeIds.has(a.nodeId)) {
          missingCounts.set(a.nodeId, (missingCounts.get(a.nodeId) ?? 0) + 1);
        }
      }
    }
    if (drift) {
      driftSum += drift.drifts.length;
      driftN += 1;
      for (const d of drift.drifts) {
        driftCategoryCounts.set(d.category, (driftCategoryCounts.get(d.category) ?? 0) + 1);
        if (sampleDrifts.length < 24) {
          sampleDrifts.push({
            studentId: s.studentId,
            category: d.category,
            nodeId: d.nodeId,
            observation: d.observation,
          });
        }
      }
    }
    if (align && drift && align.coverageRatio >= 0.95 && drift.drifts.length <= 2) {
      sampleHighPerformers.push({
        studentId: s.studentId,
        coverage: align.coverageRatio,
        driftCount: drift.drifts.length,
      });
    }
  }

  const averagePhaseReached =
    sessions.length === 0
      ? 0
      : sessions.reduce((sum: number, s: { completedAt: Date | null; currentPhase: number }) => sum + (s.completedAt ? 4 : s.currentPhase), 0) / sessions.length;

  return {
    exerciseTitle: exercise.title,
    bookKey: exercise.lesson.bookKey,
    lessonOrdinal: exercise.lesson.ordinal,
    attempts: sessions.length,
    completed: completed.length,
    averagePhaseReached,
    averageAlignCoverage: coverageN > 0 ? coverageSum / coverageN : null,
    averageDriftCount: driftN > 0 ? driftSum / driftN : null,
    topMissingNodes: [...missingCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([nodeId, count]) => ({ nodeId, label: nodeLabel.get(nodeId) ?? nodeId, count })),
    driftCategoryHistogram: [...driftCategoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count })),
    sampleDrifts,
    sampleHighPerformers: sampleHighPerformers.slice(0, 6),
  };
}

export interface CohortCard {
  exerciseId: string;
  exerciseTitle: string;
  bookKey: string;
  bookTitle: string;
  lessonOrdinal: number;
  lessonTitle: string;
  attempts: number;
  completed: number;
  completionRate: number;
  topDriftCategory: string | null;
}

export async function listCohortCards(): Promise<CohortCard[]> {
  const exercises = await prisma.remixExercise.findMany({
    include: {
      lesson: { include: { book: true } },
      sessions: true,
    },
    orderBy: [{ lesson: { bookKey: "asc" } }, { lesson: { ordinal: "asc" } }],
  });

  return exercises.map((ex: { id: string; title: string; lesson: { bookKey: string; book: { key: string; title: string }; ordinal: number; title: string }; sessions: Array<{ completedAt: Date | null; driftData?: unknown }> }) => {
    const sessions = ex.sessions;
    const completed = sessions.filter((s) => s.completedAt !== null).length;
    const driftHist = new Map<string, number>();
    for (const s of sessions) {
      const drift = s.driftData as { drifts: Array<{ category: string }> } | null;
      if (!drift) continue;
      for (const d of drift.drifts) {
        driftHist.set(d.category, (driftHist.get(d.category) ?? 0) + 1);
      }
    }
    const topDriftCategory =
      driftHist.size === 0
        ? null
        : [...driftHist.entries()].sort((a, b) => b[1] - a[1])[0][0];

    return {
      exerciseId: ex.id,
      exerciseTitle: ex.title,
      bookKey: ex.lesson.bookKey,
      bookTitle: ex.lesson.book.title,
      lessonOrdinal: ex.lesson.ordinal,
      lessonTitle: ex.lesson.title,
      attempts: sessions.length,
      completed,
      completionRate: sessions.length === 0 ? 0 : completed / sessions.length,
      topDriftCategory,
    };
  });
}
