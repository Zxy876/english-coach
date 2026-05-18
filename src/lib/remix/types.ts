// Shared types + helpers for the remix flow. Keeps phase-specific
// payload shapes in one place so server-side route handlers and React
// pages agree on names.

import type { LessonSkeleton, NceLesson, RemixExercise, RemixSession } from "@prisma/client";

export interface RemixPlan {
  newScene: string;
  newCharacters: string;
  keptNodes: string[];
  reusedPatterns: number[];
  notes?: string;
}

export interface RemixPlanData {
  plan: RemixPlan;
  examinerLog: Array<{
    at: string;
    ready: boolean;
    questions: Array<{
      field: string;
      nodeId?: string;
      question: string;
      severity: "block" | "nudge";
    }>;
  }>;
}

export interface RemixDraftData {
  text: string;
  runnerResult: unknown;
  savedAt: string;
}

export interface SessionWithCtx extends RemixSession {
  exercise: RemixExercise & {
    lesson: NceLesson & { skeleton: LessonSkeleton | null };
  };
}

export const PHASE_LABELS: Record<number, string> = {
  1: "Plan",
  2: "Draft",
  3: "Align",
  4: "Drift",
};

export function nextPhase(current: number): number {
  return Math.min(current + 1, 4);
}
